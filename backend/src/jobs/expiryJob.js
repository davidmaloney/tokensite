import cron from "node-cron";
import { getDb } from "../db/index.js";
import { dbWriteQueue } from "../utils/asyncQueue.js";
import { logger } from "../utils/logger.js";
import { EXPIRY_JOB_INTERVAL_MINUTES } from "../config/constants.js";

export function startExpiryJob() {
  const cronExpr = `*/${EXPIRY_JOB_INTERVAL_MINUTES} * * * *`;

  cron.schedule(cronExpr, async () => {
    try {
      await dbWriteQueue.push(() => {
        const db = getDb();
        const now = Math.floor(Date.now() / 1000);

        // Hard delete pages immediately on expiry — no grace period
        const result = db.prepare(`
          DELETE FROM pages
          WHERE status = 'active'
            AND expires_at IS NOT NULL
            AND expires_at < ?
        `).run(now);

        if (result.changes > 0) {
          logger.info("pages_expired_and_deleted", { count: result.changes });

          // Also blacklist the slugs permanently
          const deleted = db.prepare(`
            SELECT slug FROM pages
            WHERE status = 'active'
              AND expires_at IS NOT NULL
              AND expires_at < ?
          `).all(now);

          deleted.forEach(({ slug }) => {
            db.prepare(`
              INSERT OR IGNORE INTO deleted_slugs (slug, deleted_at, reason)
              VALUES (?, ?, 'expired')
            `).run(slug, now);
          });
        }
      });
    } catch (err) {
      logger.error("expiry_job_error", { err: err.message });
    }
  });

  logger.info("expiry_job_started", { interval: `${EXPIRY_JOB_INTERVAL_MINUTES}min` });
}
