"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrderItem {
  id: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  deliveryType: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface OrderStats {
  pending: number;
  processing: number;
  ready: number;
  delivered: number;
  cancelled: number;
}

type StatusFilter = "all" | "pending" | "processing" | "ready" | "delivered" | "cancelled";

const STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار",
  processing: "در حال آماده‌سازی",
  ready: "آماده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

const DELIVERY_LABELS: Record<string, string> = {
  dine_in: "سالن",
  takeaway: "بیرون‌بر",
  delivery: "پیک",
};

function formatPrice(value: number) {
  return `${value.toLocaleString("fa-IR")} تومان`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("fa-IR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = React.useState<OrderItem[]>([]);
  const [stats, setStats] = React.useState<OrderStats>({
    pending: 0,
    processing: 0,
    ready: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, statsRes] = await Promise.all([
        fetch("/api/admin/orders", { credentials: "include" }),
        fetch("/api/admin/orders?stats=true", { credentials: "include" }),
      ]);

      if (ordersRes.ok) {
        const payload = await ordersRes.json();
        if (payload?.data) setOrders(payload.data as OrderItem[]);
      }
      if (statsRes.ok) {
        const payload = await statsRes.json();
        if (payload?.data) setStats(payload.data as OrderStats);
      }
    } catch {
      setFeedback("در حال حاضر امکان بارگذاری سفارش‌ها وجود ندارد.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void (async () => {
      await loadData();
    })();
  }, [loadData]);

  const filteredOrders = React.useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [filter, orders]);

  const handleStatusChange = async (id: string, nextStatus: string) => {
    setUpdating(id);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error ?? "خطا در به‌روزرسانی وضعیت");
      }

      setOrders((current) =>
        current.map((o) =>
          o.id === id ? { ...o, status: nextStatus } : o,
        ),
      );
    } catch (err: any) {
      setFeedback(err?.message ?? "خطا در به‌روزرسانی وضعیت");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
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

      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6 text-sm text-stone-600 dark:text-stone-400">
            <p>در انتظار</p>
            <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">
              {stats.pending}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-sm text-stone-600 dark:text-stone-400">
            <p>در حال آماده‌سازی</p>
            <p className="mt-2 text-2xl font-semibold text-blue-600 dark:text-blue-400">
              {stats.processing}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-sm text-stone-600 dark:text-stone-400">
            <p>آماده</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.ready}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-sm text-stone-600 dark:text-stone-400">
            <p>تحویل شده</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-stone-100">
              {stats.delivered}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-sm text-stone-600 dark:text-stone-400">
            <p>لغو شده</p>
            <p className="mt-2 text-2xl font-semibold text-red-600 dark:text-red-400">
              {stats.cancelled}
            </p>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          ["all", "pending", "processing", "ready", "delivered", "cancelled"] as const
        ).map((status) => (
          <Button
            key={status}
            type="button"
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === "all"
              ? "همه"
              : STATUS_LABELS[status]}
          </Button>
        ))}
      </div>

      {feedback ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {feedback}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
          در حال بارگذاری سفارش‌ها...
        </p>
      ) : null}

      <section className="grid gap-6">
        {filteredOrders.map((order) => (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle className="text-base font-mono">{order.id}</CardTitle>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    order.status === "pending"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                      : order.status === "processing"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                        : order.status === "ready"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                          : order.status === "cancelled"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                            : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                  }`}
                >
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-stone-600 dark:text-stone-400">
                <div className="flex flex-wrap gap-3">
                  <span>مبلغ: {formatPrice(order.total)}</span>
                  <span>
                    پرداخت:{" "}
                    {order.paymentStatus === "paid"
                      ? "پرداخت شده"
                      : order.paymentStatus === "failed"
                        ? "ناموفق"
                        : "در انتظار"}
                  </span>
                  <span>نوع: {DELIVERY_LABELS[order.deliveryType] ?? order.deliveryType}</span>
                </div>
                <span className="text-xs text-stone-400">
                  {formatDate(order.createdAt)}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {order.status === "pending" && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={updating === order.id}
                      onClick={() => handleStatusChange(order.id, "processing")}
                    >
                      {updating === order.id ? "..." : "پذیرش"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={updating === order.id}
                      onClick={() => handleStatusChange(order.id, "cancelled")}
                    >
                      {updating === order.id ? "..." : "لغو"}
                    </Button>
                  </>
                )}
                {order.status === "processing" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={updating === order.id}
                    onClick={() => handleStatusChange(order.id, "ready")}
                  >
                    {updating === order.id ? "..." : "آماده شد"}
                  </Button>
                )}
                {order.status === "ready" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={updating === order.id}
                    onClick={() => handleStatusChange(order.id, "delivered")}
                  >
                    {updating === order.id ? "..." : "تحویل شد"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && filteredOrders.length === 0 && (
          <Card className="p-8 text-center text-sm text-stone-600 dark:text-stone-400">
            {filter !== "all"
              ? "هیچ سفارشی با این وضعیت یافت نشد."
              : "هنوز سفارشی ثبت نشده است."}
          </Card>
        )}
      </section>
    </div>
  );
}
