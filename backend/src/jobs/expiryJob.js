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

        const result = db.prepare(`
          UPDATE pages
          SET status = 'inactive', updated_at = ?
          WHERE status = 'active'
            AND expires_at IS NOT NULL
            AND expires_at < ?
            AND soft_deleted_at IS NULL
        `).run(now, now);

        if (result.changes > 0) {
          logger.info("pages_expired", { count: result.changes });
        }
      });
    } catch (err) {
      logger.error("expiry_job_error", { err: err.message });
    }
  });

  logger.info("expiry_job_started", { interval: `${EXPIRY_JOB_INTERVAL_MINUTES}min` });
}
