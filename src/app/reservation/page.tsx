"use client";

import * as React from "react";
import { toJalaali } from "jalaali-js";
import { CalendarDays, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReservationResponse {
  tableNumber: number;
}

interface ReservationSlot {
  startHour: number;
  endHour: number;
  isActive: boolean;
  available: boolean;
  label: string;
}

interface DateOption {
  value: string;
  label: string;
}

function toPersianDigits(value: string | number): string {
  return String(value).replace(
    /\d/g,
    (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit,
  );
}

/** برچسب فشرده‌ی بازه مطابق سبک img_3.jpg — مثال: «۸–۱۰» */
function slotGridLabel(slot: ReservationSlot): string {
  return `${toPersianDigits(slot.startHour)}–${toPersianDigits(slot.endHour)}`;
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
  const dates = React.useMemo(() => createDateOptions(), []);
  const [date, setDate] = React.useState(dates[0]?.value ?? "");
  const [guestCount, setGuestCount] = React.useState("2");
  const [guestName, setGuestName] = React.useState("");
  const [guestPhone, setGuestPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [slots, setSlots] = React.useState<ReservationSlot[]>([]);
  const [selectedSlot, setSelectedSlot] =
    React.useState<ReservationSlot | null>(null);
  const [submitted, setSubmitted] = React.useState<ReservationResponse | null>(
    null,
  );
  const [feedback, setFeedback] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!date) {
        return;
      }

      try {
        const response = await fetch(
          `/api/reservations?date=${encodeURIComponent(date)}&guestCount=${guestCount}`,
        );
        const payload = (await response.json()) as {
          data?: { slots?: ReservationSlot[] };
        };

        if (!cancelled) {
          const nextSlots = response.ok ? (payload.data?.slots ?? []) : [];
          setSlots(nextSlots);
          const preferredSlot =
            nextSlots.find((slot) => slot.isActive && slot.available) ??
            nextSlots.find((slot) => slot.isActive) ??
            null;
          setSelectedSlot(preferredSlot);
        }
      } catch {
        if (!cancelled) {
          setSlots([]);
          setSelectedSlot(null);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [date, guestCount]);

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
          startHour: selectedSlot?.startHour,
          endHour: selectedSlot?.endHour,
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
      setSlots((current) =>
        current.map((slot) =>
          slot.startHour === selectedSlot?.startHour &&
          slot.endHour === selectedSlot?.endHour
            ? { ...slot, available: false }
            : slot,
        ),
      );
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "ثبت رزرو انجام نشد.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
      <Card className="overflow-hidden border-primary/30">
        <CardHeader className="bg-[radial-gradient(circle_at_top,rgba(124,187,157,0.28),transparent_55%),linear-gradient(135deg,#1e312b_0%,#10211d_100%)] px-6 py-8 text-white sm:px-10">
          <p className="text-[10px] font-black tracking-[0.22em] text-primary-foreground/80">
            RESERVE YOUR TABLE
          </p>
          <CardTitle className="mt-3 text-3xl text-white">رزرو میز</CardTitle>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">
            تاریخ شمسی و تعداد مهمانان را انتخاب کنید. بازه‌های رزرو از طریق
            تنظیمات پنل ادمین قابل مدیریت هستند.
          </p>
        </CardHeader>

        <CardContent className="p-6 sm:p-10">
          {submitted ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              <CheckCircle2 className="mx-auto h-12 w-12" />
              <h1 className="mt-4 text-2xl font-semibold">رزرو شما ثبت شد</h1>
              <p className="mt-3 text-sm leading-7">
                میز شماره {toPersianDigits(submitted.tableNumber)} برای بازه‌ی
                {selectedSlot?.label ?? "انتخاب‌شده"} در نظر گرفته شد. تأیید
                نهایی توسط مجموعه انجام می‌شود.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  <span className="flex items-center gap-2 text-foreground">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    تاریخ
                  </span>
                  <select
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="h-11 w-full rounded-md border border-border/80 bg-surface/80 px-3 text-foreground shadow-[0_12px_24px_-22px_rgb(var(--shadow-color)/0.55)] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
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
                  <span className="text-foreground">تعداد مهمان</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={guestCount}
                    onChange={(event) => setGuestCount(event.target.value)}
                    className="h-11 w-full rounded-[0.9rem] border border-border/80 bg-surface/80 px-3 text-foreground shadow-[0_12px_24px_-22px_rgba(26,38,32,0.5)] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    required
                  />
                </label>
              </div>

              {/* گرید بازه‌های زمانی — الگوی بصری img_3.jpg: دکمه‌های چیدمان ۴تایی */}
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">بازه‌ی زمانی</legend>
                {slots.length === 0 ? (
                  <p
                    className="text-sm text-muted-foreground"
                    aria-live="polite"
                  >
                    در حال بارگذاری بازه‌ها...
                  </p>
                ) : (
                  <div
                    role="radiogroup"
                    aria-label="بازه‌ی زمانی رزرو"
                    className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                  >
                    {slots
                      .filter((slot) => slot.isActive)
                      .map((slot) => {
                        const isSelected =
                          selectedSlot?.startHour === slot.startHour &&
                          selectedSlot?.endHour === slot.endHour;
                        return (
                          <button
                            key={`${slot.startHour}-${slot.endHour}`}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            disabled={!slot.available}
                            onClick={() => setSelectedSlot(slot)}
                            className={`flex h-14 flex-col items-center justify-center rounded-[0.9rem] border text-base font-semibold transition-all ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-[0_18px_26px_-20px_rgba(47,107,86,0.9)]"
                                : slot.available
                                  ? "border-border/80 bg-surface/80 text-foreground hover:bg-muted"
                                  : "cursor-not-allowed border-border/80 bg-muted/50 text-muted-foreground line-through"
                            }`}
                          >
                            <span>{slotGridLabel(slot)}</span>
                            {!slot.available ? (
                              <span className="text-xs font-normal no-underline">
                                ظرفیت ندارد
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                  </div>
                )}
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  <span className="text-foreground">نام و نام خانوادگی</span>
                  <input
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    className="h-11 w-full rounded-[0.9rem] border border-border/80 bg-surface/80 px-3 text-foreground shadow-[0_12px_24px_-22px_rgba(26,38,32,0.5)] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span className="text-foreground">شماره تماس</span>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(event) => setGuestPhone(event.target.value)}
                    className="h-11 w-full rounded-[0.9rem] border border-border/80 bg-surface/80 px-3 text-foreground shadow-[0_12px_24px_-22px_rgba(26,38,32,0.5)] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                    required
                  />
                </label>
              </div>

              <label className="block space-y-2 text-sm font-medium">
                <span className="text-foreground">توضیحات (اختیاری)</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={500}
                  rows={3}
                  className="w-full resize-y rounded-[0.9rem] border border-border/80 bg-surface/80 px-3 py-3 text-foreground shadow-[0_12px_24px_-22px_rgba(26,38,32,0.5)] outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <p
                  className={`text-sm ${
                    slots.some((slot) => slot.isActive && slot.available)
                      ? "text-muted-foreground"
                      : "text-secondary"
                  }`}
                  aria-live="polite"
                >
                  {slots.length === 0
                    ? "در حال بررسی ظرفیت..."
                    : slots.some((slot) => slot.isActive && slot.available)
                      ? "حداقل یک بازه برای تعداد مهمان انتخابی ظرفیت دارد."
                      : "هیچ بازه‌ای برای تعداد مهمان انتخابی ظرفیت ندارد."}
                </p>
                <Button
                  type="submit"
                  disabled={loading || !selectedSlot || !selectedSlot.available}
                >
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
