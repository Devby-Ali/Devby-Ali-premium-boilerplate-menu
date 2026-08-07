// src/lib/menu-service.ts
// Data service layer for menu items with Prisma + in-memory fallback.
// This ensures the admin panel works even when MongoDB is unavailable.

import type { MenuItem as PrismaMenuItem, MenuCategory as PrismaMenuCategory } from "@prisma/client";
import type { MenuItem, MenuCategory } from "@/types";
import { getPrismaClient } from "@/server/prisma";

// ------------------------------------------------------------------
// In-memory store (fallback when Prisma/MongoDB is unavailable)
// ------------------------------------------------------------------
interface MemStore {
  categories: Map<string, PrismaMenuCategory>;
  items: Map<string, PrismaMenuItem>;
  nextId: number;
}

const mem: MemStore = {
  categories: new Map(),
  items: new Map(),
  nextId: 1,
};

function nextMemId(): string {
  return `mem_${mem.nextId++}`;
}

// Seed default categories into memory
const DEFAULT_CATEGORIES: { slug: string; name: string }[] = [
  { slug: "coffee", name: "کافی‌شاپ" },
  { slug: "dessert", name: "دسر" },
  { slug: "savory", name: "اشنایی" },
  { slug: "signature", name: "ویژه" },
];

DEFAULT_CATEGORIES.forEach((cat) => {
  if (![...mem.categories.values()].find((c) => c.slug === cat.slug)) {
    const id = nextMemId();
    mem.categories.set(id, {
      id,
      name: cat.name,
      slug: cat.slug,
      description: `${cat.name} از منوی دیجیتال`,
      parentId: null,
      isActive: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
});

// ------------------------------------------------------------------
// Prisma availability check
// ------------------------------------------------------------------
let prismaAvailable: boolean | null = null;

async function isPrismaAvailable(): Promise<boolean> {
  if (prismaAvailable !== null) return prismaAvailable;
  try {
    const prisma = getPrismaClient();
    await prisma.$connect();
    prismaAvailable = true;
  } catch {
    prismaAvailable = false;
  }
  return prismaAvailable;
}

// ------------------------------------------------------------------
// Type mappers
// ------------------------------------------------------------------
function mapPrismaMenuItem(item: PrismaMenuItem & { category?: PrismaMenuCategory | null }): MenuItem {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description ?? null,
    price: item.price,
    currency: item.currency ?? "IRR",
    imageUrl: null,
    categoryId: item.categoryId,
    category: item.category
      ? {
          id: item.category.id,
          name: item.category.name,
          slug: item.category.slug,
          description: item.category.description,
          isActive: item.category.isActive,
          sortOrder: item.category.sortOrder,
        }
      : undefined,
    isFeatured: item.isFeatured,
    isActive: item.isActive,
    preparationTime: item.preparationTime ?? null,
    tags: item.tags ?? [],
  };
}

function mapPrismaCategory(cat: PrismaMenuCategory): MenuCategory {
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    isActive: cat.isActive,
    sortOrder: cat.sortOrder,
  };
}

// ------------------------------------------------------------------
// Menu Items CRUD
// ------------------------------------------------------------------
export async function getMenuItems(): Promise<MenuItem[]> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const items = await prisma.menuItem.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    return items.map(mapPrismaMenuItem);
  }

  return [...mem.items.values()]
    .filter((i) => i.isActive)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((item) => {
      const cat = item.categoryId ? mem.categories.get(item.categoryId) : null;
      return mapPrismaMenuItem({ ...item, category: cat ?? null });
    });
}

export async function getAllMenuItems(): Promise<MenuItem[]> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const items = await prisma.menuItem.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    return items.map(mapPrismaMenuItem);
  }

  return [...mem.items.values()]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((item) => {
      const cat = item.categoryId ? mem.categories.get(item.categoryId) : null;
      return mapPrismaMenuItem({ ...item, category: cat ?? null });
    });
}

