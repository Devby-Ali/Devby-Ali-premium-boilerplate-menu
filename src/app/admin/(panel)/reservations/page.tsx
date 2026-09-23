"use client";

import * as React from "react";
import { CalendarCheck2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

interface Reservation {
  id: string;
  tableNumber?: number;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  notes?: string | null;
}

const STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: "در انتظار تأیید",
  CONFIRMED: "تأیید شده",
  CANCELLED: "لغو شده",
  COMPLETED: "تکمیل شده",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  });
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = React.useState<Reservation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState("");

  const loadReservations = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/reservations", {
        credentials: "include",
      });
      const payload = (await response.json()) as {
        data?: Reservation[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error ?? "دریافت رزروها انجام نشد.");
      setReservations(payload.data ?? []);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "دریافت رزروها انجام نشد.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/reservations", {
          credentials: "include",
        });
        const payload = (await response.json()) as {
          data?: Reservation[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "دریافت رزروها انجام نشد.");
        }
        if (!cancelled) {
          setReservations(payload.data ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setFeedback(
            error instanceof Error ? error.message : "دریافت رزروها انجام نشد.",
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
  }, [loadReservations]);

  const updateStatus = async (
    id: string,
    status: Exclude<ReservationStatus, "PENDING">,
  ) => {
    setUpdating(id);
    setFeedback("");
    try {
      const response = await fetch("/api/admin/reservations", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const payload = (await response.json()) as {
        data?: Reservation;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "تغییر وضعیت رزرو انجام نشد.");
      }
      setReservations((current) =>
        current.map((reservation) =>
          reservation.id === id ? payload.data! : reservation,
        ),
      );
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "تغییر وضعیت رزرو انجام نشد.",
      );
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="admin-hero rounded-md p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
          Reservation Desk
        </p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold">
          <CalendarCheck2 className="h-8 w-8 text-emerald-700" />
          مدیریت رزروها
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          درخواست‌های بازه‌ی ثابت ۲۰ تا ۲۲ را بررسی و وضعیت آن‌ها را مدیریت
          کنید.
        </p>
      </section>

      {feedback ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {feedback}
        </p>
      ) : null}

      {loading ? (
        <p className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-muted-foreground dark:border-stone-800 dark:bg-stone-900">
          در حال بارگذاری رزروها...
        </p>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {reservations.map((reservation) => (
            <Card key={reservation.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{reservation.guestName}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      میز{" "}
                      {reservation.tableNumber?.toLocaleString("fa-IR") ??
                        "نامشخص"}{" "}
                      · {reservation.guestCount.toLocaleString("fa-IR")} مهمان
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {STATUS_LABELS[reservation.status]}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-2 text-muted-foreground sm:grid-cols-2">
                  <p>زمان: {formatDate(reservation.startTime)}</p>
                  <p>تلفن: {reservation.guestPhone}</p>
                </div>
                {reservation.notes ? (
                  <p className="rounded-2xl bg-muted px-4 py-3 leading-7">
                    {reservation.notes}
                  </p>
                ) : null}
                {reservation.status === "PENDING" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={updating === reservation.id}
                      onClick={() =>
                        void updateStatus(reservation.id, "CONFIRMED")
                      }
                    >
                      تأیید رزرو
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updating === reservation.id}
                      onClick={() =>
                        void updateStatus(reservation.id, "CANCELLED")
                      }
                    >
                      رد درخواست
                    </Button>
                  </div>
                ) : reservation.status === "CONFIRMED" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updating === reservation.id}
                    onClick={() =>
                      void updateStatus(reservation.id, "COMPLETED")
                    }
                  >
                    ثبت به‌عنوان تکمیل‌شده
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
          {reservations.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground lg:col-span-2">
              هنوز رزروی ثبت نشده است.
            </Card>
          ) : null}
        </section>
      )}
    </div>
  );
}
