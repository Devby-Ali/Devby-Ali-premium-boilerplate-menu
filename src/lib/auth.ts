import { cookies } from "next/headers";
import { createHmac } from "node:crypto";

import { env } from "@/lib/env";
import type { UserSession } from "@/types";

const SESSION_COOKIE_NAME = "pm_session";
const SESSION_SECRET = env.AUTH_SESSION_SECRET;

export function encodeSession(session: UserSession) {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

export function decodeSession(value: string | undefined) {
  if (!value) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  if (expectedSignature !== signature) return null;

  try {
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as UserSession;
  } catch {
    return null;
  }
}

export async function getSessionFromCookie() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return decodeSession(sessionValue) ?? null;
}

export async function setSessionCookie(session: UserSession) {
  const cookieStore = await cookies();
  const value = encodeSession(session);
  cookieStore.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export { SESSION_COOKIE_NAME };
