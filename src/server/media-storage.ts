// src/server/media-storage.ts
// ─────────────────────────────────────────────────────────────────────────────
// Media storage abstraction.
//
// MVP driver: local filesystem (`UPLOAD_DIR`, default `<projectRoot>/uploads`),
// served through `GET /api/media/[...path]` with immutable cache headers.
//
// The `MediaStorage` interface is intentionally provider-agnostic so a
// Cloudinary/S3 driver (PRD F3-T04 / UC-06) can be dropped in later without
// touching API routes or services.
//
// Hardening (PRD §12 / ROADMAP F3): 5MB cap, mime whitelist (jpg/png/webp/
// avif/gif), extension derived from the *validated* mime type (never from
// user input), and magic-byte sniffing so renamed executables are rejected.
// ─────────────────────────────────────────────────────────────────────────────

import { mkdir, writeFile, readFile } from "node:fs/promises";
import crypto from "node:crypto";

export interface StoredMedia {
  /** Public URL path, e.g. `/api/media/2026/abc123.webp` */
  url: string;
  /** Storage-relative file name (subfolder/file.ext) */
  fileName: string;
  mimeType: string;
  size: number;
}

export interface MediaStorage {
  save(buffer: Buffer, mimeType: string): Promise<StoredMedia>;
  read(fileName: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
}

// ------------------------------------------------------------------
// Validation config
// ------------------------------------------------------------------

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB per ROADMAP F3

/** mime → extension. The extension always comes from this map, never the upload. */
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

const EXT_TO_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(ALLOWED_MIME_TYPES).map(([mime, ext]) => [ext, mime]),
);

/** Verify the payload's magic bytes match the declared mime type. */
function sniffMatches(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  switch (mimeType) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case "image/gif":
      return buffer.subarray(0, 4).toString("ascii") === "GIF8";
    case "image/webp":
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    case "image/avif":
      return (
        buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
        buffer.subarray(8, 12).toString("ascii") === "avif"
      );
    default:
      return false;
  }
}

export function validateUpload(
  buffer: Buffer,
  mimeType: string,
): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_MIME_TYPES[mimeType]) {
    return {
      ok: false,
      error: "فرمت تصویر مجاز نیست (فقط jpg، png، webp، avif، gif).",
    };
  }
  if (buffer.length === 0) {
    return { ok: false, error: "فایل خالی است." };
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "حجم تصویر بیش از حد مجاز (۵ مگابایت) است." };
  }
  if (!sniffMatches(buffer, mimeType)) {
    return { ok: false, error: "محتوای فایل با فرمت اعلام‌شده مطابقت ندارد." };
  }
  return { ok: true };
}

// ------------------------------------------------------------------
// Local filesystem driver
// ------------------------------------------------------------------

function getUploadDir(): string {
  const uploadDir = process.env.UPLOAD_DIR?.trim() || "uploads";
  return uploadDir.replace(/\\+$/, "");
}

/** Strict guard against path traversal — only `subfolder/name.ext` shapes. */
export function isSafeMediaPath(fileName: string): boolean {
  return /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*\.(jpg|png|webp|avif|gif)$/.test(
    fileName,
  );
}

class LocalMediaStorage implements MediaStorage {
  async save(buffer: Buffer, mimeType: string): Promise<StoredMedia> {
    const ext = ALLOWED_MIME_TYPES[mimeType]!;
    // Group by year-month to keep directories small: uploads/2026-08/<rand>.webp
    const folder = new Date().toISOString().slice(0, 7);
    const fileName = `${folder}/${crypto.randomBytes(16).toString("hex")}.${ext}`;
    const uploadDir = getUploadDir();
    const absolute = `${uploadDir}/${fileName}`;

    await mkdir(`${uploadDir}/${folder}`, { recursive: true });
    await writeFile(absolute, buffer);

    return {
      url: `/api/media/${fileName}`,
      fileName,
      mimeType,
      size: buffer.length,
    };
  }

  async read(
    fileName: string,
  ): Promise<{ buffer: Buffer; mimeType: string } | null> {
    if (!isSafeMediaPath(fileName)) return null;
    const ext = fileName.split(".").pop()!;
    const mimeType = EXT_TO_MIME[ext];
    if (!mimeType) return null;

    try {
      const buffer = await readFile(`${getUploadDir()}/${fileName}`);
      return { buffer, mimeType };
    } catch {
      return null;
    }
  }
}

// ------------------------------------------------------------------
// Singleton accessor — swap here to introduce a Cloudinary/S3 driver.
// ------------------------------------------------------------------

let storage: MediaStorage | null = null;

export function getMediaStorage(): MediaStorage {
  if (!storage) storage = new LocalMediaStorage();
  return storage;
}
