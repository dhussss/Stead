import "server-only";
import { NextResponse } from "next/server";
import { createServiceClient, steadOwnerId } from "@/lib/supabase/client";
import { COOKIE_MAX_AGE_SECONDS, GATE_COOKIE, LOCKOUT_MS, LOCKOUT_THRESHOLD, gateCookieValue, timingSafeEqual } from "@/lib/gate";

export async function POST(req: Request) {
  const passcode = process.env.STEAD_PASSCODE;
  if (!passcode) return NextResponse.json({ error: "gate not configured" }, { status: 500 });

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";

  const client = createServiceClient();
  const owner = steadOwnerId();
  const now = new Date();

  const { data: attempt } = await client
    .from("passcode_attempts")
    .select("failures, locked_until")
    .eq("owner", owner)
    .maybeSingle();

  const lockedUntil = attempt?.locked_until ? new Date(attempt.locked_until) : null;
  if (lockedUntil && lockedUntil > now) {
    return NextResponse.json({ error: "locked", retryAt: lockedUntil.toISOString() }, { status: 429 });
  }
  // A lock that has expired resets the count, so a fresh set of tries starts clean.
  const failures = lockedUntil && lockedUntil <= now ? 0 : (attempt?.failures ?? 0);

  // A short delay that grows with recent failures, so even pre-lockout guessing is slow.
  await new Promise((resolve) => setTimeout(resolve, Math.min(failures, LOCKOUT_THRESHOLD) * 400));

  const valid = code.length === 6 && timingSafeEqual(code, passcode);

  if (!valid) {
    const nextFailures = failures + 1;
    const locked = nextFailures >= LOCKOUT_THRESHOLD;
    await client.from("passcode_attempts").upsert({
      owner,
      failures: nextFailures,
      locked_until: locked ? new Date(now.getTime() + LOCKOUT_MS).toISOString() : null,
      updated: now.toISOString(),
    });
    return NextResponse.json({ error: locked ? "locked" : "wrong code" }, { status: locked ? 429 : 401 });
  }

  await client.from("passcode_attempts").upsert({
    owner,
    failures: 0,
    locked_until: null,
    updated: now.toISOString(),
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, await gateCookieValue(passcode), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return res;
}
