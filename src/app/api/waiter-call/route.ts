// src/app/api/waiter-call/route.ts
import { NextRequest, NextResponse } from "next/server";
import { waiterCallsCol, tablesCol } from "@/server/db";
import { ObjectId } from "mongodb";
import { z } from "zod";

const schema = z.object({
  tableId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "داده نامعتبر است." }, { status: 400 });
    }

    const { tableId } = parsed.data;

    // اعتبارسنجی وجود میز
    const tables = await tablesCol();
    const tableOid = ObjectId.isValid(tableId) ? new ObjectId(tableId) : null;
    if (!tableOid) {
      return NextResponse.json({ error: "شناسه میز نامعتبر است." }, { status: 400 });
    }

    const table = await tables.findOne({ _id: tableOid, isActive: true });
    if (!table) {
      return NextResponse.json({ error: "میز یافت نشد." }, { status: 404 });
    }

    // جلوگیری از ارسال تکراری — اگر در ۲ دقیقه گذشته درخواست pending وجود دارد
    const calls = await waiterCallsCol();
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const existing = await calls.findOne({
      tableId: tableOid,
      status: "PENDING",
      createdAt: { $gte: twoMinutesAgo },
    });

    if (existing) {
      return NextResponse.json(
        { error: "درخواست قبلی هنوز در انتظار پاسخ است." },
        { status: 429 }
      );
    }

    const now = new Date();
    await calls.insertOne({
      _id: new ObjectId(),
      tableId: tableOid,
      userId: null,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WAITER CALL ERROR]", error);
    return NextResponse.json({ error: "خطای سرور." }, { status: 500 });
  }
}
