import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Link } from "react-router-dom";
import axios from "axios";
import PageCard from "../components/PageCard";

const DOMAIN = import.meta.env.VITE_DOMAIN || "tokensite.fun";

export default function Dashboard() {
  const { connected, publicKey } = useWallet();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      fetchPages();
    }
  }, [connected, publicKey]);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/pages?wallet=${publicKey.toString()}`);
      setPages(res.data.pages || []);
    } catch {
      setPages([]);
    }
    setLoading(false);
  };

  if (!connected) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 64px)",
          gap: "20px",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            fontSize: "52px",
            fontWeight: 900,
            background: "linear-gradient(135deg, #9945FF, #14F195)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          TokenSite
        </div>
        <div style={{ fontSize: "18px", color: "#888", maxWidth: "400px" }}>
          Create a crypto landing page for your token in minutes. Powered by Solana.
        </div>
        <div
          style={{
            display: "flex",
            gap: "16px",
            flexWrap: "wrap",
            justifyContent: "center",
            fontSize: "14px",
            color: "#555",
            marginTop: "8px",
          }}
        >
          <span>🚀 Instant setup</span>
          <span>🔒 Wallet-based identity</span>
          <span>⚡ SOL payments</span>
          <span>🌐 Custom subdomain</span>
        </div>
        <div style={{ marginTop: "16px", color: "#777", fontSize: "13px" }}>
          Connect your Phantom wallet to get started ↑
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800 }}>My Pages</h1>
          <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
            Wallet: <span style={{ fontFamily: "monospace", color: "#9945FF" }}>
              {publicKey.toString().slice(0, 8)}…{publicKey.toString().slice(-8)}
            </span>
          </div>
        </div>
        <Link to="/create">
          <button className="btn-primary">+ Create New Page</button>
        </Link>
      </div>

      {loading ? (
        <div style={{ color: "#666", textAlign: "center", padding: "40px" }}>Loading pages…</div>
      ) : pages.length === 0 ? (
        <div
          className="glass"
          style={{
            borderRadius: "12px",
            padding: "48px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🪙</div>
          <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>No pages yet</div>
          <div style={{ fontSize: "13px", color: "#666", marginBottom: "20px" }}>
            Create your first crypto landing page
          </div>
          <Link to="/create">
            <button className="btn-primary">Create Page</button>
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {pages.map((page) => (
            <PageCard key={page.id} page={page} domain={DOMAIN} />
          ))}
        </div>
      )}
    </div>
  );
}
