import React from "react";

const TEMPLATES = [
  { id: "template_1", name: "Dark Crypto", description: "Dark theme, purple & green neon", color: "#9945FF" },
  { id: "template_2", name: "Clean Launch", description: "Minimal white, clean DeFi look", color: "#14F195" },
  { id: "template_3", name: "Neon Degen", description: "Pure black, hot pink & cyan glow", color: "#FF007A" },
  { id: "template_4", name: "Midnight Blue", description: "Deep navy, electric blue accents", color: "#1E90FF" },
  { id: "template_5", name: "Deep Space", description: "Dark blue gradients, gold accents, premium feel", color: "#c8a84b" },
  { id: "template_6", name: "Obsidian", description: "Warm near-black, sharp electric blue, minimal", color: "#0ea5e9" },
  { id: "template_7", name: "Forge", description: "Deep dark warmth, bold orange & amber energy", color: "#fb923c" },
  { id: "template_8", name: "Arctic", description: "Cold dark blue, ice white & cyan, fast & clean", color: "#7dd3fc" },
];

export default function TemplateSelector({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {TEMPLATES.map((t) => (
        <div key={t.id} onClick={() => onChange(t.id)} className="glass" style={{
          borderRadius: "10px", padding: "16px 20px", cursor: "pointer",
          border: value === t.id ? `2px solid ${t.color}` : "2px solid rgba(255,255,255,0.08)",
          transition: "border-color 0.2s",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>{t.name}</div>
              <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{t.description}</div>
            </div>
            <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: `2px solid ${t.color}`, background: value === t.id ? t.color : "transparent", flexShrink: 0 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
