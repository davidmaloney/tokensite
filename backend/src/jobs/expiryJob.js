import cron from "node-cron";
import { getDb } from "../db/index.js";
import { logger } from "../utils/logger.js";
import { EXPIRY_JOB_INTERVAL_MINUTES } from "../config/constants.js";
import { invalidatePageCache } from "../routes/subdomain.js";
import fs from "fs";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";

export function startExpiryJob() {
  const cronExpr = "*/" + EXPIRY_JOB_INTERVAL_MINUTES + " * * * *";

  cron.schedule(cronExpr, async () => {
    try {
      const pool = getDb();
      const now = Math.floor(Date.now() / 1000);

      const expiredResult = await pool.query(
        "SELECT id, slug, content_json FROM pages WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < $1",
        [now]
      );

      const expiredPages = expiredResult.rows;

      if (expiredPages.length > 0) {
        for (const page of expiredPages) {
          // Delete images from disk
          try {
            const content = JSON.parse(page.content_json || "{}");
            for (const field of ["avatar", "banner"]) {
              if (content[field]) {
                const filename = content[field].replace("/media/", "");
                const filepath = path.join(UPLOAD_DIR, filename);
                if (fs.existsSync(filepath)) {
                  fs.unlinkSync(filepath);
                  logger.info("expired_image_deleted", { filename });
                }
              }
            }
            for (const member of (content.about?.team || [])) {
              if (member && member.photo) {
                const filename = member.photo.replace("/media/", "");
                const filepath = path.join(UPLOAD_DIR, filename);
                if (fs.existsSync(filepath)) {
                  fs.unlinkSync(filepath);
                  logger.info("expired_image_deleted", { filename });
                }
              }
            }
          } catch (imgErr) {
            logger.warn("expired_image_delete_failed", { slug: page.slug, err: imgErr.message });
          }

          // Invalidate cache — slug is being freed
          invalidatePageCache(page.slug);

          // NOTE: slug is NOT added to deleted_slugs — it is freed for reuse
        }

        await pool.query(
          "DELETE FROM pages WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < $1",
          [now]
        );

        // Also delete transactions for expired pages
        for (const page of expiredPages) {
          await pool.query("DELETE FROM transactions WHERE page_id = $1", [page.id]);
        }

        logger.info("pages_expired_and_deleted", { count: expiredPages.length });
      }
    } catch (err) {
      logger.error("expiry_job_error", { err: err.message });
    }
  });

  logger.info("expiry_job_started", { interval: EXPIRY_JOB_INTERVAL_MINUTES + "min" });
}
