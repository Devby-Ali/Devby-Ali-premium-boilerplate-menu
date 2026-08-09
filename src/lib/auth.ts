// src/lib/auth.ts
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { UserSession } from "@/types";

const SESSION_COOKIE_NAME = "pm_session";
const SECRET = env.JWT_SECRET;

/* ------------------------------------------------------------------ */
/*  Utility: Base64URL encode / decode (works in Edge & Node)         */
/* ------------------------------------------------------------------ */
function toBase64Url(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(base64url: string): string {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/* ------------------------------------------------------------------ */
/*  HMAC‑SHA256 using Web Crypto (Edge‑safe)                          */
/* ------------------------------------------------------------------ */
async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ------------------------------------------------------------------ */
/*  Session encoding / decoding                                       */
/* ------------------------------------------------------------------ */
export async function encodeSession(session: UserSession): Promise<string> {
  const payload = toBase64Url(JSON.stringify(session));
  const signature = await hmacSha256(payload, SECRET);
  return `${payload}.${signature}`;
}

export async function decodeSession(value: string | undefined) {
  if (!value) return null;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = await hmacSha256(payload, SECRET);
  if (expectedSignature !== signature) return null;

  try {
    return JSON.parse(fromBase64Url(payload)) as UserSession;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Cookie helpers (server‑side only)                                 */
/* ------------------------------------------------------------------ */
export async function getSessionFromCookie() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return decodeSession(sessionValue) ?? null;
}

/**
 * Server-side guard for admin API routes (PRD FR-A01 / ROADMAP F1:
 * "server-side role check in every admin API"). The `proxy.ts` middleware
 * only guards /admin/* pages — /api/admin/* routes must call this explicitly.
 *
 * @returns the admin session, or `null` when unauthenticated/unauthorized.
 */
export async function requireAdminSession(): Promise<UserSession | null> {
  const session = await getSessionFromCookie();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function setSessionCookie(session: UserSession) {
  const cookieStore = await cookies();
  const value = await encodeSession(session);
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
