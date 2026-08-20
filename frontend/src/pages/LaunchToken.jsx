import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAUNCH_CONFIG, LAUNCH_ENABLED, PLATFORM_ID } from "../config/launchConfig.js";
import { launchToken, getSolPrice } from "../lib/raydiumLaunch.js";

const PURPLE = "#9945FF", GREEN = "#14F195";

export default function LaunchToken() {
  const wallet = useWallet();
  const { connected } = wallet;
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [uri, setUri] = useState("");
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
        uri: uri || "https://arweave.net/placeholder",
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
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>
          Launch your <span style={{ background: `linear-gradient(135deg,${PURPLE},${GREEN})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>coin</span>
        </h1>
        <p style={{ color: "#888", marginBottom: 28 }}>
          A fair launch on Raydium — deep liquidity, locked dev wallet, no hidden taxes.
        </p>

        {/* trust panel */}
        <div style={panel}>
          <Row label="Total supply" value={cfg.supplyWhole.toLocaleString()} />
          <Row label="On bonding curve" value={`${cfg.sellPct}%`} />
          <Row label="Dev locked" value={`${cfg.lockPct}% · ${cfg.cliffYears}yr cliff + ${cfg.unlockYears}yr unlock`} />
          <Row label="To liquidity pool" value={`${cfg.poolPct}%`} />
          <Row label="Graduation target" value={`$${cfg.targetUsd.toLocaleString()} (~${targetSol} SOL)`} />
          <Row label="Platform fee" value={`${cfg.platformFeePct}%`} last />
        </div>

        {/* form */}
        <div style={{ marginTop: 24 }}>
          <Field label="Token name" value={name} onChange={setName} placeholder="e.g. My Coin" />
          <Field label="Symbol" value={symbol} onChange={(v)=>setSymbol(v.toUpperCase())} placeholder="e.g. MYC" maxLength={10} />
          <Field label="Image URL (metadata URI)" value={uri} onChange={setUri} placeholder="https://…  (optional for now)" />
        </div>

        {/* actions */}
        <div style={{ marginTop: 24 }}>
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
            ⚠ Platform ID not set yet — set VITE_LAUNCH_PLATFORM_ID after creating your platform.
          </p>
        )}

        {status && (
          <div style={{ marginTop: 18, padding: 14, borderRadius: 10, background: "#111", color: status.startsWith("Error") ? "#ff6b6b" : GREEN, fontSize: 14, wordBreak: "break-all" }}>
            {status}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 14, padding: 16, borderRadius: 10, background: "#0d1f16", border: `1px solid ${GREEN}` }}>
            <div style={{ color: GREEN, fontWeight: 700, marginBottom: 8 }}>✅ Token launched</div>
            <div style={{ fontSize: 13, color: "#ccc", wordBreak: "break-all" }}>
              <b>Mint:</b> {result.mint}<br />
              <b>Tx:</b> {String(result.txId)}
            </div>
            <a href={`https://solscan.io/token/${result.mint}`} target="_blank" rel="noreferrer" style={{ color: GREEN, fontSize: 13 }}>
              View on Solscan →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const wrap = { padding: "40px 20px", minHeight: "100vh", background: "#0a0a0a", color: "#fff" };
const panel = { background: "#111", borderRadius: 12, padding: 18, border: "1px solid #222" };
const btn = { width: "100%", background: `linear-gradient(135deg,${PURPLE},${GREEN})`, color: "#000", fontWeight: 800, fontSize: 15, borderRadius: 10, border: "none", height: 50, cursor: "pointer" };

function Row({ label, value, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: last ? "none" : "1px solid #1e1e1e" }}>
      <span style={{ color: "#888", fontSize: 14 }}>{label}</span>
      <span style={{ color: "#fff", fontSize: 14, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}
function Field({ label, value, onChange, placeholder, maxLength }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", color: "#aaa", fontSize: 13, marginBottom: 6 }}>{label}</label>
      <input value={value} maxLength={maxLength} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", height: 44, background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8, color: "#fff", padding: "0 14px", fontSize: 14, boxSizing: "border-box" }} />
    </div>
  );
}
