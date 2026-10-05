import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, isValidGateCookie } from "@/lib/gate";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

/**
 * One passcode gates every route — pages, API, server actions — until it's entered (docs/status.md
 * Decisions). This runs on the Edge and never touches the database; it only checks the cookie's
 * HMAC against the current STEAD_PASSCODE.
 */
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/gate" || req.nextUrl.pathname === "/api/gate") {
    return NextResponse.next();
  }
  const cookie = req.cookies.get(GATE_COOKIE)?.value;
  if (await isValidGateCookie(cookie)) return NextResponse.next();

  const from = req.nextUrl.pathname + req.nextUrl.search;
  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.search = "";
  if (from !== "/") url.searchParams.set("from", from);
  return NextResponse.redirect(url);
}
