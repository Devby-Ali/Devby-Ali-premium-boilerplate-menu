// src/lib/slug.ts
// Unicode-aware slug utilities.
//
// The previous ASCII-only slugify stripped every Persian/Arabic character,
// producing empty ("") or colliding ("-") slugs for Persian titles — which
// made /product/<slug> links resolve to `/product/` and return 404.
// This implementation keeps Unicode letters/numbers (Persian included),
// guarantees a non-empty fallback, and ensures uniqueness against the DB.

/**
 * Convert an arbitrary (Persian or Latin) title into a URL-safe slug.
 * Keeps Unicode letters and numbers; collapses everything else to dashes.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-") // any non-letter/number run → dash
    .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes
}

const SLUG_FALLBACK_PREFIX = "item";

/**
 * Ensure a slug is non-empty and unique.
 *
 * @param baseSlug  Desired slug (already slugified).
 * @param exists    Async check: does this exact slug already exist?
 * @param excludeId Optional document id to ignore (when updating in place).
 */
export async function ensureUniqueSlug(
  baseSlug: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base =
    baseSlug ||
    `${SLUG_FALLBACK_PREFIX}-${Math.random().toString(36).slice(2, 8)}`;

  if (!(await exists(base))) return base;

  // Append a numeric suffix until free: latte, latte-2, latte-3, …
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }

  // Practically unreachable; guarantees termination.
  return `${base}-${Date.now().toString(36)}`;
}
