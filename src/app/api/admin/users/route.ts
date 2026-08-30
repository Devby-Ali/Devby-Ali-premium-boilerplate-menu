// src/app/api/admin/users/route.ts
// مدیریت کاربران — فقط SuperAdmin (Proxy هم این مسیر را با manageUsers محدود می‌کند)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from "@/lib/user-service";

function unauthorized() {
  return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
}

function userMessage(error: string): string {
  switch (error) {
    case "NOT_FOUND":
      return "کاربر یافت نشد.";
    case "DUPLICATE_EMAIL":
      return "این ایمیل قبلاً ثبت شده است.";
    case "DUPLICATE_PHONE":
      return "این شماره موبایل قبلاً ثبت شده است.";
    case "LAST_SUPERADMIN":
      return "حداقل یک مدیر ارشد فعال باید باقی بماند.";
    case "SELF_DELETE":
      return "حساب خودتان را نمی‌توانید حذف کنید.";
    case "SELF_DEMOTE":
      return "حساب خودتان را نمی‌توانید غیرفعال کنید.";
    default:
      return "درخواست با خطا مواجه شد.";
  }
}

const roleNameSchema = z.enum(["SuperAdmin", "Manager", "Staff"]);

const createUserSchema = z.object({
  name: z.string().trim().min(2, "نام باید حداقل ۲ کاراکتر باشد"),
  email: z.string().trim().email("ایمیل معتبر نیست"),
  phone: z.string().trim().min(8).nullish(),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
  roleName: roleNameSchema,
});

const updateUserSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email("ایمیل معتبر نیست").optional(),
  phone: z.string().trim().min(8).nullish(),
  // رمز اختیاری است — ارسال نشدن یعنی بدون تغییر
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد").optional(),
  roleName: roleNameSchema.optional(),
  isActive: z.boolean().optional(),
});

const deleteUserSchema = z.object({
  id: z.string().trim().min(1),
});

export async function GET() {
  const session = await requireRole(["SuperAdmin"]);
  if (!session) return unauthorized();

  try {
    const users = await listUsers();
    const data = users.map(({ user, role }) => ({
      id: user._id.toHexString(),
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      role: role?.name ?? null,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    }));
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[USERS GET ERROR]", error);
    return NextResponse.json({ error: "دریافت کاربران با خطا مواجه شد." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireRole(["SuperAdmin"]);
  if (!session) return unauthorized();

  try {
    const parsed = createUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات ورودی نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await createUser({ ...parsed.data, actorId: session.id });
    if (!result.ok) {
      return NextResponse.json({ error: userMessage(result.error) }, { status: 409 });
    }

    return NextResponse.json({ message: "کاربر ایجاد شد." }, { status: 201 });
  } catch (error) {
    console.error("[USERS CREATE ERROR]", error);
    return NextResponse.json({ error: "ایجاد کاربر با خطا مواجه شد." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireRole(["SuperAdmin"]);
  if (!session) return unauthorized();

  try {
    const parsed = updateUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات ورودی نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await updateUser({ ...parsed.data, actorId: session.id });
    if (!result.ok) {
      return NextResponse.json({ error: userMessage(result.error) }, { status: 409 });
    }
    if (!result.user) {
      return NextResponse.json({ error: userMessage("NOT_FOUND") }, { status: 404 });
    }

    return NextResponse.json({ message: "کاربر به‌روزرسانی شد." });
  } catch (error) {
    console.error("[USERS UPDATE ERROR]", error);
    return NextResponse.json({ error: "به‌روزرسانی کاربر با خطا مواجه شد." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireRole(["SuperAdmin"]);
  if (!session) return unauthorized();

  try {
    const parsed = deleteUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات ورودی نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await deleteUser(parsed.data.id, session.id);
    if (!result.ok) {
      return NextResponse.json({ error: userMessage(result.error) }, { status: 409 });
    }

    return NextResponse.json({ message: "کاربر حذف شد." });
  } catch (error) {
    console.error("[USERS DELETE ERROR]", error);
    return NextResponse.json({ error: "حذف کاربر با خطا مواجه شد." }, { status: 500 });
  }
}
