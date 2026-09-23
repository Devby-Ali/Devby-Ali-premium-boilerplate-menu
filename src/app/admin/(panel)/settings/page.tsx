"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ReservationSlotDraft {
  startHour: number;
  endHour: number;
  isActive: boolean;
}

interface SettingsDraftState {
  siteName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  reservationSlots: ReservationSlotDraft[];
}

const initialReservationSlots: ReservationSlotDraft[] = [
  { startHour: 8, endHour: 10, isActive: true },
  { startHour: 10, endHour: 12, isActive: true },
  { startHour: 12, endHour: 14, isActive: true },
  { startHour: 14, endHour: 16, isActive: true },
  { startHour: 16, endHour: 18, isActive: true },
  { startHour: 18, endHour: 20, isActive: true },
  { startHour: 20, endHour: 22, isActive: true },
];

const initialSettings: SettingsDraftState = {
  siteName: "Premium Menu",
  contactEmail: "hello@premiummenu.test",
  contactPhone: "",
  address: "تهران، خیابان ...",
  tagline: "طعم‌های لوکس و تجربه‌ای خاص برای هر بازدید",
  heroTitle: "ارائه‌ی تجربه‌ای لوکس در هر لحظه",
  heroSubtitle:
    "از اولین لمس تا آخرین لقمه، برند شما باید حس حرفه‌ای بودن را منتقل کند.",
  reservationSlots: initialReservationSlots,
};

export default function AdminSettingsPage() {
  const [settings, setSettings] =
    React.useState<SettingsDraftState>(initialSettings);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [savedMessage, setSavedMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // بارگذاری تنظیمات از API
  React.useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/settings", {
          credentials: "include",
        });
        if (res.ok) {
          const payload = await res.json();
          if (payload?.data) {
            setSettings((prev) => ({
              siteName: payload.data.siteName ?? prev.siteName,
              contactEmail: payload.data.contactEmail ?? prev.contactEmail,
              contactPhone: payload.data.contactPhone ?? prev.contactPhone,
              address: payload.data.address ?? prev.address,
              tagline: prev.tagline,
              heroTitle: prev.heroTitle,
              heroSubtitle: prev.heroSubtitle,
              reservationSlots:
                Array.isArray(payload.data.reservationSlots) &&
                payload.data.reservationSlots.length > 0
                  ? payload.data.reservationSlots.map(
                      (slot: ReservationSlotDraft) => ({
                        startHour: Number(slot.startHour),
                        endHour: Number(slot.endHour),
                        isActive: slot.isActive !== false,
                      }),
                    )
                  : prev.reservationSlots,
            }));
          }
        }
      } catch {
        // network error — use defaults
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSavedMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: settings.siteName,
          contactEmail: settings.contactEmail || null,
          contactPhone: settings.contactPhone || null,
          address: settings.address || null,
          reservationSlots: settings.reservationSlots,
        }),
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error ?? "خطا در ذخیره تنظیمات");
      }

      setSavedMessage("تنظیمات برند با موفقیت ذخیره شد.");
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (err) {
      // اصلاح شده: جلوگیری از خطای TypeScript در strict mode
      const message =
        err instanceof Error ? err.message : "خطا در ذخیره تنظیمات";
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="admin-hero rounded-md p-6 sm:p-8">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            در حال بارگذاری تنظیمات...
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="admin-hero rounded-md p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
          Brand Settings
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
          تنظیمات برند و متادیتا
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-400">
          داده‌های برند را در یک تجربه‌ی مدیریتی ساده اما حرفه‌ای نگه دارید.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>اطلاعات برند</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="siteName">نام سایت</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      siteName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">ایمیل تماس</Label>
                <Input
                  id="contactEmail"
                  value={settings.contactEmail}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      contactEmail: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactPhone">تلفن تماس</Label>
                <Input
                  id="contactPhone"
                  value={settings.contactPhone}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      contactPhone: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">آدرس</Label>
                <Input
                  id="address"
                  value={settings.address}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">شعار برند</Label>
              <Input
                id="tagline"
                value={settings.tagline}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    tagline: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="heroTitle">عنوان هدر</Label>
                <Input
                  id="heroTitle"
                  value={settings.heroTitle}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      heroTitle: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroSubtitle">زیرنویس هدر</Label>
                <Input
                  id="heroSubtitle"
                  value={settings.heroSubtitle}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      heroSubtitle: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {savedMessage ? (
              <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {savedMessage}
              </p>
            ) : null}

            {errorMessage ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <Button type="submit" disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>بازه‌های رزرو</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.reservationSlots.map((slot, index) => (
              <div
                key={`${slot.startHour}-${slot.endHour}-${index}`}
                className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950/40 md:grid-cols-[auto_1fr_1fr]"
              >
                <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={slot.isActive}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        reservationSlots: current.reservationSlots.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, isActive: event.target.checked }
                              : item,
                        ),
                      }))
                    }
                  />
                  فعال
                </label>

                <div className="space-y-2">
                  <Label htmlFor={`slot-start-${index}`}>ساعت شروع</Label>
                  <Input
                    id={`slot-start-${index}`}
                    type="number"
                    min={0}
                    max={23}
                    value={slot.startHour}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        reservationSlots: current.reservationSlots.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  startHour: Math.min(
                                    23,
                                    Math.max(
                                      0,
                                      Number(event.target.value) || 0,
                                    ),
                                  ),
                                }
                              : item,
                        ),
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`slot-end-${index}`}>ساعت پایان</Label>
                  <Input
                    id={`slot-end-${index}`}
                    type="number"
                    min={1}
                    max={24}
                    value={slot.endHour}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        reservationSlots: current.reservationSlots.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  endHour: Math.min(
                                    24,
                                    Math.max(
                                      1,
                                      Number(event.target.value) || 1,
                                    ),
                                  ),
                                }
                              : item,
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  reservationSlots: [
                    ...current.reservationSlots,
                    { startHour: 20, endHour: 22, isActive: true },
                  ],
                }))
              }
            >
              افزودن بازه‌ی رزرو
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>پیش‌نمای برند</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
            <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              {settings.siteName}
            </p>
            <p className="text-base font-medium text-stone-900 dark:text-stone-100">
              {settings.heroTitle}
            </p>
            <p>{settings.heroSubtitle}</p>
            <p>{settings.tagline}</p>
            <p>{settings.contactEmail}</p>
            <p>{settings.contactPhone}</p>
            <p>{settings.address}</p>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