export async function getMenuItemBySlug(slug: string): Promise<MenuItem | null> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const item = await prisma.menuItem.findUnique({
      where: { slug },
      include: { category: true },
    });
    return item ? mapPrismaMenuItem(item) : null;
  }

  const found = [...mem.items.values()].find((i) => i.slug === slug && i.isActive);
  if (!found) return null;
  const cat = found.categoryId ? mem.categories.get(found.categoryId) : null;
  return mapPrismaMenuItem({ ...found, category: cat ?? null });
}

export async function getMenuItemById(id: string): Promise<MenuItem | null> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: { category: true },
    });
    return item ? mapPrismaMenuItem(item) : null;
  }

  const found = mem.items.get(id);
  if (!found) return null;
  const cat = found.categoryId ? mem.categories.get(found.categoryId) : null;
  return mapPrismaMenuItem({ ...found, category: cat ?? null });
}

export interface CreateMenuItemInput {
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  categorySlug: string;
  isFeatured?: boolean;
  preparationTime?: number | null;
  tags?: string[];
}

export async function createMenuItem(input: CreateMenuItemInput): Promise<MenuItem> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const category = await ensureCategory(prisma, input.categorySlug);
    const item = await prisma.menuItem.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        price: input.price,
        categoryId: category.id,
        isFeatured: input.isFeatured ?? false,
        isActive: true,
        preparationTime: input.preparationTime ?? null,
        tags: input.tags ?? [],
      },
      include: { category: true },
    });
    return mapPrismaMenuItem(item);
  }

  const catEntry = await ensureCategoryMem(input.categorySlug);
  const id = nextMemId();
  const now = new Date();
  const newItem: PrismaMenuItem = {
    id,
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    price: input.price,
    currency: "IRR",
    imageUrl: null,
    categoryId: catEntry.id,
    isFeatured: input.isFeatured ?? false,
    isActive: true,
    preparationTime: input.preparationTime ?? null,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
  mem.items.set(id, newItem);
  return mapPrismaMenuItem({ ...newItem, category: catEntry });
}

export interface UpdateMenuItemInput {
  id: string;
  name?: string;
  slug?: string;
  description?: string | null;
  price?: number;
  categorySlug?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  preparationTime?: number | null;
  tags?: string[];
}

export async function updateMenuItem(input: UpdateMenuItemInput): Promise<MenuItem | null> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.isFeatured !== undefined) updateData.isFeatured = input.isFeatured;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.preparationTime !== undefined) updateData.preparationTime = input.preparationTime;
    if (input.tags !== undefined) updateData.tags = input.tags;

    if (input.categorySlug) {
      const category = await ensureCategory(prisma, input.categorySlug);
      updateData.categoryId = category.id;
    }

    const item = await prisma.menuItem.update({
      where: { id: input.id },
      data: updateData,
      include: { category: true },
    });
    return mapPrismaMenuItem(item);
  }

  const existing = mem.items.get(input.id);
  if (!existing) return null;

  const updated: PrismaMenuItem = { ...existing };
  if (input.name !== undefined) updated.name = input.name;
  if (input.slug !== undefined) updated.slug = input.slug;
  if (input.description !== undefined) updated.description = input.description;
  if (input.price !== undefined) updated.price = input.price;
  if (input.isFeatured !== undefined) updated.isFeatured = input.isFeatured;
  if (input.isActive !== undefined) updated.isActive = input.isActive;
  if (input.preparationTime !== undefined) updated.preparationTime = input.preparationTime;
  if (input.tags !== undefined) updated.tags = input.tags;
  if (input.categorySlug) {
    const cat = await ensureCategoryMem(input.categorySlug);
    updated.categoryId = cat.id;
  }
  updated.updatedAt = new Date();
  mem.items.set(input.id, updated);

  const cat = updated.categoryId ? mem.categories.get(updated.categoryId) : null;
  return mapPrismaMenuItem({ ...updated, category: cat ?? null });
}

export async function softDeleteMenuItem(id: string): Promise<{ id: string } | null> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const item = await prisma.menuItem.update({
      where: { id },
      data: { isActive: false },
    });
    return { id: item.id };
  }

  const existing = mem.items.get(id);
  if (!existing) return null;
  existing.isActive = false;
  existing.updatedAt = new Date();
  mem.items.set(id, existing);
  return { id };
}

