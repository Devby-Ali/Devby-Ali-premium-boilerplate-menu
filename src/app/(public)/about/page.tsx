import Link from "next/link";
import type { Metadata } from "next";

import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "درباره ما",
  description: "آشنایی با کافه رستوران، ارزش‌های ما و تجربه‌ای که برای مهمانان خود می‌سازیم",
  alternates: { canonical: "/about" },
};

const pillars = [
  {
    title: "کیفیت بی رقیب",
    description: "هر آیتم منو با دقت انتخاب و با بهترین مواد اولیه تهیه می‌شود.",
  },
  {
    title: "تجربه متمایز",
    description: "فضایی آرام و حرفه‌ای برای لحظاتی که ارزش به‌یادماندن دارند.",
  },
  {
    title: "خدمات صادقانه",
    description: "تیم ما متعهد به ارائه خدمتی گرم، سریع و بدون تعارف است.",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900/80 lg:p-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <SectionHeading
              eyebrow="داستان ما"
              title="جایی که هر فنجان یک تجربه است."
              description="ما باور داریم که یک وعده خوب فراتر از طعم است — ترکیبی از فضا، خدمت و توجه به جزئیات که مهمان را به بازگشت دعوت می‌کند."
            />
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/list">مشاهده منو</Link>
              </Button>
            </div>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>ارزش‌های ما</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7">
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
