import React, { useEffect, useState } from "react";

const SOCIAL_ICONS = {
  twitter: "𝕏",
  telegram: "✈",
  discord: "🎮",
  github: "🐙",
  coingecko: "🦎",
  coinmarketcap: "📊",
  pumpfun: "🚀",
  custom: "🔗",
};

const BUY_LABELS = {
  raydium: "Raydium",
  jupiter: "Jupiter",
  pumpfun: "Pump.fun",
};

const TOKENOMICS_LABELS = {
  totalSupply: "Total Supply",
  tax: "Buy/Sell Tax",
  liquidity: "Liquidity",
  renounced: "Contract Renounced",
  launchDate: "Launch Date",
  network: "Network",
};

// Per-template theme map — covers all 8 templates with their real colours.
// Only template_2 is light mode; the rest are dark.
const THEMES = {
  template_1: { dark: true,  accent: "#9945FF", buyGrad: "linear-gradient(135deg,#9945FF,#14F195)", buyText: "#000", pageBg: "#0d0d0d", bannerGrad: "linear-gradient(135deg,#1a0a2e,#0a1628)" },
  template_2: { dark: false, accent: "#14a37f", buyGrad: "linear-gradient(135deg,#14a37f,#0d7a5f)", buyText: "#fff", pageBg: "#f5f7fa", bannerGrad: "linear-gradient(135deg,#e8f5e9,#e3f2fd)" },
  template_3: { dark: true,  accent: "#FF007A", buyGrad: "linear-gradient(135deg,#FF007A,#00F5FF)", buyText: "#000", pageBg: "#000000", bannerGrad: "linear-gradient(135deg,#1a0010,#00101a)" },
  template_4: { dark: true,  accent: "#1E90FF", buyGrad: "linear-gradient(135deg,#1E90FF,#00BFFF)", buyText: "#fff", pageBg: "#0a0f1e", bannerGrad: "linear-gradient(135deg,#0a0f1e,#0d1f3c)" },
  template_5: { dark: true,  accent: "#c8a84b", buyGrad: "linear-gradient(135deg,#c8a84b,#f0d070)", buyText: "#000", pageBg: "#04010f", bannerGrad: "linear-gradient(135deg,#0d0630,#060d2e)" },
  template_6: { dark: true,  accent: "#0ea5e9", buyGrad: "#0ea5e9",                                  buyText: "#fff", pageBg: "#0c0c0e", bannerGrad: "linear-gradient(160deg,#141418,#0c0c0e)" },
  template_7: { dark: true,  accent: "#fb923c", buyGrad: "linear-gradient(135deg,#fb923c,#fbbf24)", buyText: "#000", pageBg: "#0a0805", bannerGrad: "linear-gradient(135deg,#1a0f02,#120a01)" },
  template_8: { dark: true,  accent: "#7dd3fc", buyGrad: "linear-gradient(135deg,#7dd3fc,#e0f2fe)", buyText: "#000", pageBg: "#060a10", bannerGrad: "linear-gradient(135deg,#0a1220,#060e18)" },
};

function getTheme(templateId) {
  return THEMES[templateId] || THEMES.template_1;
}

// Convert a hex accent like #9945FF into an rgba() string with the given alpha.
function accentRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

