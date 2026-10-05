/**
 * The passcode gate (docs/status.md Decisions). Uses only Web Crypto and globals available in
 * both the Edge middleware and the Node API route, so the two share this one file.
 */
export const GATE_COOKIE = "stead_auth";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days
export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

/** Fixed message HMAC'd with the current passcode. Changing the passcode changes every cookie's
 * expected value, which is what logs every device out without tracking sessions anywhere. */
const GATE_MESSAGE = "stead-gate-v1";

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(sig);
}

/** Constant-time comparison for two strings of (expected) equal length. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function gateCookieValue(passcode: string): Promise<string> {
  return hmacHex(passcode, GATE_MESSAGE);
}

/** Edge-safe: no DB access, just checks the cookie against the current STEAD_PASSCODE. */
export async function isValidGateCookie(cookieValue: string | undefined): Promise<boolean> {
  const passcode = process.env.STEAD_PASSCODE;
  if (!passcode || !cookieValue) return false;
  const expected = await gateCookieValue(passcode);
  return timingSafeEqual(cookieValue, expected);
}
