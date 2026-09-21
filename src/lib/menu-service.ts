// src/lib/menu-service.ts
import { ObjectId } from "mongodb";
import type { MenuItem, MenuCategory } from "@/types";
import {
  menuCategoriesCol,
  menuItemsCol,
  toObjectId,
  type MenuCategoryDoc,
  type MenuItemDoc,
} from "@/server/db";

type MenuItemDocWithCategory = MenuItemDoc & { category?: MenuCategoryDoc | null };

function mapMenuItem(item: MenuItemDocWithCategory): MenuItem {
  return {
    id: item._id.toHexString(),
    name: item.name,
    slug: item.slug,
    description: item.description ?? null,
    price: item.price,
    currency: item.currency ?? "IRR",
    imageUrl: item.imageUrl ?? null,
    categoryId: item.categoryId.toHexString(),
    category: item.category ? mapCategory(item.category) : undefined,
    inStock: item.inStock ?? true,
    isFeatured: item.isFeatured,
    isActive: item.isActive,
    preparationTime: item.preparationTime ?? null,
    tags: item.tags ?? [],
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function mapCategory(cat: MenuCategoryDoc): MenuCategory {
  return {
    id: cat._id.toHexString(),
    name: cat.name,
    slug: cat.slug,
    description: cat.description ?? null,
    parentId: cat.parentId?.toHexString() ?? null,
    isActive: cat.isActive,
    sortOrder: cat.sortOrder,
    scheduledFrom: cat.scheduledFrom?.toISOString() ?? null,
    scheduledTo: cat.scheduledTo?.toISOString() ?? null,
    scheduleDays: cat.scheduleDays ?? [],
    createdAt: cat.createdAt.toISOString(),
    updatedAt: cat.updatedAt.toISOString(),
  };
}

async function withCategories(items: MenuItemDoc[]): Promise<MenuItemDocWithCategory[]> {
  if (items.length === 0) return [];
  const categoryIds = [...new Set(items.map((i) => i.categoryId.toHexString()))].map(
    (id) => new ObjectId(id),
  );
  const cats = await (await menuCategoriesCol()).find({ _id: { $in: categoryIds } }).toArray();
  const byId = new Map(cats.map((c) => [c._id.toHexString(), c]));
  return items.map((item) => ({
    ...item,
    category: byId.get(item.categoryId.toHexString()) ?? null,
  }));
}

/** فیلتر نمایش دسته‌بندی بر اساس بازه‌ی زمان‌بندی */
export function isCategoryVisibleNow(
  category: Pick<MenuCategory, "isActive" | "scheduledFrom" | "scheduledTo">,
  now = new Date(),
): boolean {
  if (!category.isActive) return false;
  if (category.scheduledFrom && new Date(category.scheduledFrom) > now) return false;
  if (category.scheduledTo && new Date(category.scheduledTo) < now) return false;
  return true;
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const col = await menuItemsCol();
  const items = await col.find({ isActive: true }).sort({ createdAt: -1 }).toArray();
  const mapped = (await withCategories(items)).map(mapMenuItem);
  return mapped.filter((item) => {
    if (!item.category) return true;
    return isCategoryVisibleNow(item.category);
  });
}

export async function getAllMenuItems(): Promise<MenuItem[]> {
  const col = await menuItemsCol();
  const items = await col.find({}).sort({ createdAt: -1 }).toArray();
  return (await withCategories(items)).map(mapMenuItem);
}

export async function getMenuItemBySlug(slug: string): Promise<MenuItem | null> {
  const col = await menuItemsCol();
  const item = await col.findOne({ slug, isActive: true });
  if (!item) return null;
  const [withCat] = await withCategories([item]);
  const mapped = mapMenuItem(withCat!);
  if (mapped.category && !isCategoryVisibleNow(mapped.category)) return null;
  return mapped;
}

export async function getMenuItemById(id: string): Promise<MenuItem | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;
  const col = await menuItemsCol();
  const item = await col.findOne({ _id: objectId });
  if (!item) return null;
  const [withCat] = await withCategories([item]);
  return mapMenuItem(withCat!);
}

export async function menuItemSlugExists(slug: string): Promise<boolean> {
  const col = await menuItemsCol();
  return (await col.findOne({ slug }, { projection: { _id: 1 } })) !== null;
}

export interface CreateMenuItemInput {
  name: string;
  slug: string;
  description?: string | null;
  /** ریال */
  price: number;
  categoryId: string;
  imageUrl?: string | null;
  isFeatured?: boolean;
  inStock?: boolean;
  preparationTime?: number | null;
  tags?: string[];
}

async function getCategoryDocById(categoryId: string): Promise<MenuCategoryDoc> {
  const objectId = toObjectId(categoryId);
  if (!objectId) throw new Error("CATEGORY_NOT_FOUND");
  const category = await (
    await menuCategoriesCol()
  ).findOne({ _id: objectId });
  if (!category) throw new Error("CATEGORY_NOT_FOUND");
  return category;
}

export async function createMenuItem(input: CreateMenuItemInput): Promise<MenuItem> {
  const category = await getCategoryDocById(input.categoryId);
  const col = await menuItemsCol();
  const now = new Date();
  const doc: MenuItemDoc = {
    _id: new ObjectId(),
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    price: input.price,
    currency: "IRR",
    imageUrl: input.imageUrl ?? null,
    categoryId: category._id,
    inStock: input.inStock ?? true,
    isFeatured: input.isFeatured ?? false,
    isActive: true,
    preparationTime: input.preparationTime ?? null,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return mapMenuItem({ ...doc, category });
}

export interface UpdateMenuItemInput {
  id: string;
  name?: string;
  slug?: string;
  description?: string | null;
  price?: number;
  categoryId?: string;
  imageUrl?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  inStock?: boolean;
  preparationTime?: number | null;
  tags?: string[];
}

export async function updateMenuItem(input: UpdateMenuItemInput): Promise<MenuItem | null> {
  const objectId = toObjectId(input.id);
  if (!objectId) return null;

  const $set: Partial<MenuItemDoc> = { updatedAt: new Date() };
  if (input.name !== undefined) $set.name = input.name;
  if (input.slug !== undefined) $set.slug = input.slug;
  if (input.description !== undefined) $set.description = input.description;
  if (input.price !== undefined) $set.price = input.price;
  if (input.imageUrl !== undefined) $set.imageUrl = input.imageUrl;
  if (input.isFeatured !== undefined) $set.isFeatured = input.isFeatured;
  if (input.isActive !== undefined) $set.isActive = input.isActive;
  if (input.inStock !== undefined) $set.inStock = input.inStock;
  if (input.preparationTime !== undefined) $set.preparationTime = input.preparationTime;
  if (input.tags !== undefined) $set.tags = input.tags;

  if (input.categoryId) {
    const category = await getCategoryDocById(input.categoryId);
    $set.categoryId = category._id;
  }

  const col = await menuItemsCol();
  const updated = await col.findOneAndUpdate(
    { _id: objectId },
    { $set, $unset: { stockCount: "", isUnlimited: "" } },
    { returnDocument: "after" },
  );
  if (!updated) return null;
  const [withCat] = await withCategories([updated]);
  return mapMenuItem(withCat!);
}

export async function softDeleteMenuItem(id: string): Promise<{ id: string } | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;
  const col = await menuItemsCol();
  const result = await col.updateOne(
    { _id: objectId },
    { $set: { isActive: false, updatedAt: new Date() } },
  );
  return result.matchedCount > 0 ? { id } : null;
}

export async function getCategories(): Promise<MenuCategory[]> {
  const col = await menuCategoriesCol();
  const cats = await col.find({ isActive: true }).sort({ sortOrder: 1 }).toArray();
  return cats.map(mapCategory).filter((cat) => isCategoryVisibleNow(cat));
}

/**
 * فهرست کامل دسته‌ها برای پنل ادمین — بدون فیلتر isActive/زمان‌بندی.
 * (نسخه‌ی عمومی و قابل‌نمایش: getCategories / getMenuItems)
 */
export async function getAllCategoriesWithCount(): Promise<(MenuCategory & { count: number })[]> {
  const catsCol = await menuCategoriesCol();
  const itemsCol = await menuItemsCol();
  const cats = await catsCol.find({}).sort({ sortOrder: 1, createdAt: 1 }).toArray();
  const counts = await itemsCol
    .aggregate<{ _id: ObjectId; count: number }>([
      { $match: { isActive: true } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ])
    .toArray();
  const countById = new Map(counts.map((c) => [c._id.toHexString(), c.count]));
  return cats.map((c) => ({
    ...mapCategory(c),
    count: countById.get(c._id.toHexString()) ?? 0,
  }));
}

export async function createCategory(input: {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  scheduledFrom?: string | null;
  scheduledTo?: string | null;
  scheduleDays?: number[];
}): Promise<MenuCategory> {
  const col = await menuCategoriesCol();
  const now = new Date();
  const doc: MenuCategoryDoc = {
    _id: new ObjectId(),
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    parentId: input.parentId ? toObjectId(input.parentId) : null,
    isActive: true,
    sortOrder: input.sortOrder ?? 0,
    scheduledFrom: input.scheduledFrom ? new Date(input.scheduledFrom) : null,
    scheduledTo: input.scheduledTo ? new Date(input.scheduledTo) : null,
    scheduleDays: input.scheduleDays ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return mapCategory(doc);
}

export async function updateCategory(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    parentId?: string | null;
    scheduledFrom?: string | null;
    scheduledTo?: string | null;
    scheduleDays?: number[];
  },
): Promise<MenuCategory | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;

  const $set: Partial<MenuCategoryDoc> = { updatedAt: new Date() };
  if (input.name !== undefined) $set.name = input.name;
  if (input.slug !== undefined) $set.slug = input.slug;
  if (input.description !== undefined) $set.description = input.description;
  if (input.sortOrder !== undefined) $set.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) $set.isActive = input.isActive;
  if (input.parentId !== undefined) {
    $set.parentId = input.parentId ? toObjectId(input.parentId) : null;
  }
  if (input.scheduledFrom !== undefined) {
    $set.scheduledFrom = input.scheduledFrom ? new Date(input.scheduledFrom) : null;
  }
  if (input.scheduledTo !== undefined) {
    $set.scheduledTo = input.scheduledTo ? new Date(input.scheduledTo) : null;
  }
  if (input.scheduleDays !== undefined) $set.scheduleDays = input.scheduleDays;

  const col = await menuCategoriesCol();
  const updated = await col.findOneAndUpdate(
    { _id: objectId },
    { $set, $unset: { scheduleStart: "", scheduleEnd: "" } },
    { returnDocument: "after" },
  );
  return updated ? mapCategory(updated) : null;
}

export async function deleteCategory(id: string): Promise<{ id: string } | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;
  const col = await menuCategoriesCol();
  const result = await col.updateOne(
    { _id: objectId },
    { $set: { isActive: false, updatedAt: new Date() } },
  );
  return result.matchedCount > 0 ? { id } : null;
}
