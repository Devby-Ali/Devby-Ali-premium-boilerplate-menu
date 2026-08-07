import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  softDeleteMenuItem,
  getCategoriesWithCount,
  type CreateMenuItemInput,
  type UpdateMenuItemInput,
} from "@/lib/menu-service";
import type { MenuItem } from "@/types";

const CATEGORY_SLUGS = ["coffee", "dessert", "savory", "signature"] as const;

const createMenuItemSchema = z.object({
  title: z.string().trim().min(1, "عنوان الزامی است"),
  description: z.string().trim().min(1, "توضیحات الزامی است"),
  category: z.enum(CATEGORY_SLUGS, { message: "دسته‌بندی نامعتبر است" }),
  price: z.number().positive("قیمت باید مثبت باشد"),
  prepTime: z.number().positive("زمان آماده‌سازی باید مثبت باشد"),
  featured: z.boolean().optional().default(false),
  ingredients: z.array(z.string()).optional().default([]),
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
});

const deleteMenuItemSchema = z.object({
  id: z.string().trim().min(1, "شناسه الزامی است"),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
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
  };
}

export async function GET() {
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

    const slug = slugify(parsed.data.title);

    const input: CreateMenuItemInput = {
      name: parsed.data.title,
      slug,
      description: parsed.data.description,
      price: parsed.data.price,
      categorySlug: parsed.data.category,
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
      input.slug = slugify(parsed.data.title);
    }
    if (parsed.data.description !== undefined) input.description = parsed.data.description;
    if (parsed.data.category !== undefined) input.categorySlug = parsed.data.category;
    if (parsed.data.price !== undefined) input.price = parsed.data.price;
    if (parsed.data.prepTime !== undefined) input.preparationTime = parsed.data.prepTime;
    if (parsed.data.featured !== undefined) input.isFeatured = parsed.data.featured;
    if (parsed.data.ingredients !== undefined) input.tags = parsed.data.ingredients;

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
    return Response.json(
      { error: "به‌روزرسانی آیتم منو با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    return Response.json(
      { error: "حذف آیتم منو با خطا مواجه شد." },
      { status: 500 },
    );
  }
}