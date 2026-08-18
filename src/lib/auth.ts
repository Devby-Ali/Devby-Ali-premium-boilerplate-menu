// src/lib/auth.ts
// فقط برای Server Components و API Routes
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { RoleName, UserSession } from "@/types";

export { SESSION_COOKIE_NAME, PERMISSIONS, encodeSession, decodeSession } from "@/lib/auth-edge";
import { SESSION_COOKIE_NAME, decodeSession } from "@/lib/auth-edge";

const ADMIN_ROLES: RoleName[] = ["SuperAdmin", "Manager", "Staff"];

export async function getSessionFromCookie(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function setSessionCookie(session: UserSession): Promise<void> {
  const { encodeSession } = await import("@/lib/auth-edge");
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, await encodeSession(session), {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}

export async function requireAdminSession(): Promise<UserSession | null> {
  const session = await getSessionFromCookie();
  if (!session || !ADMIN_ROLES.includes(session.role as RoleName)) return null;
  return session;
}

export async function requireRole(allowedRoles: readonly RoleName[]): Promise<UserSession | null> {
  const session = await getSessionFromCookie();
  if (!session || !allowedRoles.includes(session.role as RoleName)) return null;
  return session;
}
