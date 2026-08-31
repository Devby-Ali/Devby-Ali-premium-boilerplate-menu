"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Period = "weekly" | "monthly" | "yearly";
interface Report {
  orderCount: number;
  revenue: number;
  purchases: number;
  expenses: number;
  estimatedProfit: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
}

const labels: Record<Period, string> = {
  weekly: "هفتگی",
  monthly: "ماهانه",
  yearly: "سالانه",
};

function formatMoney(value: number) {
  return `${value.toLocaleString("fa-IR")} تومان`;
}

export default function ReportsPage() {
  const [period, setPeriod] = React.useState<Period>("monthly");
  const [report, setReport] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [feedback, setFeedback] = React.useState("");

  const loadReport = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/reports?period=${period}`);
      const payload = (await response.json()) as { data?: Report; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "گزارش در دسترس نیست.");
      setReport(payload.data);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "گزارش در دسترس نیست.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  React.useEffect(() => {
    void loadReport();
  }, [loadReport]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
          Business Intelligence
        </p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold">
          <BarChart3 className="h-8 w-8 text-emerald-700" />
          گزارش‌گیری
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          نمایی خلاصه از فروش، هزینه‌ها و محصولات پرفروش مجموعه.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(labels) as Period[]).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={period === value ? "default" : "outline"}
            onClick={() => setPeriod(value)}
          >
            {labels[value]}
          </Button>
        ))}
      </div>

      {feedback ? <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{feedback}</p> : null}
      {loading ? (
        <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">در حال محاسبه گزارش...</p>
      ) : report ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["فروش", report.revenue],
              ["سود برآوردی", report.estimatedProfit],
              ["خریدها", report.purchases],
              ["هزینه‌ها", report.expenses],
              ["تعداد سفارش", report.orderCount],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-xl font-semibold">
                    {typeof value === "number" && label !== "تعداد سفارش"
                      ? formatMoney(value)
                      : Number(value).toLocaleString("fa-IR")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>
          <Card>
            <CardHeader><CardTitle>پرفروش‌ترین محصولات</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {report.topProducts.map((product) => (
                <div key={product.name} className="flex items-center justify-between gap-4 rounded-2xl bg-muted px-4 py-3 text-sm">
                  <span>{product.name}</span>
                  <span className="text-muted-foreground">
                    {product.quantity.toLocaleString("fa-IR")} عدد · {formatMoney(product.revenue)}
                  </span>
                </div>
              ))}
              {report.topProducts.length === 0 ? <p className="text-sm text-muted-foreground">داده‌ای برای این بازه وجود ندارد.</p> : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
