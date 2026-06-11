import React from "react";

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

export default function PagePreview({ data, templateId }) {
  const isDark = templateId === "template_1" || templateId === "template_3" || templateId === "template_4";

  const socialEntries = Object.entries(data.socials || {}).filter(([, v]) => v && v.trim() !== "");
  const buyEntries = Object.entries(data.buyLinks || {}).filter(([, v]) => v && v.trim() !== "");
  const tokenomicsEntries = Object.entries(data.tokenomics || {}).filter(([, v]) => v && v.trim() !== "");

  const accentColor = templateId === "template_3" ? "#FF007A" : templateId === "template_4" ? "#1E90FF" : templateId === "template_2" ? "#14a37f" : "#9945FF";

  const contractBg = templateId === "template_2" ? "rgba(20,163,127,0.06)" : templateId === "template_3" ? "rgba(255,0,122,0.06)" : templateId === "template_4" ? "rgba(30,144,255,0.08)" : "rgba(153,69,255,0.08)";
  const contractBorder = templateId === "template_2" ? "1px solid rgba(20,163,127,0.2)" : templateId === "template_3" ? "1px solid rgba(255,0,122,0.2)" : templateId === "template_4" ? "1px solid rgba(30,144,255,0.2)" : "1px solid rgba(153,69,255,0.2)";

  return (
    <div style={{
      background: templateId === "template_2" ? "#f5f7fa" : "#0d0d0d",
      borderRadius: "12px",
      overflow: "hidden",
      border: isDark ? "1px solid #222" : "1px solid #ddd",
      fontFamily: "Inter, system-ui, sans-serif",
      maxWidth: "480px",
      width: "100%",
      minHeight: "600px",
    }}>

      {/* Banner */}
      {data.banner?.preview ? (
        <img src={data.banner.preview} alt="banner"
          style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{
          width: "100%", height: "80px",
          background: templateId === "template_2" ? "linear-gradient(135deg, #e8f5e9, #e3f2fd)" : templateId === "template_3" ? "linear-gradient(135deg, #1a0010, #00101a)" : templateId === "template_4" ? "linear-gradient(135deg, #0a0f1e, #0d1f3c)" : "linear-gradient(135deg, #1a0a2e, #0a1628)",
        }} />
      )}

      <div style={{ padding: "16px 20px" }}>

        {/* Avatar + Name */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", marginTop: "-30px", marginBottom: "14px" }}>
          {data.avatar?.preview ? (
            <img src={data.avatar.preview} alt="avatar" style={{
              width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover",
              border: isDark ? "3px solid #1a1a1a" : "3px solid #fff", flexShrink: 0,
            }} />
          ) : (
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%",
              background: isDark ? "#1e1e1e" : "#ddd",
              border: isDark ? "3px solid #1a1a1a" : "3px solid #fff",
              flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#666", fontSize: "24px",
            }}>🪙</div>
          )}
          {data.name && (
            <div style={{ paddingBottom: "4px" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, color: isDark ? "#fff" : "#111" }}>
                {data.name}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {data.description && (
          <div style={{
            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
            borderRadius: "10px", padding: "12px 14px", marginBottom: "12px",
          }}>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: isDark ? "#aaa" : "#555" }}>
              {data.description}
            </p>
          </div>
        )}

        {/* Contract Address */}
        {data.contractAddress && (
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: contractBg,
            border: contractBorder,
            borderRadius: "8px", padding: "8px 12px", marginBottom: "12px", flexWrap: "wrap",
          }}>
            <span style={{ fontSize: "10px", fontWeight: 800, color: accentColor, letterSpacing: "1px", flexShrink: 0 }}>CA</span>
            <span style={{ fontFamily: "monospace", fontSize: "10px", color: isDark ? "#aaa" : "#666", wordBreak: "break-all", flex: 1 }}>
              {data.contractAddress}
            </span>
          </div>
        )}

        {/* Buy Buttons */}
        {buyEntries.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
            {buyEntries.map(([key]) => (
              <span key={key} style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                padding: "5px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                background: templateId === "template_2"
                  ? "linear-gradient(135deg, #14a37f, #0d7a5f)"
                  : templateId === "template_3"
                  ? "linear-gradient(135deg, #FF007A, #00F5FF)"
                  : templateId === "template_4"
                  ? "linear-gradient(135deg, #1E90FF, #00BFFF)"
                  : "linear-gradient(135deg, #9945FF, #14F195)",
                color: templateId === "template_2" ? "#fff" : "#000",
              }}>
                {BUY_LABELS[key] || key}
              </span>
            ))}
          </div>
        )}

        {/* Tokenomics */}
        {tokenomicsEntries.length > 0 && (
          <div style={{
            background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
            borderRadius: "10px", padding: "12px 14px", marginBottom: "12px",
          }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: accentColor, letterSpacing: "1.5px", marginBottom: "8px" }}>TOKENOMICS</div>
            {tokenomicsEntries.map(([key, value]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
                <span style={{ fontSize: "11px", color: isDark ? "#666" : "#888" }}>{TOKENOMICS_LABELS[key] || key}</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: isDark ? "#fff" : "#111" }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Social Links */}
        {socialEntries.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {socialEntries.map(([key, url]) => (
              <a key={key} href={url} target="_blank" rel="noreferrer" style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                textDecoration: "none",
                background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                color: isDark ? "#ccc" : "#333",
                border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
              }}>
                <span>{SOCIAL_ICONS[key] || "🔗"}</span>
                <span style={{ textTransform: "capitalize" }}>{key}</span>
              </a>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
