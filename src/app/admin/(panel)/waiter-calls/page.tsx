// src/app/admin/(panel)/waiter-calls/page.tsx
// فراخوان گارسون — Real-time از طریق SSE (/api/admin/waiter-calls/stream)
// استراتژی: CSR چون داده‌ی زنده و وابسته به نشست است.
"use client";

import * as React from "react";
import { BellRing, CheckCheck, CircleDot } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WaiterCallStatus } from "@/types";

interface LiveWaiterCall {
  id: string;
  tableId: string;
  tableNumber?: number | null;
  status: WaiterCallStatus;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<WaiterCallStatus, string> = {
  PENDING: "در انتظار",
  ACKNOWLEDGED: "در راه است",
  RESOLVED: "تکمیل شده",
};

const STATUS_STYLES: Record<WaiterCallStatus, string> = {
  PENDING:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  ACKNOWLEDGED:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  RESOLVED:
    "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
};

function relativeTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fa-IR", { timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function AdminWaiterCallsPage() {
  const [calls, setCalls] = React.useState<LiveWaiterCall[]>([]);
  const [connection, setConnection] = React.useState<"connecting" | "open" | "error">(
    "connecting"
  );
  const [updating, setUpdating] = React.useState<string | null>(null);
  const callsRef = React.useRef<LiveWaiterCall[]>([]);

  // لیست جاری را در ref نگه می‌داریم تا merge رویدادهای SSE بدون race باشد
  React.useEffect(() => {
    callsRef.current = calls;
  }, [calls]);

  const upsertMany = React.useCallback((incoming: LiveWaiterCall[]) => {
    const map = new Map(callsRef.current.map((c) => [c.id, c]));
    for (const call of incoming) map.set(call.id, call);
    const merged = [...map.values()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    callsRef.current = merged;
    setCalls(merged);
  }, []);

  React.useEffect(() => {
    const source = new EventSource("/api/admin/waiter-calls/stream");

    source.addEventListener("open", () => setConnection("open"));

    source.addEventListener("connected", () => setConnection("open"));

    source.addEventListener("waiter-calls", (event) => {
      setConnection("open");
      try {
        const events = JSON.parse((event as MessageEvent<string>).data) as LiveWaiterCall[];
        upsertMany(events);
      } catch {
        // payload خراب نادیده گرفته می‌شود؛ اتصال برقرار می‌ماند
      }
    });

    source.addEventListener("error", () => {
      // EventSource خودش reconnect می‌کند
      setConnection("connecting");
    });

    return () => source.close();
  }, [upsertMany]);

  const updateStatus = async (id: string, status: WaiterCallStatus) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/admin/waiter-calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (res.ok) {
        upsertMany([{ ...callsRef.current.find((c) => c.id === id)!, status }]);
      }
    } finally {
      setUpdating(null);
    }
  };

  const pendingCount = calls.filter((c) => c.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
          Live Service Calls
        </p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold text-stone-900 dark:text-stone-100">
          فراخوان گارسون
          <span
            aria-label="وضعیت اتصال"
            title={
              connection === "open"
                ? "اتصال زنده"
                : connection === "connecting"
                  ? "در حال اتصال..."
                  : "خطای اتصال — تلاش مجدد خودکار"
            }
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
              connection === "open"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : connection === "connecting"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
            }`}
          >
            <CircleDot className="h-3 w-3" />
            {connection === "open" ? "زنده" : connection === "connecting" ? "..." : "قطع"}
          </span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-400">
          درخواست‌های «آماده سفارشم» مشتریان به‌صورت لحظه‌ای همین‌جا نمایش داده
          می‌شود. این بخش مستقل از سفارشات آنلاین کار می‌کند.
        </p>
        {pendingCount > 0 && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            <BellRing className="h-4 w-4" />
            {pendingCount.toLocaleString("fa-IR")} فراخوان در انتظار رسیدگی
          </p>
        )}
      </section>

      {/* Calls */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {calls.slice(0, 30).map((call) => (
          <Card
            key={call.id}
            className={call.status === "PENDING" ? "ring-2 ring-amber-300 dark:ring-amber-700" : undefined}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xl">
                  {call.tableNumber ? `میز ${call.tableNumber.toLocaleString("fa-IR")}` : "میز نامشخص"}
                </CardTitle>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[call.status]}`}
                >
                  {STATUS_LABELS[call.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-400">
                ثبت: {relativeTime(call.createdAt)} · آخرین تغییر: {relativeTime(call.updatedAt)}
              </p>
            </CardHeader>
            {(call.status === "PENDING" || call.status === "ACKNOWLEDGED") && (
              <CardContent>
                {call.status === "PENDING" && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={updating === call.id}
                    onClick={() => void updateStatus(call.id, "ACKNOWLEDGED")}
                  >
                    {updating === call.id ? "..." : "پذیرش فراخوان"}
                  </Button>
                )}
                {call.status === "ACKNOWLEDGED" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={updating === call.id}
                    onClick={() => void updateStatus(call.id, "RESOLVED")}
                  >
                    <CheckCheck className="ml-1.5 h-3.5 w-3.5" />
                    {updating === call.id ? "..." : "تکمیل شد"}
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        ))}

        {calls.length === 0 && (
          <Card className="col-span-full p-8 text-center text-sm text-stone-500 dark:text-stone-400">
            هنوز فراخوانی ثبت نشده است. با اسکن QR یک میز و فشردن دکمه‌ی «آماده
            سفارشم» می‌توانید جریان را آزمایش کنید.
          </Card>
        )}
      </section>
    </div>
  );
}
