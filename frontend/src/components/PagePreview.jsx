import React, { useEffect, useRef, useState } from "react";

// ============================================================================
// PagePreview
// ----------------------------------------------------------------------------
// Shows a live, REAL preview of the page the user is building, by asking the
// backend /api/preview endpoint to render the exact same HTML the live page
// would use — including the real animated template background.
//
// This is completely isolated: it only SENDS the in-progress data and DISPLAYS
// the returned HTML inside a sandboxed iframe. Nothing is saved, no page is
// created, and the create -> pay -> activate flow is never touched.
//
// Images (avatar / banner / team photos) are already data: URLs at this stage
// (ImageUpload stores them via readAsDataURL), so they render inside the iframe
// with no extra work.
// ============================================================================

// Buy-link builder — identical logic to CreatePage / ManagePage / renderer, so the
// preview shows exactly the buttons the live page will. Buy links are derived from
// the CA + the creator's chain pick (buyChain), never edited by hand.
const EVM_CHAINS = [
  { id: "ethereum", label: "Ethereum", dex: "uniswap",     uniChain: "mainnet"  },
  { id: "bsc",      label: "BNB Chain (BSC)", dex: "pancakeswap"                 },
  { id: "base",     label: "Base",     dex: "uniswap",     uniChain: "base"     },
  { id: "arbitrum", label: "Arbitrum", dex: "uniswap",     uniChain: "arbitrum" },
  { id: "polygon",  label: "Polygon",  dex: "uniswap",     uniChain: "polygon"  },
];

function detectChain(ca) {
  const a = (ca || "").trim();
  if (!a) return null;
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return "evm";
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return "tron";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return "solana";
  return "other";
}

function buildBuyLinks(family, ca, evmChain) {
  const a = (ca || "").trim();
  if (!a) return [];
  if (family === "solana") {
    return [
      { key: "raydium", url: "https://raydium.io/swap/?inputMint=sol&outputMint=" + a },
      { key: "pumpfun", url: "https://pump.fun/coin/" + a },
    ];
  }
  // Tron's button is rendered by the backend from the CA directly, so nothing to add here.
  if (family === "evm") {
    const chain = EVM_CHAINS.find((c) => c.id === evmChain);
    if (!chain) return [];
    if (chain.dex === "uniswap") {
      return [{ key: "uniswap", url: "https://app.uniswap.org/swap?chain=" + chain.uniChain + "&inputCurrency=ETH&outputCurrency=" + a }];
    }
    if (chain.dex === "pancakeswap") {
      return [{ key: "pancakeswap", url: "https://pancakeswap.finance/swap?chain=bsc&outputCurrency=" + a }];
    }
  }
  return [];
}

// Map the in-progress `data` prop into the `content` shape the renderer expects.
function buildContent(data) {
  const content = {};
  if (data.name) content.name = data.name;
  if (data.description) content.description = data.description;
  if (data.contractAddress) content.contractAddress = data.contractAddress;

  // Buy links: build from the CA + chosen chain, exactly like the live page.
  const builtLinks = buildBuyLinks(detectChain(data.contractAddress), data.contractAddress, data.buyChain);
  const buyLinks = Object.fromEntries(builtLinks.map((b) => [b.key, b.url]));
  if (Object.keys(buyLinks).length) content.buyLinks = buyLinks;

  const tokenomics = Object.fromEntries(Object.entries(data.tokenomics || {}).filter(([, v]) => v && String(v).trim()));
  if (Object.keys(tokenomics).length) content.tokenomics = tokenomics;

  content.socials = Object.fromEntries(Object.entries(data.socials || {}).filter(([, v]) => v && String(v).trim()));

  // Images: use the local data: URL previews so they show in the iframe.
  const avatarSrc = data.avatar?.preview || (typeof data.avatar === "string" ? data.avatar : null);
  const bannerSrc = data.banner?.preview || (typeof data.banner === "string" ? data.banner : null);
  if (avatarSrc) content.avatar = avatarSrc;
  if (bannerSrc) content.banner = bannerSrc;

  if (data.contractAddress && data.showTicker) content.showTicker = true;
  if (data.contractAddress && data.showChart) content.showChart = true;

  if (data.countdownDate) content.countdown = { date: data.countdownDate, label: data.countdownLabel || "Countdown" };

  const team = (data.team || [])
    .filter((m) => m.name && m.name.trim())
    .map((m) => {
      const member = { name: m.name, role: m.role };
      if (m.twitter && m.twitter.trim()) member.twitter = m.twitter.trim();
      const photoSrc = m.photo?.preview || (typeof m.photo === "string" ? m.photo : null);
      if (photoSrc) member.photo = photoSrc;
      return member;
    });
  if ((data.aboutText && data.aboutText.trim()) || team.length) {
    content.about = { text: data.aboutText || "", team };
  }

  const roadmap = (data.roadmap || []).filter((m) => m.title && m.title.trim());
  if (roadmap.length) content.roadmap = roadmap;

  return content;
}

export default function PagePreview({ data, templateId, debounceMs = 500 }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const content = buildContent(data);
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId, content }),
        });
        const text = await res.text();
        setHtml(text);
      } catch {
        setHtml("<p style='color:#888;font-family:sans-serif;padding:20px'>Preview unavailable.</p>");
      }
      setLoading(false);
    }, debounceMs);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [data, templateId, debounceMs]);

  return (
    <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", background: "#0a0a0a", minHeight: "400px" }}>
      {loading && (
        <div style={{ position: "absolute", top: "10px", right: "12px", fontSize: "11px", color: "#666", zIndex: 2 }}>Updating…</div>
      )}
      <iframe
        srcDoc={html}
        title="Page preview"
        sandbox="allow-scripts allow-same-origin"
        style={{ width: "100%", height: "600px", border: "none", display: "block" }}
      />
    </div>
  );
}
