import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname);

const templateCache = new Map();

function loadTemplate(templateId) {
  if (templateCache.has(templateId)) return templateCache.get(templateId);

  const dir = path.join(TEMPLATES_DIR, templateId);
  const htmlPath = path.join(dir, "index.html");
  const cssPath = path.join(dir, "style.css");

  if (!fs.existsSync(htmlPath)) {
    logger.warn("template_not_found", { templateId });
    return null;
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";

  const tmpl = { html, css };
  templateCache.set(templateId, tmpl);
  return tmpl;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SOCIAL_ICONS = {
  twitter: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  telegram: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.068l-2.04 9.613c-.153.674-.551.839-1.116.521l-3.078-2.268-1.484 1.43c-.164.164-.302.302-.62.302l.221-3.131 5.704-5.153c.248-.221-.054-.344-.384-.123L6.59 14.028 3.56 13.07c-.66-.206-.672-.66.138-.977l10.896-4.202c.549-.198 1.03.134.968.977z"/></svg>`,
  discord: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>`,
  github: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
  coingecko: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><circle cx="12" cy="12" r="10"/></svg>`,
  coinmarketcap: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 0C5.374 0 0 5.374 0 12s5.374 12 12 12 12-5.374 12-12S18.626 0 12 0zm5.237 14.625a.735.735 0 01-1.037.046c-1.46-1.294-3.54-2.036-5.8-2.036s-4.34.742-5.8 2.036a.735.735 0 01-.991-1.083c1.755-1.558 4.13-2.453 6.79-2.453s5.036.895 6.79 2.453a.735.735 0 01.048.037z"/></svg>`,
  pumpfun: `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
  custom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
};

export function renderPage(page) {
  const templateId = page.template_id || "template_1";
  const tmpl = loadTemplate(templateId);

  if (!tmpl) {
    return `<!DOCTYPE html><html><body><p>Template not found.</p></body></html>`;
  }

  let content = {};
  try {
    content = JSON.parse(page.content_json || "{}");
  } catch {}

  const socials = content.socials || {};
  const socialHtml = Object.entries(socials)
    .filter(([, url]) => url && url.trim())
    .map(
      ([key, url]) =>
        `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="social-link social-${key}">
          <span class="social-icon">${SOCIAL_ICONS[key] || SOCIAL_ICONS.custom}</span>
          <span>${escapeHtml(key)}</span>
        </a>`
    )
    .join("\n");

  let html = tmpl.html;

  html = html.replace(/\{\{CSS\}\}/g, `<style>${tmpl.css}</style>`);
  html = html.replace(/\{\{TOKEN_NAME\}\}/g, content.name ? escapeHtml(content.name) : "");
  html = html.replace(/\{\{DESCRIPTION\}\}/g, content.description ? escapeHtml(content.description) : "");
  html = html.replace(/\{\{SLUG\}\}/g, escapeHtml(page.slug));

  if (content.avatar) {
    html = html.replace(/\{\{AVATAR_BLOCK\}\}/g, `<img src="${escapeHtml(content.avatar)}" alt="avatar" class="avatar-img" />`);
  } else {
    html = html.replace(/\{\{AVATAR_BLOCK\}\}/g, `<div class="avatar-placeholder">🪙</div>`);
  }

  if (content.banner) {
    html = html.replace(/\{\{BANNER_BLOCK\}\}/g, `<img src="${escapeHtml(content.banner)}" alt="banner" class="banner-img" />`);
  } else {
    html = html.replace(/\{\{BANNER_BLOCK\}\}/g, `<div class="banner-placeholder"></div>`);
  }

  if (content.name) {
    html = html.replace(/\{\{NAME_BLOCK\}\}/g, `<h1 class="token-name">${escapeHtml(content.name)}</h1>`);
  } else {
    html = html.replace(/\{\{NAME_BLOCK\}\}/g, "");
  }

  if (content.description) {
    html = html.replace(/\{\{DESC_BLOCK\}\}/g, `<p class="description">${escapeHtml(content.description)}</p>`);
  } else {
    html = html.replace(/\{\{DESC_BLOCK\}\}/g, "");
  }

  if (socialHtml) {
    html = html.replace(/\{\{SOCIAL_BLOCK\}\}/g, `<div class="social-links">${socialHtml}</div>`);
  } else {
    html = html.replace(/\{\{SOCIAL_BLOCK\}\}/g, "");
  }

  return html;
}
