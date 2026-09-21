// src/app/(public)/product/[slug]/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock3, Leaf, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getMenuItemBySlug as getMenuItemBySlugFromService,
  getAllMenuItems,
} from "@/lib/menu-service";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const items = await getAllMenuItems();
    return items.filter((i) => i.isActive).map((item) => ({ slug: item.slug }));
  } catch {
    return [];
  }
}

function formatPrice(value: number) {
  return `${value.toLocaleString("fa-IR")} تومان`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getMenuItemBySlugFromService(slug);

  if (!product) {
    return {
      title: "محصول یافت نشد",
      description: "این آیتم در منو موجود نیست.",
    };
  }

  return {
    title: `${product.name} | منو`,
    description: product.description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.imageUrl ? [product.imageUrl] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getMenuItemBySlugFromService(slug);

  if (!product) notFound();

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8 lg:py-14">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/list"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت به منو
        </Link>
        <span className="text-xs font-bold uppercase tracking-[0.24em] text-secondary">
          جزئیات انتخاب
        </span>
      </div>

      <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
        <div className="glass-panel relative min-h-[25rem] overflow-hidden rounded-md lg:min-h-[38rem]">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgb(154_79_47_/_0.2),transparent_65%)] text-sm text-muted-foreground">
              بدون تصویر
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-6 pt-28 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
              {product.category?.name ?? product.category?.slug}
            </p>
            <p className="mt-2 text-sm text-white/80">
              انتخابی دست‌ساز برای حال خوب شما
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between py-2 lg:py-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">
              <Sparkles className="h-4 w-4" />
              از منوی کافه
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground">
              {product.description}
            </p>
          </div>

          <div className="mt-10 space-y-8">
            <div className="flex items-end justify-between gap-4 border-y border-border py-5">
              <span className="text-sm text-muted-foreground">قیمت نهایی</span>
              <span className="text-3xl font-semibold text-primary">
                {formatPrice(product.price)}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {product.preparationTime != null ? (
                <div className="border border-border bg-surface-raised p-4">
                  <Clock3 className="h-5 w-5 text-accent" />
                  <p className="mt-4 text-xs text-muted-foreground">
                    زمان آماده‌سازی
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {product.preparationTime} دقیقه
                  </p>
                </div>
              ) : null}
              <div className="border border-border bg-surface-raised p-4">
                <Leaf className="h-5 w-5 text-primary" />
                <p className="mt-4 text-xs text-muted-foreground">وضعیت</p>
                <p className="mt-1 font-semibold text-foreground">
                  {product.inStock ? "موجود و آماده سفارش" : "فعلاً ناموجود"}
                </p>
              </div>
            </div>

            {(product.tags ?? []).length > 0 ? (
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  ترکیبات و ویژگی‌ها
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="border border-border px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/list">بازگشت به انتخاب‌های منو</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
