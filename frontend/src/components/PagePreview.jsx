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
    <div style={{ fontSize: "16px", fontWeight: 800, color: accentColor, textAlign: "center", padding: "12px" }}>🚀 Launched!</div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "6px" }}>
      {[["d", "Days"], ["h", "Hours"], ["m", "Mins"], ["s", "Secs"]].map(([k, l]) => (
        <div key={k} style={{ textAlign: "center", background: "rgba(153,69,255,0.08)", borderRadius: "6px", padding: "8px 4px" }}>
          <div style={{ fontSize: "20px", fontWeight: 900, color: accentColor }}>{String(timeLeft[k] || 0).padStart(2, "0")}</div>
          <div style={{ fontSize: "9px", color: "#666", marginTop: "2px", textTransform: "uppercase", letterSpacing: "1px" }}>{l}</div>
        </div>
      ))}
    </div>
  );
}

export default function PagePreview({ data, templateId }) {
  const isDark = templateId !== "template_2";
  const accentColor = templateId === "template_3" ? "#FF007A" : templateId === "template_4" ? "#1E90FF" : templateId === "template_2" ? "#14a37f" : "#9945FF";

  const socialEntries = Object.entries(data.socials || {}).filter(([, v]) => v && v.trim());
  const buyEntries = Object.entries(data.buyLinks || {}).filter(([, v]) => v && v.trim());
  const tokenomicsEntries = Object.entries(data.tokenomics || {}).filter(([, v]) => v && v.trim());
  const filteredTeam = (data.team || []).filter((m) => m.name && m.name.trim());
  const filteredRoadmap = (data.roadmap || []).filter((m) => m.title && m.title.trim());
  const hasAbout = (data.aboutText && data.aboutText.trim()) || filteredTeam.length > 0;
  const hasCountdown = data.countdownDate;

  const contractBg = templateId === "template_2" ? "rgba(20,163,127,0.06)" : templateId === "template_3" ? "rgba(255,0,122,0.06)" : templateId === "template_4" ? "rgba(30,144,255,0.08)" : "rgba(153,69,255,0.08)";
  const contractBorder = templateId === "template_2" ? "1px solid rgba(20,163,127,0.2)" : templateId === "template_3" ? "1px solid rgba(255,0,122,0.2)" : templateId === "template_4" ? "1px solid rgba(30,144,255,0.2)" : "1px solid rgba(153,69,255,0.2)";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";

  return (
    <div style={{
      background: templateId === "template_2" ? "#f5f7fa" : templateId === "template_4" ? "#0a0f1e" : templateId === "template_3" ? "#000" : "#0d0d0d",
      borderRadius: "12px", overflow: "hidden",
      border: isDark ? "1px solid #222" : "1px solid #ddd",
      fontFamily: "Inter, system-ui, sans-serif",
      maxWidth: "480px", width: "100%", minHeight: "400px",
    }}>

      {data.banner?.preview ? (
        <img src={data.banner.preview} alt="banner" style={{ width: "100%", height: "100px", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{
          width: "100%", height: "70px",
          background: templateId === "template_2" ? "linear-gradient(135deg,#e8f5e9,#e3f2fd)" : templateId === "template_3" ? "linear-gradient(135deg,#1a0010,#00101a)" : templateId === "template_4" ? "linear-gradient(135deg,#0a0f1e,#0d1f3c)" : "linear-gradient(135deg,#1a0a2e,#0a1628)",
        }} />
      )}

      <div style={{ padding: "14px 16px" }}>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", marginTop: "-24px", marginBottom: "12px" }}>
          {data.avatar?.preview ? (
            <img src={data.avatar.preview} alt="avatar" style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover", border: isDark ? "3px solid #1a1a1a" : "3px solid #fff", flexShrink: 0 }} />
          ) : (
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: isDark ? "#1e1e1e" : "#ddd", border: isDark ? "3px solid #1a1a1a" : "3px solid #fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: "20px" }}>🪙</div>
          )}
          {data.name && <div style={{ fontSize: "16px", fontWeight: 800, color: isDark ? "#fff" : "#111", paddingBottom: "4px" }}>{data.name}</div>}
        </div>

        {data.description && (
          <div style={{ background: cardBg, border: cardBorder, borderRadius: "8px", padding: "10px 12px", marginBottom: "10px" }}>
            <p style={{ fontSize: "12px", lineHeight: 1.6, color: isDark ? "#aaa" : "#555" }}>{data.description}</p>
          </div>
        )}

        {data.contractAddress && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: contractBg, border: contractBorder, borderRadius: "6px", padding: "6px 10px", marginBottom: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "9px", fontWeight: 800, color: accentColor, letterSpacing: "1px" }}>CA</span>
            <span style={{ fontFamily: "monospace", fontSize: "9px", color: isDark ? "#aaa" : "#666", wordBreak: "break-all", flex: 1 }}>{data.contractAddress}</span>
          </div>
        )}

        {buyEntries.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
            {buyEntries.map(([key]) => (
              <span key={key} style={{
                padding: "4px 10px", borderRadius: "16px", fontSize: "10px", fontWeight: 700,
                background: templateId === "template_2" ? "linear-gradient(135deg,#14a37f,#0d7a5f)" : templateId === "template_3" ? "linear-gradient(135deg,#FF007A,#00F5FF)" : templateId === "template_4" ? "linear-gradient(135deg,#1E90FF,#00BFFF)" : "linear-gradient(135deg,#9945FF,#14F195)",
                color: templateId === "template_2" ? "#fff" : "#000",
              }}>{BUY_LABELS[key] || key}</span>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "8px" }}>

          {tokenomicsEntries.length > 0 && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: accentColor, letterSpacing: "1.5px", marginBottom: "6px", textTransform: "uppercase" }}>Tokenomics</div>
              {tokenomicsEntries.map(([key, value]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: "10px", color: isDark ? "#666" : "#888" }}>{TOKENOMICS_LABELS[key] || key}</span>
                  <span style={{ fontSize: "10px", fontWeight: 600, color: isDark ? "#fff" : "#111" }}>{value}</span>
                </div>
              ))}
            </div>
          )}

          {data.showTicker && data.contractAddress && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: accentColor, letterSpacing: "1.5px", marginBottom: "6px", textTransform: "uppercase" }}>Live Price</div>
              <div style={{ fontSize: "11px", color: "#555" }}>Live data on published page</div>
            </div>
          )}

          {hasCountdown && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: accentColor, letterSpacing: "1.5px", marginBottom: "8px", textTransform: "uppercase" }}>{data.countdownLabel || "Countdown"}</div>
              <CountdownPreview date={data.countdownDate} label={data.countdownLabel} accentColor={accentColor} />
            </div>
          )}

          {hasAbout && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: accentColor, letterSpacing: "1.5px", marginBottom: "6px", textTransform: "uppercase" }}>About</div>
              {data.aboutText && <p style={{ fontSize: "11px", color: isDark ? "#aaa" : "#666", lineHeight: 1.5, marginBottom: filteredTeam.length > 0 ? "8px" : "0" }}>{data.aboutText.slice(0, 80)}{data.aboutText.length > 80 ? "…" : ""}</p>}
              {filteredTeam.length > 0 && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {filteredTeam.map((m, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 800, color: "#000" }}>{m.name.charAt(0).toUpperCase()}</div>
                      <span style={{ fontSize: "10px", color: isDark ? "#ccc" : "#333" }}>{m.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {filteredRoadmap.length > 0 && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: accentColor, letterSpacing: "1.5px", marginBottom: "8px", textTransform: "uppercase" }}>Roadmap</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {filteredRoadmap.slice(0, 4).map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "14px", height: "14px", borderRadius: "50%", flexShrink: 0, background: item.status === "completed" ? accentColor : item.status === "inprogress" ? "transparent" : "transparent", border: item.status === "completed" ? "none" : "2px solid " + (item.status === "inprogress" ? accentColor : "rgba(255,255,255,0.2)"), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {item.status === "completed" && <span style={{ fontSize: "8px", color: "#000", fontWeight: 800 }}>✓</span>}
                      {item.status === "inprogress" && <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: accentColor, display: "block" }} />}
                    </div>
                    <span style={{ fontSize: "10px", color: item.status === "upcoming" ? (isDark ? "#555" : "#aaa") : isDark ? "#fff" : "#111", fontWeight: item.status === "upcoming" ? 400 : 600 }}>{item.title}</span>
                  </div>
                ))}
                {filteredRoadmap.length > 4 && <div style={{ fontSize: "10px", color: "#555" }}>+{filteredRoadmap.length - 4} more</div>}
              </div>
            </div>
          )}

          {socialEntries.length > 0 && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: accentColor, letterSpacing: "1.5px", marginBottom: "8px", textTransform: "uppercase" }}>Socials</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {socialEntries.map(([key]) => (
                  <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "16px", background: isDark ? "rgba(255,255,255,0.06)" : "#f4f4f4", color: isDark ? "#ccc" : "#333", fontSize: "10px", fontWeight: 600, textTransform: "capitalize" }}>
                    {SOCIAL_ICONS[key] || "🔗"} {key}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.showChart && data.contractAddress && (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "8px", padding: "10px 12px", gridColumn: "1 / -1" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: accentColor, letterSpacing: "1.5px", marginBottom: "6px", textTransform: "uppercase" }}>Price Chart</div>
              <div style={{ fontSize: "11px", color: "#555" }}>Live chart will load on published page</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
