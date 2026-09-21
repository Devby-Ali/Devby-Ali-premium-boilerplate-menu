import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  getOrders,
  getOrderStats,
  updateOrderStatus,
} from "@/lib/order-service";

const ALLOWED_ROLES = ["SuperAdmin", "Manager", "Staff"] as const;

function unauthorized() {
  return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const stats = searchParams.get("stats") === "true";

    if (stats) {
      const orderStats = await getOrderStats();
      return NextResponse.json({ data: orderStats });
    }

    const orders = await getOrders();
    const filtered =
      status && status !== "all"
        ? orders.filter((o) => o.status === status)
        : orders;

    return NextResponse.json({ data: filtered });
  } catch (error) {
    console.error("[ORDERS GET ERROR]", error);
    return NextResponse.json(
      { error: "دریافت سفارش‌ها با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();
  try {
    const body = await request.json();
    const parsed = z
      .object({
        id: z.string().trim().min(1),
        status: z.enum([
          "PENDING",
          "PROCESSING",
          "READY",
          "DELIVERED",
          "CANCELLED",
        ]),
      })
      .safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const order = await updateOrderStatus(parsed.data.id, parsed.data.status);
    if (!order) {
      return NextResponse.json({ error: "سفارش یافت نشد." }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error("[ORDERS UPDATE ERROR]", error);
    return NextResponse.json(
      { error: "به‌روزرسانی سفارش با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
