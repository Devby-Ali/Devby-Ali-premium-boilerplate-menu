import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  createReservation,
  isReservationSlotAvailable,
} from "@/lib/reservation-service";

const reservationSchema = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{1,2}-\d{1,2}$/),
  guestName: z.string().trim().min(2).max(100),
  guestPhone: z.string().trim().min(8).max(20),
  guestCount: z.number().int().min(1).max(20),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const guestCount = Number(request.nextUrl.searchParams.get("guestCount") ?? "1");
  if (!date || !Number.isInteger(guestCount)) {
    return NextResponse.json({ error: "پارامترهای رزرو نامعتبر است." }, { status: 400 });
  }

  try {
    const available = await isReservationSlotAvailable(date, guestCount);
    return NextResponse.json({
      data: { date, slot: "20:00-22:00", available },
    });
  } catch (error) {
    console.error("[RESERVATION AVAILABILITY ERROR]", error);
    return NextResponse.json({ error: "بررسی ظرفیت رزرو با خطا مواجه شد." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const parsed = reservationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "اطلاعات رزرو نامعتبر است.", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const reservation = await createReservation(parsed.data);
    if (!reservation) {
      return NextResponse.json(
        { error: "برای این تاریخ و تعداد مهمان، میز مناسبی باقی نمانده است." },
        { status: 409 },
      );
    }
    return NextResponse.json({ data: reservation }, { status: 201 });
  } catch (error) {
    console.error("[RESERVATION CREATE ERROR]", error);
    return NextResponse.json({ error: "ثبت رزرو با خطا مواجه شد." }, { status: 500 });
  }
}
