// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginRoute = pathname === "/admin/login";

  if (!isAdminRoute) return NextResponse.next();

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decodeSession(sessionCookie);
  const isAuthenticated = Boolean(session);

  if (!isLoginRoute && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && isAuthenticated) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/admin";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
