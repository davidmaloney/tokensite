import React from "react";

const SOCIAL_TYPES = [
  {
    key: "twitter",
    label: "X (Twitter)",
    prefix: "https://x.com/",
    placeholder: "yourhandle",
    hint: "Enter your @handle e.g. pepecoin",
  },
  {
    key: "telegram",
    label: "Telegram",
    prefix: "https://t.me/",
    placeholder: "yourgroup",
    hint: "Enter your group or channel name e.g. pepecoinofficial",
  },
  {
    key: "discord",
    label: "Discord",
    prefix: "https://discord.gg/",
    placeholder: "yourserver",
    hint: "Enter your invite code e.g. abc123xyz",
  },
  {
    key: "github",
    label: "GitHub",
    prefix: "https://github.com/",
    placeholder: "username/repo",
    hint: "Enter your username or username/repo",
  },
  {
    key: "coingecko",
    label: "CoinGecko",
    prefix: "https://www.coingecko.com/en/coins/",
    placeholder: "your-token-name",
    hint: "Enter your token slug e.g. pepe-coin",
  },
  {
    key: "coinmarketcap",
    label: "CoinMarketCap",
    prefix: "https://coinmarketcap.com/currencies/",
    placeholder: "your-token-name",
    hint: "Enter your token slug e.g. pepe-coin",
  },
  {
    key: "pumpfun",
    label: "Pump.fun",
    prefix: "https://pump.fun/coin/",
    placeholder: "your-token-CA",
    hint: "Enter your token CA",
  },
];

export default function SocialLinksInput({ value = {}, onChange }) {
  const handleChange = (key, prefix, val) => {
    const clean = val.replace(/^https?:\/\/[^/]+\//, "").replace(/^\/+/, "");
    onChange({ ...value, [key]: clean ? prefix + clean : "" });
  };

  const getDisplayValue = (key, prefix) => {
    const full = value[key] || "";
    if (full.startsWith(prefix)) return full.slice(prefix.length);
    return full;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {SOCIAL_TYPES.map(({ key, label, prefix, placeholder, hint }) => (
        <div key={key}>
          <label>{label} <span style={{ color: "#555" }}>(optional)</span></label>
          <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", overflow: "hidden" }}>
            <span style={{
              padding: "10px 10px 10px 12px",
              fontSize: "11px",
              color: "#555",
              whiteSpace: "nowrap",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              flexShrink: 0,
              maxWidth: "180px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {prefix}
            </span>
            <input
              type="text"
              placeholder={placeholder}
              value={getDisplayValue(key, prefix)}
              onChange={(e) => handleChange(key, prefix, e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                flex: 1,
                padding: "10px 12px",
                fontSize: "13px",
                outline: "none",
                color: "#fff",
              }}
            />
          </div>
          <div style={{ fontSize: "11px", color: "#555", marginTop: "4px", paddingLeft: "2px" }}>{hint}</div>
        </div>
      ))}
    </div>
  );
}
