// src/app/(public)/t/[token]/page.tsx
// استراتژی: dynamic (force-dynamic) — چون محتوا به token و وضعیت میز وابسته است
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { tablesCol } from "@/server/db";
import { getMenuItems, getCategories } from "@/lib/menu-service";
import { MenuView } from "./menu-view";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const col = await tablesCol();
  const table = await col.findOne({ qrToken: token, isActive: true });

  if (!table) return { title: "میز یافت نشد" };

  return {
    title: `میز ${table.number} | منوی دیجیتال`,
    description: "منوی کافه رستوران — سفارش از میز",
  };
}

export default async function TableMenuPage({ params }: Props) {
  const { token } = await params;

  const col = await tablesCol();
  const table = await col.findOne({ qrToken: token, isActive: true });

  if (!table) notFound();

  const [items, categories] = await Promise.all([
    getMenuItems(),
    getCategories(),
  ]);

  return (
    <MenuView
      tableNumber={table.number}
      tableId={table._id.toString()}
      items={items}
      categories={categories}
    />
  );
}
