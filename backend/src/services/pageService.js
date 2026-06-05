import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/index.js";
import { dbWriteQueue } from "../utils/asyncQueue.js";
import { logger } from "../utils/logger.js";
import { PLANS } from "../config/constants.js";

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

    db.prepare(`INSERT OR IGNORE INTO users (wallet_address, created_at) VALUES (?, ?)`).run(walletAddress, now);

    db.prepare(`
      INSERT INTO pages (id, wallet_address, slug, template_id, content_json, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'inactive', ?, ?)
    `).run(id, walletAddress, slug.toLowerCase(), templateId || "template_1", JSON.stringify(content || {}), now, now);

    logger.info("page_created", { id, slug, walletAddress });
    return db.prepare("SELECT * FROM pages WHERE id = ?").get(id);
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

    db.prepare(`
      UPDATE pages SET status = 'active', expires_at = ?, soft_deleted_at = NULL, updated_at = ?
      WHERE id = ?
    `).run(newExpiry, now, pageId);

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
    const page = db.prepare("SELECT slug FROM pages WHERE id = ?").get(pageId);
    if (page) {
      db.prepare("INSERT OR IGNORE INTO deleted_slugs (slug, reason) VALUES (?, 'hard_delete')").run(page.slug);
      db.prepare("DELETE FROM pages WHERE id = ?").run(pageId);
      db.prepare("DELETE FROM transactions WHERE page_id = ?").run(pageId);
      logger.info("page_hard_deleted", { pageId, slug: page.slug });
    }
  });
}
