// src/app/api/media/[...path]/route.ts
// Public serving endpoint for locally stored uploads (see media-storage.ts).
// Filenames are validated against a strict whitelist pattern, so path
// traversal is impossible; responses are immutable-cacheable because
// upload filenames are content-random and never reused.

import { NextRequest, NextResponse } from "next/server";

import { getMediaStorage } from "@/server/media-storage";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const fileName = path.join("/");

  const media = await getMediaStorage().read(fileName);
  if (!media) {
    return NextResponse.json({ error: "فایل یافت نشد." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(media.buffer), {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Length": String(media.buffer.length),
      // Uploads are immutable (random filenames) — safe to cache for a year.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'",
    },
  });
}
