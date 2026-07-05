import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/index.js";
import { logger } from "../utils/logger.js";
import { PLANS } from "../config/constants.js";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";

let _invalidateCache = null;
export function registerCacheInvalidator(fn) {
  _invalidateCache = fn;
}
function invalidateCache(slug) {
  if (_invalidateCache) _invalidateCache(slug);
}

export async function getPageById(id) {
  const pool = getDb();
  const result = await pool.query("SELECT * FROM pages WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export async function getPageBySlug(slug) {
  const pool = getDb();
  const result = await pool.query("SELECT * FROM pages WHERE slug = $1", [slug.toLowerCase()]);
  return result.rows[0] || null;
}

export async function getPagesByWallet(walletAddress) {
  const pool = getDb();
  const result = await pool.query(
    "SELECT * FROM pages WHERE wallet_address = $1 AND soft_deleted_at IS NULL ORDER BY created_at DESC",
    [walletAddress]
  );
  return result.rows;
}

export async function createPage({ walletAddress, slug, templateId, content }) {
  const pool = getDb();
  const id = uuidv4();
  const now = Math.floor(Date.now() / 1000);

  await pool.query(
    "INSERT INTO users (wallet_address, created_at) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [walletAddress, now]
  );

  await pool.query(
    "INSERT INTO pages (id, wallet_address, slug, template_id, content_json, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 'inactive', $6, $7)",
    [id, walletAddress, slug.toLowerCase(), templateId || "template_1", JSON.stringify(content || {}), now, now]
  );

  logger.info("page_created", { id, slug, walletAddress });
  const result = await pool.query("SELECT * FROM pages WHERE id = $1", [id]);
  return result.rows[0];
}

function deleteOldImage(oldUrl, newUrl) {
  if (!oldUrl || oldUrl === newUrl) return;
  try {
    const filename = oldUrl.replace("/media/", "");
    const filepath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      logger.info("old_image_deleted", { filename });
    }
  } catch (err) {
    logger.warn("old_image_delete_failed", { err: err.message });
  }
}


export async function updatePageContent(pageId, walletAddress, { templateId, content }) {
  const pool = getDb();
  const pageResult = await pool.query("SELECT * FROM pages WHERE id = $1", [pageId]);
  const page = pageResult.rows[0];
  if (!page) throw new Error("Page not found");
  if (page.wallet_address !== walletAddress) throw new Error("Unauthorized");

  const existing = JSON.parse(page.content_json || "{}");

  const now = Math.floor(Date.now() / 1000);
  const isActive = page.status === "active" && page.expires_at && page.expires_at > now;

  // --- Contract-address change limit (after activation only) ---
  // Rule: while a page is NOT active (draft/unpaid), the CA can be changed freely.
  // Once a page is active, the owner gets a fixed number of CA changes (3) and then
  // the contract address is locked. Changing any OTHER field never costs a turn.
  const CA_CHANGE_LIMIT = 3;
  const oldCA = (existing.contractAddress || "").trim();
  // Only consider it a CA change if the incoming content actually includes the field.
  const incomingHasCA = Object.prototype.hasOwnProperty.call(content, "contractAddress");
  const newCA = incomingHasCA ? String(content.contractAddress || "").trim() : oldCA;
  const caIsChanging = incomingHasCA && newCA !== oldCA;
  const usedSoFar = Number(page.ca_changes_used || 0);

  if (caIsChanging && isActive && usedSoFar >= CA_CHANGE_LIMIT) {
    // Out of changes: reject with a clear, catchable error.
    const err = new Error("CA change limit reached");
    err.code = "CA_LOCKED";
    throw err;
  }

  // Merge: start with existing content, overlay with incoming content.
  // This means if the frontend fails to send avatar/banner, we keep
  // whatever was already saved — the URL is never lost.
  const merged = { ...existing, ...content };

  // If the frontend explicitly sent an empty string for avatar or banner,
  // treat that as the user removing the image — respect it, and delete the
  // old file from disk so it doesn't linger as an orphan.
  if (content.avatar === "") {
    if (existing.avatar) deleteOldImage(existing.avatar, null);
    merged.avatar = undefined;
  }
  if (content.banner === "") {
    if (existing.banner) deleteOldImage(existing.banner, null);
    merged.banner = undefined;
  }

  // Clean up undefined keys so they don't get stored as "undefined"
  Object.keys(merged).forEach((k) => merged[k] === undefined && delete merged[k]);

  // If avatar changed to a genuinely new file, delete the old file from disk.
  if (content.avatar && content.avatar !== "" && existing.avatar && content.avatar !== existing.avatar) {
    deleteOldImage(existing.avatar, content.avatar);
  }
  // If banner changed to a genuinely new file, delete the old file from disk.
  if (content.banner && content.banner !== "" && existing.banner && content.banner !== existing.banner) {
    deleteOldImage(existing.banner, content.banner);
  }

  // Team member photos: delete any old photo file that is no longer used.
  // Collect the photo URLs that exist after this update, then remove any
  // old team photo that isn't in that set.
  try {
    const oldPhotos = (existing.about?.team || []).map((m) => m && m.photo).filter(Boolean);
    const newPhotos = new Set((merged.about?.team || []).map((m) => m && m.photo).filter(Boolean));
    for (const oldPhoto of oldPhotos) {
      if (!newPhotos.has(oldPhoto)) deleteOldImage(oldPhoto, null);
    }
  } catch (err) {
    logger.warn("team_photo_cleanup_failed", { err: err.message });
  }

  // Reuse the `now` computed above for the CA-limit check.
  const nextCaUsed = (caIsChanging && isActive) ? (usedSoFar + 1) : usedSoFar;
  // Buy buttons are derived from the CA (already lock-limited), so we no longer
  // track a separate buy-links change budget. Carry the existing counter unchanged.
  const nextBuyLinksUsed = Number(page.buylinks_changes_used || 0);
  await pool.query(
    "UPDATE pages SET template_id = $1, content_json = $2, ca_changes_used = $3, buylinks_changes_used = $4, updated_at = $5 WHERE id = $6",
    [templateId || page.template_id, JSON.stringify(merged), nextCaUsed, nextBuyLinksUsed, now, pageId]
  );

  invalidateCache(page.slug);
  logger.info("page_updated", { pageId, walletAddress });
  const updated = await pool.query("SELECT * FROM pages WHERE id = $1", [pageId]);
  return updated.rows[0];
}

