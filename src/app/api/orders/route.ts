import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createDineInOrder } from "@/lib/order-service";
import { tablesCol, toObjectId } from "@/server/db";

const orderSchema = z.object({
  tableId: z.string().trim().min(1),
  tableToken: z.string().uuid("شناسه میز نامعتبر است"),
  items: z
    .array(
      z.object({
        menuItemId: z.string().trim().min(1),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(50),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "اطلاعات سفارش نامعتبر است.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const tableOid = toObjectId(parsed.data.tableId);
    if (!tableOid) {
      return NextResponse.json({ error: "میز فعال یافت نشد." }, { status: 404 });
    }

    // جلوگیری از جعل tableId: باید با token مسیر QR مطابقت داشته باشد
    const table = await (await tablesCol()).findOne({
      _id: tableOid,
      token: parsed.data.tableToken,
      isActive: true,
    });
    if (!table) {
      return NextResponse.json({ error: "میز فعال یافت نشد." }, { status: 404 });
    }

    const order = await createDineInOrder({
      tableId: parsed.data.tableId,
      items: parsed.data.items,
      notes: parsed.data.notes,
    });
    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TABLE_NOT_FOUND") {
      return NextResponse.json({ error: "میز فعال یافت نشد." }, { status: 404 });
    }
    if (code === "INVALID_ITEMS" || code === "ITEM_NOT_AVAILABLE") {
      return NextResponse.json(
        { error: "یک یا چند آیتم سفارش دیگر قابل ثبت نیست." },
        { status: 409 },
      );
    }
    console.error("[PUBLIC ORDER CREATE ERROR]", error);
    return NextResponse.json({ error: "ثبت سفارش با خطا مواجه شد." }, { status: 500 });
  }
}
