"use client";

import * as React from "react";

import { AdminShell } from "@/app/admin/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsDraftState {
  siteName: string;
  contactEmail: string;
  address: string;
  tagline: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = React.useState<SettingsDraftState>({
    siteName: "Premium Menu",
    contactEmail: "hello@premiummenu.test",
    address: "تهران، خیابان ...",
    tagline: "طعم‌های لوکس و تجربه‌ای خاص برای هر بازدید",
  });
  const [savedMessage, setSavedMessage] = React.useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSavedMessage("تنظیمات برند با موفقیت ذخیره شد.");
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <section className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
            Brand Settings
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
            تنظیمات برند و متادیتا
          </h1>
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

              {savedMessage ? (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {savedMessage}
                </p>
              ) : null}

              <Button type="submit">ذخیره تنظیمات</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>پیش‌نمایش برند</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-7 text-stone-600 dark:text-stone-400">
              <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                {settings.siteName}
              </p>
              <p>{settings.tagline}</p>
              <p>{settings.contactEmail}</p>
              <p>{settings.address}</p>
            </CardContent>
          </Card>
        </form>
      </div>
    </AdminShell>
  );
}
