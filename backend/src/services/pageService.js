import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/index.js";
import { dbWriteQueue } from "../utils/asyncQueue.js";
import { logger } from "../utils/logger.js";
import { PLANS } from "../config/constants.js";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";

export function getPageById(id) {
  const db = getDb();
  return db.prepare("SELECT * FROM pages WHERE id = ?").get(id);
}

export function getPageBySlug(slug) {
  const db = getDb();
  return db.prepare("SELECT * FROM pages WHERE slug = ?").get(slug.toLowerCase());
}

export function getPagesByWallet(walletAddress) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM pages WHERE wallet_address = ? AND soft_deleted_at IS NULL ORDER BY created_at DESC")
    .all(walletAddress);
}

export async function createPage({ walletAddress, slug, templateId, content }) {
  return dbWriteQueue.push(() => {
    const db = getDb();
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    db.prepare("INSERT OR IGNORE INTO users (wallet_address, created_at) VALUES (?, ?)").run(walletAddress, now);

    db.prepare(
      "INSERT INTO pages (id, wallet_address, slug, template_id, content_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'inactive', ?, ?)"
    ).run(id, walletAddress, slug.toLowerCase(), templateId || "template_1", JSON.stringify(content || {}), now, now);

    logger.info("page_created", { id, slug, walletAddress });
    return db.prepare("SELECT * FROM pages WHERE id = ?").get(id);
  });
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
  return dbWriteQueue.push(() => {
    const db = getDb();
    const page = db.prepare("SELECT * FROM pages WHERE id = ?").get(pageId);
    if (!page) throw new Error("Page not found");
    if (page.wallet_address !== walletAddress) throw new Error("Unauthorized");

    const existing = JSON.parse(page.content_json || "{}");

    // Delete old avatar if replaced
    if (content.avatar && existing.avatar && content.avatar !== existing.avatar) {
      deleteOldImage(existing.avatar, content.avatar);
    }

    // Delete old banner if replaced
    if (content.banner && existing.banner && content.banner !== existing.banner) {
      deleteOldImage(existing.banner, content.banner);
    }

    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      "UPDATE pages SET template_id = ?, content_json = ?, updated_at = ? WHERE id = ?"
    ).run(templateId || page.template_id, JSON.stringify(content || {}), now, pageId);

    logger.info("page_updated", { pageId, walletAddress });
    return db.prepare("SELECT * FROM pages WHERE id = ?").get(pageId);
  });
}

export async function activatePage(pageId, planId, daysOverride) {
  return dbWriteQueue.push(() => {
    const db = getDb();
    const page = db.prepare("SELECT * FROM pages WHERE id = ?").get(pageId);
    if (!page) throw new Error("Page not found");

    const plan = PLANS[planId];
    const days = daysOverride !== undefined ? daysOverride : (plan ? plan.days : 30);
    const now = Math.floor(Date.now() / 1000);
    const currentExpiry = page.expires_at && page.expires_at > now ? page.expires_at : now;
    const newExpiry = currentExpiry + days * 86400;

    db.prepare(
      "UPDATE pages SET status = 'active', expires_at = ?, soft_deleted_at = NULL, updated_at = ? WHERE id = ?"
    ).run(newExpiry, now, pageId);

    logger.info("page_activated", { pageId, planId, newExpiry });
    return db.prepare("SELECT * FROM pages WHERE id = ?").get(pageId);
  });
}

export async function deactivatePage(pageId) {
  return dbWriteQueue.push(() => {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    db.prepare("UPDATE pages SET status = 'inactive', updated_at = ? WHERE id = ?").run(now, pageId);
    logger.info("page_deactivated", { pageId });
  });
}

export async function softDeletePage(pageId) {
  return dbWriteQueue.push(() => {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    db.prepare("UPDATE pages SET status = 'inactive', soft_deleted_at = ?, updated_at = ? WHERE id = ?").run(now, now, pageId);
    logger.info("page_soft_deleted", { pageId });
  });
}

export async function hardDeletePage(pageId) {
  return dbWriteQueue.push(() => {
    const db = getDb();
    const page = db.prepare("SELECT slug, content_json FROM pages WHERE id = ?").get(pageId);
    if (page) {
      // Delete images from disk
      try {
        const content = JSON.parse(page.content_json || "{}");
        for (const field of ["avatar", "banner"]) {
          if (content[field]) {
            const filename = content[field].replace("/media/", "");
            const filepath = path.join(UPLOAD_DIR, filename);
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
          }
        }
      } catch {}

      db.prepare("INSERT OR IGNORE INTO deleted_slugs (slug, reason) VALUES (?, 'hard_delete')").run(page.slug);
      db.prepare("DELETE FROM pages WHERE id = ?").run(pageId);
      db.prepare("DELETE FROM transactions WHERE page_id = ?").run(pageId);
      logger.info("page_hard_deleted", { pageId, slug: page.slug });
    }
  });
}
