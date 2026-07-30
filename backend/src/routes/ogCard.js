// ---------------------------------------------------------------------------
// ogCard.js  —  Social link-preview card generator (fully self-contained)
// ---------------------------------------------------------------------------
//
// PURPOSE
//   When someone pastes a page link (e.g. https://foo.shillit.fun) into X,
//   Telegram, Facebook, Instagram, Discord, WhatsApp, iMessage, LinkedIn, etc.,
//   the platform reads Open Graph meta tags and fetches a preview image. This
//   module builds a good-looking preview image on demand: the page's banner as
//   the backdrop, the avatar as a glossy circle, the token name, and a short
//   blurb line — echoing the real page hero as closely as a static image can.
//
// WHY THIS FILE IS SAFE / SELF-CONTAINED
//   * It ONLY READS from things that already exist (the page row in the DB and
//     the banner/avatar files on disk). It never writes to the DB, never alters
//     uploads, never touches the templates, the existing /media routes, the
//     payment/promo logic, or the expiry/cleanup jobs.
//   * The one thing it writes is its OWN cache of generated card images, in its
//     OWN sub-folder (UPLOAD_DIR/og-cards). It cleans up after itself on a timer
//     and never relies on — or interferes with — the app's existing cleanup jobs.
//   * If anything goes wrong (missing image, sharp error, etc.) it fails soft:
//     it returns a plain fallback card or a 404, never throws in a way that could
//     take page-serving down.
//
// LOAD BEHAVIOUR (important on small / free tiers)
//   * A generated card is cached ON DISK for CARD_TTL_MS. Repeat scrapes of the
//     same link within that window are served as a static file (near-zero CPU).
//   * Generation is capped by a small concurrency limit so a burst of DIFFERENT
//     links can't spawn unlimited simultaneous sharp jobs and spike memory.
//   * Social platforms cache the image on THEIR servers after the first scrape,
//     so ordinary post views never hit this server at all.
//
// HOW IT'S WIRED IN
//   server.js mounts this router (one added line). The route only answers a
//   single dedicated path (OG_CARD_PATH) on page subdomains; every other request
//   falls straight through untouched. Meta tags on the pages point at that path.
// ---------------------------------------------------------------------------

import express from "express";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { getPageBySlug } from "../services/pageService.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";
const CARD_DIR = path.join(UPLOAD_DIR, "og-cards");

// The public path (on a page subdomain) that serves the card image.
// e.g. https://foo.shillit.fun/__og/card.jpg
export const OG_CARD_PATH = "/__og/card.jpg";

// Card dimensions — 1200x630 is the universal large-card size.
const CARD_W = 1200;
const CARD_H = 630;

// How long a generated card stays valid on disk before it's regenerated/swept.
const CARD_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Concurrency cap on simultaneous generations (protects memory under bursts).
const MAX_CONCURRENT = 2;
let inFlight = 0;
const waiters = [];

function acquireSlot() {
  if (inFlight < MAX_CONCURRENT) {
    inFlight++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiters.push(resolve));
}
function releaseSlot() {
  inFlight--;
  const next = waiters.shift();
  if (next) {
    inFlight++;
    next();
  }
}

// Ensure our own cache dir exists (never touches anything else).
try {
  if (!fs.existsSync(CARD_DIR)) fs.mkdirSync(CARD_DIR, { recursive: true });
} catch (err) {
  logger.warn("og_card_dir_error", { err: err.message });
}

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Resolve a stored "/media/xxx.webp" path to an absolute file path on disk.
function mediaFileForPath(mediaPath) {
  if (!mediaPath || typeof mediaPath !== "string") return null;
  if (!mediaPath.startsWith("/media/")) return null;
  const name = path.basename(mediaPath); // strips any path tricks
  const p = path.join(UPLOAD_DIR, name);
  return fs.existsSync(p) ? p : null;
}

