// src/app/(public)/t/[token]/menu-view.tsx
"use client";

import { useState } from "react";
import { WaiterCallButton } from "@/components/waiter-call-button";
import type { MenuItem, MenuCategory } from "@/types";

interface Props {
  tableNumber: number;
  tableId: string;
  items: MenuItem[];
  categories: MenuCategory[];
}

export function MenuView({ tableNumber, tableId, items, categories }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered =
    activeCategory === "all"
      ? items
      : items.filter((item) => item.category?.slug === activeCategory);

  return (
    <div className="relative min-h-screen">
      {/* هدر میز */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          میز شماره{" "}
          <span className="font-bold text-foreground">{tableNumber}</span>
        </p>
      </div>

      {/* فیلتر دسته‌بندی */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
        <button
          onClick={() => setActiveCategory("all")}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
            activeCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          همه
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setActiveCategory(cat.slug)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
              activeCategory === cat.slug
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* لیست آیتم‌ها */}
      <div className="grid grid-cols-1 gap-4 px-4 pb-28 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-16 text-center text-muted-foreground">
            آیتمی در این دسته‌بندی وجود ندارد.
          </p>
        )}
      </div>

      {/* دکمه شناور Waiter Call */}
      <WaiterCallButton tableId={tableId} tableNumber={tableNumber} />
    </div>
  );
}

function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-40 w-full object-cover"
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-card-foreground">{item.name}</h3>
          <span className="shrink-0 text-sm font-bold text-primary">
            {item.price.toLocaleString("fa-IR")} تومان
          </span>
        </div>
        {item.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}
        {item.preparationTime && (
          <p className="mt-2 text-xs text-muted-foreground">
            زمان آماده‌سازی: {item.preparationTime} دقیقه
          </p>
        )}
      </div>
    </div>
  );
}
