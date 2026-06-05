import express from "express";
import {
  createPage,
  getPageById,
  getPagesByWallet,
  activatePage,
} from "../services/pageService.js";
import { validateSlug } from "../utils/slugValidator.js";
import { createPageRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: "wallet required" });
  const pages = getPagesByWallet(wallet);
  res.json({ pages });
});

router.get("/check-slug/:slug", (req, res) => {
  const { slug } = req.params;
  const result = validateSlug(slug);
  if (!result.valid) return res.json({ available: false, reason: result.reason });
  res.json({ available: true });
});

router.get("/:id", (req, res) => {
  const page = getPageById(req.params.id);
  if (!page || page.soft_deleted_at) return res.status(404).json({ error: "Not found" });
  res.json({ page });
});

router.post("/", createPageRateLimiter, async (req, res) => {
  const { walletAddress, slug, templateId, content } = req.body;

  if (!walletAddress) return res.status(400).json({ error: "walletAddress required" });
  if (!slug) return res.status(400).json({ error: "slug required" });

  const validation = validateSlug(slug);
  if (!validation.valid) return res.status(400).json({ error: validation.reason });

  try {
    const page = await createPage({ walletAddress, slug, templateId, content });
    res.json({ page });
  } catch (err) {
    if (err.message?.includes("UNIQUE")) {
      return res.status(400).json({ error: "Slug already taken." });
    }
    res.status(500).json({ error: "Failed to create page." });
  }
});

export default router;
