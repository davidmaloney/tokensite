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

export async function runCleanup() {
  const pool = getDb();
  const now = Math.floor(Date.now() / 1000);

  const unpaidCutoff = now - UNPAID_PAGE_CLEANUP_HOURS * 3600;
  const unpaidResult = await pool.query(
    "DELETE FROM pages WHERE status = 'inactive' AND expires_at IS NULL AND created_at < $1 AND id NOT IN (SELECT page_id FROM transactions WHERE confirmed = 1)",
    [unpaidCutoff]
  );
  if (unpaidResult.rowCount > 0) {
    logger.info("unpaid_pages_deleted", { count: unpaidResult.rowCount });
  }

  const softDeleteCutoff = now - SOFT_DELETE_AFTER_EXPIRY_DAYS * 86400;
  const softDeleteResult = await pool.query(
    "UPDATE pages SET status = 'inactive', soft_deleted_at = $1, updated_at = $2 WHERE soft_deleted_at IS NULL AND expires_at IS NOT NULL AND expires_at < $3",
    [now, now, softDeleteCutoff]
  );
  if (softDeleteResult.rowCount > 0) {
    logger.info("pages_soft_deleted", { count: softDeleteResult.rowCount });
  }

  const hardDeleteCutoff = now - HARD_DELETE_AFTER_SOFT_DELETE_DAYS * 86400;
  const toDeleteResult = await pool.query(
    "SELECT id, slug, content_json FROM pages WHERE soft_deleted_at IS NOT NULL AND soft_deleted_at < $1",
    [hardDeleteCutoff]
  );

  for (const page of toDeleteResult.rows) {
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

    await pool.query(
      "INSERT INTO deleted_slugs (slug, reason) VALUES ($1, 'auto_cleanup') ON CONFLICT DO NOTHING",
      [page.slug]
    );
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
      "SELECT id FROM pages WHERE slug = $1",
      [slug]
    );
    const page = pageResult.rows[0];
    if (page) {
      await pool.query(
        "INSERT INTO deleted_slugs (slug, reason) VALUES ($1, 'admin_env_delete') ON CONFLICT DO NOTHING",
        [slug]
      );
      await pool.query("DELETE FROM transactions WHERE page_id = $1", [page.id]);
      await pool.query("DELETE FROM pages WHERE id = $1", [page.id]);
      logger.info("page_admin_deleted", { slug });
    } else {
      await pool.query(
        "INSERT INTO deleted_slugs (slug, reason) VALUES ($1, 'admin_env_block') ON CONFLICT DO NOTHING",
        [slug]
      );
    }
  }
}
