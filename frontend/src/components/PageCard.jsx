import React from "react";
import { Link } from "react-router-dom";

export default function PageCard({ page, domain }) {
  const isActive = page.status === "active";
  const expires = page.expires_at ? new Date(page.expires_at * 1000).toLocaleDateString() : "—";

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
        Template: {page.template_id} &nbsp;·&nbsp; Expires: {expires}
      </div>

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
