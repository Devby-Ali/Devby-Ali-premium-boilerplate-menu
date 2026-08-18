// src/proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/auth-edge";
import type { RoleName } from "@/types";

export const config = {
  matcher: ["/admin/:path*"],
};

const ADMIN_ROLES: readonly RoleName[] = ["SuperAdmin", "Manager", "Staff"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginRoute = pathname === "/admin/login";

  const session = await decodeSession(
    request.cookies.get(SESSION_COOKIE_NAME)?.value
  );
  const isAuthenticated = session !== null && ADMIN_ROLES.includes(session.role as RoleName);

  if (isLoginRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (!isLoginRoute && !isAuthenticated) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
