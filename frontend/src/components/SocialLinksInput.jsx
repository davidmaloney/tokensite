import React, { useState } from "react";

const SOCIAL_TYPES = [
  { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/yourtoken" },
  { key: "telegram", label: "Telegram", placeholder: "https://t.me/yourgroup" },
  { key: "discord", label: "Discord", placeholder: "https://discord.gg/yourserver" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/yourrepo" },
  { key: "coingecko", label: "CoinGecko", placeholder: "https://coingecko.com/..." },
  { key: "coinmarketcap", label: "CoinMarketCap", placeholder: "https://coinmarketcap.com/..." },
  { key: "pumpfun", label: "Pump.fun", placeholder: "https://pump.fun/..." },
  { key: "custom", label: "Custom Link", placeholder: "https://..." },
];

export default function SocialLinksInput({ value = {}, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {SOCIAL_TYPES.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label>{label} <span style={{ color: "#555" }}>(optional)</span></label>
          <input
            type="url"
            placeholder={placeholder}
            value={value[key] || ""}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
