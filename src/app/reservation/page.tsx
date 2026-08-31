"use client";

import * as React from "react";
import { toJalaali } from "jalaali-js";
import { CalendarDays, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReservationResponse {
  tableNumber: number;
}

interface DateOption {
  value: string;
  label: string;
}

function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}

function createDateOptions(): DateOption[] {
  const options: DateOption[] = [];
  const formatter = new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  for (let offset = 1; offset <= 21; offset += 1) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    const jalaali = toJalaali(date);
    options.push({
      value: `${jalaali.jy}-${jalaali.jm}-${jalaali.jd}`,
      label: formatter.format(date),
    });
  }
  return options;
}

export default function ReservationPage() {
  const dates = React.useMemo(createDateOptions, []);
  const [date, setDate] = React.useState(dates[0]?.value ?? "");
  const [guestCount, setGuestCount] = React.useState("2");
  const [guestName, setGuestName] = React.useState("");
  const [guestPhone, setGuestPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const [submitted, setSubmitted] = React.useState<ReservationResponse | null>(null);
  const [feedback, setFeedback] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const checkAvailability = React.useCallback(async () => {
    if (!date) return;
    const response = await fetch(
      `/api/reservations?date=${encodeURIComponent(date)}&guestCount=${guestCount}`,
    );
    const payload = (await response.json()) as { data?: { available: boolean } };
    setAvailable(response.ok ? payload.data?.available ?? false : false);
  }, [date, guestCount]);

  React.useEffect(() => {
    void checkAvailability();
  }, [checkAvailability]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setFeedback("");
    setSubmitted(null);
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          guestName,
          guestPhone,
          guestCount: Number(guestCount),
          notes: notes || null,
        }),
      });
      const payload = (await response.json()) as {
        data?: ReservationResponse;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "ثبت رزرو انجام نشد.");
      }
      setSubmitted(payload.data);
      setAvailable(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "ثبت رزرو انجام نشد.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
      <Card className="overflow-hidden border-emerald-700/40">
        <CardHeader className="bg-emerald-950 px-6 py-8 text-white sm:px-10">
          <p className="text-sm font-semibold tracking-[0.2em] text-emerald-200">
            RESERVE YOUR TABLE
          </p>
          <CardTitle className="mt-3 text-3xl text-white">رزرو میز</CardTitle>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-100">
            تاریخ شمسی و تعداد مهمانان را انتخاب کنید. بازه‌ی رزرو این مرحله
            همیشه از ساعت ۲۰ تا ۲۲ است.
          </p>
        </CardHeader>

        <CardContent className="p-6 sm:p-10">
          {submitted ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              <CheckCircle2 className="mx-auto h-12 w-12" />
              <h1 className="mt-4 text-2xl font-semibold">رزرو شما ثبت شد</h1>
              <p className="mt-3 text-sm leading-7">
                میز شماره {toPersianDigits(submitted.tableNumber)} برای بازه‌ی
                ۲۰ تا ۲۲ در نظر گرفته شد. تأیید نهایی توسط مجموعه انجام می‌شود.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-2 text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-emerald-700" />
                    تاریخ
                  </span>
                  <select
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-input bg-background px-3"
                    required
                  >
                    {dates.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium">
                  <span>بازه‌ی زمانی</span>
                  <input
                    value="۲۰:۰۰ تا ۲۲:۰۰"
                    readOnly
                    className="h-11 w-full rounded-2xl border border-input bg-muted px-3"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium">
                  <span>تعداد مهمان</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={guestCount}
                    onChange={(event) => setGuestCount(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-input bg-background px-3"
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  <span>نام و نام خانوادگی</span>
                  <input
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-input bg-background px-3"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span>شماره تماس</span>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(event) => setGuestPhone(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-input bg-background px-3"
                    required
                  />
                </label>
              </div>

              <label className="block space-y-2 text-sm font-medium">
                <span>توضیحات (اختیاری)</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full resize-y rounded-2xl border border-input bg-background px-3 py-3"
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <p
                  className={`text-sm ${
                    available === false
                      ? "text-rose-700 dark:text-rose-400"
                      : "text-muted-foreground"
                  }`}
                  aria-live="polite"
                >
                  {available === null
                    ? "در حال بررسی ظرفیت..."
                    : available
                      ? "این بازه در حال حاضر ظرفیت دارد."
                      : "این بازه برای تعداد مهمان انتخابی ظرفیت ندارد."}
                </p>
                <Button type="submit" disabled={loading || available === false}>
                  {loading ? "در حال ثبت..." : "ثبت درخواست رزرو"}
                </Button>
              </div>

              {feedback ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                  {feedback}
                </p>
              ) : null}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
