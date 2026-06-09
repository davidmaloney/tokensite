import cron from "node-cron";
import { getDb } from "../db/index.js";
import { dbWriteQueue } from "../utils/asyncQueue.js";
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
  const cronExpr = `0 */${CLEANUP_JOB_INTERVAL_HOURS} * * *`;

  cron.schedule(cronExpr, async () => {
    try {
      await runCleanup();
    } catch (err) {
      logger.error("cleanup_job_error", { err: err.message });
    }
  });

  logger.info("cleanup_job_started", { interval: `${CLEANUP_JOB_INTERVAL_HOURS}h` });
}

export async function runCleanup() {
  return dbWriteQueue.push(() => {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);

    const unpaidCutoff = now - UNPAID_PAGE_CLEANUP_HOURS * 3600;
    const unpaidResult = db.prepare(`
      DELETE FROM pages
      WHERE status = 'inactive'
        AND expires_at IS NULL
        AND created_at < ?
        AND id NOT IN (
          SELECT page_id FROM transactions WHERE confirmed = 1
        )
    `).run(unpaidCutoff);

    if (unpaidResult.changes > 0) {
      logger.info("unpaid_pages_deleted", { count: unpaidResult.changes });
    }

    const softDeleteCutoff = now - SOFT_DELETE_AFTER_EXPIRY_DAYS * 86400;
    const softDeleteResult = db.prepare(`
      UPDATE pages
      SET status = 'inactive', soft_deleted_at = ?, updated_at = ?
      WHERE soft_deleted_at IS NULL
        AND expires_at IS NOT NULL
        AND expires_at < ?
    `).run(now, now, softDeleteCutoff);

    if (softDeleteResult.changes > 0) {
      logger.info("pages_soft_deleted", { count: softDeleteResult.changes });
    }

    const hardDeleteCutoff = now - HARD_DELETE_AFTER_SOFT_DELETE_DAYS * 86400;
    const toDelete = db.prepare(`
      SELECT id, slug, content_json FROM pages
      WHERE soft_deleted_at IS NOT NULL AND soft_deleted_at < ?
    `).all(hardDeleteCutoff);

    for (const page of toDelete) {
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

      db.prepare("INSERT OR IGNORE INTO deleted_slugs (slug, reason) VALUES (?, 'auto_cleanup')").run(page.slug);
      db.prepare("DELETE FROM transactions WHERE page_id = ?").run(page.id);
      db.prepare("DELETE FROM pages WHERE id = ?").run(page.id);
      logger.info("page_hard_deleted", { pageId: page.id, slug: page.slug });
    }

    processEnvDeleteSlugs(db, now);
  });
}

function processEnvDeleteSlugs(db, now) {
  const deleteList = (process.env.DELETE_SLUGS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  for (const slug of deleteList) {
    const page = db.prepare("SELECT id FROM pages WHERE slug = ?").get(slug);
    if (page) {
      db.prepare("INSERT OR IGNORE INTO deleted_slugs (slug, reason) VALUES (?, 'admin_env_delete')").run(slug);
      db.prepare("DELETE FROM transactions WHERE page_id = ?").run(page.id);
      db.prepare("DELETE FROM pages WHERE id = ?").run(page.id);
      logger.info("page_admin_deleted", { slug });
    } else {
      db.prepare("INSERT OR IGNORE INTO deleted_slugs (slug, reason) VALUES (?, 'admin_env_block')").run(slug);
    }
  }
}
