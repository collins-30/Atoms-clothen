import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed "middleware" to "proxy". This is the first, cheap gate for
// /account and /admin: no session cookie at all -> go to the login page.
//
// It is only a convenience. The REAL checks happen on the server: the admin
// layout and every admin action look the user up in the database (requireAdmin),
// and account queries filter by the signed-in user's id.
const SESSION_COOKIE_PREFIXES = ["authjs.session-token", "__Secure-authjs.session-token"];

export function proxy(req: NextRequest) {
  // Auth.js splits big sessions into "...session-token.0", ".1", so match by prefix.
  const hasSession = req.cookies
    .getAll()
    .some((c) => SESSION_COOKIE_PREFIXES.some((p) => c.name.startsWith(p)));
  if (hasSession) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?returnTo=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/account/:path*", "/admin/:path*"] };
