"use client";

import * as React from "react";

import { AdminShell } from "@/app/admin/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice, menuItems, type MenuItemData } from "@/data/menu";

interface MenuDraftState {
  title: string;
  description: string;
  category: MenuItemData["category"];
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
  const [items, setItems] = React.useState(menuItems);
  const [draft, setDraft] = React.useState<MenuDraftState>(createDraft);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [showComposer, setShowComposer] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const filteredItems = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;

    return items.filter((item) => {
      return [
        item.title,
        item.description,
        item.category,
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const title = draft.title.trim();
    const description = draft.description.trim();
    const price = Number(draft.price);
    const prepTime = Number(draft.prepTime);

    if (
      !title ||
      !description ||
      Number.isNaN(price) ||
      price <= 0 ||
      Number.isNaN(prepTime) ||
      prepTime <= 0
    ) {
      setFeedback("لطفاً همه‌ی فیلدهای ضروری را با مقدار معتبر وارد کنید.");
      return;
    }

    if (editingId) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                title,
                description,
                price,
                category: draft.category,
                prepTime,
                slug: title.toLowerCase().replace(/\s+/g, "-"),
              }
            : item,
        ),
      );
      setFeedback("آیتم با موفقیت به‌روزرسانی شد.");
    } else {
      const newItem: MenuItemData = {
        id: `${Date.now()}`,
        title,
        slug: title.toLowerCase().replace(/\s+/g, "-"),
        description,
        price,
        category: draft.category,
        prepTime,
        ingredients: ["ترکیب سفارشی"],
        story: description,
      };

      setItems((current) => [newItem, ...current]);
      setFeedback("آیتم جدید به لیست اضافه شد.");
    }

    resetComposer();
  };

  const handleEdit = (item: MenuItemData) => {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      description: item.description,
      category: item.category,
      price: String(item.price),
      prepTime: String(item.prepTime ?? ""),
    });
    setShowComposer(true);
    setFeedback(null);
  };

  const handleDelete = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setFeedback("آیتم با موفقیت حذف شد.");
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <section className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
                Menu Management
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
                مدیریت آیتم‌های منو
              </h1>
            </div>
            <Button
              type="button"
              onClick={() => {
                setShowComposer(true);
                setFeedback(null);
              }}
            >
              افزودن آیتم جدید
            </Button>
          </div>
          <div className="mt-6 max-w-md">
            <Input
              aria-label="جستجوی آیتم‌ها"
              placeholder="جستجو در آیتم‌های منو"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </section>

        {showComposer ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId ? "ویرایش آیتم" : "افزودن آیتم جدید"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit}
                className="grid gap-4 md:grid-cols-2"
              >
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="menu-title">نام آیتم</Label>
                  <Input
                    id="menu-title"
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="menu-description">توضیح</Label>
                  <textarea
                    id="menu-description"
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="min-h-24 w-full rounded-2xl border border-stone-300 bg-transparent px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="menu-category">دسته</Label>
                  <select
                    id="menu-category"
                    value={draft.category}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        category: event.target
                          .value as MenuItemData["category"],
                      }))
                    }
                    className="w-full rounded-2xl border border-stone-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  >
                    <option value="coffee">کافی‌شاپ</option>
                    <option value="dessert">دسر</option>
                    <option value="savory">اشنایی</option>
                    <option value="signature">ویژه</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="menu-price">قیمت</Label>
                  <Input
                    id="menu-price"
                    type="number"
                    value={draft.price}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="menu-prep">زمان آماده‌سازی (دقیقه)</Label>
                  <Input
                    id="menu-prep"
                    type="number"
                    value={draft.prepTime}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        prepTime: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex flex-wrap gap-3 md:col-span-2">
                  <Button type="submit">
                    {editingId ? "ذخیره تغییرات" : "افزودن آیتم"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetComposer}
                  >
                    انصراف
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {feedback ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {feedback}
          </p>
        ) : null}

        <section className="grid gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle>{item.title}</CardTitle>
                    <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                      {item.slug}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      ویرایش
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      حذف
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
                <p>{item.description}</p>
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                    دسته: {item.category}
                  </span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                    قیمت: {formatPrice(item.price)}
                  </span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                    زمان آماده‌سازی: {item.prepTime} دقیقه
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </AdminShell>
  );
}
