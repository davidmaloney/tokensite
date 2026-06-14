import express from "express";
import { getPageById, activatePage, deactivatePage } from "../services/pageService.js";
import { getDb } from "../db/index.js";
import { logger } from "../utils/logger.js";
import { adminRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.use(adminRateLimiter);

function verifyCode(code) {
  return code && code === process.env.OWNER_ACCESS_CODE;
}

router.post("/verify-code", (req, res) => {
  const { code } = req.body;
  res.json({ valid: verifyCode(code) });
});

router.post("/page-action", async (req, res) => {
  const { pageId, action, code } = req.body;
  if (!verifyCode(code)) return res.status(403).json({ error: "Invalid code." });

  const page = await getPageById(pageId);
  if (!page) return res.status(404).json({ error: "Page not found." });

  try {
    let message = "";
    const pool = getDb();
    const now = Math.floor(Date.now() / 1000);

    if (action === "activate") {
      await activatePage(pageId, "1month");
      message = "Page forced active (1 month added).";
    } else if (action === "deactivate") {
      await deactivatePage(pageId);
      message = "Page forced inactive.";
    } else if (action === "simulate_expiry") {
      const past = now - 100;
      await pool.query(
        "UPDATE pages SET expires_at = $1, status = 'inactive', updated_at = $2 WHERE id = $3",
        [past, now, pageId]
      );
      message = "Expiry simulated.";
    } else if (action === "extend_7days") {
      const pageResult = await pool.query(
        "SELECT expires_at FROM pages WHERE id = $1",
        [pageId]
      );
      const p = pageResult.rows[0];
      const base = p.expires_at && p.expires_at > now ? p.expires_at : now;
      await pool.query(
        "UPDATE pages SET expires_at = $1, updated_at = $2 WHERE id = $3",
        [base + 7 * 86400, now, pageId]
      );
      message = "Extended by 7 days.";
    } else if (action === "shorten_1day") {
      const pageResult = await pool.query(
        "SELECT expires_at FROM pages WHERE id = $1",
        [pageId]
      );
      const p = pageResult.rows[0];
      const base = p.expires_at || now;
      await pool.query(
        "UPDATE pages SET expires_at = $1, updated_at = $2 WHERE id = $3",
        [base - 86400, now, pageId]
      );
      message = "Shortened by 1 day.";
    } else {
      return res.status(400).json({ error: "Unknown action." });
    }

    logger.info("owner_action", { pageId, action });
    res.json({ message });
  } catch (err) {
    logger.error("owner_action_error", { err: err.message });
    res.status(500).json({ error: "Action failed." });
  }
});

export default router;
