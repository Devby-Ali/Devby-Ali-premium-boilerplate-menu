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
  const [categories, setCategories] = React.useState<
    { slug: string; label: string }[]
  >([ALL_CATEGORY]);
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
              ...(payload.categories as CategoryData[]).map((c) => ({
                slug: c.slug,
                label: c.name,
              })),
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
      const matchCat =
        activeCategory === "all" || item.category === activeCategory;
      const matchQ =
        !q ||
        [item.title, item.description, ...item.ingredients]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return matchCat && matchQ;
    });
  }, [activeCategory, query, items]);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-10 lg:px-8 lg:py-14">
      <section className="border-b border-border pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-secondary">
              انتخاب امروز
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
              منوی کافه
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
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
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-surface text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <p className="border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          در حال بارگذاری...
        </p>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => (
          <Card key={item.slug} className="group overflow-hidden rounded-md">
            <Link
              href={`/product/${item.slug}`}
              className="relative block aspect-[16/10] w-full overflow-hidden bg-surface-raised"
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
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgb(154_79_47_/_0.18),transparent_65%)] text-sm text-muted-foreground">
                  بدون تصویر
                </div>
              )}
            </Link>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{item.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.categoryName || item.category}
                  </p>
                </div>
                {item.featured ? (
                  <span className="border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
                    ویژه
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-muted-foreground">
                {item.description}
              </p>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{item.prepTime} دقیقه</span>
                <span className="font-semibold text-primary">
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
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {query.trim() ? "نتیجه‌ای یافت نشد." : "آیتمی در منو ثبت نشده است."}
        </Card>
      ) : null}
    </main>
  );
}
