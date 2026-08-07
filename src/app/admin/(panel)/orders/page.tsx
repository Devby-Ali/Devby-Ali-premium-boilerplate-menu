"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STORAGE_KEY = "premium-admin-orders";

type OrderItem = {
  id: string;
  customer: string;
  status: "pending" | "confirmed" | "delivered";
  total: string;
};

const initialOrders: OrderItem[] = [
  { id: "ORD-001", customer: "آرمان", status: "pending", total: "۳۸۰۰۰ تومان" },
  {
    id: "ORD-002",
    customer: "نازنین",
    status: "confirmed",
    total: "۱۱۰۰۰۰ تومان",
  },
  {
    id: "ORD-003",
    customer: "سارا",
    status: "delivered",
    total: "۶۵۰۰۰ تومان",
  },
];

const loadOrders = () => {
  if (typeof window === "undefined") {
    return initialOrders;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as OrderItem[]) : initialOrders;
  } catch {
    return initialOrders;
  }
};

type OrderStatus = OrderItem["status"] | "all";

export default function AdminOrdersPage() {
  const [orders, setOrders] = React.useState<OrderItem[]>(loadOrders);
  const [filter, setFilter] = React.useState<OrderStatus>("all");

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const filteredOrders = React.useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((order) => order.status === filter);
  }, [filter, orders]);

  const handleStatusChange = (
    id: string,
    nextStatus: Exclude<OrderStatus, "all">,
  ) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === id ? { ...order, status: nextStatus } : order,
      ),
    );
  };

  const summary = React.useMemo(
    () => ({
      pending: orders.filter((order) => order.status === "pending").length,
      confirmed: orders.filter((order) => order.status === "confirmed").length,
      delivered: orders.filter((order) => order.status === "delivered").length,
    }),
    [orders],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
          Order Overview
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
          سفارش‌ها
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-400">
          وضعیت سفارش‌ها را در یک تجربه‌ی مدیریتی ساده و قابل‌پیگیری دنبال کنید.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-sm text-stone-600 dark:text-stone-400">
            <p>در انتظار</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-100">
              {summary.pending}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-sm text-stone-600 dark:text-stone-400">
            <p>تأیید شده</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-100">
              {summary.confirmed}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-sm text-stone-600 dark:text-stone-400">
            <p>تحویل شده</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-100">
              {summary.delivered}
            </p>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "confirmed", "delivered"] as const).map(
          (status) => (
            <Button
              key={status}
              type="button"
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status === "all"
                ? "همه"
                : status === "pending"
                  ? "در انتظار"
                  : status === "confirmed"
                    ? "تأیید شده"
                    : "تحویل شده"}
            </Button>
          ),
        )}
      </div>

      <section className="grid gap-6">
        {filteredOrders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle>{order.id}</CardTitle>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  {order.status === "pending"
                    ? "در انتظار"
                    : order.status === "confirmed"
                      ? "تأیید شده"
                      : "تحویل شده"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 text-sm text-stone-600 dark:text-stone-400">
              <span>مشتری: {order.customer}</span>
              <span>مبلغ: {order.total}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  handleStatusChange(
                    order.id,
                    order.status === "pending"
                      ? "confirmed"
                      : order.status === "confirmed"
                        ? "delivered"
                        : "delivered",
                  )
                }
              >
                {order.status === "delivered"
                  ? "تحویل شده"
                  : "به‌روزرسانی وضعیت"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
