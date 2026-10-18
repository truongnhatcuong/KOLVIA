import { NextResponse, type NextRequest } from "next/server";
// Optimistic redirect only. Every protected read/write verifies its session and role at the service.
export function proxy(request: NextRequest) {
  if (!request.cookies.get("kolvia_session"))
    return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/kol/:path*", "/organizer/:path*", "/admin/:path*", "/account/:path*"] };