function CountdownPreview({ date, label, accentColor }) {
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const calc = () => {
      const diff = new Date(date).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ launched: true }); return; }
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [date]);

  if (timeLeft.launched) return (
    <div style={{ fontSize: "20px", fontWeight: 800, color: accentColor, textAlign: "center", padding: "14px" }}>🚀 Launched!</div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
      {[["d", "Days"], ["h", "Hours"], ["m", "Mins"], ["s", "Secs"]].map(([k, l]) => (
        <div key={k} style={{ textAlign: "center", background: accentRgba(accentColor, 0.08), borderRadius: "8px", padding: "10px 4px" }}>
          <div style={{ fontSize: "26px", fontWeight: 900, color: accentColor }}>{String(timeLeft[k] || 0).padStart(2, "0")}</div>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "3px", textTransform: "uppercase", letterSpacing: "1px" }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

export default function PagePreview({ data, templateId }) {
  const theme = getTheme(templateId);
  const isDark = theme.dark;
  const accentColor = theme.accent;

  const socialEntries = Object.entries(data.socials || {}).filter(([, v]) => v && v.trim());
  const buyEntries = Object.entries(data.buyLinks || {}).filter(([, v]) => v && v.trim());
  const tokenomicsEntries = Object.entries(data.tokenomics || {}).filter(([, v]) => v && v.trim());
  const filteredTeam = (data.team || []).filter((m) => m.name && m.name.trim());
  const filteredRoadmap = (data.roadmap || []).filter((m) => m.title && m.title.trim());
  const hasAbout = (data.aboutText && data.aboutText.trim()) || filteredTeam.length > 0;
  const hasCountdown = data.countdownDate;

  const contractBg = accentRgba(accentColor, 0.07);
  const contractBorder = "1px solid " + accentRgba(accentColor, 0.2);
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";

  return (
    <div style={{
      background: theme.pageBg,
      borderRadius: "12px", overflow: "hidden",
      border: isDark ? "1px solid #222" : "1px solid #ddd",
      fontFamily: "Inter, system-ui, sans-serif",
      maxWidth: "480px", width: "100%", minHeight: "400px",
    }}>

      {data.banner?.preview ? (
        <img src={data.banner.preview} alt="banner" style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{
          width: "100%", height: "90px",
          background: theme.bannerGrad,
        }} />
      )}

      <div style={{ padding: "16px 18px" }}>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", marginTop: "-30px", marginBottom: "14px" }}>
          {data.avatar?.preview ? (
            <img src={data.avatar.preview} alt="avatar" style={{ width: "78px", height: "78px", borderRadius: "50%", objectFit: "cover", border: isDark ? "3px solid #1a1a1a" : "3px solid #fff", flexShrink: 0 }} />
          ) : (
            <div style={{ width: "78px", height: "78px", borderRadius: "50%", background: isDark ? "#1e1e1e" : "#ddd", border: isDark ? "3px solid #1a1a1a" : "3px solid #fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: "26px" }}>🪙</div>
          )}
          {data.name && <div style={{ fontSize: "24px", fontWeight: 900, color: isDark ? "#fff" : "#111", paddingBottom: "4px", lineHeight: 1.1 }}>{data.name}</div>}
        </div>

        {data.description && (
          <div style={{ background: cardBg, border: cardBorder, borderRadius: "10px", padding: "12px 14px", marginBottom: "12px" }}>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: isDark ? "#aaa" : "#555" }}>{data.description}</p>
          </div>
        )}

        {data.contractAddress && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: contractBg, border: contractBorder, borderRadius: "8px", padding: "10px 12px", marginBottom: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 800, color: accentColor, letterSpacing: "1px" }}>CA</span>
            <span style={{ fontFamily: "monospace", fontSize: "12px", color: isDark ? "#aaa" : "#666", wordBreak: "break-all", flex: 1 }}>{data.contractAddress}</span>
          </div>
        )}

        {buyEntries.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
            {buyEntries.map(([key]) => (
              <span key={key} style={{
                padding: "10px 18px", borderRadius: "20px", fontSize: "15px", fontWeight: 700,
                background: theme.buyGrad,
                color: theme.buyText,
              }}>{BUY_LABELS[key] || key}</span>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "10px" }}>

          {tokenomicsEntries.length > 0 && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: accentColor, letterSpacing: "1.5px", marginBottom: "10px", textTransform: "uppercase" }}>Tokenomics</div>
              {tokenomicsEntries.map(([key, value]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: "14px", color: isDark ? "#888" : "#888" }}>{TOKENOMICS_LABELS[key] || key}</span>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: isDark ? "#fff" : "#111" }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {data.showTicker && data.contractAddress && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: accentColor, letterSpacing: "1.5px", marginBottom: "10px", textTransform: "uppercase" }}>Live Price</div>
              <div style={{ fontSize: "14px", color: "#666" }}>Live data on published page</div>
            </div>
          )}

          {hasCountdown && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: accentColor, letterSpacing: "1.5px", marginBottom: "10px", textTransform: "uppercase" }}>{data.countdownLabel || "Countdown"}</div>
              <CountdownPreview date={data.countdownDate} label={data.countdownLabel} accentColor={accentColor} />
            </div>
          )}

          {hasAbout && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: accentColor, letterSpacing: "1.5px", marginBottom: "10px", textTransform: "uppercase" }}>About</div>
              {data.aboutText && <p style={{ fontSize: "14px", color: isDark ? "#aaa" : "#666", lineHeight: 1.6, marginBottom: filteredTeam.length > 0 ? "10px" : "0" }}>{data.aboutText.slice(0, 80)}{data.aboutText.length > 80 ? "…" : ""}</p>}
              {filteredTeam.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {filteredTeam.map((m, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: "#000" }}>{m.name.charAt(0).toUpperCase()}</div>
                      <span style={{ fontSize: "14px", color: isDark ? "#ccc" : "#333" }}>{m.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {filteredRoadmap.length > 0 && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: accentColor, letterSpacing: "1.5px", marginBottom: "10px", textTransform: "uppercase" }}>Roadmap</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {filteredRoadmap.slice(0, 4).map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0, background: item.status === "completed" ? accentColor : "transparent", border: item.status === "completed" ? "none" : "2px solid " + (item.status === "inprogress" ? accentColor : "rgba(255,255,255,0.2)"), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {item.status === "completed" && <span style={{ fontSize: "10px", color: "#000", fontWeight: 800 }}>✓</span>}
                      {item.status === "inprogress" && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: accentColor, display: "block" }} />}
                    </div>
                    <span style={{ fontSize: "14px", color: item.status === "upcoming" ? (isDark ? "#555" : "#aaa") : isDark ? "#fff" : "#111", fontWeight: item.status === "upcoming" ? 400 : 600 }}>{item.title}</span>
                  </div>
                ))}
                {filteredRoadmap.length > 4 && <div style={{ fontSize: "14px", color: "#666" }}>+{filteredRoadmap.length - 4} more</div>}
              </div>
            </div>
          )}

          {socialEntries.length > 0 && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: accentColor, letterSpacing: "1.5px", marginBottom: "10px", textTransform: "uppercase" }}>Socials</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {socialEntries.map(([key]) => (
                  <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "20px", background: isDark ? "rgba(255,255,255,0.06)" : "#f4f4f4", color: isDark ? "#ccc" : "#333", fontSize: "14px", fontWeight: 600, textTransform: "capitalize" }}>
                    {SOCIAL_ICONS[key] || "🔗"} {key}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.showChart && data.contractAddress && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "10px", padding: "12px 14px", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, color: accentColor, letterSpacing: "1.5px", marginBottom: "10px", textTransform: "uppercase" }}>Price Chart</div>
              <div style={{ fontSize: "14px", color: "#666" }}>Live chart will load on published page</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