// Wrap/limit the name and blurb so text never overflows the card.
function clamp(str, max) {
  const s = String(str || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "\u2026";
}

// Build the SVG overlay: dark gradient scrim (so text is readable over any
// banner), the token name, a short blurb line, and the domain.
function buildOverlaySvg({ name, blurb, domain }) {
  const safeName = escapeXml(clamp(name, 22));
  const safeBlurb = escapeXml(clamp(blurb, 64));
  const safeDomain = escapeXml(clamp(domain, 40));

  // Avatar sits centered horizontally at this y; text starts below it.
  return `
<svg width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#05060a" stop-opacity="0.35"/>
      <stop offset="42%" stop-color="#05060a" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#05060a" stop-opacity="0.92"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
  </defs>

  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#scrim)"/>

  <g filter="url(#soft)" font-family="Arial, Helvetica, sans-serif" text-anchor="middle">
    <text x="${CARD_W / 2}" y="474" fill="#ffffff" font-size="82" font-weight="800"
          letter-spacing="1">${safeName}</text>
    ${safeBlurb ? `<text x="${CARD_W / 2}" y="528" fill="#cfd3dc" font-size="30"
          font-weight="500">${safeBlurb}</text>` : ""}
    <text x="${CARD_W / 2}" y="586" fill="#8b93ff" font-size="26"
          font-weight="600" letter-spacing="2">${safeDomain}</text>
  </g>
</svg>`;
}

// Build a circular avatar buffer (with a subtle ring) to composite on top.
async function buildAvatarCircle(avatarFile, size) {
  const ringSvg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
       <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#ffffff"/>
     </svg>`
  );
  const maskSvg = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
       <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#ffffff"/>
     </svg>`
  );

  const inner = size - 8; // leave a 4px white ring around the photo
  const photo = await sharp(avatarFile)
    .resize(inner, inner, { fit: "cover" })
    .composite([{
      input: Buffer.from(
        `<svg width="${inner}" height="${inner}" xmlns="http://www.w3.org/2000/svg">
           <circle cx="${inner / 2}" cy="${inner / 2}" r="${inner / 2}" fill="#ffffff"/>
         </svg>`
      ),
      blend: "dest-in",
    }])
    .png()
    .toBuffer();

  // White ring base, then the circular photo centered on it.
  return sharp(ringSvg)
    .composite([
      { input: maskSvg, blend: "dest-in" },
      { input: photo, top: 4, left: 4 },
    ])
    .png()
    .toBuffer();
}

// Core: build the composite card image buffer for a page's content.
async function generateCardBuffer(content, domain) {
  const bannerFile = mediaFileForPath(content.banner);
  const avatarFile = mediaFileForPath(content.avatar);

  // Base layer: banner cropped to card size, or a dark branded gradient if none.
  let base;
  if (bannerFile) {
    base = sharp(bannerFile).resize(CARD_W, CARD_H, { fit: "cover", position: "attention" });
  } else {
    base = sharp({
      create: {
        width: CARD_W,
        height: CARD_H,
        channels: 3,
        background: { r: 13, g: 14, b: 22 },
      },
    });
  }
  let baseBuf = await base.jpeg().toBuffer();

  const layers = [];

  // Dark scrim + text overlay.
  const overlay = Buffer.from(buildOverlaySvg({
    name: content.name || "",
    blurb: content.description || "",
    domain,
  }));
  layers.push({ input: overlay, top: 0, left: 0 });

  // Avatar circle, centered horizontally, sitting above the name.
  if (avatarFile) {
    try {
      const AV = 210;
      const avatarBuf = await buildAvatarCircle(avatarFile, AV);
      layers.push({
        input: avatarBuf,
        top: 150,
        left: Math.round((CARD_W - AV) / 2),
      });
    } catch (err) {
      logger.warn("og_card_avatar_fail", { err: err.message });
    }
  }

  return sharp(baseBuf)
    .composite(layers)
    .jpeg({ quality: 84 })
    .toBuffer();
}

// Disk-cache helpers ---------------------------------------------------------

function cachePathForSlug(slug) {
  const safe = String(slug).replace(/[^a-z0-9_-]/gi, "").slice(0, 64);
  return path.join(CARD_DIR, safe + ".jpg");
}

function freshCache(cacheFile) {
  try {
    const st = fs.statSync(cacheFile);
    if (Date.now() - st.mtimeMs < CARD_TTL_MS) return true;
  } catch {}
  return false;
}

// Periodic sweep: delete cached cards older than the TTL. Self-contained;
// touches ONLY our own og-cards folder.
function sweepOldCards() {
  try {
    const files = fs.readdirSync(CARD_DIR);
    const now = Date.now();
    for (const f of files) {
      const fp = path.join(CARD_DIR, f);
      try {
        const st = fs.statSync(fp);
        if (now - st.mtimeMs > CARD_TTL_MS) fs.unlinkSync(fp);
      } catch {}
    }
  } catch {}
}
setInterval(sweepOldCards, 60 * 60 * 1000).unref?.(); // hourly, never blocks exit

