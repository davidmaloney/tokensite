import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import ImageUpload from "../components/ImageUpload";
import { LAUNCH_CONFIG, LAUNCH_ENABLED, PLATFORM_ID } from "../config/launchConfig.js";
import { launchToken, getSolPrice } from "../lib/raydiumLaunch.js";

const PURPLE = "#9945FF", GREEN = "#14F195";

export default function LaunchToken() {
  const wallet = useWallet();
  const { connected } = wallet;
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [solPrice, setSolPrice] = useState(0);

  useEffect(() => { getSolPrice().then(setSolPrice); }, []);

  if (!LAUNCH_ENABLED) {
    return (
      <div style={wrap}>
        <div style={{ color: "#666", textAlign: "center", marginTop: 80 }}>
          This feature is not available yet.
        </div>
      </div>
    );
  }

  const cfg = LAUNCH_CONFIG;
  const targetSol = solPrice ? (cfg.targetUsd / solPrice).toFixed(1) : "…";

  async function handleLaunch() {
    setBusy(true); setResult(null); setStatus("");
    try {
      if (!name || !symbol) throw new Error("Name and symbol are required.");
      const price = solPrice || (await getSolPrice());
      if (!price) throw new Error("Couldn't fetch SOL price.");
      const res = await launchToken({
        wallet, name, symbol,
        uri: logoUrl || "https://arweave.net/placeholder",
        solPrice: price,
        onStatus: setStatus,
      });
      setResult(res);
      setStatus("Launched!");
    } catch (e) {
      setStatus("Error: " + (e.message || String(e)));
    } finally { setBusy(false); }
  }

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 34px)", fontWeight: 800, marginBottom: 6, lineHeight: 1.15 }}>
          Launch your{" "}
          <span style={{ background: `linear-gradient(135deg,${PURPLE},${GREEN})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            coin
          </span>
        </h1>
        <p style={{ color: "#888", marginBottom: 28, fontSize: "clamp(14px, 2.5vw, 16px)" }}>
          A fair launch on Raydium — deep liquidity, transparent by design.
        </p>

        {/* two-column on desktop, stacks on mobile */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          {/* LEFT: trust panel */}
          <div style={{ flex: "1 1 260px", minWidth: 260 }}>
            <div className="glass" style={panel}>
              <div style={{ fontSize: 13, color: GREEN, fontWeight: 700, marginBottom: 12, letterSpacing: 0.3 }}>
                WHAT MAKES THIS FAIR
              </div>
              <Row label="Total supply" value={cfg.supplyWhole.toLocaleString()} />
              <Row label="On bonding curve" value={`${cfg.sellPct}%`} />
              <Row label="Deep liquidity pool" value={`${cfg.poolPct}%`} />
              <Row
                label="You're gifted"
                value={`${cfg.lockPct}%`}
                hint={`Locked ${cfg.cliffYears}yr, then released over ${cfg.unlockYears}yr — proves you won't dump. You can still buy more like anyone else.`}
              />
              <Row label="Graduation target" value={`$${cfg.targetUsd.toLocaleString()} · ~${targetSol} SOL`} />
              <Row label="No hidden taxes" value="0%" />
              <Row label="Platform fee" value={`${cfg.platformFeePct}%`} last />
            </div>
          </div>

          {/* RIGHT: form */}
          <div style={{ flex: "1 1 300px", minWidth: 280 }}>
            <div className="glass" style={panel}>
              <Field label="Token name" value={name} onChange={setName} placeholder="e.g. My Coin" />
              <Field label="Symbol" value={symbol} onChange={(v) => setSymbol(v.toUpperCase())} placeholder="e.g. MYC" maxLength={10} />

              <label style={lbl}>Coin logo</label>
              <div style={{ marginBottom: 4 }}>
                <ImageUpload onUploaded={setLogoUrl} currentUrl={logoUrl} />
              </div>
              <p style={{ color: "#666", fontSize: 12, marginTop: 6, marginBottom: 4 }}>
                Shows in wallets, Raydium & DexScreener. Optional for now.
              </p>
            </div>

            {/* actions */}
            <div style={{ marginTop: 18 }}>
              {!connected ? (
                <WalletMultiButton style={btn} />
              ) : (
                <button onClick={handleLaunch} disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1, cursor: busy ? "wait" : "pointer" }}>
                  {busy ? "Launching…" : "Launch token"}
                </button>
              )}
            </div>

            {!PLATFORM_ID && (
              <p style={{ color: "#e0a800", fontSize: 13, marginTop: 14 }}>
                ⚠ Platform not set yet — add VITE_LAUNCH_PLATFORM_ID after creating your platform.
              </p>
            )}
          </div>
        </div>

        {status && (
          <div style={{ marginTop: 20, padding: 14, borderRadius: 10, background: "#111", color: status.startsWith("Error") ? "#ff6b6b" : GREEN, fontSize: 14, wordBreak: "break-all" }}>
            {status}
          </div>
        )}

        {result && (
          <div className="glass" style={{ marginTop: 14, padding: 16, borderRadius: 12, border: `1px solid ${GREEN}` }}>
            <div style={{ color: GREEN, fontWeight: 700, marginBottom: 8 }}>✅ Token launched</div>
            <div style={{ fontSize: 13, color: "#ccc", wordBreak: "break-all", lineHeight: 1.6 }}>
              <b>Mint:</b> {result.mint}<br />
              <b>Tx:</b> {String(result.txId)}
            </div>
            <a href={`https://solscan.io/token/${result.mint}`} target="_blank" rel="noreferrer" style={{ color: GREEN, fontSize: 13, display: "inline-block", marginTop: 8 }}>
              View on Solscan →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const wrap = { padding: "40px 20px", minHeight: "100vh", background: "#0d0d0d", color: "#f0f0f0" };
const panel = { borderRadius: 14, padding: 20 };
const btn = { width: "100%", background: `linear-gradient(135deg,${PURPLE},${GREEN})`, color: "#000", fontWeight: 800, fontSize: 15, borderRadius: 10, border: "none", height: 50, cursor: "pointer" };
const lbl = { display: "block", color: "#aaa", fontSize: 13, marginBottom: 6, marginTop: 4 };

function Row({ label, value, hint, last }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ color: "#999", fontSize: 14 }}>{label}</span>
        <span style={{ color: "#fff", fontSize: 14, fontWeight: 600, textAlign: "right" }}>{value}</span>
      </div>
      {hint && <div style={{ color: "#6f6f6f", fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, maxLength }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={lbl}>{label}</label>
      
