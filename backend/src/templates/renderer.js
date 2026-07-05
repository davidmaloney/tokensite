import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname);

function loadTemplate(templateId) {
  const dir = path.join(TEMPLATES_DIR, templateId);
  const htmlPath = path.join(dir, "index.html");
  const cssPath = path.join(dir, "style.css");
  if (!fs.existsSync(htmlPath)) {
    logger.warn("template_not_found", { templateId });
    return null;
  }
  const html = fs.readFileSync(htmlPath, "utf8");
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
  return { html, css };
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

function cleanHandle(raw) {
  if (!raw) return "";
  return String(raw)
    .replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "")
    .replace(/^(x|twitter)\.com\//i, "")
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 15);
}

const SOCIAL_ICONS = {
  twitter: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
  discord: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
  coingecko: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><circle cx="12" cy="12" r="10"/></svg>',
  coinmarketcap: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 0C5.374 0 0 5.374 0 12s5.374 12 12 12 12-5.374 12-12S18.626 0 12 0zm5.237 14.625a.735.735 0 01-1.037.046c-1.46-1.294-3.54-2.036-5.8-2.036s-4.34.742-5.8 2.036a.735.735 0 01-.991-1.083c1.755-1.558 4.13-2.453 6.79-2.453s5.036.895 6.79 2.453a.735.735 0 01.048.037z"/></svg>',
  pumpfun: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
};

const BUY_ICONS = {
  raydium: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3l7 4-7 4-7-4 7-4zm0 6.5l7 4-7 4-7-4 7-4z"/></svg>',
  jupiter: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>',
  pumpfun: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
  uniswap: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M9.563 2.048a.88.88 0 00-.528.04C7.24 2.744 5.98 4.854 5.98 7.1c0 .592.08 1.168.232 1.72C4.76 9.716 4 11.26 4 13c0 3.864 3.584 7 8 7s8-3.136 8-7c0-1.74-.76-3.284-2.212-4.18.152-.552.232-1.128.232-1.72 0-2.246-1.26-4.356-3.055-5.012a.88.88 0 00-.528-.04c-.336.08-.584.304-.704.616C13.5 4.812 12.796 5.4 12 5.4s-1.5-.588-1.733-1.736c-.12-.312-.368-.536-.704-.616zm2.437 5.152c2.652 0 4.8 2.016 4.8 4.5S14.652 16.2 12 16.2s-4.8-2.016-4.8-4.5 2.148-4.5 4.8-4.5z"/></svg>',
  pancakeswap: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 5h2v2h-2V7zm0 4h2v6h-2v-6z"/></svg>',
};

const BUY_LABELS = {
  raydium: "Buy on Raydium",
  jupiter: "Buy on Jupiter",
  pumpfun: "Buy on Pump.fun",
  uniswap: "Buy on Uniswap",
  pancakeswap: "Buy on PancakeSwap",
};

const TOKENOMICS_LABELS = {
  totalSupply: "Total Supply",
  tax: "Buy/Sell Tax",
  liquidity: "Liquidity",
  renounced: "Contract Renounced",
  launchDate: "Launch Date",
  network: "Network",
};

function buildTickerBlock(contractAddress) {
  if (!contractAddress) return "";
  return "<div class=\"card ticker-card\" data-ca=\"" + escapeHtml(contractAddress) + "\">" +
    "<div class=\"card-title\">Live Price</div>" +
    "<div class=\"ticker-content\"><div class=\"ticker-loading\">Loading price data...</div></div>" +
    "</div>";
}

function buildChartBlock(contractAddress) {
  if (!contractAddress) return "";
  let chartUrl;
  const addr = contractAddress.trim();
  // Tron: DexScreener's embed needs a pair/pool address and won't resolve a bare
  // Tron token CA, so the iframe just loads blank. Rather than show a broken empty
  // chart, show a short honest note instead.
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(addr)) {
    return "<div class=\"card chart-card\">" +
      "<div class=\"card-title\">Price Chart</div>" +
      "<div style=\"padding:24px;text-align:center;color:#888;font-size:13px;\">" +
      "Live chart isn't available for Tron tokens yet." +
      "</div></div>";
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) {
    chartUrl = "https://dexscreener.com/solana/" + escapeHtml(addr) + "?embed=1&theme=dark&trades=0&info=0";
  } else {
    chartUrl = "https://dexscreener.com/search?q=" + escapeHtml(addr) + "&embed=1&theme=dark";
  }
  return "<div class=\"card chart-card\">" +
    "<div class=\"card-title\">Price Chart</div>" +
    "<iframe src=\"" + chartUrl + "\" " +
    "style=\"width:100%;height:400px;border:none;border-radius:8px;\" " +
    "loading=\"lazy\" allowfullscreen></iframe>" +
    "</div>";
}

