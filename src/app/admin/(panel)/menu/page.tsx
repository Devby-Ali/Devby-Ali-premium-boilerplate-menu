// src/app/admin/(panel)/menu/page.tsx
// مدیریت منو: آیتم‌ها (موجودی/ویژه/تصویر/قیمت تومان) + دسته‌بندی‌ها (CRUD و زمان‌بندی نمایش)
"use client";

import * as React from "react";
import { ImagePlus, Layers3, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice, rialToToman } from "@/lib/price";
import { slugify } from "@/lib/slug";

// ─── قرارداد API (/api/admin/menu و /api/admin/categories) ───────────────────

interface AdminMenuItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** ریال */
  price: number;
  currency: string;
  categoryId: string;
  categorySlug: string | null;
  categoryName: string | null;
  inStock: boolean;
  isFeatured: boolean;
  isActive: boolean;
  preparationTime: number | null;
  tags: string[];
  imageUrl: string | null;
}

interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  scheduledFrom: string | null;
  scheduledTo: string | null;
  count: number;
}

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/avif,image/gif";
const MAX_UPLOAD_MB = 5;

// ─── کمک‌تابع‌ها ──────────────────────────────────────────────────────────────

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseTags(value: string): string[] {
  return value
    .split(/[،,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

// ─── فرم آیتم ────────────────────────────────────────────────────────────────

interface ItemDraft {
  name: string;
  description: string;
  categoryId: string;
  /** تومان — هنگام ارسال به API به ریال تبدیل می‌شود */
  priceToman: string;
  prepTime: string;
  tagsText: string;
  imageUrl: string | null;
  inStock: boolean;
  isFeatured: boolean;
}

const createItemDraft = (categoryId = ""): ItemDraft => ({
  name: "",
  description: "",
  categoryId,
  priceToman: "",
  prepTime: "",
  tagsText: "",
  imageUrl: null,
  inStock: true,
  isFeatured: false,
});

// ─── فرم دسته‌بندی ───────────────────────────────────────────────────────────

interface CategoryDraft {
  name: string;
  slug: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
  scheduledFrom: string;
  scheduledTo: string;
}

const createCategoryDraft = (): CategoryDraft => ({
  name: "",
  slug: "",
  description: "",
  sortOrder: "0",
  isActive: true,
  scheduledFrom: "",
  scheduledTo: "",
});

// ─── صفحه ────────────────────────────────────────────────────────────────────

export default function AdminMenuPage() {
  const [activeTab, setActiveTab] = React.useState<"items" | "categories">("items");
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<AdminMenuItem[]>([]);
  const [categories, setCategories] = React.useState<AdminCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [itemDraft, setItemDraft] = React.useState<ItemDraft>(createItemDraft);
  const [categoryDraft, setCategoryDraft] = React.useState<CategoryDraft>(createCategoryDraft);
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = React.useState<string | null>(null);
  const [showItemComposer, setShowItemComposer] = React.useState(false);
  const [showCategoryComposer, setShowCategoryComposer] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadItems = React.useCallback(async () => {
    try {
      const response = await fetch("/api/admin/menu");
      if (response.ok) {
        const payload = await response.json();
        if (payload?.data) setItems(payload.data as AdminMenuItem[]);
        if (payload?.categories) setCategories(payload.categories as AdminCategory[]);
      } else {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error ?? "خطا در دریافت داده‌ها");
      }
    } catch {
      setFeedback("در حال حاضر امکان بارگذاری داده‌های منو وجود ندارد.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      await loadItems();
    })();
  }, [loadItems]);

  const filteredItems = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      [item.name, item.description, item.categoryName ?? "", item.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [items, query]);

  // ─── آیتم‌ها ───────────────────────────────────────────────────────────────

  const resetItemComposer = () => {
    setItemDraft(createItemDraft(categories[0]?.id ?? ""));
    setEditingItemId(null);
    setShowItemComposer(false);
    setFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setFeedback(`حجم تصویر بیش از حد مجاز (${MAX_UPLOAD_MB} مگابایت) است.`);
      event.target.value = "";
      return;
    }

    setUploading(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ownerType", "menu_item");

      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok || !payload?.data?.url) {
        throw new Error(payload?.error ?? "آپلود تصویر با خطا مواجه شد.");
      }

      setItemDraft((current) => ({ ...current, imageUrl: payload.data.url as string }));
      setFeedback("تصویر آپلود شد. برای نهایی شدن، آیتم را ذخیره کنید.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "آپلود تصویر با خطا مواجه شد.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleItemSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const name = itemDraft.name.trim();
    const description = itemDraft.description.trim();
    const priceToman = Number(itemDraft.priceToman);
    const prepTime = itemDraft.prepTime.trim() ? Number(itemDraft.prepTime) : null;

    if (!name || !description || !itemDraft.categoryId) {
      setFeedback("عنوان، توضیحات و دسته‌بندی الزامی هستند.");
      return;
    }
    if (Number.isNaN(priceToman) || priceToman <= 0) {
      setFeedback("قیمت (تومان) باید عددی مثبت باشد.");
      return;
    }
    if (prepTime !== null && (Number.isNaN(prepTime) || prepTime <= 0)) {
      setFeedback("زمان آماده‌سازی باید عددی مثبت باشد.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/menu", {
        method: editingItemId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItemId ?? undefined,
          name,
          description,
          categoryId: itemDraft.categoryId,
          priceToman,
          preparationTime: prepTime,
          isFeatured: itemDraft.isFeatured,
          inStock: itemDraft.inStock,
          tags: parseTags(itemDraft.tagsText),
          imageUrl: itemDraft.imageUrl,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error ?? "درخواست با خطا مواجه شد.");
      }

      const item = payload.data as AdminMenuItem;

      if (editingItemId) {
        setItems((current) =>
          current.map((currentItem) => (currentItem.id === editingItemId ? item : currentItem)),
        );
        setFeedback("آیتم با موفقیت به‌روزرسانی شد.");
      } else {
        setItems((current) => [item, ...current]);
        resetItemComposer();
        setFeedback("آیتم با موفقیت اضافه شد.");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleItemDelete = async (id: string) => {
    if (!confirm("آیا از غیرفعال‌سازی این آیتم اطمینان دارید؟")) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/menu", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error ?? "درخواست با خطا مواجه شد.");
      }

      setItems((current) => current.filter((item) => item.id !== id));
      setFeedback("آیتم با موفقیت غیرفعال شد.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleItemEdit = (item: AdminMenuItem) => {
    setEditingItemId(item.id);
    setItemDraft({
      name: item.name,
      description: item.description,
      categoryId: item.categoryId,
      priceToman: String(rialToToman(item.price)),
      prepTime: item.preparationTime ? String(item.preparationTime) : "",
      tagsText: item.tags.join("، "),
      imageUrl: item.imageUrl,
      inStock: item.inStock,
      isFeatured: item.isFeatured,
    });
    setShowItemComposer(true);
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // تغییر سریع وضعیت موجودی بدون باز کردن فرم ویرایش
  const handleToggleStock = async (item: AdminMenuItem) => {
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, inStock: !item.inStock }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error ?? "درخواست با خطا مواجه شد.");
      }
      const updated = payload.data as AdminMenuItem;
      setItems((current) =>
        current.map((currentItem) => (currentItem.id === item.id ? updated : currentItem)),
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "خطایی رخ داد.");
    }
  };

  // ─── دسته‌بندی‌ها ───────────────────────────────────────────────────────────

  const resetCategoryComposer = () => {
    setCategoryDraft(createCategoryDraft());
    setEditingCategoryId(null);
    setShowCategoryComposer(false);
    setFeedback(null);
  };

  const handleCategoryEdit = (category: AdminCategory) => {
    setEditingCategoryId(category.id);
    setCategoryDraft({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      sortOrder: String(category.sortOrder),
      isActive: category.isActive,
      scheduledFrom: isoToLocalInput(category.scheduledFrom),
      scheduledTo: isoToLocalInput(category.scheduledTo),
    });
    setShowCategoryComposer(true);
    setFeedback(null);
  };

  const handleCategorySubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const name = categoryDraft.name.trim();
    const slug = slugify(categoryDraft.slug.trim() || name);
    const sortOrder = Number(categoryDraft.sortOrder);

    if (!name || !slug) {
      setFeedback("نام و اسلاگ دسته‌بندی الزامی است.");
      return;
    }
    if (Number.isNaN(sortOrder) || sortOrder < 0) {
      setFeedback("ترتیب نمایش باید عددی نامنفی باشد.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/categories", {
        method: editingCategoryId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCategoryId ?? undefined,
          name,
          slug,
          description: categoryDraft.description.trim() || null,
          sortOrder,
          isActive: categoryDraft.isActive,
          scheduledFrom: localInputToIso(categoryDraft.scheduledFrom),
          scheduledTo: localInputToIso(categoryDraft.scheduledTo),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error ?? "درخواست با خطا مواجه شد.");
      }

      // لیست دسته‌ها را تازه می‌کنیم تا count و وضعیت زمان‌بندی دقیق باشد
      await loadItems();
      resetCategoryComposer();
      setFeedback(editingCategoryId ? "دسته‌بندی به‌روزرسانی شد." : "دسته‌بندی ایجاد شد.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCategoryDelete = async (category: AdminCategory) => {
    if (!confirm(`دسته‌بندی «${category.name}» غیرفعال شود؟ آیتم‌های آن دیگر نمایش داده نمی‌شوند.`)) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: category.id }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error ?? "درخواست با خطا مواجه شد.");
      }
      await loadItems();
      setFeedback("دسته‌بندی غیرفعال شد.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── رندر ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
          Content Manager
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
          مدیریت منو
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-400">
          آیتم‌ها، وضعیت موجودی و دسته‌بندی‌ها (همراه با زمان‌بندی نمایش) را مدیریت
          کنید. قیمت‌ها به تومان وارد می‌شوند.
        </p>
      </section>

      {/* تب‌ها */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeTab === "items" ? "default" : "outline"}
          onClick={() => setActiveTab("items")}
        >
          آیتم‌های منو
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeTab === "categories" ? "default" : "outline"}
          onClick={() => setActiveTab("categories")}
        >
          دسته‌بندی‌ها
        </Button>
      </div>

      {feedback ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400" aria-live="polite">
          {feedback}
        </p>
      ) : null}

      {activeTab === "items" ? (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <Input
                  placeholder="جستجو در آیتم‌های منو..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pr-10"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    aria-label="پاک کردن جستجو"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                resetItemComposer();
                setItemDraft((current) => ({
                  ...current,
                  categoryId: current.categoryId || categories[0]?.id || "",
                }));
                setShowItemComposer(true);
              }}
              disabled={submitting || categories.length === 0}
            >
              <Plus className="ml-2 h-4 w-4" />
              افزودن آیتم
            </Button>
          </div>

          {categories.length === 0 && !loading ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              برای افزودن آیتم، ابتدا از تب «دسته‌بندی‌ها» یک دسته ایجاد کنید.
            </p>
          ) : null}

          {showItemComposer && (
            <Card>
              <CardHeader>
                <CardTitle>{editingItemId ? "ویرایش آیتم" : "افزودن آیتم جدید"}</CardTitle>
                <CardDescription>فیلدهای الزامی را پر کرده و ذخیره کنید.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleItemSubmit} className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="menu-name">عنوان</Label>
                      <Input
                        id="menu-name"
                        value={itemDraft.name}
                        onChange={(event) => setItemDraft((current) => ({ ...current, name: event.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="menu-category">دسته‌بندی</Label>
                      <select
                        id="menu-category"
                        value={itemDraft.categoryId}
                        onChange={(event) => setItemDraft((current) => ({ ...current, categoryId: event.target.value }))}
                        className="w-full rounded-2xl border border-stone-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-stone-700"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="menu-desc">توضیحات</Label>
                      <Input
                        id="menu-desc"
                        value={itemDraft.description}
                        onChange={(event) => setItemDraft((current) => ({ ...current, description: event.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="menu-price">قیمت (تومان)</Label>
                      <Input
                        id="menu-price"
                        type="number"
                        min={1}
                        value={itemDraft.priceToman}
                        onChange={(event) => setItemDraft((current) => ({ ...current, priceToman: event.target.value }))}
                        placeholder="مثال: ۱۸۵۰۰۰"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="menu-prep">زمان آماده‌سازی (دقیقه — اختیاری)</Label>
                      <Input
                        id="menu-prep"
                        type="number"
                        min={1}
                        value={itemDraft.prepTime}
                        onChange={(event) => setItemDraft((current) => ({ ...current, prepTime: event.target.value }))}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="menu-tags">برچسب‌ها (با ویرگول جدا کنید — اختیاری)</Label>
                      <Input
                        id="menu-tags"
                        value={itemDraft.tagsText}
                        onChange={(event) => setItemDraft((current) => ({ ...current, tagsText: event.target.value }))}
                        placeholder="مثال: داغ، گیاهی"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="menu-image">تصویر آیتم</Label>
                      <div className="flex flex-wrap items-center gap-4">
                        {itemDraft.imageUrl ? (
                          <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-700">
                            {/* eslint-disable-next-line @next/next/no-img-element -- پیش‌نمایش فایل تازه آپلودشده در پنل */}
                            <img
                              src={itemDraft.imageUrl}
                              alt="پیش‌نمایش تصویر آیتم"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-stone-300 text-stone-400 dark:border-stone-700">
                            <ImagePlus className="h-6 w-6" />
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <input
                            ref={fileInputRef}
                            id="menu-image"
                            type="file"
                            accept={ACCEPTED_IMAGE_TYPES}
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploading || submitting}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {uploading ? "در حال آپلود..." : itemDraft.imageUrl ? "تغییر تصویر" : "آپلود تصویر"}
                          </Button>
                          {itemDraft.imageUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={uploading || submitting}
                              onClick={() => setItemDraft((current) => ({ ...current, imageUrl: null }))}
                            >
                              <Trash2 className="ml-1 h-4 w-4" />
                              حذف تصویر
                            </Button>
                          )}
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            فرمت‌های مجاز: jpg، png، webp، avif، gif — حداکثر {MAX_UPLOAD_MB} مگابایت
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 md:col-span-2">
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={itemDraft.inStock}
                          onChange={(event) => setItemDraft((current) => ({ ...current, inStock: event.target.checked }))}
                          className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        موجود است
                      </label>
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={itemDraft.isFeatured}
                          onChange={(event) => setItemDraft((current) => ({ ...current, isFeatured: event.target.checked }))}
                          className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        آیتم ویژه
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-3 md:col-span-2">
                      <Button type="submit" disabled={submitting || uploading}>
                        {submitting ? "در حال ذخیره..." : editingItemId ? "ذخیره تغییرات" : "افزودن آیتم"}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetItemComposer} disabled={submitting}>
                        انصراف
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <p className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
              در حال بارگذاری آیتم‌های منو…
            </p>
          ) : null}

          <section className="grid gap-6">
            {filteredItems.map((item) => (
              <Card key={item.id} className={!item.isActive ? "opacity-60" : undefined}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {item.imageUrl ? (
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-stone-200 dark:border-stone-700">
                          {/* eslint-disable-next-line @next/next/no-img-element -- تصویر بندانگشتی پنل */}
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-stone-300 text-stone-400 dark:border-stone-700">
                          <ImagePlus className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-xl">{item.name}</CardTitle>
                        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{item.slug}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.isFeatured && (
                            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                              ویژه
                            </span>
                          )}
                          {!item.isActive && (
                            <span className="inline-flex rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                              غیرفعال
                            </span>
                          )}
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              item.inStock
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                            }`}
                          >
                            {item.inStock ? "موجود" : "ناموجود"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleToggleStock(item)}
                        disabled={submitting}
                      >
                        {item.inStock ? "اعلام ناموجودی" : "اعلام موجودی"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleItemEdit(item)} disabled={submitting}>
                        ویرایش
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void handleItemDelete(item.id)} disabled={submitting}>
                        حذف
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
                  <p>{item.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                      دسته: {item.categoryName ?? "—"}
                    </span>
                    <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                      قیمت: {formatPrice(item.price)}
                    </span>
                    {item.preparationTime ? (
                      <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                        زمان آماده‌سازی: {item.preparationTime.toLocaleString("fa-IR")} دقیقه
                      </span>
                    ) : null}
                    {item.tags.length > 0 && (
                      <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                        برچسب‌ها: {item.tags.join("، ")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {!loading && filteredItems.length === 0 && (
              <Card className="p-8 text-center text-sm text-stone-600 dark:text-stone-400">
                {query.trim() ? "هیچ آیتمی با این جستجو یافت نشد." : "هنوز آیتمی اضافه نشده است. از دکمه «افزودن آیتم» استفاده کنید."}
              </Card>
            )}
          </section>
        </>
      ) : (
        <>
          {/* ─── تب دسته‌بندی‌ها ─── */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {categories.length.toLocaleString("fa-IR")} دسته‌بندی ثبت شده
            </p>
            <Button
              type="button"
              onClick={() => {
                resetCategoryComposer();
                setShowCategoryComposer(true);
              }}
              disabled={submitting}
            >
              <Plus className="ml-2 h-4 w-4" />
              افزودن دسته‌بندی
            </Button>
          </div>

          {showCategoryComposer && (
            <Card>
              <CardHeader>
                <CardTitle>{editingCategoryId ? "ویرایش دسته‌بندی" : "افزودن دسته‌بندی جدید"}</CardTitle>
                <CardDescription>
                  با تعیین بازه‌ی زمان‌بندی، دسته فقط در همان بازه در منوی عمومی نمایش داده می‌شود (مناسب آیتم‌های فصلی/مناسبتی).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCategorySubmit} className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cat-name">نام دسته</Label>
                      <Input
                        id="cat-name"
                        value={categoryDraft.name}
                        onChange={(event) =>
                          setCategoryDraft((current) => ({
                            ...current,
                            name: event.target.value,
                            // اسلاگ فقط تا وقتی خودکار پر می‌شود که کاربر دستی تغییرش نداده باشد
                            slug: editingCategoryId ? current.slug : slugify(event.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-slug">اسلاگ (URL)</Label>
                      <Input
                        id="cat-slug"
                        dir="ltr"
                        value={categoryDraft.slug}
                        onChange={(event) => setCategoryDraft((current) => ({ ...current, slug: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="cat-desc">توضیحات (اختیاری)</Label>
                      <Input
                        id="cat-desc"
                        value={categoryDraft.description}
                        onChange={(event) => setCategoryDraft((current) => ({ ...current, description: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-sort">ترتیب نمایش</Label>
                      <Input
                        id="cat-sort"
                        type="number"
                        min={0}
                        value={categoryDraft.sortOrder}
                        onChange={(event) => setCategoryDraft((current) => ({ ...current, sortOrder: event.target.value }))}
                      />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={categoryDraft.isActive}
                          onChange={(event) => setCategoryDraft((current) => ({ ...current, isActive: event.target.checked }))}
                          className="h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        دسته فعال است
                      </label>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-from">زمان‌بندی — شروع نمایش (اختیاری)</Label>
                      <Input
                        id="cat-from"
                        type="datetime-local"
                        value={categoryDraft.scheduledFrom}
                        onChange={(event) => setCategoryDraft((current) => ({ ...current, scheduledFrom: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-to">زمان‌بندی — پایان نمایش (اختیاری)</Label>
                      <Input
                        id="cat-to"
                        type="datetime-local"
                        value={categoryDraft.scheduledTo}
                        onChange={(event) => setCategoryDraft((current) => ({ ...current, scheduledTo: event.target.value }))}
                      />
                    </div>
                    <div className="flex flex-wrap gap-3 md:col-span-2">
                      <Button type="submit" disabled={submitting}>
                        {submitting ? "در حال ذخیره..." : editingCategoryId ? "ذخیره تغییرات" : "افزودن دسته‌بندی"}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetCategoryComposer} disabled={submitting}>
                        انصراف
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Card key={category.id} className={!category.isActive ? "opacity-60" : undefined}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <Layers3 className="h-4 w-4 text-stone-400" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    {category.count.toLocaleString("fa-IR")} آیتم · اسلاگ: <span dir="ltr">{category.slug}</span>
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-full px-3 py-1 font-semibold ${
                        category.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                          : "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                      }`}
                    >
                      {category.isActive ? "فعال" : "غیرفعال"}
                    </span>
                    {category.scheduledFrom || category.scheduledTo ? (
                      <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        زمان‌بندی‌شده
                      </span>
                    ) : null}
                  </div>
                  {category.scheduledFrom || category.scheduledTo ? (
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {category.scheduledFrom
                        ? `از ${new Date(category.scheduledFrom).toLocaleString("fa-IR")}`
                        : "بدون شروع"}{" "}
                      —{" "}
                      {category.scheduledTo
                        ? `تا ${new Date(category.scheduledTo).toLocaleString("fa-IR")}`
                        : "بدون پایان"}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCategoryEdit(category)} disabled={submitting}>
                      ویرایش
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCategoryDelete(category)}
                      disabled={submitting || !category.isActive}
                    >
                      غیرفعال‌سازی
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!loading && categories.length === 0 && (
              <Card className="col-span-full p-8 text-center text-sm text-stone-600 dark:text-stone-400">
                هنوز دسته‌بندی‌ای ثبت نشده است.
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
