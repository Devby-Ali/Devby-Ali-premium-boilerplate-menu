// src/app/admin/(panel)/reports/page.tsx
// گزارش‌گیری مالی + ثبت خریدها و هزینه‌ها
// قرارداد مبلغ: همه‌ی مقادیر API به ریال (IRR) هستند؛ نمایش فقط با formatPrice (تومان)
"use client";

import * as React from "react";
import { BarChart3, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/price";

type Period = "weekly" | "monthly" | "yearly";

interface Report {
  orderCount: number;
  revenue: number;
  purchases: number;
  expenses: number;
  costs: number;
  averageOrderValue: number;
  estimatedProfit: number;
  estimatedProfitMargin: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
}

interface FinanceEntry {
  id: string;
  title: string;
  /** ریال */
  amount: number;
  purchasedAt?: string;
  spentAt?: string;
  notes?: string | null;
}

const labels: Record<Period, string> = {
  weekly: "هفتگی",
  monthly: "ماهانه",
  yearly: "سالانه",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fa-IR");
  } catch {
    return iso;
  }
}

// ─── بخش ثبت/مدیریت خرید یا هزینه ────────────────────────────────────────────

interface FinanceSectionProps {
  kind: "purchases" | "expenses";
  title: string;
  description: string;
  /** نام فیلد تاریخ در payload API */
  dateField: "purchasedAt" | "spentAt";
}

function FinanceSection({ kind, title, description, dateField }: FinanceSectionProps) {
  const endpoint = `/api/admin/${kind}`;
  const [entries, setEntries] = React.useState<FinanceEntry[]>([]);
  const [entryTitle, setEntryTitle] = React.useState("");
  const [amountToman, setAmountToman] = React.useState("");
  const [entryDate, setEntryDate] = React.useState("");
  const [entryNotes, setEntryNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const response = await fetch(endpoint, { credentials: "include" });
        const payload = (await response.json()) as { data?: FinanceEntry[] };
        if (!cancelled && response.ok && payload.data) {
          setEntries(payload.data);
        }
      } catch {
        if (!cancelled) setFeedback("بارگذاری لیست با خطا مواجه شد.");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(amountToman);
    if (!entryTitle.trim() || Number.isNaN(amount) || amount <= 0) {
      setFeedback("عنوان و مبلغ معتبر (تومان) الزامی است.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: entryTitle.trim(),
          amountToman: amount,
          [dateField]: entryDate || undefined,
          notes: entryNotes.trim() || null,
        }),
      });
      const payload = (await response.json()) as {
        data?: FinanceEntry;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "ثبت با خطا مواجه شد.");
      }
      setEntries((current) => [payload.data!, ...current]);
      setEntryTitle("");
      setAmountToman("");
      setEntryDate("");
      setEntryNotes("");
      setFeedback("با موفقیت ثبت شد.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "ثبت با خطا مواجه شد.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این رکورد اطمینان دارید؟")) return;
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "حذف با خطا مواجه شد.");
      }
      setEntries((current) => current.filter((entry) => entry.id !== id));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "حذف با خطا مواجه شد.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          onSubmit={handleAdd}
          className="grid gap-3 rounded-2xl border border-stone-200 p-4 dark:border-stone-800 sm:grid-cols-2"
        >
          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-title`}>عنوان</Label>
            <Input
              id={`${kind}-title`}
              value={entryTitle}
              onChange={(event) => setEntryTitle(event.target.value)}
              placeholder="مثال: خرید دانه قهوه"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-amount`}>مبلغ (تومان)</Label>
            <Input
              id={`${kind}-amount`}
              type="number"
              min={1}
              value={amountToman}
              onChange={(event) => setAmountToman(event.target.value)}
              placeholder="مثال: ۲۵۰۰۰۰۰"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-date`}>تاریخ (اختیاری)</Label>
            <Input
              id={`${kind}-date`}
              type="date"
              value={entryDate}
              onChange={(event) => setEntryDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-notes`}>توضیح (اختیاری)</Label>
            <Input
              id={`${kind}-notes`}
              value={entryNotes}
              onChange={(event) => setEntryNotes(event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={submitting}>
              <Plus className="ml-1.5 h-4 w-4" />
              {submitting ? "در حال ثبت..." : "ثبت"}
            </Button>
          </div>
        </form>

        {feedback ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {feedback}
          </p>
        ) : null}

        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{entry.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(entry.purchasedAt ?? entry.spentAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-semibold">{formatPrice(entry.amount)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDelete(entry.id)}
                  aria-label={`حذف ${entry.title}`}
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            </li>
          ))}
          {entries.length === 0 ? (
            <li className="text-sm text-muted-foreground">رکوردی ثبت نشده است.</li>
          ) : null}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── صفحه‌ی گزارش‌گیری ────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = React.useState<Period>("monthly");
  const [report, setReport] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [feedback, setFeedback] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/reports?period=${period}`);
        const payload = (await response.json()) as {
          data?: Report;
          error?: string;
        };
        if (!response.ok || !payload.data) {
          throw new Error(payload.error ?? "گزارش در دسترس نیست.");
        }
        if (!cancelled) {
          setReport(payload.data);
        }
      } catch (error) {
        if (!cancelled) {
          setFeedback(
            error instanceof Error ? error.message : "گزارش در دسترس نیست.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [period]);

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
          نمایی خلاصه از فروش، هزینه‌ها و محصولات پرفروش مجموعه. مبالغ به تومان
          نمایش داده می‌شوند.
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

      {feedback ? (
        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {feedback}
        </p>
      ) : null}
      {loading ? (
        <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
          در حال محاسبه گزارش...
        </p>
      ) : report ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(
              [
                ["فروش", report.revenue, "rial"],
                ["خریدها", report.purchases, "rial"],
                ["هزینه‌ها", report.expenses, "rial"],
                ["کل هزینه‌ها", report.costs, "rial"],
                ["سود برآوردی", report.estimatedProfit, "rial"],
                ["میانگین ارزش سفارش", report.averageOrderValue, "rial"],
                ["حاشیه سود", report.estimatedProfitMargin, "percent"],
                ["تعداد سفارش", report.orderCount, "count"],
              ] as const
            ).map(([label, value, kind]) => (
              <Card key={label}>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-xl font-semibold">
                    {kind === "rial"
                      ? formatPrice(value)
                      : kind === "percent"
                        ? `${Number(value).toFixed(1)}٪`
                        : Number(value).toLocaleString("fa-IR")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>پرفروش‌ترین محصولات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.topProducts.map((product) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-muted px-4 py-3 text-sm"
                >
                  <span>{product.name}</span>
                  <span className="text-muted-foreground">
                    {product.quantity.toLocaleString("fa-IR")} عدد ·{" "}
                    {formatPrice(product.revenue)}
                  </span>
                </div>
              ))}
              {report.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  داده‌ای برای این بازه وجود ندارد.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <section className="grid gap-6 lg:grid-cols-2">
            <FinanceSection
              kind="purchases"
              title="خریدها"
              description="خرید مواد اولیه و اقلام مصرفی — در محاسبه‌ی هزینه‌ها لحاظ می‌شود."
              dateField="purchasedAt"
            />
            <FinanceSection
              kind="expenses"
              title="هزینه‌ها"
              description="هزینه‌های عملیاتی (اجاره، حقوق، قبوض و…) — در محاسبه‌ی هزینه‌ها لحاظ می‌شود."
              dateField="spentAt"
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
