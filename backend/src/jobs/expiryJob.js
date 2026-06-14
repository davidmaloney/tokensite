import cron from "node-cron";
import { getDb } from "../db/index.js";
import { logger } from "../utils/logger.js";
import { EXPIRY_JOB_INTERVAL_MINUTES } from "../config/constants.js";
import { invalidatePageCache } from "../routes/subdomain.js";

export function startExpiryJob() {
  const cronExpr = "*/" + EXPIRY_JOB_INTERVAL_MINUTES + " * * * *";

  cron.schedule(cronExpr, async () => {
    try {
      const pool = getDb();
      const now = Math.floor(Date.now() / 1000);

      const expiredResult = await pool.query(
        "SELECT id, slug FROM pages WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < $1",
        [now]
      );

      const expiredPages = expiredResult.rows;

      if (expiredPages.length > 0) {
        for (const { slug } of expiredPages) {
          await pool.query(
            "INSERT INTO deleted_slugs (slug, deleted_at, reason) VALUES ($1, $2, 'expired') ON CONFLICT DO NOTHING",
            [slug, now]
          );
          invalidatePageCache(slug);
        }

        await pool.query(
          "DELETE FROM pages WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < $1",
          [now]
        );

        logger.info("pages_expired_and_deleted", { count: expiredPages.length });
      }
    } catch (err) {
      logger.error("expiry_job_error", { err: err.message });
    }
  });

  logger.info("expiry_job_started", { interval: EXPIRY_JOB_INTERVAL_MINUTES + "min" });
}
