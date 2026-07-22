import React from "react";

const TEMPLATES = [
  { id: "template_1", name: "Genesis", description: "Techie purple & green, connected-network feel", color: "#9945FF" },
  { id: "template_2", name: "Aurora", description: "Clean light theme, elegant flowing lines", color: "#14a37f" },
  { id: "template_3", name: "Degen", description: "Pure black, hot pink & cyan chaos", color: "#FF007A" },
  { id: "template_4", name: "Storm", description: "Deep navy, electric indigo lightning", color: "#5A78FF" },
  { id: "template_5", name: "24K", description: "Dark & gold, premium jackpot glow", color: "#c8a84b" },
  { id: "template_6", name: "Playground", description: "Playful pink, fun bubbly energy", color: "#ff5fa2" },
  { id: "template_7", name: "Moonshot", description: "Deep space starfield, to-the-moon vibe", color: "#7fb2ff" },
  { id: "template_8", name: "Amber", description: "Dark warmth, glowing orange fire", color: "#ff8a3c" },
  { id: "template_9", name: "Woof", description: "For dog coins — a golden-hour park: blazing sun, rolling hills, swaying grass & a bouncing ball", color: "#ffc25e" },
  { id: "template_10", name: "Alpha", description: "For based dog coins — a midnight summit: moonlit peaks, rolling fog, drifting snow & a paw trail climbing to the top", color: "#9fc3e8" },
  { id: "template_11", name: "Ribbit", description: "For frog coins — a glowing night swamp: real mirrored water, lily pads, fireflies & an invisible frog hopping across", color: "#4de08a" },
  { id: "template_12", name: "Meow", description: "For cat coins — a sunny living room: golden sunbeams, drifting dust, paw prints on the floor, batted yarn & the famous flower-pot tip off the windowsill", color: "#ff9e7a" },
  { id: "template_13", name: "Zoo", description: "For every animal coin — a bright savanna day: sunny hills, drifting hot-air balloon, butterflies & an animal footprint parade", color: "#7fd4ff" },
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
