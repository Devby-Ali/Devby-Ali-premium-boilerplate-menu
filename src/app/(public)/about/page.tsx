import Link from "next/link";

import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "درباره ما | Premium Menu",
  description:
    "معرفی برند و فلسفه منوی دیجیتال مدرن با تجربه کاربری حرفه‌ای و آماده برای توسعه آینده",
  alternates: {
    canonical: "/about",
  },
};

const pillars = [
  { title: "هویت برند", description: "طراحی بصری منسجم با حس لوکس و آرامش." },
  {
    title: "سرعت تجربه",
    description: "انتقال سریع اطلاعات و دسترسی روان به منو و جزئیات.",
  },
  {
    title: "آماده‌سازی برای آینده",
    description: "زیرساختی که برای پنل ادمین و سفارش‌گیری در آینده آماده است.",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80 lg:p-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <SectionHeading
              eyebrow="About the experience"
              title="یک منوی دیجیتال مدرن که حس برند و کیفیت را منتقل می‌کند."
              description="این پروژه با تمرکز روی زیبایی، سرعت و آماده‌بودن برای توسعه آینده طراحی شده است. هدف ما ارائه یک تجربه شفاف، لوکس و قابل مدیریت برای برندهای رستورانی است."
            />
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/list">مشاهده منو</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin">ورود پنل ادمین</Link>
              </Button>
            </div>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>مزیت‌های اصلی</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-stone-600 dark:text-stone-400">
              {pillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-950/60"
                >
                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                    {pillar.title}
                  </p>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
