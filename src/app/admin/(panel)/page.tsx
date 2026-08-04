import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "آیتم‌های منو", value: "24" },
  { label: "دسته‌بندی‌ها", value: "6" },
  { label: "سفارش‌های امروز", value: "11" },
];

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

export const metadata = {
  title: "پنل ادمین | Premium Menu",
  description: "داشبورد مدیریت محتوای منو و ساختار آینده‌نگر",
};

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-4xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80 lg:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
              Admin Panel
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-900 dark:text-stone-100">
              داشبورد مدیریت منو
            </h1>
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
                {stat.value}
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
            <p>• مدیریت دسته‌بندی‌ها و آیتم‌ها</p>
            <p>• آپلود و مدیریت تصاویر</p>
            <p>• تنظیمات برند و متادیتا</p>
            <p>• زیرساخت آماده برای سفارش و پرداخت</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>وضعیت احراز هویت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
            <p>حالت فعلی: آماده برای ورود با ایمیل/شماره همراه و رمز عبور</p>
            <p>نقش MVP: Admin</p>
            <p>آماده برای توسعه به RBAC حرفه‌ای در مراحل بعدی</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className="block">
            <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader>
                <CardTitle>{link.title}</CardTitle>
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
