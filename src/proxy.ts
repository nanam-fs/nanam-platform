import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: sends visitors without a session cookie to the right sign-in page.
// Every page and server action still validates the session against the database.
const areas = [
  { prefix: "/console", login: "/console/login", cookie: "nanam_session" },
  { prefix: "/portal", login: "/portal/login", cookie: "nanam_portal" },
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const area = areas.find((a) => pathname === a.prefix || pathname.startsWith(`${a.prefix}/`));
  if (!area || pathname === area.login) return NextResponse.next();
  if (!request.cookies.has(area.cookie)) {
    const url = new URL(area.login, request.url);
    if (area.prefix === "/console") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = { matcher: ["/console", "/console/:path*", "/portal", "/portal/:path*"] };
