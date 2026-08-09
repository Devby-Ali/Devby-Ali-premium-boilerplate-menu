import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { env } from "@/lib/env";
import {
  ensureInitialAdmin,
  findUserByEmail,
  findUserByPhone,
} from "@/lib/user-service";

// ─────────────────────────────────────────────
//  Validation Schema
//  PRD FR-A02: login with email OR mobile + password.
//  `email` is kept for backward compatibility with the current login form;
//  `identifier` (email or phone) is the forward-compatible field.
// ─────────────────────────────────────────────
const loginSchema = z
  .object({
    identifier: z.string().trim().min(3).optional(),
    email: z.string().trim().min(3).optional(),
    password: z.string().min(4, "رمز عبور باید حداقل ۴ کاراکتر باشد"),
  })
  .refine((v) => v.identifier || v.email, {
    message: "ایمیل یا شماره موبایل الزامی است",
  });

const PHONE_PATTERN = /^\+?\d[\d\s-]{7,14}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: "ورودی نامعتبر است.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { password } = parsed.data;
    const identifier = (parsed.data.identifier ?? parsed.data.email ?? "").trim();

    // ── Find the user (by phone or email) ──────────────────────────
    let userWithRole = PHONE_PATTERN.test(identifier) && !identifier.includes("@")
      ? await findUserByPhone(identifier)
      : await findUserByEmail(identifier.toLowerCase());

    // ── First-run bootstrap: provision the initial admin from env ──
    // If no DB user matches but the credentials are the configured initial
    // admin, create that admin in the database (seed-on-first-login) so the
    // session is always backed by a real user document.
    if (!userWithRole) {
      const isInitialAdmin =
        identifier.toLowerCase() === env.ADMIN_INITIAL_EMAIL.toLowerCase() &&
        password === env.ADMIN_INITIAL_PASSWORD;

      if (isInitialAdmin) {
        userWithRole = await ensureInitialAdmin();
      }
    }

    if (!userWithRole) {
      return Response.json(
        { error: "ایمیل یا رمز عبور اشتباه است." },
        { status: 401 },
      );
    }

    const { user, role } = userWithRole;

    if (!user.isActive) {
      return Response.json(
        { error: "حساب کاربری شما غیرفعال شده است." },
        { status: 403 },
      );
    }

    if (role?.name !== "admin") {
      return Response.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return Response.json(
        { error: "ایمیل یا رمز عبور اشتباه است." },
        { status: 401 },
      );
    }

    const session = {
      id: user._id.toHexString(),
      name: user.name,
      email: user.email,
      role: role.name,
      roleId: role._id.toHexString(),
    };

    await setSessionCookie(session);

    return Response.json({
      message: "با موفقیت وارد شدید.",
      user: session,
    });
  } catch (error) {
    console.error("[LOGIN ERROR]", error);
    return Response.json({ error: "خطای داخلی سرور." }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return Response.json({ message: "با موفقیت خارج شدید." });
}
