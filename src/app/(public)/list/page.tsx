"use client";

import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatPrice, menuCategories, menuItems } from "@/data/menu";

export default function ListPage() {
  const [activeCategory, setActiveCategory] =
    React.useState<(typeof menuCategories)[number]["slug"]>("all");
  const [query, setQuery] = React.useState("");

  const filteredItems = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return menuItems.filter((item) => {
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [item.title, item.description, item.ingredients.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionHeading
              eyebrow="Menu Explorer"
              title="فهرست آیتم‌های منو"
              description="دسته‌بندی، جستجو و مشاهده جزئیات محصول در یک تجربه سریع و مدرن."
            />
          </div>
          <div className="w-full max-w-md">
            <Input
              aria-label="جستجوی منو"
              placeholder="جستجو در منو..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {menuCategories.map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() => setActiveCategory(category.slug)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeCategory === category.slug
                  ? "bg-emerald-700 text-white"
                  : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => (
          <Card key={item.slug} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{item.title}</CardTitle>
                  <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                    {item.category}
                  </p>
                </div>
                {item.badge ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    {item.badge}
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-stone-600 dark:text-stone-400">
                {item.description}
              </p>
              <div className="flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
                <span>زمان آماده‌سازی: {item.prepTime} دقیقه</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {formatPrice(item.price)}
                </span>
              </div>
              <div className="flex gap-3">
                <Button asChild size="sm">
                  <Link href={`/product/${item.slug}`}>مشاهده جزئیات</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {filteredItems.length === 0 ? (
        <Card className="p-8 text-center text-sm text-stone-600 dark:text-stone-400">
          هیچ آیتمی با این فیلتر پیدا نشد.
        </Card>
      ) : null}
    </main>
  );
}
