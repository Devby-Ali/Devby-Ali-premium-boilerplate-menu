import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { getReport } from "@/lib/report-service";

const ALLOWED_ROLES = ["SuperAdmin", "Manager"] as const;
const periodSchema = z.enum(["weekly", "monthly", "yearly"]).default("monthly");

export async function GET(request: NextRequest) {
  if (!(await requireRole(ALLOWED_ROLES))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
  }
  const period = periodSchema.safeParse(request.nextUrl.searchParams.get("period"));
  if (!period.success) {
    return NextResponse.json({ error: "بازه‌ی گزارش نامعتبر است." }, { status: 400 });
  }
  try {
    return NextResponse.json({ data: await getReport(period.data) });
  } catch (error) {
    console.error("[REPORTS GET ERROR]", error);
    return NextResponse.json({ error: "دریافت گزارش با خطا مواجه شد." }, { status: 500 });
  }
}