// ------------------------------------------------------------------
// Categories
// ------------------------------------------------------------------
async function ensureCategory(prisma: ReturnType<typeof getPrismaClient>, categorySlug: string) {
  const labelMap: Record<string, string> = {
    coffee: "کافی‌شاپ",
    dessert: "دسر",
    savory: "اشنایی",
    signature: "ویژه",
  };

  return prisma.menuCategory.upsert({
    where: { slug: categorySlug },
    update: {},
    create: {
      name: labelMap[categorySlug] ?? categorySlug,
      slug: categorySlug,
      description: `${labelMap[categorySlug] ?? categorySlug} از منوی دیجیتال`,
    },
  });
}

async function ensureCategoryMem(categorySlug: string): Promise<PrismaMenuCategory> {
  const existing = [...mem.categories.values()].find((c) => c.slug === categorySlug);
  if (existing) return existing;

  const labelMap: Record<string, string> = {
    coffee: "کافی‌شاپ",
    dessert: "دسر",
    savory: "اشنایی",
    signature: "ویژه",
  };

  const id = nextMemId();
  const now = new Date();
  const cat: PrismaMenuCategory = {
    id,
    name: labelMap[categorySlug] ?? categorySlug,
    slug: categorySlug,
    description: `${labelMap[categorySlug] ?? categorySlug} از منوی دیجیتال`,
    parentId: null,
    isActive: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };
  mem.categories.set(id, cat);
  return cat;
}

export async function getCategories(): Promise<MenuCategory[]> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const cats = await prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return cats.map(mapPrismaCategory);
  }

  return [...mem.categories.values()]
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(mapPrismaCategory);
}

export async function getCategoriesWithCount(): Promise<(MenuCategory & { count: number })[]> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const cats = await prisma.menuCategory.findMany({
      where: { isActive: true },
      include: { _count: { select: { items: { where: { isActive: true } } } } },
      orderBy: { sortOrder: "asc" },
    });
    return cats.map((c) => ({
      ...mapPrismaCategory(c),
      count: c._count?.items ?? 0,
    }));
  }

  return [...mem.categories.values()]
    .filter((c) => c.isActive)
    .map((c) => ({
      ...mapPrismaCategory(c),
      count: [...mem.items.values()].filter((i) => i.categoryId === c.id && i.isActive).length,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createCategory(input: {
  name: string;
  slug: string;
  description?: string | null;
}): Promise<MenuCategory> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const cat = await prisma.menuCategory.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
      },
    });
    return mapPrismaCategory(cat);
  }

  const id = nextMemId();
  const now = new Date();
  const cat: PrismaMenuCategory = {
    id,
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    parentId: null,
    isActive: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };
  mem.categories.set(id, cat);
  return mapPrismaCategory(cat);
}

export async function updateCategory(
  id: string,
  input: { name?: string; slug?: string; description?: string | null; sortOrder?: number },
): Promise<MenuCategory | null> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const cat = await prisma.menuCategory.update({
      where: { id },
      data: input,
    });
    return mapPrismaCategory(cat);
  }

  const existing = mem.categories.get(id);
  if (!existing) return null;
  if (input.name !== undefined) existing.name = input.name;
  if (input.slug !== undefined) existing.slug = input.slug;
  if (input.description !== undefined) existing.description = input.description;
  if (input.sortOrder !== undefined) existing.sortOrder = input.sortOrder;
  existing.updatedAt = new Date();
  mem.categories.set(id, existing);
  return mapPrismaCategory(existing);
}

export async function deleteCategory(id: string): Promise<{ id: string } | null> {
  if (await isPrismaAvailable()) {
    const prisma = getPrismaClient();
    const cat = await prisma.menuCategory.update({
      where: { id },
      data: { isActive: false },
    });
    return { id: cat.id };
  }

  const existing = mem.categories.get(id);
  if (!existing) return null;
  existing.isActive = false;
  existing.updatedAt = new Date();
  mem.categories.set(id, existing);
  return { id };
}
