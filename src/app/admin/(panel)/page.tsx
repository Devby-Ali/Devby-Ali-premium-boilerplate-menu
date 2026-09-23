// src/app/admin/(panel)/page.tsx
import Link from "next/link";
import { ArrowUpRight, Sparkles, ShoppingBag, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllMenuItems, getCategories } from "@/lib/menu-service";
import { getOrderStats } from "@/lib/order-service";

// ─── helpers ─────────────────────────────────────────────────────────────────

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
    href: "/admin/tables",
    title: "میز ها",
    description: "مدیریت میزها و ظرف‌ها",
  },
  {
    href: "/admin/users",
    title: "کاربران",
    description: "مدیریت دسترسی‌ها و نقش‌ها",
  },
];

// ─── page (Server Component) ──────────────────────────────────────────────────
// داده‌ها مستقیماً از Service Layer خوانده می‌شوند — بدون HTTP round-trip

export default async function AdminPage() {
  // هر سه درخواست موازی اجرا می‌شوند
  const [items, categories, orderStats] = await Promise.allSettled([
    getAllMenuItems(),
    getCategories(),
    getOrderStats(),
  ]);

  // مقادیر امن با fallback به صفر در صورت خطا
  const allItems = items.status === "fulfilled" ? items.value : [];
  const allCats = categories.status === "fulfilled" ? categories.value : [];
  const stats = orderStats.status === "fulfilled" ? orderStats.value : null;

  const itemCount = allItems.length;
  const catCount = allCats.length;
  const orderCount = stats
    ? stats.PENDING +
      stats.PROCESSING +
      stats.READY +
      stats.DELIVERED +
      stats.CANCELLED
    : 0;

  // آیتم‌های ویژه — حداکثر ۲ آیتم
  const featuredItems = allItems.filter((i) => i.isFeatured).slice(0, 2);

  const dashboardStats = [
    { label: "آیتم‌های منو", value: itemCount },
    { label: "دسته‌بندی‌های فعال", value: catCount },
    { label: "کل سفارش‌ها", value: orderCount },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="admin-hero rounded-md p-6 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-primary">
              Admin Panel
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-foreground">
              داشبورد مدیریت منو
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              پنل شما در حال حاضر برای مدیریت محتوای برند، منو و تجربه مشتری
              آماده است.
            </p>
          </div>
          <Button asChild>
            <Link href="/">بازگشت به سایت</Link>
          </Button>
        </div>
      </section>

      {/* ─── Stats ────────────────────────────────────────────────────────── */}
      <section className="grid gap-6 md:grid-cols-3">
        {dashboardStats.map((stat) => (
          <Card key={stat.label} className="rounded-[1.2rem]">
            <CardHeader>
              <CardTitle>{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums text-primary">
                {stat.value.toLocaleString("fa-IR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* ─── Featured + Quick Actions ─────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[1.2rem]">
          <CardHeader>
            <CardTitle>پیشنهادهای امروز</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {featuredItems.length > 0 ? (
              featuredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-[1rem] border border-border/80 bg-surface-raised/80 p-4"
                >
                  <div>
                    <p className="font-semibold text-foreground">{item.name}</p>
                    {item.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-primary">
                    {formatPrice(item.price)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                هیچ آیتم ویژه‌ای یافت نشد.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.2rem]">
          <CardHeader>
            <CardTitle>اقدامات سریع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                { icon: Sparkles, label: "به‌روزرسانی آیتم‌های ویژه منو" },
                { icon: ShoppingBag, label: "بررسی سفارش‌های در انتظار" },
                { icon: Users2, label: "مشاهده دسترسی‌های کاربر" },
              ] as const
            ).map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[1rem] border border-border/80 bg-surface-raised/80 p-4 text-sm leading-7 text-muted-foreground"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span>{label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ─── Quick Links ──────────────────────────────────────────────────── */}
      <section className="grid gap-6 md:grid-cols-2">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className="block">
            <Card className="h-full rounded-[1.2rem] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_42px_-30px_rgba(26,38,32,0.45)]">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <CardTitle>{link.title}</CardTitle>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="text-sm leading-7 text-muted-foreground">
                {link.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
