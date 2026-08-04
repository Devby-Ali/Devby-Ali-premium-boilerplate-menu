import { NextResponse } from "next/server";

import type { ApiResponse } from "@/types";

// ------------------------------------------------------------------
//  پاسخ موفق استاندارد API
// ------------------------------------------------------------------
export function apiSuccess<T>(
  data: T,
  init?: number | ResponseInit
): NextResponse<ApiResponse<T>> {
  const responseInit = typeof init === "number" ? { status: init } : init;

  return NextResponse.json<ApiResponse<T>>({ data }, responseInit);
}

// ------------------------------------------------------------------
//  پاسخ خطای استاندارد API
// ------------------------------------------------------------------
export function apiError(
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiResponse> {
  const body: ApiResponse & { details?: unknown } = { error: message };
  if (details !== undefined) {
    body.details = details;
  }

  return NextResponse.json(body, { status });
}
