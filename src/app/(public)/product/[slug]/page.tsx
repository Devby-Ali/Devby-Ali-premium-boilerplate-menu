import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice, getMenuItemBySlug, menuItems } from "@/data/menu";

export function generateStaticParams() {
  return menuItems.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const product = getMenuItemBySlug(resolvedParams.slug);

  if (!product) {
    return {
      title: "محصول یافت نشد | Premium Menu",
      description: "محصولی با این شناسه در منوی دیجیتال موجود نیست.",
    };
  }

  return {
    title: `${product.title} | Premium Menu`,
    description: product.description,
    alternates: {
      canonical: `/product/${product.slug}`,
    },
  };
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = React.use(params);
  const product = getMenuItemBySlug(resolvedParams.slug);

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
              <CardTitle className="mt-2 text-3xl">{product.title}</CardTitle>
            </div>
            <Button asChild variant="outline">
              <Link href="/list">بازگشت به فهرست</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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
                {product.ingredients.map((ingredient) => (
                  <li key={ingredient} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-emerald-600" />
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[1.25rem] border border-stone-200 p-6 dark:border-stone-800">
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                داستان محصول
              </h3>
              <p className="mt-4 text-sm leading-7 text-stone-600 dark:text-stone-400">
                {product.story}
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-stone-500 dark:text-stone-400">
                <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                  زمان آماده‌سازی: {product.prepTime} دقیقه
                </span>
                <span className="rounded-full bg-stone-100 px-3 py-1 dark:bg-stone-800">
                  دسته: {product.category}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
