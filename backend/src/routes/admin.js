import express from "express";
import { getPageById, activatePage, deactivatePage } from "../services/pageService.js";
import { dbWriteQueue } from "../utils/asyncQueue.js";
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

  const page = getPageById(pageId);
  if (!page) return res.status(404).json({ error: "Page not found." });

  try {
    let message = "";

    if (action === "activate") {
      await activatePage(pageId, "1month");
      message = "Page forced active (1 month added).";
    } else if (action === "deactivate") {
      await deactivatePage(pageId);
      message = "Page forced inactive.";
    } else if (action === "simulate_expiry") {
      await dbWriteQueue.push(() => {
        const db = getDb();
        const past = Math.floor(Date.now() / 1000) - 100;
        db.prepare("UPDATE pages SET expires_at = ?, status = 'inactive', updated_at = ? WHERE id = ?").run(past, Math.floor(Date.now() / 1000), pageId);
      });
      message = "Expiry simulated.";
    } else if (action === "extend_7days") {
      await dbWriteQueue.push(() => {
        const db = getDb();
        const p = db.prepare("SELECT expires_at FROM pages WHERE id = ?").get(pageId);
        const base = p.expires_at && p.expires_at > Math.floor(Date.now() / 1000) ? p.expires_at : Math.floor(Date.now() / 1000);
        db.prepare("UPDATE pages SET expires_at = ?, updated_at = ? WHERE id = ?").run(base + 7 * 86400, Math.floor(Date.now() / 1000), pageId);
      });
      message = "Extended by 7 days.";
    } else if (action === "shorten_1day") {
      await dbWriteQueue.push(() => {
        const db = getDb();
        const p = db.prepare("SELECT expires_at FROM pages WHERE id = ?").get(pageId);
        const base = p.expires_at || Math.floor(Date.now() / 1000);
        db.prepare("UPDATE pages SET expires_at = ?, updated_at = ? WHERE id = ?").run(base - 86400, Math.floor(Date.now() / 1000), pageId);
      });
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
