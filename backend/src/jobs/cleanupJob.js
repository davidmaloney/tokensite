import cron from "node-cron";
import { getDb } from "../db/index.js";
import { logger } from "../utils/logger.js";
import {
  CLEANUP_JOB_INTERVAL_HOURS,
  SOFT_DELETE_AFTER_EXPIRY_DAYS,
  HARD_DELETE_AFTER_SOFT_DELETE_DAYS,
  UNPAID_PAGE_CLEANUP_HOURS,
} from "../config/constants.js";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";

export function startCleanupJob() {
  const cronExpr = "0 */" + CLEANUP_JOB_INTERVAL_HOURS + " * * *";

  cron.schedule(cronExpr, async () => {
    try {
      await runCleanup();
    } catch (err) {
      logger.error("cleanup_job_error", { err: err.message });
    }
  });

  logger.info("cleanup_job_started", { interval: CLEANUP_JOB_INTERVAL_HOURS + "h" });
}

function deleteImageFiles(content) {
  try {
    const parsed = JSON.parse(content || "{}");
    for (const field of ["avatar", "banner"]) {
      if (parsed[field]) {
        const filename = parsed[field].replace("/media/", "");
        const filepath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          logger.info("image_deleted", { filename });
        }
      }
    }
    for (const member of (parsed.about?.team || [])) {
      if (member && member.photo) {
        const filename = member.photo.replace("/media/", "");
        const filepath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          logger.info("image_deleted", { filename });
        }
      }
    }
  } catch (err) {
    logger.warn("image_delete_failed", { err: err.message });
  }
}

export async function runCleanup() {
  const pool = getDb();
  const now = Math.floor(Date.now() / 1000);

  // Delete unpaid pages older than 1 hour — including their images
  const unpaidCutoff = now - UNPAID_PAGE_CLEANUP_HOURS * 3600;
  const unpaidPages = await pool.query(
    "SELECT id, slug, content_json FROM pages WHERE status = 'inactive' AND expires_at IS NULL AND created_at < $1 AND id NOT IN (SELECT page_id FROM transactions WHERE confirmed = 1)",
    [unpaidCutoff]
  );

  for (const page of unpaidPages.rows) {
    // Delete images first
    deleteImageFiles(page.content_json);
    // Delete page record — slug is freed, not blacklisted
    await pool.query("DELETE FROM pages WHERE id = $1", [page.id]);
    logger.info("unpaid_page_deleted", { pageId: page.id, slug: page.slug });
  }

  if (unpaidPages.rowCount > 0) {
    logger.info("unpaid_pages_deleted", { count: unpaidPages.rowCount });
  }

  // Soft delete expired pages
  const softDeleteCutoff = now - SOFT_DELETE_AFTER_EXPIRY_DAYS * 86400;
  const softDeleteResult = await pool.query(
    "UPDATE pages SET status = 'inactive', soft_deleted_at = $1, updated_at = $2 WHERE soft_deleted_at IS NULL AND expires_at IS NOT NULL AND expires_at < $3",
    [now, now, softDeleteCutoff]
  );
  if (softDeleteResult.rowCount > 0) {
    logger.info("pages_soft_deleted", { count: softDeleteResult.rowCount });
  }

  // Hard delete soft-deleted pages — including their images
  const hardDeleteCutoff = now - HARD_DELETE_AFTER_SOFT_DELETE_DAYS * 86400;
  const toDeleteResult = await pool.query(
    "SELECT id, slug, content_json FROM pages WHERE soft_deleted_at IS NOT NULL AND soft_deleted_at < $1",
    [hardDeleteCutoff]
  );

  for (const page of toDeleteResult.rows) {
    // Delete images first
    deleteImageFiles(page.content_json);

    // Natural expiry/cleanup frees the slug for reuse — it is NOT blacklisted.
    // (Only admin/env manual deletes blacklist a slug.) This matches expiryJob.
    await pool.query("DELETE FROM transactions WHERE page_id = $1", [page.id]);
    await pool.query("DELETE FROM pages WHERE id = $1", [page.id]);
    logger.info("page_hard_deleted", { pageId: page.id, slug: page.slug });
  }

  await processEnvDeleteSlugs(pool, now);
}

async function processEnvDeleteSlugs(pool, now) {
  const deleteList = (process.env.DELETE_SLUGS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  for (const slug of deleteList) {
    const pageResult = await pool.query(
      "SELECT id, content_json FROM pages WHERE slug = $1",
      [slug]
    );
    const page = pageResult.rows[0];
    if (page) {
      // Delete images first
      deleteImageFiles(page.content_json);
      await pool.query(
        "INSERT INTO deleted_slugs (slug, reason) VALUES ($1, 'admin_env_delete') ON CONFLICT DO NOTHING",
        [slug]
      );
      await pool.query("DELETE FROM transactions WHERE page_id = $1", [page.id]);
      await pool.query("DELETE FROM pages WHERE id = $1", [page.id]);
      logger.info("page_admin_deleted", { slug });
    } else {
      // Slug blocked but no page exists — only block while in .env
      // Do NOT permanently blacklist — if removed from .env it should be available again
      // So we do NOT insert into deleted_slugs here
      logger.info("slug_blocked_by_env", { slug });
    }
  }
}
