// src/lib/auth-edge.ts
// قابل استفاده در Middleware و Edge Runtime (بدون next/headers)
import { env } from "@/lib/env";
import type { RoleName, UserSession } from "@/types";

export const SESSION_COOKIE_NAME = "pm_session";
const SECRET = env.JWT_SECRET;

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
  const payload = toBase64Url(JSON.stringify(session));
  const signature = await hmacSha256(payload, SECRET);
  return `${payload}.${signature}`;
}

export async function decodeSession(value: string | undefined): Promise<UserSession | null> {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = await hmacSha256(payload, SECRET);
  if (expected !== signature) return null;
  try {
    return JSON.parse(fromBase64Url(payload)) as UserSession;
  } catch {
    return null;
  }
}
