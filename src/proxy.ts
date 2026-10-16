import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: sends visitors without a session cookie to sign-in.
// Every console page and server action still validates the session against the database.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/console/login") return NextResponse.next();
  if (!request.cookies.has("nanam_session")) {
    const url = new URL("/console/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = { matcher: ["/console", "/console/:path*"] };
