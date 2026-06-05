import React from "react";
import { Link } from "react-router-dom";
import WalletConnect from "./WalletConnect";

export default function Navbar() {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "64px",
        background: "rgba(13,13,13,0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        zIndex: 1000,
        backdropFilter: "blur(10px)",
      }}
    >
      <Link to="/" style={{ textDecoration: "none" }}>
        <span
          style={{
            fontSize: "20px",
            fontWeight: 800,
            background: "linear-gradient(135deg, #9945FF, #14F195)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          TokenSite
        </span>
      </Link>
      <WalletConnect />
    </nav>
  );
}
