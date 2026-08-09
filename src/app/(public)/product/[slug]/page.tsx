import * as React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMenuItemBySlug as getMenuItemBySlugFromService, getAllMenuItems } from "@/lib/menu-service";

// ISR per PRD §7.4: /product/[slug] revalidates every 300s.
export const revalidate = 300;
// Segments not generated at build time are rendered on demand (then cached).
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const items = await getAllMenuItems();
    return items.filter((i) => i.isActive).map((item) => ({ slug: item.slug }));
  } catch (error) {
    // The database may be unreachable at build time (CI, cold deploy).
    // Returning [] defers rendering to runtime on-demand ISR instead of
    // failing the whole build.
    console.error("[PRODUCT PAGE] generateStaticParams failed:", error);
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
      title: "محصول یافت نشد | Premium Menu",
      description: "محصولی با این شناسه در منوی دیجیتال موجود نیست.",
    };
  }

  return {
    title: `${product.name} | Premium Menu`,
    description: product.description,
    alternates: {
      canonical: `/product/${product.slug}`,
    },
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

  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 lg:px-8">
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700 dark:text-emerald-400">
                Product Detail
              </p>
              <CardTitle className="mt-2 text-3xl">{product.name}</CardTitle>
            </div>
            <Button asChild variant="outline">
              <Link href="/list">بازگشت به فهرست</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[1.25rem] border border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-800">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                priority
                sizes="(min-width: 1024px) 64rem, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(47,107,79,0.15),_transparent_65%)] text-sm text-stone-400 dark:text-stone-500">
                تصویری برای این آیتم ثبت نشده است
              </div>
            )}
          </div>
          <p className="max-w-3xl text-lg leading-8 text-stone-600 dark:text-stone-400">
            {product.description}
          </p>
          <div className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-6 dark:border-stone-800 dark:bg-stone-950/60">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-stone-500 dark:text-stone-400">
              Price
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-700 dark:text-emerald-400">
              {formatPrice(product.price)}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.25rem] border border-stone-200 p-6 dark:border-stone-800">
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                مواد تشکیل‌دهنده
              </h3>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
                {(product.tags ?? []).map((ingredient) => (
                  <li key={ingredient} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-emerald-600" />
                    <span>{ingredient}</span>
                  </li>
                ))}
                {(product.tags ?? []).length === 0 && (
                  <li className="text-stone-400">اطلاعاتی ثبت نشده است.</li>
                )}
              </ul>
            </div>
            <div className="rounded-[1.25rem] border border-stone-200 p-6 dark:border-stone-800">
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                داستان محصول
              </h3>
              <p className="mt-4 text-sm leading-7 text-stone-600 dark:text-stone-400">
                {product.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-stone-500 dark:text-stone-400">
                {product.preparationTime != null && (
                  <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                    زمان آماده‌سازی: {product.preparationTime} دقیقه
                  </span>
                )}
                <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                  دسته: {product.category?.name ?? product.category?.slug ?? "نامشخص"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
