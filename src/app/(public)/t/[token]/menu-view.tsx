// src/app/(public)/t/[token]/menu-view.tsx
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
  const [draft, setDraft] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? items
        : items.filter((item) => item.category?.slug === activeCategory),
    [activeCategory, items],
  );
  const total = draft.reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0,
  );

  const changeQuantity = (item: MenuItem, change: number) => {
    setDraft((current) => {
      const existing = current.find((entry) => entry.item.id === item.id);
      if (!existing && change > 0) return [...current, { item, quantity: 1 }];
      if (!existing) return current;
      const quantity = existing.quantity + change;
      if (quantity <= 0) return current.filter((entry) => entry.item.id !== item.id);
      return current.map((entry) =>
        entry.item.id === item.id ? { ...entry, quantity } : entry,
      );
    });
  };

  const submitOrder = async () => {
    if (draft.length === 0) return;
    setSubmitting(true);
    setFeedback("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          items: draft.map((entry) => ({
            menuItemId: entry.item.id,
            quantity: entry.quantity,
          })),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "ثبت سفارش انجام نشد.");
      setDraft([]);
      setFeedback("سفارش شما ثبت شد و در حال آماده‌سازی است.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "ثبت سفارش انجام نشد.");
    } finally {
      setSubmitting(false);
    }
  };

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
          <MenuItemCard
            key={item.id}
            item={item}
            quantity={draft.find((entry) => entry.item.id === item.id)?.quantity ?? 0}
            onChange={(change) => changeQuantity(item, change)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-16 text-center text-muted-foreground">
            آیتمی در این دسته‌بندی وجود ندارد.
          </p>
        )}
      </div>

      {/* دکمه شناور Waiter Call */}
      <div className="fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-3xl border border-emerald-700/30 bg-background/95 p-4 shadow-xl backdrop-blur">
        <div>
          <p className="text-xs text-muted-foreground">جمع سفارش</p>
          <p className="font-semibold text-primary">
            {total.toLocaleString("fa-IR")} تومان
          </p>
        </div>
        <Button
          disabled={submitting || draft.length === 0}
          onClick={() => void submitOrder()}
        >
          {submitting ? "در حال ثبت..." : "ثبت سفارش حضوری"}
        </Button>
      </div>
      {feedback ? (
        <p className="fixed bottom-24 left-4 right-4 z-30 mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800 shadow-lg dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200">
          {feedback}
        </p>
      ) : null}

      <WaiterCallButton tableId={tableId} tableNumber={tableNumber} />
    </div>
  );
}

function MenuItemCard({
  item,
  quantity,
  onChange,
}: {
  item: MenuItem;
  quantity: number;
  onChange: (change: number) => void;
}) {
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
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label={`افزایش ${item.name}`}
            onClick={() => onChange(1)}
            className="h-8 w-8 rounded-full bg-primary text-lg text-primary-foreground"
          >
            +
          </button>
          <span className="min-w-5 text-center text-sm font-semibold">{quantity}</span>
          <button
            type="button"
            aria-label={`کاهش ${item.name}`}
            onClick={() => onChange(-1)}
            disabled={quantity === 0}
            className="h-8 w-8 rounded-full border border-border text-lg disabled:opacity-40"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
}
