"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsDraftState {
  siteName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
}

const initialSettings: SettingsDraftState = {
  siteName: "Premium Menu",
  contactEmail: "hello@premiummenu.test",
  contactPhone: "",
  address: "تهران، خیابان ...",
  tagline: "طعم‌های لوکس و تجربه‌ای خاص برای هر بازدید",
  heroTitle: "ارائه‌ی تجربه‌ای لوکس در هر لحظه",
  heroSubtitle:
    "از اولین لمس تا آخرین لقمه، برند شما باید حس حرفه‌ای بودن را منتقل کند.",
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
        const res = await fetch("/api/admin/settings", { credentials: "include" });
        if (res.ok) {
          const payload = await res.json();
          if (payload?.data) {
            setSettings((prev) => ({
              siteName: payload.data.siteName ?? prev.siteName,
              contactEmail: payload.data.contactEmail ?? prev.contactEmail,
              contactPhone: payload.data.contactPhone ?? prev.contactPhone,
              address: payload.data.address ?? prev.address,
              // tagline و heroTitle و heroSubtitle در settings-service نیستند
              // بنابراین از مقادیر پیش‌فرض استفاده می‌کنیم
              tagline: prev.tagline,
              heroTitle: prev.heroTitle,
              heroSubtitle: prev.heroSubtitle,
            }));
          }
        } else {
          // fallback: از مقادیر پیش‌فرض استفاده کن
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
        }),
      });

      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error ?? "خطا در ذخیره تنظیمات");
      }

      setSavedMessage("تنظیمات برند با موفقیت ذخیره شد.");
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err?.message ?? "خطا در ذخیره تنظیمات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            در حال بارگذاری تنظیمات...
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
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