export async function activatePage(pageId, planId, daysOverride) {
  const pool = getDb();
  const pageResult = await pool.query("SELECT * FROM pages WHERE id = $1", [pageId]);
  const page = pageResult.rows[0];
  if (!page) throw new Error("Page not found");

  const plan = PLANS[planId];
  const days = daysOverride !== undefined ? daysOverride : (plan ? plan.days : 30);
  const now = Math.floor(Date.now() / 1000);
  const currentExpiry = page.expires_at && page.expires_at > now ? page.expires_at : now;
  const newExpiry = currentExpiry + days * 86400;

  await pool.query(
    "UPDATE pages SET status = 'active', expires_at = $1, soft_deleted_at = NULL, updated_at = $2 WHERE id = $3",
    [newExpiry, now, pageId]
  );

  invalidateCache(page.slug);
  logger.info("page_activated", { pageId, planId, newExpiry });
  const updated = await pool.query("SELECT * FROM pages WHERE id = $1", [pageId]);
  return updated.rows[0];
}

export async function deactivatePage(pageId) {
  const pool = getDb();
  const pageResult = await pool.query("SELECT slug FROM pages WHERE id = $1", [pageId]);
  const page = pageResult.rows[0];
  const now = Math.floor(Date.now() / 1000);
  await pool.query(
    "UPDATE pages SET status = 'inactive', updated_at = $1 WHERE id = $2",
    [now, pageId]
  );
  if (page) invalidateCache(page.slug);
  logger.info("page_deactivated", { pageId });
}

export async function softDeletePage(pageId) {
  const pool = getDb();
  const pageResult = await pool.query("SELECT slug FROM pages WHERE id = $1", [pageId]);
  const page = pageResult.rows[0];
  const now = Math.floor(Date.now() / 1000);
  await pool.query(
    "UPDATE pages SET status = 'inactive', soft_deleted_at = $1, updated_at = $2 WHERE id = $3",
    [now, now, pageId]
  );
  if (page) invalidateCache(page.slug);
  logger.info("page_soft_deleted", { pageId });
}

export async function hardDeletePage(pageId) {
  const pool = getDb();
  const pageResult = await pool.query("SELECT slug, content_json FROM pages WHERE id = $1", [pageId]);
  const page = pageResult.rows[0];
  if (page) {
    try {
      const content = JSON.parse(page.content_json || "{}");
      for (const field of ["avatar", "banner"]) {
        if (content[field]) {
          const filename = content[field].replace("/media/", "");
          const filepath = path.join(UPLOAD_DIR, filename);
          if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        }
      }
      // Also delete any team member photos.
      for (const member of (content.about?.team || [])) {
        if (member && member.photo) {
          const filename = member.photo.replace("/media/", "");
          const filepath = path.join(UPLOAD_DIR, filename);
          if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        }
      }
    } catch {}

    invalidateCache(page.slug);
    await pool.query(
      "INSERT INTO deleted_slugs (slug, reason) VALUES ($1, 'hard_delete') ON CONFLICT DO NOTHING",
      [page.slug]
    );
    await pool.query("DELETE FROM pages WHERE id = $1", [pageId]);
    await pool.query("DELETE FROM transactions WHERE page_id = $1", [pageId]);
    logger.info("page_hard_deleted", { pageId, slug: page.slug });
  }
}
