import React from "react";
import { Link } from "react-router-dom";

export default function PageCard({ page, domain }) {
  const now = Math.floor(Date.now() / 1000);
  // A page is only truly live if it's active AND not past its expiry.
  const isActive = page.status === "active" && page.expires_at && page.expires_at > now;

  // Work out how much time is left, so we can show "4 days left" and warn when low.
  let timeLeftLabel = "—";
  let daysLeft = null;
  if (page.expires_at && page.expires_at > now) {
    const secondsLeft = page.expires_at - now;
    daysLeft = Math.ceil(secondsLeft / 86400);
    if (secondsLeft < 86400) {
      const hoursLeft = Math.max(1, Math.ceil(secondsLeft / 3600));
      timeLeftLabel = hoursLeft + " hour" + (hoursLeft === 1 ? "" : "s") + " left";
    } else {
      timeLeftLabel = daysLeft + " day" + (daysLeft === 1 ? "" : "s") + " left";
    }
  } else if (page.expires_at && page.expires_at <= now) {
    timeLeftLabel = "Expired";
  }

  // "Expiring soon" = 3 days or less remaining. Used to colour the card's warning.
  const expiringSoon = daysLeft !== null && daysLeft <= 3;

  return (
    <div
      className="glass"
      style={{
        borderRadius: "12px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 700 }}>{page.slug}</div>
          <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
            {page.slug}.{domain}
          </div>
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: "20px",
            background: isActive ? "rgba(20,241,149,0.15)" : "rgba(255,100,100,0.15)",
            color: isActive ? "#14F195" : "#ff6464",
            border: `1px solid ${isActive ? "rgba(20,241,149,0.3)" : "rgba(255,100,100,0.3)"}`,
          }}
        >
          {isActive ? "ACTIVE" : "INACTIVE"}
        </span>
      </div>

      <div style={{ fontSize: "12px", color: "#666" }}>
        Template: {page.template_id}
      </div>

      {/* Time-left line: green normally, amber when 3 days or less remain, so the
          owner sees it's running low BEFORE the page expires and is deleted. */}
      {isActive && (
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: expiringSoon ? "#ffcc44" : "#14F195",
          }}
        >
          {expiringSoon ? "⚠️ " : ""}{timeLeftLabel}
          {expiringSoon && (
            <span style={{ color: "#888", fontWeight: 400 }}>
              {" "}— top up soon to avoid deletion
            </span>
          )}
        </div>
      )}

      {!isActive && (
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#ff6464" }}>
          {timeLeftLabel === "Expired" ? "Expired — reactivate to bring it back" : "Not active"}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <Link to={`/manage/${page.id}`} style={{ flex: 1 }}>
          <button className="btn-secondary" style={{ width: "100%", fontSize: "13px" }}>
            Manage
          </button>
        </Link>
        {isActive && (
          <a
            href={`https://${page.slug}.${domain}`}
            target="_blank"
            rel="noreferrer"
            style={{ flex: 1 }}
          >
            <button className="btn-primary" style={{ width: "100%", fontSize: "13px" }}>
              View Live
            </button>
          </a>
        )}
      </div>
    </div>
  );
}
