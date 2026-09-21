import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import {
  listReservations,
  updateReservationStatus,
} from "@/lib/reservation-service";

const ALLOWED_ROLES = ["SuperAdmin", "Manager"] as const;

function unauthorized() {
  return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
}

export async function GET() {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();

  try {
    return NextResponse.json({ data: await listReservations() });
  } catch (error) {
    console.error("[ADMIN RESERVATIONS GET ERROR]", error);
    return NextResponse.json({ error: "دریافت رزروها با خطا مواجه شد." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();

  const parsed = z
    .object({
      id: z.string().trim().min(1),
      status: z.enum(["CONFIRMED", "CANCELLED", "COMPLETED"]),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات تغییر وضعیت نامعتبر است." }, { status: 400 });
  }

  try {
    const reservation = await updateReservationStatus(parsed.data.id, parsed.data.status);
    if (!reservation) {
      return NextResponse.json({ error: "رزرو یافت نشد." }, { status: 404 });
    }
    return NextResponse.json({ data: reservation });
  } catch (error) {
    console.error("[ADMIN RESERVATIONS UPDATE ERROR]", error);
    return NextResponse.json({ error: "تغییر وضعیت رزرو با خطا مواجه شد." }, { status: 500 });
  }
}
