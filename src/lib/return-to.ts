/**
 * Where to send someone after they log in. Replaces your authReturnTo.js.
 *
 * Only paths on THIS site are allowed ("/checkout", "/account/orders?x=1").
 * Anything that could jump to another site ("https://evil.com", "//evil.com",
 * "/\evil.com") falls back to the home page. This stops phishing links like
 * /login?returnTo=https://evil.com.
 */
export function safeReturnTo(raw: string | null | undefined, fallback = "/"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 500) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (/[\\\r\n\t]/.test(raw)) return fallback; // backslashes and control characters
  return raw;
}
