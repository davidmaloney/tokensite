import express from "express";
import { getPageBySlug } from "../services/pageService.js";
import { renderPage } from "../templates/renderer.js";
import { logger } from "../utils/logger.js";
import path from "path";
import fs from "fs";

const router = express.Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";

const notFoundHtml = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Page Not Found</title>" +
  "<style>body{background:#0d0d0d;color:#666;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}</style>" +
  "</head><body><div><div style=\"font-size:36px;margin-bottom:12px\">🔍</div>" +
  "<div style=\"font-size:16px\">Page not found</div>" +
  "<div style=\"font-size:13px;margin-top:8px\"><a href=\"https://" + (process.env.DOMAIN || "shillit.fun") + "\" style=\"color:#9945FF;text-decoration:none\">Create yours on SHILLit →</a></div>" +
  "</div></body></html>";

const inactiveHtml = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Page Inactive</title>" +
  "<style>body{background:#0d0d0d;color:#666;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}</style>" +
  "</head><body><div><div style=\"font-size:36px;margin-bottom:12px\">💤</div>" +
  "<div style=\"font-size:16px\">This page is currently inactive</div>" +
  "<div style=\"font-size:13px;margin-top:8px;color:#555\">The owner needs to top up their page</div>" +
  "<div style=\"font-size:12px;margin-top:12px\"><a href=\"https://" + (process.env.DOMAIN || "shillit.fun") + "\" style=\"color:#9945FF;text-decoration:none\">SHILLit</a></div>" +
  "</div></body></html>";

router.get("/media/:filename", (req, res) => {
  const filename = path.basename(req.params.filename);
  const filepath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).send("Not found");
  res.sendFile(filepath);
});

router.get("*", async (req, res) => {
  const slug = req.subdomain;

  if (!slug) {
    return res.status(404).send(notFoundHtml);
  }

  try {
    const page = getPageBySlug(slug);

    if (!page || page.soft_deleted_at) {
      return res.status(404).send(notFoundHtml);
    }

    if (page.status !== "active") {
      return res.status(200).send(inactiveHtml);
    }

    const html = renderPage(page);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(html);

    logger.debug("page_served", { slug });
  } catch (err) {
    logger.error("subdomain_serve_error", { slug, err: err.message });
    res.status(500).send("Internal error");
  }
});

export default router;
