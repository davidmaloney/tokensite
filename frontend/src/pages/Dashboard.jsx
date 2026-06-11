import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Link } from "react-router-dom";
import axios from "axios";
import PageCard from "../components/PageCard";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const DOMAIN = import.meta.env.VITE_DOMAIN || "shillit.fun";

export default function Dashboard() {
  const { connected, publicKey } = useWallet();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [iframeError, setIframeError] = useState(false);

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
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 64px)",
        gap: "32px",
        textAlign: "center",
        padding: "24px 20px",
      }}>

        <div style={{
          fontSize: "56px",
          fontWeight: 900,
          background: "linear-gradient(135deg, #9945FF, #14F195)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1.1,
        }}>
          SHILLit
        </div>

        <div style={{ fontSize: "20px", color: "#ccc", maxWidth: "380px", lineHeight: 1.5, fontWeight: 600 }}>
          Instant crypto landing pages for your token
        </div>

        <div style={{ fontSize: "16px", fontWeight: 700, color: "#888", maxWidth: "340px", lineHeight: 1.6, marginTop: "-16px" }}>
          One wallet. One page. Yours in seconds.
        </div>

        {/* Live example showcase */}
        <div style={{ maxWidth: "460px", width: "100%", textAlign: "left" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#9945FF", letterSpacing: "1.5px", marginBottom: "14px" }}>
            SEE IT IN ACTION
          </div>
          <div style={{
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid rgba(153,69,255,0.3)",
            boxShadow: "0 0 40px rgba(153,69,255,0.15), 0 0 80px rgba(20,241,149,0.05)",
            background: "#1a1a2e",
          }}>
            <div style={{
              background: "#111",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FF5F57" }} />
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FFBD2E" }} />
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#28C840" }} />
              </div>
              <div style={{
                flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: "6px",
                padding: "4px 10px", fontSize: "11px", color: "#666", fontFamily: "monospace", textAlign: "center",
              }}>
                fomoyodl.shillit.fun
              </div>
              <a href="https://fomoyodl.shillit.fun" target="_blank" rel="noreferrer"
                style={{ fontSize: "10px", color: "#9945FF", textDecoration: "none", flexShrink: 0 }}>
                ↗
              </a>
            </div>
            {!iframeError ? (
              <iframe
                src="https://fomoyodl.shillit.fun"
                style={{ width: "100%", height: "320px", border: "none", display: "block", background: "#0d0d0d" }}
                title="Live example"
                onError={() => setIframeError(true)}
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <a href="https://fomoyodl.shillit.fun" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <div style={{
                  height: "320px", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "12px",
                  background: "#0d0d0d", cursor: "pointer",
                }}>
                  <div style={{ fontSize: "32px" }}>🚀</div>
                  <div style={{ fontSize: "14px", color: "#9945FF", fontWeight: 600 }}>View live example →</div>
                  <div style={{ fontSize: "11px", color: "#555" }}>fomoyodl.shillit.fun</div>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* How it works + Pricing panel */}
        <div className="glass" style={{
          borderRadius: "16px",
          padding: "28px 24px",
          maxWidth: "460px",
          width: "100%",
          textAlign: "left",
          border: "1px solid rgba(153,69,255,0.2)",
          boxShadow: "0 0 40px rgba(153,69,255,0.08)",
        }}>

          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#9945FF", letterSpacing: "1.5px", marginBottom: "16px" }}>
              HOW IT WORKS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                "Connect your Solana wallet",
                "Pay as you go, leave when you're done",
              ].map((text) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span style={{ fontSize: "18px", color: "#9945FF", lineHeight: 1, flexShrink: 0 }}>●</span>
                  <span style={{ fontSize: "15px", fontWeight: 500, color: "#ccc", lineHeight: 1.4 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: "20px" }} />

          <div style={{ fontSize: "11px", fontWeight: 700, color: "#9945FF", letterSpacing: "1.5px", marginBottom: "14px" }}>
            SIMPLE PRICING
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <div style={{
              flex: 1, minWidth: "120px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px", padding: "14px", textAlign: "center",
            }}>
              <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>TOP UP MONTHLY</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#fff" }}>$4.99</div>
            </div>
            <div style={{
              flex: 1, minWidth: "120px",
              background: "rgba(153,69,255,0.08)",
              border: "1px solid rgba(153,69,255,0.3)",
              borderRadius: "10px", padding: "14px", textAlign: "center",
            }}>
              <div style={{ fontSize: "11px", color: "#9945FF", marginBottom: "6px" }}>TOP UP YEARLY</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#fff" }}>$39</div>
              <div style={{ fontSize: "10px", color: "#14F195", fontWeight: 700, marginTop: "4px" }}>SAVE 35%</div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "12px", color: "#fff", fontWeight: 600 }}>
              Stays online while funded
            </div>
            <div style={{ fontSize: "11px", color: "#fff" }}>
              Page deleted on expiry
            </div>
          </div>

        </div>

        {/* Connect button */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          <WalletMultiButton style={{
            background: "linear-gradient(135deg, #9945FF, #14F195)",
            color: "#000",
            fontWeight: 800,
            fontSize: "16px",
            borderRadius: "12px",
            border: "none",
            height: "52px",
            padding: "0 32px",
            cursor: "pointer",
          }} />
          <div style={{ fontSize: "12px", color: "#555" }}>
            Phantom, Solflare and Backpack supported
          </div>
          <a href="https://t.me/shillitchat" target="_blank" rel="noreferrer"
            style={{ fontSize: "12px", color: "#555", textDecoration: "none", marginTop: "4px" }}>
            Community & Support →
          </a>
          <a href="https://t.me/shillitsocials" target="_blank" rel="noreferrer"
            style={{ fontSize: "11px", color: "#444", textDecoration: "none" }}>
            Terms & Privacy →
          </a>
          <a href="https://github.com/davidmaloney/tokensite" target="_blank" rel="noreferrer"
            style={{ fontSize: "11px", color: "#444", textDecoration: "none" }}>
            Developer Info →
          </a>
        </div>

      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "28px",
        flexWrap: "wrap",
        gap: "12px",
      }}>
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
        <div style={{ color: "#666", textAlign: "center", padding: "40px" }}>Loading…</div>
      ) : pages.length === 0 ? (
        <div className="glass" style={{ borderRadius: "12px", padding: "48px", textAlign: "center" }}>
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
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
        }}>
          {pages.map((page) => (
            <PageCard key={page.id} page={page} domain={DOMAIN} />
          ))}
        </div>
      )}
    </div>
  );
}
