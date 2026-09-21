// src/app/api/admin/tables/route.ts
// API مدیریت میزها — CRUD + تولید token (UUID v4)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { tablesCol, ordersCol, toObjectId, type TableDoc } from "@/server/db";
import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";
import type { Table } from "@/types";

const ALLOWED_ROLES = ["SuperAdmin", "Manager"] as const;

function unauthorized() {
  return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
}

function notFound() {
  return NextResponse.json({ error: "میز یافت نشد." }, { status: 404 });
}

function mapTable(doc: TableDoc): Table {
  return {
    id: doc._id.toHexString(),
    number: doc.number,
    token: doc.token,
    capacity: doc.capacity,
    isActive: doc.isActive,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

const createTableSchema = z.object({
  number: z
    .number()
    .int()
    .positive({ message: "شماره میز باید عدد مثبت باشد." }),
  capacity: z.number().int().min(1).max(20).default(2),
  isActive: z.boolean().default(true),
});

const updateTableSchema = z.object({
  id: z.string().trim().min(1),
  number: z.number().int().positive().optional(),
  capacity: z.number().int().min(1).max(20).optional(),
  isActive: z.boolean().optional(),
});

const deleteTableSchema = z.object({
  id: z.string().trim().min(1),
});

export async function GET(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();

  try {
    const { searchParams } = request.nextUrl;
    const stats = searchParams.get("stats") === "true";
    const col = await tablesCol();

    if (stats) {
      const [total, active, inactive] = await Promise.all([
        col.countDocuments(),
        col.countDocuments({ isActive: true }),
        col.countDocuments({ isActive: false }),
      ]);
      return NextResponse.json({ data: { total, active, inactive } });
    }

    const tables = await col.find({}).sort({ number: 1 }).toArray();
    return NextResponse.json({ data: tables.map(mapTable) });
  } catch (error) {
    console.error("[TABLES GET ERROR]", error);
    return NextResponse.json(
      { error: "دریافت میزها با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();

  try {
    const body = await request.json();
    const parsed = createTableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const col = await tablesCol();
    const existing = await col.findOne({ number: parsed.data.number });
    if (existing) {
      return NextResponse.json(
        { error: `میز شماره ${parsed.data.number} قبلاً ثبت شده است.` },
        { status: 409 },
      );
    }

    const now = new Date();
    const doc: TableDoc = {
      _id: new ObjectId(),
      number: parsed.data.number,
      capacity: parsed.data.capacity,
      isActive: parsed.data.isActive,
      token: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    await col.insertOne(doc);
    return NextResponse.json({ data: mapTable(doc) }, { status: 201 });
  } catch (error) {
    console.error("[TABLES POST ERROR]", error);
    return NextResponse.json(
      { error: "ایجاد میز با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();

  try {
    const body = await request.json();
    const parsed = updateTableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { id, ...data } = parsed.data;
    const oid = toObjectId(id);
    if (!oid) {
      return NextResponse.json(
        { error: "شناسه میز نامعتبر است." },
        { status: 400 },
      );
    }

    const col = await tablesCol();

    if (data.number !== undefined) {
      const conflict = await col.findOne({
        number: data.number,
        _id: { $ne: oid },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `میز شماره ${data.number} قبلاً ثبت شده است.` },
          { status: 409 },
        );
      }
    }

    const table = await col.findOneAndUpdate(
      { _id: oid },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!table) return notFound();
    return NextResponse.json({ data: mapTable(table) });
  } catch (error) {
    console.error("[TABLES PATCH ERROR]", error);
    return NextResponse.json(
      { error: "به‌روزرسانی میز با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();

  try {
    const body = await request.json();
    const parsed = deleteTableSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "شناسه میز نامعتبر است." },
        { status: 400 },
      );
    }

    const oid = toObjectId(parsed.data.id);
    if (!oid) {
      return NextResponse.json(
        { error: "شناسه میز نامعتبر است." },
        { status: 400 },
      );
    }

    const tCol = await tablesCol();
    const oCol = await ordersCol();

    const activeOrders = await oCol.countDocuments({
      tableId: oid,
      status: { $in: ["PENDING", "PROCESSING", "READY"] },
    });

    if (activeOrders > 0) {
      const table = await tCol.findOneAndUpdate(
        { _id: oid },
        { $set: { isActive: false, updatedAt: new Date() } },
        { returnDocument: "after" },
      );
      if (!table) return notFound();
      return NextResponse.json({
        data: mapTable(table),
        message: "میز دارای سفارش فعال است و غیرفعال شد.",
      });
    }

    const result = await tCol.deleteOne({ _id: oid });
    if (result.deletedCount === 0) return notFound();

    return NextResponse.json({ message: "میز با موفقیت حذف شد." });
  } catch (error) {
    console.error("[TABLES DELETE ERROR]", error);
    return NextResponse.json(
      { error: "حذف میز با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
