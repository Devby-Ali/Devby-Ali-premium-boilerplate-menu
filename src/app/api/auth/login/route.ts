import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { env } from "@/lib/env";
import { getPrismaClient } from "@/server/prisma";

// ─────────────────────────────────────────────
//  Validation Schema
// ─────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().trim().email("ایمیل معتبر نیست"),
  password: z.string().min(4, "رمز عبور باید حداقل ۴ کاراکتر باشد"),
});

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

    const { email, password } = parsed.data;

    const isInitialAdminLogin =
      email.toLowerCase() === env.ADMIN_INITIAL_EMAIL.toLowerCase() &&
      password === env.ADMIN_INITIAL_PASSWORD;

    if (isInitialAdminLogin) {
      const session = {
        id: "fallback-admin",
        name: "Administrator",
        email: env.ADMIN_INITIAL_EMAIL,
        role: "admin",
        roleId: "fallback-admin-role",
      };

      await setSessionCookie(session);

      return Response.json({
        message: "با موفقیت وارد شدید.",
        user: session,
      });
    }

    const prisma = getPrismaClient();

    if (!prisma) {
      return Response.json(
        {
          error:
            "در حال حاضر دسترسی به پایگاه داده مقدور نیست. لطفاً دوباره تلاش کنید.",
        },
        { status: 503 },
      );
    }

    // جستجوی کاربر با ایمیل (و role مرتبط)
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return Response.json(
        { error: "ایمیل یا رمز عبور اشتباه است." },
        { status: 401 },
      );
    }

    // بررسی فعال بودن کاربر
    if (!user.isActive) {
      return Response.json(
        { error: "حساب کاربری شما غیرفعال شده است." },
        { status: 403 },
      );
    }

    // بررسی اینکه نقش کاربر admin باشد (اختیاری بسته به نیاز پروژه)
    if (user.role?.name !== "admin") {
      return Response.json({ error: "دسترسی غیرمجاز." }, { status: 403 });
    }

    // تطبیق پسورد هش‌شده
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return Response.json(
        { error: "ایمیل یا رمز عبور اشتباه است." },
        { status: 401 },
      );
    }

    // ایجاد نشست
    const session = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      roleId: user.role.id,
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
