// src/app/(public)/t/[token]/menu-view.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { WaiterCallButton } from "@/components/waiter-call-button";
import { formatPrice } from "@/lib/price";
import type { MenuItem, MenuCategory } from "@/types";

interface Props {
  tableNumber: number;
  tableId: string;
  tableToken: string;
  items: MenuItem[];
  categories: MenuCategory[];
}

const TABLE_SESSION_KEY = "pm_table_session";

export function MenuView({
  tableNumber,
  tableId,
  tableToken,
  items,
  categories,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [draft, setDraft] = useState<{ item: MenuItem; quantity: number }[]>(
    [],
  );
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // الگوی صنعتی: token در URL + ذخیره‌ی نشست سمت مشتری
  useEffect(() => {
    try {
      sessionStorage.setItem(
        TABLE_SESSION_KEY,
        JSON.stringify({ tableId, tableToken, tableNumber }),
      );
    } catch {
      // sessionStorage ممکن است در حالت خصوصی محدود باشد
    }
  }, [tableId, tableToken, tableNumber]);

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? items.filter((item) => item.inStock)
        : items.filter(
            (item) => item.inStock && item.category?.slug === activeCategory,
          ),
    [activeCategory, items],
  );
  const total = draft.reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0,
  );

  const changeQuantity = (item: MenuItem, change: number) => {
    if (!item.inStock && change > 0) return;
    setDraft((current) => {
      const existing = current.find((entry) => entry.item.id === item.id);
      if (!existing && change > 0) return [...current, { item, quantity: 1 }];
      if (!existing) return current;
      const quantity = existing.quantity + change;
      if (quantity <= 0)
        return current.filter((entry) => entry.item.id !== item.id);
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
          tableToken,
          items: draft.map((entry) => ({
            menuItemId: entry.item.id,
            quantity: entry.quantity,
          })),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(payload.error ?? "ثبت سفارش انجام نشد.");
      setDraft([]);
      setFeedback("سفارش شما ثبت شد و در حال آماده‌سازی است.");
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "ثبت سفارش انجام نشد.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          میز شماره{" "}
          <span className="font-bold text-foreground">{tableNumber}</span>
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
            activeCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          همه
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategory(category.slug)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
              activeCategory === category.slug
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="grid gap-4 px-4 pb-28 sm:grid-cols-2">
        {filtered.map((item) => {
          const quantity =
            draft.find((entry) => entry.item.id === item.id)?.quantity ?? 0;
          return (
            <MenuItemCard
              key={item.id}
              item={item}
              quantity={quantity}
              onChange={(change) => changeQuantity(item, change)}
            />
          );
        })}
      </div>

      {draft.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                {draft.reduce((sum, entry) => sum + entry.quantity, 0)} آیتم
              </p>
              <p className="font-bold text-foreground">{formatPrice(total)}</p>
            </div>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void submitOrder()}
            >
              {submitting ? "در حال ثبت..." : "ثبت سفارش میز"}
            </Button>
          </div>
          {feedback ? (
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              {feedback}
            </p>
          ) : null}
        </div>
      )}

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
            {formatPrice(item.price)}
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
          <span className="min-w-5 text-center text-sm font-semibold">
            {quantity}
          </span>
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
