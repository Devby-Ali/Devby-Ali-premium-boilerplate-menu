import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";

import { menuItems as fallbackMenuItems, type MenuItemData } from "@/data/menu";
import { getPrismaClient } from "@/server/prisma";

const menuItemSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  category: z.enum(["coffee", "dessert", "savory", "signature"]),
  price: z.number().positive(),
  prepTime: z.number().positive(),
  featured: z.boolean().optional(),
  ingredients: z.array(z.string()).optional(),
});

const updateMenuItemSchema = menuItemSchema
  .partial()
  .extend({ id: z.string().trim().min(1) });

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function toAdminMenuItem(item: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  isFeatured: boolean;
  isActive: boolean;
  preparationTime: number | null;
  tags: string[];
  category?: { slug: string | null; name: string | null } | null;
}): MenuItemData {
  return {
    id: item.id,
    title: item.name,
    slug: item.slug,
    description: item.description ?? "",
    price: item.price,
    category: (item.category?.slug as MenuItemData["category"]) ?? "coffee",
    badge: item.isFeatured ? "ویژه" : undefined,
    featured: item.isFeatured,
    prepTime: item.preparationTime ?? 0,
    ingredients: item.tags ?? [],
    story: item.description ?? "",
  };
}

async function ensureCategory(
  prisma: ReturnType<typeof getPrismaClient>,
  category: MenuItemData["category"],
) {
  const slug = category;
  const labelMap: Record<MenuItemData["category"], string> = {
    coffee: "کافی‌شاپ",
    dessert: "دسر",
    savory: "اشنایی",
    signature: "ویژه",
  };

  return prisma.menuCategory.upsert({
    where: { slug },
    update: {},
    create: {
      name: labelMap[category],
      slug,
      description: `${labelMap[category]} از منوی دیجیتال`,
    },
  });
}

async function writeAuditLog(action: string, details: Record<string, unknown>) {
  try {
    const prisma = getPrismaClient();
    await prisma.auditLog.create({
      data: {
        action,
        details: details as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Ignore audit log failures to avoid breaking the main flow.
  }
}

export async function GET() {
  try {
    const prisma = getPrismaClient();
    const items = await prisma.menuItem.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: [{ createdAt: "desc" }],
    });

    return Response.json({ data: items.map(toAdminMenuItem) });
  } catch {
    return Response.json({ data: fallbackMenuItems });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = menuItemSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const category = await ensureCategory(prisma, parsed.data.category);
    const slug = slugify(parsed.data.title);

    const item = await prisma.menuItem.create({
      data: {
        name: parsed.data.title,
        slug,
        description: parsed.data.description,
        price: parsed.data.price,
        categoryId: category.id,
        isFeatured: parsed.data.featured ?? false,
        isActive: true,
        preparationTime: parsed.data.prepTime,
        tags: parsed.data.ingredients ?? [],
      },
      include: { category: true },
    });

    await writeAuditLog("menu.created", {
      title: parsed.data.title,
      category: parsed.data.category,
    });

    return Response.json({ data: toAdminMenuItem(item) });
  } catch (error) {
    console.error("[ADMIN MENU CREATE ERROR]", error);
    return Response.json(
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
      return Response.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const updateData: Record<string, unknown> = {};

    if (parsed.data.title) updateData.name = parsed.data.title;
    if (parsed.data.description)
      updateData.description = parsed.data.description;
    if (parsed.data.category) {
      const category = await ensureCategory(prisma, parsed.data.category);
      updateData.categoryId = category.id;
    }
    if (parsed.data.price) updateData.price = parsed.data.price;
    if (parsed.data.prepTime) updateData.preparationTime = parsed.data.prepTime;
    if (parsed.data.featured !== undefined)
      updateData.isFeatured = parsed.data.featured;
    if (parsed.data.ingredients) updateData.tags = parsed.data.ingredients;

    if (parsed.data.title) {
      updateData.slug = slugify(parsed.data.title);
    }

    const item = await prisma.menuItem.update({
      where: { id: parsed.data.id },
      data: updateData,
      include: { category: true },
    });

    await writeAuditLog("menu.updated", {
      id: parsed.data.id,
      title: item.name,
    });

    return Response.json({ data: toAdminMenuItem(item) });
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
    const parsed = z.object({ id: z.string().trim().min(1) }).safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "شناسه آیتم نامعتبر است." },
        { status: 400 },
      );
    }

    const prisma = getPrismaClient();
    const item = await prisma.menuItem.update({
      where: { id: parsed.data.id },
      data: { isActive: false },
      include: { category: true },
    });

    await writeAuditLog("menu.deleted", {
      id: parsed.data.id,
      title: item.name,
    });

    return Response.json({ data: { id: item.id } });
  } catch (error) {
    console.error("[ADMIN MENU DELETE ERROR]", error);
    return Response.json(
      { error: "حذف آیتم منو با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