function buildCountdownBlock(countdown) {
  if (!countdown || !countdown.date) return "";
  var label = escapeHtml(countdown.label || "Countdown");
  var targetDate = new Date(countdown.date).getTime();
  if (isNaN(targetDate)) return "";
  return "<div class=\"card countdown-card\" data-target=\"" + targetDate + "\">" +
    "<div class=\"card-title\">" + label + "</div>" +
    "<div class=\"countdown-grid\">" +
    "<div class=\"countdown-item\"><div class=\"countdown-num cd-days\">--</div><div class=\"countdown-label\">Days</div></div>" +
    "<div class=\"countdown-item\"><div class=\"countdown-num cd-hours\">--</div><div class=\"countdown-label\">Hours</div></div>" +
    "<div class=\"countdown-item\"><div class=\"countdown-num cd-mins\">--</div><div class=\"countdown-label\">Mins</div></div>" +
    "<div class=\"countdown-item\"><div class=\"countdown-num cd-secs\">--</div><div class=\"countdown-label\">Secs</div></div>" +
    "</div>" +
    "</div>";
}

function buildAboutBlock(about) {
  if (!about) return "";
  var hasText = about.text && about.text.trim();
  var hasTeam = about.team && about.team.length > 0;
  if (!hasText && !hasTeam) return "";
  var html = "<div class=\"card about-card\"><div class=\"card-title\">About</div>";
  if (hasText) {
    html += "<p class=\"about-text\">" + escapeHtml(about.text) + "</p>";
  }
  if (hasTeam) {
    html += "<div class=\"team-grid\">";
    about.team.forEach(function(member) {
      if (!member.name) return;
      var avatarInner = member.photo
        ? "<img src=\"" + escapeHtml(member.photo) + "\" alt=\"" + escapeHtml(member.name) + "\" class=\"team-photo\" />"
        : escapeHtml(member.name.charAt(0).toUpperCase());
      html += "<div class=\"team-member\">" +
        "<div class=\"team-avatar\">" + avatarInner + "</div>" +
        "<div class=\"team-info\">" +
        "<div class=\"team-name\">" + escapeHtml(member.name) + "</div>" +
        (member.role ? "<div class=\"team-role\">" + escapeHtml(member.role) + "</div>" : "") +
        (cleanHandle(member.twitter) ? "<a href=\"https://x.com/" + escapeHtml(cleanHandle(member.twitter)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"team-twitter\" aria-label=\"X profile\">" + SOCIAL_ICONS.twitter + "</a>" : "") +
        "</div></div>";
    });
    html += "</div>";
  }
  html += "</div>";
  return html;
}

function buildRoadmapBlock(roadmap) {
  if (!roadmap || roadmap.length === 0) return "";
  var html = "<div class=\"card roadmap-card\"><div class=\"card-title\">Roadmap</div><div class=\"roadmap-list\">";
  roadmap.forEach(function(item) {
    if (!item.title) return;
    var status = item.status || "upcoming";
    html += "<div class=\"roadmap-item status-" + status + "\">" +
      "<div class=\"roadmap-dot\">" +
      (status === "completed" ? "<span class=\"dot-check\">&#10003;</span>" : "<span class=\"dot-inner\"></span>") +
      "</div>" +
      "<div class=\"roadmap-content\">" +
      "<div class=\"roadmap-title\">" + escapeHtml(item.title) + "</div>" +
      (item.description ? "<div class=\"roadmap-desc\">" + escapeHtml(item.description) + "</div>" : "") +
      "<div class=\"roadmap-status-label\">" + (status === "completed" ? "Completed" : status === "inprogress" ? "In Progress" : "Upcoming") + "</div>" +
      "</div></div>";
  });
  html += "</div></div>";
  return html;
}

export function renderPage(page) {
  const templateId = page.template_id || "template_1";
  const tmpl = loadTemplate(templateId);

  if (!tmpl) {
    return "<!DOCTYPE html><html><body><p>Template not found.</p></body></html>";
  }

  let content = {};
  try {
    content = JSON.parse(page.content_json || "{}");
  } catch {}

  const pageUrl = "https://" + page.slug + ".shillit.fun";
  const ogTitle = escapeHtml(content.name || page.slug);
  const ogDescription = escapeHtml(content.description ? content.description.slice(0, 160) : "Token page on shillit.fun");
  const ogImage = content.avatar ? "https://" + page.slug + ".shillit.fun" + content.avatar : "https://shillit.fun/og-default.png";

  const ogTags = "<meta property=\"og:title\" content=\"" + ogTitle + "\" />" +
    "<meta property=\"og:description\" content=\"" + ogDescription + "\" />" +
    "<meta property=\"og:image\" content=\"" + ogImage + "\" />" +
    "<meta property=\"og:url\" content=\"" + pageUrl + "\" />" +
    "<meta property=\"og:type\" content=\"website\" />" +
    "<meta name=\"twitter:card\" content=\"summary_large_image\" />" +
    "<meta name=\"twitter:title\" content=\"" + ogTitle + "\" />" +
    "<meta name=\"twitter:description\" content=\"" + ogDescription + "\" />" +
    "<meta name=\"twitter:image\" content=\"" + ogImage + "\" />";

  const socials = content.socials || {};
  const socialHtml = Object.entries(socials)
    .filter(([, url]) => url && url.trim())
    .map(([key, url]) =>
      "<a href=\"" + escapeHtml(url) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"social-link social-" + key + "\">" +
      "<span class=\"social-icon\">" + (SOCIAL_ICONS[key] || SOCIAL_ICONS.github) + "</span>" +
      "<span>" + escapeHtml(key) + "</span></a>"
    ).join("\n");

  const buyLinks = content.buyLinks || {};
  let buyHtml = Object.entries(buyLinks)
    // Skip any stored "sunswap" link — Tron gets the dedicated copy-and-open button
    // below instead, so we never render a plain (empty) SunSwap buy button.
    .filter(([key, url]) => key !== "sunswap" && url && url.trim())
    .map(([key, url]) =>
      "<a href=\"" + escapeHtml(url) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"buy-btn buy-" + key + "\">" +
      "<span class=\"buy-icon\">" + (BUY_ICONS[key] || "") + "</span>" +
      "<span>" + (BUY_LABELS[key] || key) + "</span></a>"
    ).join("\n");

  // Tron special-case: Tron DEXs don't support pre-filling the output token via URL,
  // so instead of a normal buy button we render a button that copies the contract
  // address to the buyer's clipboard AND opens SunSwap in a new tab. By the time they
  // arrive on SunSwap, the CA is already copied and ready to paste. Driven purely off
  // the contract address being a Tron address, so it works with no stored buy link.
  const caTrimmedForTron = (content.contractAddress || "").trim();
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(caTrimmedForTron)) {
    const caJs = escapeHtml(caTrimmedForTron).replace(/'/g, "\\'");
    const tronBtnFinal =
      "<a href=\"https://sunswap.com\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"buy-btn buy-sunswap\" " +
      "onclick=\"navigator.clipboard.writeText('" + caJs + "');var s=this.querySelector('.buy-sunswap-label');if(s){var o=s.textContent;s.textContent='\\u2713 CA copied \\u2014 paste on SunSwap';setTimeout(function(){s.textContent=o},2500)}\">" +
      "<span class=\"buy-sunswap-label\">Copy CA &amp; Buy on SunSwap &#8594;</span></a>";
    buyHtml = buyHtml ? (buyHtml + "\n" + tronBtnFinal) : tronBtnFinal;
  }

  const contractAddress = content.contractAddress || "";
  const contractHtml = contractAddress
    ? "<div class=\"contract-block\">" +
      "<span class=\"contract-label\">CA</span>" +
      "<span class=\"contract-address\">" + escapeHtml(contractAddress) + "</span>" +
      "<button class=\"copy-btn\" onclick=\"navigator.clipboard.writeText('" + escapeHtml(contractAddress) + "').then(function(){this.textContent='&#10003;';var b=this;setTimeout(function(){b.textContent='Copy'},1500)}.bind(this))\">Copy</button>" +
      "</div>"
    : "";

  const tokenomics = content.tokenomics || {};
  const tokenomicsRows = Object.entries(tokenomics)
    .filter(([, v]) => v && v.trim())
    .map(([key, value]) =>
      "<div class=\"tokenomics-row\">" +
      "<span class=\"tokenomics-label\">" + (TOKENOMICS_LABELS[key] || key) + "</span>" +
      "<span class=\"tokenomics-value\">" + escapeHtml(value) + "</span>" +
      "</div>"
    ).join("\n");

  const tokenomicsHtml = tokenomicsRows
    ? "<div class=\"card tokenomics-block\">" +
      "<div class=\"tokenomics-title\">Tokenomics</div>" +
      tokenomicsRows +
      "</div>"
    : "";

  const descHtml = content.description
    ? "<div class=\"description-block\"><p class=\"description\">" + escapeHtml(content.description) + "</p></div>"
    : "";

  const tickerHtml = content.showTicker && contractAddress ? buildTickerBlock(contractAddress) : "";
  const chartHtml = content.showChart && contractAddress ? buildChartBlock(contractAddress) : "";
  const countdownHtml = buildCountdownBlock(content.countdown);
  const aboutHtml = buildAboutBlock(content.about);
  const roadmapHtml = buildRoadmapBlock(content.roadmap);

  let html = tmpl.html;

  html = html.replace(/\{\{CSS\}\}/g, "<style>" + tmpl.css + "</style>");
  html = html.replace(/\{\{OG_TAGS\}\}/g, ogTags);
  html = html.replace(/\{\{TOKEN_NAME\}\}/g, content.name ? escapeHtml(content.name) : "");
  html = html.replace(/\{\{SLUG\}\}/g, escapeHtml(page.slug));

  html = html.replace(/\{\{AVATAR_BLOCK\}\}/g, content.avatar
    ? "<img src=\"" + escapeHtml(content.avatar) + "\" alt=\"avatar\" class=\"avatar-img\" />"
    : "<div class=\"avatar-placeholder\">&#127752;</div>");

  html = html.replace(/\{\{BANNER_BLOCK\}\}/g, content.banner
    ? "<img src=\"" + escapeHtml(content.banner) + "\" alt=\"banner\" class=\"banner-img\" />"
    : "<div class=\"banner-placeholder\"></div>");

  html = html.replace(/\{\{NAME_BLOCK\}\}/g, content.name
    ? "<h1 class=\"token-name\">" + escapeHtml(content.name) + "</h1>"
    : "");

  html = html.replace(/\{\{DESC_BLOCK\}\}/g, descHtml);
  html = html.replace(/\{\{CONTRACT_BLOCK\}\}/g, contractHtml);
  // Buy buttons show by default; the creator can switch them off (hideBuyButtons).
  const showBuy = !content.hideBuyButtons;
  html = html.replace(/\{\{BUY_BLOCK\}\}/g, (showBuy && buyHtml) ? "<div class=\"buy-links\">" + buyHtml + "</div>" : "");
  html = html.replace(/\{\{TOKENOMICS_BLOCK\}\}/g, tokenomicsHtml);
  html = html.replace(/\{\{SOCIAL_BLOCK\}\}/g, socialHtml ? "<div class=\"social-links\">" + socialHtml + "</div>" : "");
  html = html.replace(/\{\{TICKER_BLOCK\}\}/g, tickerHtml);
  html = html.replace(/\{\{CHART_BLOCK\}\}/g, chartHtml);
  html = html.replace(/\{\{COUNTDOWN_BLOCK\}\}/g, countdownHtml);
  html = html.replace(/\{\{ABOUT_BLOCK\}\}/g, aboutHtml);
  html = html.replace(/\{\{ROADMAP_BLOCK\}\}/g, roadmapHtml);

  return html;
}
