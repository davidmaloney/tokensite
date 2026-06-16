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

function isValidContractAddress(address) {
  if (!address || !address.trim()) return true;
  const a = address.trim();
  // Solana — base58, 32-44 chars
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return true;
  // EVM (Ethereum, Base, BSC, Polygon, Arbitrum, Optimism, Avalanche, Fantom etc) — 0x + 40 hex
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return true;
  // Sui and Aptos — 0x + 64 hex
  if (/^0x[0-9a-fA-F]{64}$/.test(a)) return true;
  // Tron — T + 33 base58 chars
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return true;
  return false;
}

function validateContent(content) {
  if (!content) return null;
  if (content.contractAddress && !isValidContractAddress(content.contractAddress)) {
    return "Invalid contract address.";
  }
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
  const pages = await getPagesByWallet(wallet);
  res.json({ pages });
});

router.get("/check-slug/:slug", async (req, res) => {
  const { slug } = req.params;
  const result = await validateSlug(slug);
  if (!result.valid) return res.json({ available: false, reason: result.reason });
  res.json({ available: true });
});

router.get("/:id", async (req, res) => {
  const page = await getPageById(req.params.id);
  if (!page || page.soft_deleted_at) return res.status(404).json({ error: "Not found" });
  res.json({ page });
});

router.post("/", createPageRateLimiter, async (req, res) => {
  const { walletAddress, slug, templateId, content } = req.body;

  if (!walletAddress) return res.status(400).json({ error: "walletAddress required" });
  if (!slug) return res.status(400).json({ error: "slug required" });

  const validation = await validateSlug(slug);
  if (!validation.valid) return res.status(400).json({ error: validation.reason });

  const urlError = validateContent(content);
  if (urlError) return res.status(400).json({ error: urlError });

  try {
    const page = await createPage({ walletAddress, slug, templateId, content });
    res.json({ page });
  } catch (err) {
    if (err.message?.includes("unique") || err.message?.includes("UNIQUE")) {
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
