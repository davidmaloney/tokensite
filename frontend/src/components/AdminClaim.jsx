import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { claimPlatformFees } from "../lib/raydiumLaunch.js";

// Raydium's claimPlatformFee instruction requires the platform's
// platformClaimFeeWallet itself to sign the claim transaction — the admin
// wallet cannot sign for it. So the wallet allowed to see + use this button
// must be the treasury wallet (the on-chain platformClaimFeeWallet), not the
// admin/throwaway wallet. Until this exact wallet is connected, the
// component renders nothing at all.
const ADMIN_WALLET = "ApYPhmmxRpwnGzfeEaxSCFUhaqqgVz1vL9uBfK5cgD1T";

// claimPlatformFee is per-coin (per pool), so you tell it which coin's fees to
// sweep. Defaults to your first token; paste any mint to claim that coin's fees.
const DEFAULT_MINT = "6GiSXQrjTtFTRLV2aZb3bjFh9ECJB9B7z6ciFiKdUiPp";

const GREEN = "#14F195";

export default function AdminClaim() {
  const wallet = useWallet();
  const [mint, setMint] = useState(DEFAULT_MINT);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Hard gate: only the admin wallet ever sees this.
  const isAdmin = wallet?.connected && wallet.publicKey?.toBase58() === ADMIN_WALLET;
  if (!isAdmin) return null;

  async function handleClaim() {
    setBusy(true); setMsg("");
    try {
      if (!mint.trim()) throw new Error("Enter a coin mint to claim from.");
      const { txId } = await claimPlatformFees({ wallet, mint: mint.trim(), onStatus: setMsg });
      setMsg(`Claimed to treasury.${txId ? " Tx: " + txId.slice(0, 12) + "…" : ""}`);
    } catch (e) {
      setMsg("Error: " + (e.message || String(e)));
    } finally { setBusy(false); }
  }

  return (
    <div style={box}>
      <div style={title}>Admin · claim fees</div>
      <div style={sub}>Sweeps this coin's 0.5% platform fee to your treasury.</div>
      <input value={mint} onChange={(e) => setMint(e.target.value)} placeholder="Coin mint" style={input} />
      <button onClick={handleClaim} disabled={busy}
        style={{ ...btn, opacity: busy ? 0.6 : 1, cursor: busy ? "wait" : "pointer" }}>
        {busy ? "Claiming…" : "Claim to treasury"}
      </button>
      {msg && <div style={{ ...note, color: msg.startsWith("Error") ? "#ff6b6b" : GREEN }}>{msg}</div>}
    </div>
  );
}

const box = {
  position: "fixed", bottom: 16, right: 16, zIndex: 9999, width: 300,
  background: "#141414", border: "1px solid rgba(20,241,149,0.4)", borderRadius: 14,
  padding: 16, fontFamily: "Inter, system-ui, sans-serif", boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
};
const title = { color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 4 };
const sub = { color: "#888", fontSize: 11.5, marginBottom: 12, lineHeight: 1.4 };
const input = {
  width: "100%", height: 38, background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff",
  padding: "0 10px", fontSize: 12, boxSizing: "border-box", marginBottom: 10,
  fontFamily: "ui-monospace, monospace",
};
const btn = {
  width: "100%", height: 42, background: GREEN, color: "#08210f",
  fontWeight: 800, fontSize: 13.5, border: "none", borderRadius: 9,
};
const note = { marginTop: 10, fontSize: 11.5, wordBreak: "break-all", lineHeight: 1.4 };
