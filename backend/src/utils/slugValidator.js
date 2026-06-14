import { RESERVED_SLUGS } from "../config/constants.js";
import { getDb } from "../db/index.js";

export function isSlugFormatValid(slug) {
  return /^[a-z0-9-]{2,40}$/.test(slug);
}

export function isSlugReserved(slug) {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export async function isSlugBlacklisted(slug) {
  const deleteList = (process.env.DELETE_SLUGS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (deleteList.includes(slug.toLowerCase())) return true;

  const pool = getDb();
  const result = await pool.query(
    "SELECT slug FROM deleted_slugs WHERE slug = $1",
    [slug.toLowerCase()]
  );
  return result.rows.length > 0;
}

export async function isSlugTaken(slug) {
  const pool = getDb();
  const result = await pool.query(
    "SELECT id FROM pages WHERE slug = $1",
    [slug.toLowerCase()]
  );
  return result.rows.length > 0;
}

export async function validateSlug(slug) {
  if (!isSlugFormatValid(slug)) return { valid: false, reason: "Invalid format. Use 2-40 lowercase letters, numbers, hyphens." };
  if (isSlugReserved(slug)) return { valid: false, reason: "That slug is reserved." };
  if (await isSlugBlacklisted(slug)) return { valid: false, reason: "That slug is not available." };
  if (await isSlugTaken(slug)) return { valid: false, reason: "That slug is already taken." };
  return { valid: true };
}

export function isValidUrl(url) {
  if (!url || !url.trim()) return true;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
