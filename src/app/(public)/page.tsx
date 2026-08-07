import type { Metadata } from "next";
import Link from "next/link";

import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice, getFeaturedMenuItems } from "@/data/menu";

export const metadata: Metadata = {
  title: "Premium Menu Boilerplate | منوی دیجیتال مدرن",
  description:
    "بویلرپلیت منوی دیجیتال مدرن برای کافه و رستوران با پنل ادمین و معماری آینده‌نگر",
  alternates: {
    canonical: "/",
  },
};

const highlights = [
  "Branding مدرن و هویت بصری حرفه‌ای",
  "منوی دیجیتال با جستجو، دسته‌بندی و جزئیات محصول",
  "پایه آماده برای سفارش، پرداخت و پنل ادمین در آینده",
];

export default function Home() {
  const featuredItems = getFeaturedMenuItems();

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-10 px-6 pb-16 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white/90 p-8 shadow-[0_25px_80px_-30px_rgba(47,107,79,0.35)] backdrop-blur dark:border-stone-800 dark:bg-stone-900/80 lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
              Phase 2 — Public Experience
            </span>
            <div className="space-y-4">
              <h2 className="text-4xl font-semibold leading-tight text-stone-900 dark:text-stone-100 sm:text-5xl">
                تجربه‌ای مدرن، سریع و لوکس برای منوی دیجیتال کافه شما
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-stone-600 dark:text-stone-300">
                این نسخه از Boilerplate با تمرکز بر برند، سئو، سرعت و تجربه
                کاربری طراحی شده است تا هم برای مشتری و هم برای مدیریت محتوا
                آماده باشد.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/about">درباره پروژه</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/list">مشاهده منو</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-stone-200 bg-[radial-gradient(circle_at_top,_rgba(47,107,79,0.18),_transparent_60%)] p-6 dark:border-stone-800">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400">
              ویژگى‌های فاز ۲
            </p>
            <ul className="mt-5 space-y-3 text-sm text-stone-700 dark:text-stone-300">
              {highlights.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>پیشنهادهای ویژه</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {featuredItems.map((item) => (
              <div
                key={item.slug}
                className="flex items-center justify-between gap-4 rounded-[1rem] border border-stone-200 px-4 py-3 dark:border-stone-800"
              >
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                    {item.description}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatPrice(item.price)}
                  </p>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link href={`/product/${item.slug}`}>جزئیات</Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>چرا این ساختار مناسب است؟</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-stone-600 dark:text-stone-400">
            <p>• طراحی کاملاً پاسخگو و بهینه برای موبایل و دسکتاپ</p>
            <p>• معماری آماده برای SSG و ISR برای نمایش سریع و بهینه</p>
            <p>
              • داده‌های منو در ساختار قابل توسعه و آماده برای دیتابیس واقعی
            </p>
            <p>• پایه‌ای مناسب برای پنل ادمین و سفارش‌گیری آینده</p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white/90 p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80 lg:p-10">
        <SectionHeading
          eyebrow="Brand story"
          title="یک تجربه بصری که برند شما را تقویت می‌کند"
          description="از نخستین لمس صفحه تا مشاهده جزئیات محصول، همه اجزا با هویت برند و تجربه کاربری حرفه‌ای هماهنگ‌اند."
          align="center"
        />
      </section>
    </main>
  );
}
