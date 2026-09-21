// src/app/api/admin/categories/route.ts
// CRUD دسته‌بندی‌ها + زمان‌بندی نمایش (scheduledFrom/scheduledTo) و فعال/غیرفعال
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  getAllCategoriesWithCount,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/menu-service";

const ALLOWED_ROLES = ["SuperAdmin", "Manager"] as const;

function unauthorized() {
  return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
}

// Date.parse روی ISO 8601 و خروجی input[type=datetime-local] با ثانیه کار می‌کند
const dateTimeSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "تاریخ/زمان نامعتبر است",
  })
  .nullable()
  .optional();

const scheduleFields = {
  scheduledFrom: dateTimeSchema,
  scheduledTo: dateTimeSchema,
  scheduleDays: z.array(z.number().int().min(0).max(6)).optional(),
};

function validateScheduleRange(data: {
  scheduledFrom?: string | null;
  scheduledTo?: string | null;
}): boolean {
  if (data.scheduledFrom && data.scheduledTo) {
    return Date.parse(data.scheduledFrom) < Date.parse(data.scheduledTo);
  }
  return true;
}

const createSchema = z
  .object({
    name: z.string().trim().min(1, "نام دسته الزامی است"),
    slug: z.string().trim().min(1, "اسلاگ الزامی است"),
    description: z.string().trim().nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    ...scheduleFields,
  })
  .refine(validateScheduleRange, {
    message: "پایان بازه‌ی زمان‌بندی باید بعد از شروع آن باشد.",
  });

const updateSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    slug: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    ...scheduleFields,
  })
  .refine(validateScheduleRange, {
    message: "پایان بازه‌ی زمان‌بندی باید بعد از شروع آن باشد.",
  });

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export async function GET() {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();
  try {
    // برای مدیریت، همه‌ی دسته‌ها (حتی غیرفعال/خارج از بازه) لازم است
    const categories = await getAllCategoriesWithCount();
    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("[CATEGORIES GET ERROR]", error);
    return NextResponse.json(
      { error: "دریافت دسته‌بندی‌ها با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const category = await createCategory(parsed.data);
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    if (isDuplicateKey(error)) {
      return NextResponse.json(
        { error: "اسلاگ دسته‌بندی تکراری است." },
        { status: 409 },
      );
    }
    console.error("[CATEGORIES CREATE ERROR]", error);
    return NextResponse.json(
      { error: "ایجاد دسته‌بندی با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const { id, ...input } = parsed.data;
    const category = await updateCategory(id, input);
    if (!category) {
      return NextResponse.json(
        { error: "دسته‌بندی یافت نشد." },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: category });
  } catch (error) {
    if (isDuplicateKey(error)) {
      return NextResponse.json(
        { error: "اسلاگ دسته‌بندی تکراری است." },
        { status: 409 },
      );
    }
    console.error("[CATEGORIES UPDATE ERROR]", error);
    return NextResponse.json(
      { error: "به‌روزرسانی دسته‌بندی با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();
  try {
    const body = await request.json();
    const parsed = z.object({ id: z.string().trim().min(1) }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "شناسه دسته‌بندی نامعتبر است." },
        { status: 400 },
      );
    }
    const result = await deleteCategory(parsed.data.id);
    if (!result) {
      return NextResponse.json(
        { error: "دسته‌بندی یافت نشد." },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[CATEGORIES DELETE ERROR]", error);
    return NextResponse.json(
      { error: "حذف دسته‌بندی با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
