import cron from "node-cron";
import { getDb } from "../db/index.js";
import { dbWriteQueue } from "../utils/asyncQueue.js";
import { logger } from "../utils/logger.js";
import { EXPIRY_JOB_INTERVAL_MINUTES } from "../config/constants.js";
import { invalidatePageCache } from "../routes/subdomain.js";

export function startExpiryJob() {
  const cronExpr = "*/" + EXPIRY_JOB_INTERVAL_MINUTES + " * * * *";

  cron.schedule(cronExpr, async () => {
    try {
      await dbWriteQueue.push(() => {
        const db = getDb();
        const now = Math.floor(Date.now() / 1000);

        const expiredPages = db.prepare(
          "SELECT id, slug FROM pages WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < ?"
        ).all(now);

        if (expiredPages.length > 0) {
          const insertSlug = db.prepare(
            "INSERT OR IGNORE INTO deleted_slugs (slug, deleted_at, reason) VALUES (?, ?, 'expired')"
          );
          expiredPages.forEach(({ slug }) => {
            insertSlug.run(slug, now);
            invalidatePageCache(slug);
          });

          db.prepare(
            "DELETE FROM pages WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < ?"
          ).run(now);

          logger.info("pages_expired_and_deleted", { count: expiredPages.length });
        }
      });
    } catch (err) {
      logger.error("expiry_job_error", { err: err.message });
    }
  });

  logger.info("expiry_job_started", { interval: EXPIRY_JOB_INTERVAL_MINUTES + "min" });
}
