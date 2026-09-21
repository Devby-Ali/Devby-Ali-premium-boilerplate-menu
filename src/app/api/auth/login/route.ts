import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { RoleName } from "@/types";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { env } from "@/lib/env";
import { ensureInitialAdmin, findUserByEmail, findUserByPhone } from "@/lib/user-service";

const ADMIN_ROLES: RoleName[] = ["SuperAdmin", "Manager", "Staff"];
const PHONE_PATTERN = /^\+?\d[\d\s-]{7,14}$/;

const loginSchema = z
  .object({
    identifier: z.string().trim().min(3).optional(),
    email: z.string().trim().min(3).optional(),
    password: z.string().min(4, "رمز عبور باید حداقل ۴ کاراکتر باشد"),
  })
  .refine((v) => v.identifier || v.email, {
    message: "ایمیل یا شماره موبایل الزامی است",
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "ورودی نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { password } = parsed.data;
    const identifier = (parsed.data.identifier ?? parsed.data.email ?? "").trim();

    let user =
      PHONE_PATTERN.test(identifier) && !identifier.includes("@")
        ? await findUserByPhone(identifier)
        : await findUserByEmail(identifier.toLowerCase());

    if (!user) {
      const isInitialAdmin =
        identifier.toLowerCase() === env.ADMIN_INITIAL_EMAIL.toLowerCase() &&
        password === env.ADMIN_INITIAL_PASSWORD;
      if (isInitialAdmin) user = await ensureInitialAdmin();
    }

    if (!user) {
      return Response.json({ error: "ایمیل یا رمز عبور اشتباه است." }, { status: 401 });
    }

    if (!user.isActive) {
      return Response.json({ error: "حساب کاربری شما غیرفعال شده است." }, { status: 403 });
    }

    if (!ADMIN_ROLES.includes(user.role)) {
      return Response.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return Response.json({ error: "ایمیل یا رمز عبور اشتباه است." }, { status: 401 });
    }

    const session = {
      id: user._id.toHexString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    await setSessionCookie(session);
    return Response.json({ message: "با موفقیت وارد شدید.", user: session });
  } catch (error) {
    console.error("[LOGIN ERROR]", error);
    return Response.json({ error: "خطای داخلی سرور." }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return Response.json({ message: "با موفقیت خارج شدید." });
}