// Route ----------------------------------------------------------------------

router.get(OG_CARD_PATH, async (req, res) => {
  const slug = req.subdomain;
  if (!slug) return res.status(404).end();

  try {
    const page = await getPageBySlug(slug);

    // Card auto-dies with the page: no card for missing / deleted / inactive
    // (unfunded, expired) pages. This is what makes previews expire on their own.
    const now = Math.floor(Date.now() / 1000);
    const isLive =
      page &&
      !page.soft_deleted_at &&
      page.status === "active" &&
      (!page.expires_at || page.expires_at > now);

    if (!isLive) return res.status(404).end();

    const cacheFile = cachePathForSlug(slug);

    // Serve fresh cached card if we have one.
    if (freshCache(cacheFile)) {
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=21600");
      return res.sendFile(cacheFile);
    }

    let content = {};
    try {
      content = JSON.parse(page.content_json || "{}");
    } catch {}

    const domain = (slug + "." + (process.env.DOMAIN || "localhost"));

    await acquireSlot();
    let buf;
    try {
      buf = await generateCardBuffer(content, domain);
      // Best-effort cache write; if it fails we still serve the buffer.
      try { fs.writeFileSync(cacheFile, buf); } catch {}
    } finally {
      releaseSlot();
    }

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=21600");
    return res.send(buf);
  } catch (err) {
    logger.warn("og_card_error", { slug, err: err.message });
    // Fail soft — no image rather than a broken page. Platforms then just show
    // the title/description card without an image.
    return res.status(404).end();
  }
});

// ---------------------------------------------------------------------------
// ogInject middleware
// ---------------------------------------------------------------------------
// Rather than editing the template renderer, we intercept the OUTGOING page
// HTML and repoint its preview image at our card route, plus upgrade the
// twitter card to the large format. This keeps renderer.js completely untouched.
//
// It only acts on HTML responses served on a page subdomain, and only rewrites
// the OG/twitter IMAGE tags (leaving title, description, url, everything else
// exactly as the renderer produced them). If anything about the response isn't
// what we expect, it passes through unchanged.
// ---------------------------------------------------------------------------
export function ogInject(req, res, next) {
  // Only page subdomains have previews worth upgrading.
  if (req.isMainDomain || !req.subdomain) return next();

  // Don't touch our own card path or media files.
  if (req.path === OG_CARD_PATH || req.path.startsWith("/media/") || req.path.startsWith("/__og/")) {
    return next();
  }

  const slug = req.subdomain;
  const domain = process.env.DOMAIN || "localhost";
  const cardUrl = "https://" + slug + "." + domain + OG_CARD_PATH;

  const origSend = res.send.bind(res);
  res.send = (body) => {
    try {
      const ct = res.getHeader("Content-Type");
      const isHtml =
        typeof body === "string" &&
        (!ct || String(ct).includes("text/html")) &&
        body.indexOf("<meta") !== -1;

      if (isHtml) {
        let html = body;

        // Replace the og:image and twitter:image contents with our card URL.
        html = html.replace(
          /(<meta\s+property="og:image"\s+content=")[^"]*(")/i,
          `$1${cardUrl}$2`
        );
        html = html.replace(
          /(<meta\s+name="twitter:image"\s+content=")[^"]*(")/i,
          `$1${cardUrl}$2`
        );

        // Ensure the large-image twitter card (renderer already sets this, but
        // enforce it in case a template differs).
        html = html.replace(
          /(<meta\s+name="twitter:card"\s+content=")[^"]*(")/i,
          `$1summary_large_image$2`
        );

        // Add explicit image dimensions right after og:image, so platforms know
        // it's the large 1200x630 card. Only add once.
        if (html.indexOf('property="og:image:width"') === -1) {
          html = html.replace(
            /(<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>)/i,
            `$1<meta property="og:image:width" content="${CARD_W}" /><meta property="og:image:height" content="${CARD_H}" /><meta property="og:image:type" content="image/jpeg" />`
          );
        }

        return origSend(html);
      }
    } catch (err) {
      logger.warn("og_inject_error", { err: err.message });
    }
    return origSend(body);
  };

  next();
}

export default router;
