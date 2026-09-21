// src/lib/auth-edge.ts
// قابل استفاده در Middleware و Edge Runtime (بدون next/headers)
import { env } from "@/lib/env";
import type { RoleName, UserSession } from "@/types";

export const SESSION_COOKIE_NAME = "pm_session";
const SECRET = env.JWT_SECRET;

// طول عمر نشست — هم‌راستا با maxAge کوکی در setSessionCookie (۷ روز)
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

/** payload داخلی کوکی: علاوه بر UserSession، زمان انقضا هم امضا می‌شود */
type SessionPayload = UserSession & { exp: number };

export const PERMISSIONS = {
  manageUsers:        ["SuperAdmin"],
  manageSettings:     ["SuperAdmin"],
  manageMenu:         ["SuperAdmin", "Manager"],
  manageStock:        ["SuperAdmin", "Manager"],
  manageTables:       ["SuperAdmin", "Manager"],
  viewReports:        ["SuperAdmin", "Manager"],
  manageReservations: ["SuperAdmin", "Manager"],
  viewOrders:         ["SuperAdmin", "Manager", "Staff"],
  manageOrders:       ["SuperAdmin", "Manager", "Staff"],
  handleWaiterCall:   ["SuperAdmin", "Manager", "Staff"],
} as const satisfies Record<string, RoleName[]>;

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(base64url: string): string {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: { name: "SHA-256" } },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function encodeSession(session: UserSession): Promise<string> {
  const payload: SessionPayload = {
    ...session,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = await hmacSha256(encoded, SECRET);
  return `${encoded}.${signature}`;
}

// مقایسه زمان‌ثابت برای جلوگیری از timing attack روی امضای کوکی
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function decodeSession(value: string | undefined): Promise<UserSession | null> {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = await hmacSha256(payload, SECRET);
  if (!timingSafeEqual(expected, signature)) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as SessionPayload;
    // نشست بدون exp یا منقضی‌شده معتبر نیست — کاربر باید دوباره وارد شود
    if (
      typeof parsed.exp !== "number" ||
      parsed.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    const session: UserSession = {
      id: parsed.id,
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
    };
    return session;
  } catch {
    return null;
  }
}
