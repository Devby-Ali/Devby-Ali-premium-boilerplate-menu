"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowUpRight, Sparkles, ShoppingBag, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MenuItemData {
  id: string;
  title: string;
  description: string;
  price: number;
  featured: boolean;
}

interface OrderStats {
  pending: number;
  processing: number;
  ready: number;
  delivered: number;
  cancelled: number;
}

function formatPrice(value: number) {
  return `\u200E${value.toLocaleString("fa-IR")} تومان`;
}

const quickLinks = [
  {
    href: "/admin/menu",
    title: "مدیریت منو",
    description: "ویرایش آیتم‌ها و دسته‌بندی‌ها",
  },
  {
    href: "/admin/orders",
    title: "سفارش‌ها",
    description: "پیگیری سفارش‌های در حال پردازش",
  },
  {
    href: "/admin/settings",
    title: "تنظیمات",
    description: "به‌روزرسانی برند و متادیتا",
  },
  {
    href: "/admin/users",
    title: "کاربران",
    description: "مدیریت دسترسی‌ها و نقش‌ها",
  },
];

export default function AdminPage() {
  const [itemCount, setItemCount] = React.useState(0);
  const [catCount, setCatCount] = React.useState(0);
  const [orderCount, setOrderCount] = React.useState(0);
  const [featuredItems, setFeaturedItems] = React.useState<MenuItemData[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        const [menuRes, orderStatsRes] = await Promise.all([
          fetch("/api/admin/menu", { credentials: "include" }),
          fetch("/api/admin/orders?stats=true", { credentials: "include" }),
        ]);

        if (menuRes.ok) {
          const payload = await menuRes.json();
          if (payload?.data) {
            const items = payload.data as MenuItemData[];
            setItemCount(items.length);
            setFeaturedItems(
              items.filter((i: MenuItemData) => i.featured).slice(0, 2),
            );
          }
          if (payload?.categories) {
            setCatCount((payload.categories as any[]).length);
          }
        }

        if (orderStatsRes.ok) {
          const payload = await orderStatsRes.json();
          if (payload?.data) {
            const s = payload.data as OrderStats;
            setOrderCount(
              s.pending + s.processing + s.ready + s.delivered + s.cancelled,
            );
          }
        }
      } catch {
        // silent fail — show zeros
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const stats = [
    { label: "آیتم‌های منو", value: String(itemCount) },
    { label: "دسته‌بندی‌های فعال", value: String(catCount) },
    { label: "کل سفارش‌ها", value: String(orderCount) },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80 lg:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
              Admin Panel
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
              داشبورد مدیریت منو
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 dark:text-stone-400">
              پنل شما در حال حاضر برای مدیریت محتوای برند، منو و تجربه مشتری
              آماده است.
            </p>
          </div>
          <Button asChild>
            <Link href="/">بازگشت به سایت</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle>{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-emerald-700 dark:text-emerald-400">
                {loading ? "..." : stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>امکانات پنل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
            <p>• مدیریت دسته‌بندی‌ها و آیتم‌های منو با فرم‌های سریع</p>
            <p>• نمایش وضعیت سفارش‌ها و دسترسی‌های کاربر</p>
            <p>• تنظیمات برند و متادیتا برای تجربه حرفه‌ای‌تر</p>
            <p>
              • زیرساخت آماده برای سفارش، پرداخت و کنترل دسترسی در مرحله بعد
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>وضعیت احراز هویت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
            <p>حالت فعلی: آماده برای ورود با ایمیل و رمز عبور</p>
            <p>نقش MVP: Admin</p>
            <p>آماده برای توسعه به RBAC حرفه‌ای در مراحل بعدی</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>پیشنهادهای امروز</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {featuredItems.length > 0 ? (
              featuredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950/50"
                >
                  <div>
                    <p className="font-semibold text-stone-900 dark:text-stone-100">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                      {item.description}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatPrice(item.price)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-500">
                {loading ? "در حال بارگذاری..." : "هیچ آیتم ویژه‌ای یافت نشد."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>اقدامات سریع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
            <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950/50">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>به‌روزرسانی آیتم‌های ویژه منو</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950/50">
              <ShoppingBag className="h-4 w-4 text-emerald-600" />
              <span>بررسی سفارش‌های در انتظار</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950/50">
              <Users2 className="h-4 w-4 text-emerald-600" />
              <span>مشاهده دسترسی‌های کاربر</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className="block">
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <CardTitle>{link.title}</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-stone-500" />
              </CardHeader>
              <CardContent className="text-sm leading-7 text-stone-600 dark:text-stone-400">
                {link.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
