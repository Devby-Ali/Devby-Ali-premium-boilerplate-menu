// src/app/(public)/list/list-page-client.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface MenuItemData {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  category: string;
  categoryName: string;
  badge?: string;
  featured: boolean;
  prepTime: number;
  ingredients: string[];
  imageUrl: string | null;
}

interface CategoryData {
  slug: string;
  name: string;
}

const ALL_CATEGORY = { slug: "all", label: "همه" };

function formatPrice(value: number) {
  return `${value.toLocaleString("fa-IR")} تومان`;
}

export function ListPageClient() {
  const [activeCategory, setActiveCategory] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<MenuItemData[]>([]);
  const [categories, setCategories] = React.useState<{ slug: string; label: string }[]>([ALL_CATEGORY]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/menu");
        if (res.ok) {
          const payload = await res.json();
          if (payload?.data) setItems(payload.data as MenuItemData[]);
          if (payload?.categories) {
            setCategories([
              ALL_CATEGORY,
              ...(payload.categories as CategoryData[]).map((c) => ({ slug: c.slug, label: c.name })),
            ]);
          }
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory;
      const matchQ = !q || [item.title, item.description, ...item.ingredients].join(" ").toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeCategory, query, items]);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">منو</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              دسته‌بندی و جستجو در آیتم‌های منو
            </p>
          </div>
          <div className="w-full max-w-md">
            <Input
              aria-label="جستجوی منو"
              placeholder="جستجو در منو..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setActiveCategory(cat.slug)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeCategory === cat.slug
                  ? "bg-emerald-700 text-white"
                  : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <p className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900">
          در حال بارگذاری...
        </p>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => (
          <Card key={item.slug} className="overflow-hidden">
            <Link
              href={`/product/${item.slug}`}
              className="relative block aspect-[16/10] w-full overflow-hidden bg-stone-100 dark:bg-stone-800"
              aria-label={`مشاهده جزئیات ${item.title}`}
            >
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(47,107,79,0.15),_transparent_65%)] text-sm text-stone-400 dark:text-stone-500">
                  بدون تصویر
                </div>
              )}
            </Link>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{item.title}</CardTitle>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    {item.categoryName || item.category}
                  </p>
                </div>
                {item.featured ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    ویژه
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-stone-600 dark:text-stone-400">{item.description}</p>
              <div className="flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
                <span>{item.prepTime} دقیقه</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatPrice(item.price)}
                </span>
              </div>
              <Button asChild size="sm">
                <Link href={`/product/${item.slug}`}>مشاهده جزئیات</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>

      {!loading && filteredItems.length === 0 ? (
        <Card className="p-8 text-center text-sm text-stone-500 dark:text-stone-400">
          {query.trim() ? "نتیجه‌ای یافت نشد." : "آیتمی در منو ثبت نشده است."}
        </Card>
      ) : null}
    </main>
  );
}
