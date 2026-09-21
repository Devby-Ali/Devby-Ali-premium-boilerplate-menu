// src/app/api/admin/waiter-calls/route.ts
// لیست و تغییر وضعیت فراخوان گارسون — همه نقش‌های پنل مجازند
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";

import { requireRole } from "@/lib/auth";
import { toObjectId, tablesCol, waiterCallsCol } from "@/server/db";

const ALLOWED_ROLES = ["SuperAdmin", "Manager", "Staff"] as const;

function unauthorized() {
  return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
}

export async function GET() {
  const session = await requireRole(ALLOWED_ROLES);
  if (!session) return unauthorized();

  try {
    const col = await waiterCallsCol();
    // ۵۰ فراخوان آخر کافی است؛ صفحه Real-time با SSE به‌روز می‌ماند
    const calls = await col
      .find()
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray();

    const tCol = await tablesCol();
    const tableIds = [...new Set(calls.map((c) => c.tableId))];
    const tables = await tCol
      .find({ _id: { $in: tableIds } })
      .project({ _id: 1, number: 1 })
      .toArray();
    const tableMap = new Map(tables.map((t) => [t._id.toHexString(), t.number]));

    const data = calls.map((c) => ({
      id: c._id.toHexString(),
      tableId: c.tableId.toHexString(),
      tableNumber: tableMap.get(c.tableId.toHexString()) ?? null,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[WAITER CALLS GET ERROR]", error);
    return NextResponse.json({ error: "دریافت فراخوان‌ها با خطا مواجه شد." }, { status: 500 });
  }
}

const patchSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["ACKNOWLEDGED", "RESOLVED"]),
});

export async function PATCH(request: NextRequest) {
  const session = await requireRole(ALLOWED_ROLES);
  if (!session) return unauthorized();

  try {
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات ورودی نامعتبر است.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const _id = toObjectId(parsed.data.id);
    if (!_id) {
      return NextResponse.json({ error: "شناسه فراخوان نامعتبر است." }, { status: 400 });
    }

    const col = await waiterCallsCol();
    const result = await col.findOneAndUpdate(
      { _id },
      {
        $set: {
          status: parsed.data.status,
          // کاربری که فراخوان را رسیدگی کرد، ثبت می‌شود
          userId: ObjectId.isValid(session.id) ? new ObjectId(session.id) : null,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "فراخوان یافت نشد." }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: result._id.toHexString(),
        tableId: result.tableId.toHexString(),
        status: result.status,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[WAITER CALLS PATCH ERROR]", error);
    return NextResponse.json({ error: "به‌روزرسانی فراخوان با خطا مواجه شد." }, { status: 500 });
  }
}
