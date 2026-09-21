// src/proxy.ts
// Proxy (جانشین Middleware در Next.js 16) — Authentication + RBAC Authorization
// پوشش: /admin/:path* (HTML) و /api/admin/:path* (JSON)
import { NextResponse, type NextRequest } from "next/server";

import { decodeSession, PERMISSIONS, SESSION_COOKIE_NAME } from "@/lib/auth-edge";
import type { RoleName } from "@/types";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

// نگاشت سگمنت مسیر → کلید PERMISSIONS در auth-edge.ts
const ROUTE_PERMISSIONS: Record<string, keyof typeof PERMISSIONS> = {
  users: "manageUsers",
  settings: "manageSettings",
  menu: "manageMenu",
  stock: "manageStock",
  tables: "manageTables",
  reports: "viewReports",
  purchases: "viewReports",
  expenses: "viewReports",
  reservations: "manageReservations",
  orders: "viewOrders",
  "waiter-calls": "handleWaiterCall",
};

const DASHBOARD_ROLES: readonly RoleName[] = ["SuperAdmin", "Manager", "Staff"];

// سگمنت اول بعد از /admin یا /api/admin را استخراج می‌کند؛ null = داشبورد ریشه
function getRouteSegment(pathname: string): string | null {
  const trimmed = pathname.replace(/^\/api/, "").replace(/^\/admin\/?/, "");
  if (!trimmed) return null;
  return trimmed.split("/")[0] ?? null;
}

export function getRolesForPath(pathname: string): readonly RoleName[] {
  const segment = getRouteSegment(pathname);
  // داشبورد و مسیرهای نگاشت‌نشده: همه‌ی نقش‌های ادمین
  if (!segment) return DASHBOARD_ROLES;

  const permission = ROUTE_PERMISSIONS[segment];
  if (!permission) return DASHBOARD_ROLES;

  return PERMISSIONS[permission];
}

function isApiRequest(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function unauthorizedJson(): NextResponse {
  return NextResponse.json(
    { error: "احراز هویت انجام نشده است." },
    { status: 401 }
  );
}

function forbiddenJson(): NextResponse {
  return NextResponse.json(
    { error: "سطح دسترسی لازم را ندارید." },
    { status: 403 }
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = isApiRequest(pathname);
  const isLoginRoute = pathname === "/admin/login";

  const session = await decodeSession(
    request.cookies.get(SESSION_COOKIE_NAME)?.value
  );

  // احرازنشده — جدول رفتاری: HTML → redirect به login، API → 401 JSON
  if (!session) {
    if (isLoginRoute) return NextResponse.next();

    if (isApi) return unauthorizedJson();

    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // احرازشده و مراجعه به صفحه ورود → همیشه انتقال به داشبورد
  if (isLoginRoute) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Authorization نقش-محور — سگمنت‌های بدون مجوز مشخص به داشبورد/403 می‌روند
  const allowedRoles = getRolesForPath(pathname);
  const hasAccess = allowedRoles.includes(session.role);

  if (!hasAccess) {
    if (isApi) return forbiddenJson();
    return NextResponse.redirect(new URL("/admin?error=AccessDenied", request.url));
  }

  // تزریق هویت تأییدشده به درخواست برای استفاده در Server Components/API Routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", session.id);
  requestHeaders.set("x-user-role", session.role);
  requestHeaders.set("x-user-name", session.name);

  return NextResponse.next({ request: { headers: requestHeaders } });
}
