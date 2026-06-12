import React from "react";

const SOCIAL_TYPES = [
  { key: "twitter", label: "X (Twitter)", prefix: "https://x.com/", placeholder: "yourhandle" },
  { key: "telegram", label: "Telegram", prefix: "https://t.me/", placeholder: "yourgroup" },
  { key: "discord", label: "Discord", prefix: "https://discord.gg/", placeholder: "yourserver" },
  { key: "github", label: "GitHub", prefix: "https://github.com/", placeholder: "yourrepo" },
  { key: "coingecko", label: "CoinGecko", prefix: "https://www.coingecko.com/en/coins/", placeholder: "your-token-name" },
  { key: "coinmarketcap", label: "CoinMarketCap", prefix: "https://coinmarketcap.com/currencies/", placeholder: "your-token-name" },
  { key: "pumpfun", label: "Pump.fun", prefix: "https://pump.fun/coin/", placeholder: "your-token-address" },
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
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {SOCIAL_TYPES.map(({ key, label, prefix, placeholder }) => (
        <div key={key}>
          <label>{label} <span style={{ color: "#555" }}>(optional)</span></label>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <span style={{
              position: "absolute", left: "12px",
              fontSize: "11px", color: "#555",
              pointerEvents: "none", whiteSpace: "nowrap",
            }}>
              {prefix}
            </span>
            <input
              type="text"
              placeholder={placeholder}
              value={getDisplayValue(key, prefix)}
              onChange={(e) => handleChange(key, prefix, e.target.value)}
              style={{ paddingLeft: (prefix.length * 6.5 + 12) + "px" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
