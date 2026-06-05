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

export default function PagePreview({ data, templateId }) {
  const isDark = templateId === "template_1";

  const socialEntries = Object.entries(data.socials || {}).filter(
    ([, v]) => v && v.trim() !== ""
  );

  return (
    <div
      style={{
        background: isDark ? "#0d0d0d" : "#f5f7fa",
        borderRadius: "12px",
        overflow: "hidden",
        border: isDark ? "1px solid #222" : "1px solid #ddd",
        fontFamily: "Inter, system-ui, sans-serif",
        maxWidth: "480px",
        width: "100%",
      }}
    >
      {/* Banner */}
      {data.banner?.preview ? (
        <img
          src={data.banner.preview}
          alt="banner"
          style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "80px",
            background: isDark
              ? "linear-gradient(135deg, #1a0a2e, #0a1628)"
              : "linear-gradient(135deg, #e8f5e9, #e3f2fd)",
          }}
        />
      )}

      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", marginTop: "-30px", marginBottom: "14px" }}>
          {/* Avatar */}
          {data.avatar?.preview ? (
            <img
              src={data.avatar.preview}
              alt="avatar"
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                objectFit: "cover",
                border: isDark ? "3px solid #1a1a1a" : "3px solid #fff",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: isDark ? "#1e1e1e" : "#ddd",
                border: isDark ? "3px solid #1a1a1a" : "3px solid #fff",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#666",
                fontSize: "24px",
              }}
            >
              🪙
            </div>
          )}

          {data.name && (
            <div style={{ paddingBottom: "4px" }}>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  color: isDark ? "#fff" : "#111",
                }}
              >
                {data.name}
              </div>
            </div>
          )}
        </div>

        {data.description && (
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              color: isDark ? "#aaa" : "#555",
              marginBottom: "14px",
            }}
          >
            {data.description}
          </p>
        )}

        {socialEntries.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {socialEntries.map(([key, url]) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none",
                  background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                  color: isDark ? "#ccc" : "#333",
                  border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                }}
              >
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
