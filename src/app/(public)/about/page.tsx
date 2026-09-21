import Link from "next/link";
import type { Metadata } from "next";

import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "درباره ما",
  description:
    "آشنایی با کافه رستوران، ارزش‌های ما و تجربه‌ای که برای مهمانان خود می‌سازیم",
  alternates: { canonical: "/about" },
};

const pillars = [
  {
    title: "کیفیت بی رقیب",
    description:
      "هر آیتم منو با دقت انتخاب و با بهترین مواد اولیه تهیه می‌شود.",
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
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-10 lg:px-8 lg:py-16">
      <section className="grid gap-12 border-b border-border pb-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div className="space-y-7">
          <SectionHeading
            eyebrow="داستان ما"
            title="جایی که هر فنجان، یک تجربه است."
            description="ما باور داریم که یک وعده خوب فراتر از طعم است — ترکیبی از فضا، خدمت و توجه به جزئیات که مهمان را به بازگشت دعوت می‌کند."
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/list">مشاهده منو</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/reservation">رزرو میز</Link>
            </Button>
          </div>
        </div>

        <div className="glass-panel rounded-md p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-secondary">
            قانون ساده ما
          </p>
          <p className="mt-4 text-2xl font-semibold leading-relaxed text-foreground">
            کمتر، بهتر، با دقت بیشتر.
          </p>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            از مواد اولیه تا آخرین جزئیات سرو، هر انتخاب باید دلیل خوبی داشته
            باشد.
          </p>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {pillars.map((pillar, index) => (
          <article
            key={pillar.title}
            className="border-s border-border px-5 py-2 first:border-0"
          >
            <span className="text-xs font-bold text-primary">0{index + 1}</span>
            <h2 className="mt-5 text-lg font-semibold text-foreground">
              {pillar.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {pillar.description}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
