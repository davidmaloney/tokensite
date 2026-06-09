import express from "express";
import {
  createPage,
  getPageById,
  getPagesByWallet,
  updatePageContent,
} from "../services/pageService.js";
import { validateSlug, isValidUrl } from "../utils/slugValidator.js";
import { createPageRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

function validateContent(content) {
  if (!content) return null;
  const socials = content.socials || {};
  for (const [key, url] of Object.entries(socials)) {
    if (url && !isValidUrl(url)) return "Invalid URL in social links: " + key;
  }
  const buyLinks = content.buyLinks || {};
  for (const [key, url] of Object.entries(buyLinks)) {
    if (url && !isValidUrl(url)) return "Invalid URL in buy links: " + key;
  }
  return null;
}

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

  const urlError = validateContent(content);
  if (urlError) return res.status(400).json({ error: urlError });

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

router.put("/:id", async (req, res) => {
  const { walletAddress, templateId, content } = req.body;
  const { id } = req.params;

  if (!walletAddress) return res.status(400).json({ error: "walletAddress required" });

  const urlError = validateContent(content);
  if (urlError) return res.status(400).json({ error: urlError });

  try {
    const page = await updatePageContent(id, walletAddress, { templateId, content });
    res.json({ page });
  } catch (err) {
    if (err.message === "Unauthorized") return res.status(403).json({ error: "Unauthorized" });
    if (err.message === "Page not found") return res.status(404).json({ error: "Page not found" });
    res.status(500).json({ error: "Failed to update page." });
  }
});

export default router;
