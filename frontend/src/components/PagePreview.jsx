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

// Map the in-progress `data` prop into the `content` shape the renderer expects.
function buildContent(data) {
  const content = {};
  if (data.name) content.name = data.name;
  if (data.description) content.description = data.description;
  if (data.contractAddress) content.contractAddress = data.contractAddress;

  // Buy links + tokenomics: keep only filled entries.
  const buyLinks = Object.fromEntries(Object.entries(data.buyLinks || {}).filter(([, v]) => v && String(v).trim()));
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
  if ((data.aboutText && data.aboutText.trim()) || team.length > 0) {
    content.about = { text: data.aboutText || "", team };
  }

  const roadmap = (data.roadmap || []).filter((m) => m.title && m.title.trim());
  if (roadmap.length) content.roadmap = roadmap;

  return content;
}

export default function PagePreview({ data, templateId }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  useEffect(() => {
    // Debounce so we don't hit the endpoint on every keystroke.
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
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
        setHtml("<!DOCTYPE html><html><body style=\"margin:0;background:#0d0d0d\"></body></html>");
      }
      setLoading(false);
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [data, templateId]);

  return (
    <div style={{
      position: "relative",
      borderRadius: "12px",
      overflow: "hidden",
      border: "1px solid #222",
      background: "#0d0d0d",
      maxWidth: "900px",
      width: "100%",
      height: "600px",
    }}>
      {loading && (
        <div style={{
          position: "absolute", top: "10px", right: "12px", zIndex: 2,
          fontSize: "11px", color: "#888", background: "rgba(0,0,0,0.5)",
          padding: "4px 10px", borderRadius: "12px", pointerEvents: "none",
        }}>
          updating…
        </div>
      )}
      <iframe
        title="Page preview"
        srcDoc={html}
        sandbox="allow-scripts allow-same-origin"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
