import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  getSettings,
  updateSettings,
  type UpdateSettingsInput,
} from "@/lib/settings-service";

const ALLOWED_ROLES = ["SuperAdmin"] as const;

function unauthorized() {
  return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
}

const slotSchema = z
  .object({
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
    isActive: z.boolean().default(true),
  })
  .refine((slot) => slot.startHour < slot.endHour, {
    message: "ساعت پایان باید بزرگ‌تر از شروع باشد.",
    path: ["endHour"],
  });

const updateSchema = z.object({
  siteName: z.string().trim().min(1).optional(),
  primaryColor: z.string().trim().min(1).optional(),
  secondaryColor: z.string().trim().min(1).optional(),
  accentColor: z.string().trim().min(1).optional(),
  themeMode: z.enum(["light", "dark", "system"]).optional(),
  contactPhone: z.string().trim().nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  reservationSlots: z.array(slotSchema).optional(),
});

export async function GET() {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();
  try {
    const settings = await getSettings();
    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("[SETTINGS GET ERROR]", error);
    return NextResponse.json(
      { error: "دریافت تنظیمات با خطا مواجه شد." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) return unauthorized();
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    const settings = await updateSettings(parsed.data as UpdateSettingsInput);
    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("[SETTINGS UPDATE ERROR]", error);
    return NextResponse.json(
      { error: "به‌روزرسانی تنظیمات با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
