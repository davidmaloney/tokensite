import { RESERVED_SLUGS } from "../config/constants.js";
import { getDb } from "../db/index.js";

export function isSlugFormatValid(slug) {
  return /^[a-z0-9-]{2,40}$/.test(slug);
}

export function isSlugReserved(slug) {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export function isSlugBlacklisted(slug) {
  const deleteList = (process.env.DELETE_SLUGS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (deleteList.includes(slug.toLowerCase())) return true;

  const db = getDb();
  const row = db.prepare("SELECT slug FROM deleted_slugs WHERE slug = ?").get(slug.toLowerCase());
  return !!row;
}

export function isSlugTaken(slug) {
  const db = getDb();
  const row = db.prepare("SELECT id FROM pages WHERE slug = ?").get(slug.toLowerCase());
  return !!row;
}

export function validateSlug(slug) {
  if (!isSlugFormatValid(slug)) return { valid: false, reason: "Invalid format. Use 2–40 lowercase letters, numbers, hyphens." };
  if (isSlugReserved(slug)) return { valid: false, reason: "That slug is reserved." };
  if (isSlugBlacklisted(slug)) return { valid: false, reason: "That slug is not available." };
  if (isSlugTaken(slug)) return { valid: false, reason: "That slug is already taken." };
  return { valid: true };
}
