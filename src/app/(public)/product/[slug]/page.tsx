// src/app/(public)/product/[slug]/page.tsx
import * as React from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 lg:px-8">
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {product.category?.name ?? product.category?.slug}
              </p>
              <CardTitle className="mt-1 text-3xl">{product.name}</CardTitle>
            </div>
            <Button asChild variant="outline">
              <Link href="/list">بازگشت به منو</Link>
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
                بدون تصویر
              </div>
            )}
          </div>

          <p className="max-w-3xl text-lg leading-8 text-stone-600 dark:text-stone-400">
            {product.description}
          </p>

          <div className="rounded-[1.25rem] border border-stone-200 bg-stone-50 p-6 dark:border-stone-800 dark:bg-stone-950/60">
            <p className="text-3xl font-semibold text-emerald-700 dark:text-emerald-400">
              {formatPrice(product.price)}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {(product.tags ?? []).length > 0 && (
              <div className="rounded-[1.25rem] border border-stone-200 p-6 dark:border-stone-800">
                <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                  مواد تشکیل‌دهنده
                </h3>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-stone-600 dark:text-stone-400">
                  {(product.tags ?? []).map((tag) => (
                    <li key={tag} className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                      <span>{tag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {product.preparationTime != null && (
              <div className="rounded-[1.25rem] border border-stone-200 p-6 dark:border-stone-800">
                <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                  اطلاعات
                </h3>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-stone-500 dark:text-stone-400">
                  <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                    زمان آماده‌سازی: {product.preparationTime} دقیقه
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
