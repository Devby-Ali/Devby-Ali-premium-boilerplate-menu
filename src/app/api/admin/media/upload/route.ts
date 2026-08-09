// src/app/api/admin/media/upload/route.ts
// PRD §9.3: POST /api/admin/media/upload — admin-only media upload.

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { requireAdminSession } from "@/lib/auth";
import { mediaAssetsCol, type MediaAssetDoc } from "@/server/db";
import { getMediaStorage, validateUpload } from "@/server/media-storage";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "دسترسی غیرمجاز." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "فایلی برای آپلود ارسال نشده است." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validateUpload(buffer, file.type);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const stored = await getMediaStorage().save(buffer, file.type);

    // Track the asset (schema model MediaAsset — PRD §8). Ownership is linked
    // to a menu item when the item form is saved with this URL.
    const ownerType = typeof formData.get("ownerType") === "string"
      ? String(formData.get("ownerType"))
      : "unassigned";
    const doc: MediaAssetDoc = {
      _id: new ObjectId(),
      fileName: stored.fileName,
      url: stored.url,
      mimeType: stored.mimeType,
      size: stored.size,
      ownerType,
      ownerId: "",
      createdAt: new Date(),
    };
    try {
      await (await mediaAssetsCol()).insertOne(doc);
    } catch (assetError) {
      // The file is already stored — never fail the upload on bookkeeping.
      console.error("[MEDIA UPLOAD] asset record failed:", assetError);
    }

    return NextResponse.json(
      {
        data: {
          id: doc._id.toHexString(),
          url: stored.url,
          fileName: stored.fileName,
          mimeType: stored.mimeType,
          size: stored.size,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[MEDIA UPLOAD ERROR]", error);
    return NextResponse.json(
      { error: "آپلود تصویر با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
