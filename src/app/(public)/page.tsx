// src/app/(public)/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { getMenuItems } from "@/lib/menu-service";
import { formatPrice } from "@/lib/price";
import { env } from "@/lib/env";
import { ArrowUpLeft, Clock3, Leaf, Sparkles } from "lucide-react";

export const revalidate = 60;

export { formatPrice };

export const metadata: Metadata = {
  title: "کافه | منوی دیجیتال",
  description: "منوی دیجیتال کافه — مشاهده آیتم‌ها، قیمت‌ها و پیشنهادهای ویژه",
  alternates: { canonical: "/" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "کافه رستوران",
  description: "منوی دیجیتال کافه رستوران و رزرو میز",
  url: env.APP_URL,
  servesCuisine: ["کافه", "رستوران"],
};

const highlights = [
  "قهوه تازه‌دم با دانه‌های منتخب از مزارع برتر",
  "دسرهای خانگی با مواد اولیه طبیعی",
  "فضای آرام و مناسب برای کار و دورهمی",
];

export default async function Home() {
  let featuredItems: Awaited<ReturnType<typeof getMenuItems>> = [];
  try {
    const items = await getMenuItems();
    featuredItems = items.filter((item) => item.isFeatured).slice(0, 2);
  } catch {
    // silent
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-16 px-6 pb-20 pt-8 lg:px-8 lg:pt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <section className="relative overflow-hidden border-y border-border py-12 lg:py-20">
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-secondary/15 blur-3xl" />
        <div className="relative grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-primary">
              <span className="h-px w-10 bg-primary" />
              روزمرگی، با طعم بهتر
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.15] tracking-tight text-foreground sm:text-7xl">
              مکثی آرام،
              <br />
              <span className="text-primary">طعم‌هایی ماندگار.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              منوی روز کافه را ببینید، میزتان را از قبل رزرو کنید و تجربه‌ای را
              انتخاب کنید که دقیقاً با حال امروزتان جور است.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/list">
                  مشاهده منو
                  <ArrowUpLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/reservation">رزرو میز</Link>
              </Button>
            </div>
          </div>

          <div className="glass-panel relative min-h-72 overflow-hidden rounded-md p-7 lg:min-h-96">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_20%,rgb(154_79_47_/_0.16),transparent_70%)]" />
            <div className="relative flex h-full flex-col justify-between gap-16">
              <div className="flex items-start justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-md bg-primary text-primary-foreground">
                  <Sparkles className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  EST. 2024
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">انتخاب امروز</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  یک فنجان خوب
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 border border-border px-2.5 py-1.5">
                    <Leaf className="h-3.5 w-3.5 text-primary" /> تازه و دست‌ساز
                  </span>
                  <span className="inline-flex items-center gap-1 border border-border px-2.5 py-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-accent" /> سرو سریع
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {featuredItems.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-secondary">
                از منوی امروز
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                پیشنهادهای ویژه
              </h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/list">
                دیدن همه <ArrowUpLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {featuredItems.map((item) => (
              <article
                key={item.slug}
                className="glass-panel group flex items-center justify-between gap-4 rounded-md p-4 transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center gap-4">
                  {item.imageUrl ? (
                    <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="4rem"
                        className="object-cover"
                      />
                    </span>
                  ) : null}
                  <div>
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-left">
                  <p className="text-sm font-semibold text-primary">
                    {formatPrice(item.price)}
                  </p>
                  <Link
                    className="mt-3 inline-flex text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                    href={`/product/${item.slug}`}
                  >
                    جزئیات
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-8 border-t border-border pt-12 md:grid-cols-3">
        <div className="md:col-span-1">
          <SectionHeading
            eyebrow="درباره ما"
            title="کیفیت در هر جزئیات"
            description="از انتخاب دانه‌های قهوه تا سرو نهایی، هر مرحله با دقت و علاقه انجام می‌شود."
          />
        </div>
        <div className="md:col-span-2 grid gap-3 sm:grid-cols-3">
          {highlights.map((item, index) => (
            <div
              key={item}
              className="border-s border-border px-5 py-2 first:border-0"
            >
              <span className="text-xs font-bold text-primary">
                0{index + 1}
              </span>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {item}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
