"use client";

import * as React from "react";
import { Layers3, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MenuItemData {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  badge?: string;
  featured?: boolean;
  prepTime: number;
  ingredients: string[];
  story: string;
}

interface CategorySummary {
  slug: string;
  name: string;
  count: number;
}

const CATEGORY_SLUGS = ["coffee", "dessert", "savory", "signature"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  coffee: "کافی‌شاپ",
  dessert: "دسر",
  savory: "اشنایی",
  signature: "ویژه",
};

function formatPrice(value: number) {
  return `${value.toLocaleString("fa-IR")} تومان`;
}

interface MenuDraftState {
  title: string;
  description: string;
  category: string;
  price: string;
  prepTime: string;
}

const createDraft = (): MenuDraftState => ({
  title: "",
  description: "",
  category: "coffee",
  price: "",
  prepTime: "",
});

export default function AdminMenuPage() {
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<MenuItemData[]>([]);
  const [categories, setCategories] = React.useState<CategorySummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [draft, setDraft] = React.useState<MenuDraftState>(createDraft);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showComposer, setShowComposer] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/menu");
      if (response.ok) {
        const payload = await response.json();
        if (payload?.data) {
          setItems(payload.data as MenuItemData[]);
        }
        if (payload?.categories) {
          setCategories(payload.categories as CategorySummary[]);
        }
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
    void loadItems();
  }, [loadItems]);

  const filteredItems = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;

    return items.filter((item) => {
      return [
        item.title,
        item.description,
        item.category,
        CATEGORY_LABELS[item.category] ?? item.category,
        item.ingredients.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [items, query]);

  const resetComposer = () => {
    setDraft(createDraft());
    setEditingId(null);
    setShowComposer(false);
    setFeedback(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const title = draft.title.trim();
    const description = draft.description.trim();
    const price = Number(draft.price);
    const prepTime = Number(draft.prepTime);

    if (!title || !description || Number.isNaN(price) || price <= 0 || Number.isNaN(prepTime) || prepTime <= 0) {
      setFeedback("لطفاً همهٔ فیلدهای ضروری را با مقدار معتبر وارد کنید.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/menu", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          title,
          description,
          category: draft.category,
          price,
          prepTime,
          featured: false,
          ingredients: ["ترکیب سفارشی"],
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error ?? "درخواست با خطا مواجه شد.");
      }

      const item = payload.data as MenuItemData;

      if (editingId) {
        setItems((current) =>
          current.map((currentItem) => (currentItem.id === editingId ? item : currentItem)),
        );
        setFeedback("آیتم با موفقیت به‌روزرسانی شد.");
      } else {
        setItems((current) => [item, ...current]);
        resetComposer();
        setFeedback("آیتم با موفقیت اضافه شد.");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "خطایی رخ داد.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
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

  const handleEdit = (item: MenuItemData) => {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      description: item.description,
      category: item.category,
      price: String(item.price),
      prepTime: String(item.prepTime),
    });
    setShowComposer(true);
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
          آیتم‌ها و دسته‌بندی‌های منو را مدیریت کنید.
        </p>
      </section>

      {categories.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Card key={category.slug}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{CATEGORY_LABELS[category.slug] ?? category.name}</CardTitle>
                  <Layers3 className="h-4 w-4 text-stone-400" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-stone-500 dark:text-stone-400">{category.count} آیتم</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

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
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <Button type="button" onClick={() => { resetComposer(); setShowComposer(true); }} disabled={submitting}>
          <Plus className="ml-2 h-4 w-4" />
          افزودن آیتم
        </Button>
      </div>

      {showComposer && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "ویرایش آیتم" : "افزودن آیتم جدید"}</CardTitle>
            <CardDescription>فیلدهای الزامی را پر کرده و ذخیره کنید.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="menu-title">عنوان</Label>
                  <Input
                    id="menu-title"
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="menu-desc">توضیحات</Label>
                  <Input
                    id="menu-desc"
                    value={draft.description}
                    onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="menu-category">دسته‌بندی</Label>
                  <select
                    id="menu-category"
                    value={draft.category}
                    onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
                    className="w-full rounded-2xl border border-stone-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  >
                    {CATEGORY_SLUGS.map((slug) => (
                      <option key={slug} value={slug}>{CATEGORY_LABELS[slug]}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="menu-price">قیمت</Label>
                  <Input
                    id="menu-price"
                    type="number"
                    value={draft.price}
                    onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="menu-prep">زمان آماده‌سازی (دقیقه)</Label>
                  <Input
                    id="menu-prep"
                    type="number"
                    value={draft.prepTime}
                    onChange={(event) => setDraft((current) => ({ ...current, prepTime: event.target.value }))}
                  />
                </div>

                <div className="flex flex-wrap gap-3 md:col-span-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "در حال ذخیره..." : editingId ? "ذخیره تغییرات" : "افزودن آیتم"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetComposer} disabled={submitting}>
                    انصراف
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {feedback ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
          در حال بارگذاری آیتم‌های منو…
        </p>
      ) : null}

      <section className="grid gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{item.slug}</p>
                  {item.featured && (
                    <span className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                      ویژه
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(item)} disabled={submitting}>
                    ویرایش
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)} disabled={submitting}>
                    حذف
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
              <p>{item.description}</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                  دسته: {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
                <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                  قیمت: {formatPrice(item.price)}
                </span>
                <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                  زمان آماده‌سازی: {item.prepTime} دقیقه
                </span>
                {item.ingredients.length > 0 && (
                  <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                    ترکیبات: {item.ingredients.join("، ")}
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
    </div>
  );
}