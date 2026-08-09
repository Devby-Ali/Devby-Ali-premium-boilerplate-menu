import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth";
import { slugify, ensureUniqueSlug } from "@/lib/slug";
import {
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  softDeleteMenuItem,
  getCategoriesWithCount,
  menuItemSlugExists,
  type CreateMenuItemInput,
  type UpdateMenuItemInput,
} from "@/lib/menu-service";
import type { MenuItem } from "@/types";

const CATEGORY_SLUGS = ["coffee", "dessert", "savory", "signature"] as const;

const imageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .nullable()
  .optional();

const createMenuItemSchema = z.object({
  title: z.string().trim().min(1, "عنوان الزامی است"),
  description: z.string().trim().min(1, "توضیحات الزامی است"),
  category: z.enum(CATEGORY_SLUGS, { message: "دسته‌بندی نامعتبر است" }),
  price: z.number().positive("قیمت باید مثبت باشد"),
  prepTime: z.number().positive("زمان آماده‌سازی باید مثبت باشد"),
  featured: z.boolean().optional().default(false),
  ingredients: z.array(z.string()).optional().default([]),
  imageUrl: imageUrlSchema,
});

const updateMenuItemSchema = z.object({
  id: z.string().trim().min(1, "شناسه الزامی است"),
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  category: z.enum(CATEGORY_SLUGS).optional(),
  price: z.number().positive().optional(),
  prepTime: z.number().positive().optional(),
  featured: z.boolean().optional(),
  ingredients: z.array(z.string()).optional(),
  imageUrl: imageUrlSchema,
});

const deleteMenuItemSchema = z.object({
  id: z.string().trim().min(1, "شناسه الزامی است"),
});

function unauthorized() {
  return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
}

function toAdminMenuItem(item: MenuItem) {
  return {
    id: item.id,
    title: item.name,
    slug: item.slug,
    description: item.description ?? "",
    price: item.price,
    category: (item.category?.slug ?? "coffee") as string,
    badge: item.isFeatured ? "ویژه" : undefined,
    featured: item.isFeatured,
    prepTime: item.preparationTime ?? 0,
    ingredients: item.tags ?? [],
    story: item.description ?? "",
    imageUrl: item.imageUrl ?? null,
  };
}

export async function GET() {
  if (!(await requireAdminSession())) return unauthorized();

  try {
    const [items, categories] = await Promise.all([
      getAllMenuItems(),
      getCategoriesWithCount(),
    ]);

    return NextResponse.json({
      data: items.map(toAdminMenuItem),
      categories: categories.map((c) => ({ slug: c.slug, name: c.name, count: c.count })),
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
  if (!(await requireAdminSession())) return unauthorized();

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

    // Unicode-aware slug (Persian-safe), guaranteed unique (PRD FR-A05).
    const slug = await ensureUniqueSlug(slugify(parsed.data.title), menuItemSlugExists);

    const input: CreateMenuItemInput = {
      name: parsed.data.title,
      slug,
      description: parsed.data.description,
      price: parsed.data.price,
      categorySlug: parsed.data.category,
      imageUrl: parsed.data.imageUrl ?? null,
      isFeatured: parsed.data.featured,
      preparationTime: parsed.data.prepTime,
      tags: parsed.data.ingredients,
    };

    const item = await createMenuItem(input);

    return NextResponse.json({
      data: toAdminMenuItem(item),
    });
  } catch (error) {
    console.error("[ADMIN MENU CREATE ERROR]", error);
    return NextResponse.json(
      { error: "در حال حاضر امکان ذخیره آیتم منو وجود ندارد." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();

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

    if (parsed.data.title) {
      input.name = parsed.data.title;
      input.slug = await ensureUniqueSlug(slugify(parsed.data.title), menuItemSlugExists);
    }
    if (parsed.data.description !== undefined) input.description = parsed.data.description;
    if (parsed.data.category !== undefined) input.categorySlug = parsed.data.category;
    if (parsed.data.price !== undefined) input.price = parsed.data.price;
    if (parsed.data.prepTime !== undefined) input.preparationTime = parsed.data.prepTime;
    if (parsed.data.featured !== undefined) input.isFeatured = parsed.data.featured;
    if (parsed.data.ingredients !== undefined) input.tags = parsed.data.ingredients;
    if (parsed.data.imageUrl !== undefined) input.imageUrl = parsed.data.imageUrl;

    const item = await updateMenuItem(input);

    if (!item) {
      return NextResponse.json(
        { error: "آیتم منو یافت نشد." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: toAdminMenuItem(item),
    });
  } catch (error) {
    console.error("[ADMIN MENU UPDATE ERROR]", error);
    return NextResponse.json(
      { error: "به‌روزرسانی آیتم منو با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();

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
