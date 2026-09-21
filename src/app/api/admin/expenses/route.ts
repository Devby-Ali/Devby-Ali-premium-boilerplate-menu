// src/app/api/admin/expenses/route.ts
// ثبت و مدیریت هزینه‌های عملیاتی — مبنای محاسبه‌ی هزینه در گزارش‌گیری
// قرارداد مبلغ: ورودی به تومان (amountToman)، ذخیره به ریال (IRR)
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { tomanToRial } from "@/lib/price";
import { expensesCol, toObjectId, type ExpenseDoc } from "@/server/db";

const ALLOWED_ROLES = ["SuperAdmin", "Manager"] as const;

const createSchema = z.object({
  title: z.string().trim().min(1, "عنوان هزینه الزامی است"),
  amountToman: z.number().positive("مبلغ باید مثبت باشد"),
  spentAt: z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "تاریخ نامعتبر است",
    })
    .optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

const deleteSchema = z.object({
  id: z
    .string()
    .trim()
    .refine((value) => ObjectId.isValid(value), {
      message: "شناسه نامعتبر است",
    }),
});

const updateSchema = createSchema.extend({
  id: z
    .string()
    .trim()
    .refine((value) => ObjectId.isValid(value), {
      message: "شناسه نامعتبر است",
    }),
});

function unauthorized() {
  return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
}

function mapExpense(doc: ExpenseDoc) {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    /** ریال */
    amount: doc.amount,
    currency: doc.currency,
    spentAt: doc.spentAt.toISOString(),
    notes: doc.notes ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function GET() {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();
  try {
    const docs = await (
      await expensesCol()
    )
      .find({})
      .sort({ spentAt: -1 })
      .limit(200)
      .toArray();
    return NextResponse.json({ data: docs.map(mapExpense) });
  } catch (error) {
    console.error("[EXPENSES GET ERROR]", error);
    return NextResponse.json(
      { error: "دریافت هزینه‌ها با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();
  try {
    const parsed = createSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const doc: ExpenseDoc = {
      _id: new ObjectId(),
      title: parsed.data.title,
      amount: tomanToRial(parsed.data.amountToman),
      currency: "IRR",
      spentAt: parsed.data.spentAt ? new Date(parsed.data.spentAt) : now,
      notes: parsed.data.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await (await expensesCol()).insertOne(doc);
    return NextResponse.json({ data: mapExpense(doc) }, { status: 201 });
  } catch (error) {
    console.error("[EXPENSES POST ERROR]", error);
    return NextResponse.json(
      { error: "ثبت هزینه با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();
  try {
    const parsed = updateSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "اطلاعات ویرایش هزینه نامعتبر است.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const updated = await (
      await expensesCol()
    ).findOneAndUpdate(
      { _id: toObjectId(parsed.data.id)! },
      {
        $set: {
          title: parsed.data.title,
          amount: tomanToRial(parsed.data.amountToman),
          spentAt: parsed.data.spentAt ? new Date(parsed.data.spentAt) : now,
          notes: parsed.data.notes ?? null,
          updatedAt: now,
        },
      },
      { returnDocument: "after" },
    );
    if (!updated)
      return NextResponse.json({ error: "هزینه یافت نشد." }, { status: 404 });
    return NextResponse.json({ data: mapExpense(updated) });
  } catch (error) {
    console.error("[EXPENSES PUT ERROR]", error);
    return NextResponse.json(
      { error: "ویرایش هزینه با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();
  try {
    const parsed = deleteSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "شناسه هزینه نامعتبر است." },
        { status: 400 },
      );
    }

    const result = await (
      await expensesCol()
    ).deleteOne({ _id: toObjectId(parsed.data.id)! });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "هزینه یافت نشد." }, { status: 404 });
    }
    return NextResponse.json({ message: "هزینه حذف شد." });
  } catch (error) {
    console.error("[EXPENSES DELETE ERROR]", error);
    return NextResponse.json(
      { error: "حذف هزینه با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
