// src/app/api/admin/menu/route.ts
// API مدیریت آیتم‌های منو — قرارداد Canonical:
// ورودی قیمت به «تومان» (priceToman) است و در سرویس به ریال (IRR) ذخیره می‌شود.
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { tomanToRial } from "@/lib/price";
import { slugify, ensureUniqueSlug } from "@/lib/slug";
import {
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  softDeleteMenuItem,
  getAllCategoriesWithCount,
  menuItemSlugExists,
  type CreateMenuItemInput,
  type UpdateMenuItemInput,
} from "@/lib/menu-service";
import type { MenuItem } from "@/types";

const ALLOWED_ROLES = ["SuperAdmin", "Manager"] as const;

const imageUrlSchema = z.string().trim().max(2048).nullable().optional();

const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => ObjectId.isValid(value), { message: "شناسه نامعتبر است" });

const createMenuItemSchema = z.object({
  name: z.string().trim().min(1, "عنوان الزامی است"),
  description: z.string().trim().min(1, "توضیحات الزامی است"),
  categoryId: objectIdSchema,
  /** قیمت به تومان — قبل از ذخیره به ریال تبدیل می‌شود */
  priceToman: z.number().positive("قیمت باید مثبت باشد"),
  preparationTime: z.number().int().positive().nullable().optional(),
  isFeatured: z.boolean().optional().default(false),
  inStock: z.boolean().optional().default(true),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
  imageUrl: imageUrlSchema,
});

const updateMenuItemSchema = z.object({
  id: objectIdSchema,
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  categoryId: objectIdSchema.optional(),
  priceToman: z.number().positive().optional(),
  preparationTime: z.number().int().positive().nullable().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  inStock: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  imageUrl: imageUrlSchema,
});

const deleteMenuItemSchema = z.object({
  id: objectIdSchema,
});

function unauthorized() {
  return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
}

function toAdminMenuItem(item: MenuItem) {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description ?? "",
    /** ریال — نمایش تومان فقط در UI با formatPrice */
    price: item.price,
    currency: item.currency,
    categoryId: item.categoryId,
    categorySlug: item.category?.slug ?? null,
    categoryName: item.category?.name ?? null,
    inStock: item.inStock,
    isFeatured: item.isFeatured,
    isActive: item.isActive,
    preparationTime: item.preparationTime ?? null,
    tags: item.tags,
    imageUrl: item.imageUrl ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function isCategoryNotFound(error: unknown): boolean {
  return error instanceof Error && error.message === "CATEGORY_NOT_FOUND";
}

export async function GET() {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();

  try {
    const [items, categories] = await Promise.all([
      getAllMenuItems(),
      getAllCategoriesWithCount(),
    ]);

    return NextResponse.json({
      data: items.map(toAdminMenuItem),
      categories,
    });
  } catch (error) {
    console.error("[ADMIN MENU GET ERROR]", error);
    return NextResponse.json(
      { error: "دریافت آیتم‌های منو با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();

  try {
    const body = await request.json();
    const parsed = createMenuItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // slug یکتا و سازگار با فارسی
    const slug = await ensureUniqueSlug(
      slugify(parsed.data.name),
      menuItemSlugExists,
    );

    const input: CreateMenuItemInput = {
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      price: tomanToRial(parsed.data.priceToman),
      categoryId: parsed.data.categoryId,
      imageUrl: parsed.data.imageUrl ?? null,
      isFeatured: parsed.data.isFeatured,
      inStock: parsed.data.inStock,
      preparationTime: parsed.data.preparationTime ?? null,
      tags: parsed.data.tags,
    };

    const item = await createMenuItem(input);

    return NextResponse.json({ data: toAdminMenuItem(item) }, { status: 201 });
  } catch (error) {
    if (isCategoryNotFound(error)) {
      return NextResponse.json(
        { error: "دسته‌بندی انتخاب‌شده یافت نشد." },
        { status: 400 },
      );
    }
    console.error("[ADMIN MENU CREATE ERROR]", error);
    return NextResponse.json(
      { error: "در حال حاضر امکان ذخیره آیتم منو وجود ندارد." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();

  try {
    const body = await request.json();
    const parsed = updateMenuItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const input: UpdateMenuItemInput = { id: parsed.data.id };

    if (parsed.data.name) {
      input.name = parsed.data.name;
      input.slug = await ensureUniqueSlug(
        slugify(parsed.data.name),
        menuItemSlugExists,
      );
    }
    if (parsed.data.description !== undefined)
      input.description = parsed.data.description;
    if (parsed.data.categoryId !== undefined)
      input.categoryId = parsed.data.categoryId;
    if (parsed.data.priceToman !== undefined)
      input.price = tomanToRial(parsed.data.priceToman);
    if (parsed.data.preparationTime !== undefined)
      input.preparationTime = parsed.data.preparationTime;
    if (parsed.data.isFeatured !== undefined)
      input.isFeatured = parsed.data.isFeatured;
    if (parsed.data.isActive !== undefined) input.isActive = parsed.data.isActive;
    if (parsed.data.inStock !== undefined) input.inStock = parsed.data.inStock;
    if (parsed.data.tags !== undefined) input.tags = parsed.data.tags;
    if (parsed.data.imageUrl !== undefined)
      input.imageUrl = parsed.data.imageUrl;

    const item = await updateMenuItem(input);

    if (!item) {
      return NextResponse.json(
        { error: "آیتم منو یافت نشد." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: toAdminMenuItem(item) });
  } catch (error) {
    if (isCategoryNotFound(error)) {
      return NextResponse.json(
        { error: "دسته‌بندی انتخاب‌شده یافت نشد." },
        { status: 400 },
      );
    }
    console.error("[ADMIN MENU UPDATE ERROR]", error);
    return NextResponse.json(
      { error: "به‌روزرسانی آیتم منو با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();

  try {
    const body = await request.json();
    const parsed = deleteMenuItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "شناسه آیتم نامعتبر است." },
        { status: 400 },
      );
    }

    const result = await softDeleteMenuItem(parsed.data.id);

    if (!result) {
      return NextResponse.json(
        { error: "آیتم منو یافت نشد." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[ADMIN MENU DELETE ERROR]", error);
    return NextResponse.json(
      { error: "حذف آیتم منو با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
