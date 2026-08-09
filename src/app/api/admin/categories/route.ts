import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth";
import {
  getCategories,
  getCategoriesWithCount,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/menu-service";

function unauthorized() {
  return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
}

const createSchema = z.object({
  name: z.string().trim().min(1, "نام دسته الزامی است"),
  slug: z.string().trim().min(1, "اسلاگ الزامی است"),
  description: z.string().trim().nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  if (!(await requireAdminSession())) return unauthorized();
  try {
    const categories = await getCategoriesWithCount();
    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("[CATEGORIES GET ERROR]", error);
    return NextResponse.json({ error: "دریافت دسته‌بندی‌ها با خطا مواجه شد." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: "اطلاعات ورودی نامعتبر است.",
        details: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }
    const category = await createCategory(parsed.data);
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    console.error("[CATEGORIES CREATE ERROR]", error);
    return NextResponse.json({ error: "ایجاد دسته‌بندی با خطا مواجه شد." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();
  try {
    const body = await request.json();
    const schema = updateSchema.extend({ id: z.string().trim().min(1) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: "اطلاعات ورودی نامعتبر است.",
        details: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }
    const { id, ...input } = parsed.data;
    const category = await updateCategory(id, input);
    if (!category) {
      return NextResponse.json({ error: "دسته‌بندی یافت نشد." }, { status: 404 });
    }
    return NextResponse.json({ data: category });
  } catch (error) {
    console.error("[CATEGORIES UPDATE ERROR]", error);
    return NextResponse.json({ error: "به‌روزرسانی دسته‌بندی با خطا مواجه شد." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();
  try {
    const body = await request.json();
    const parsed = z.object({ id: z.string().trim().min(1) }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "شناسه دسته‌بندی نامعتبر است." }, { status: 400 });
    }
    const result = await deleteCategory(parsed.data.id);
    if (!result) {
      return NextResponse.json({ error: "دسته‌بندی یافت نشد." }, { status: 404 });
    }
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[CATEGORIES DELETE ERROR]", error);
    return NextResponse.json({ error: "حذف دسته‌بندی با خطا مواجه شد." }, { status: 500 });
  }
}
