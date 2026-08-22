import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { claimPlatformFeeFromVault } from "../lib/raydiumLaunch.js";

// Raydium's claim instruction requires the platform's platformClaimFeeWallet
// itself to sign the claim transaction — the admin wallet cannot sign for it.
// So the wallet allowed to see + use this button must be the treasury wallet
// (the on-chain platformClaimFeeWallet), not the admin/throwaway wallet.
// Until this exact wallet is connected, the component renders nothing at all.
const ADMIN_WALLET = "ApYPhmmxRpwnGzfeEaxSCFUhaqqgVz1vL9uBfK5cgD1T";

const GREEN = "#14F195";

export default function AdminClaim() {
  const wallet = useWallet();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // Hard gate: only the admin wallet ever sees this.
  const isAdmin = wallet?.connected && wallet.publicKey?.toBase58() === ADMIN_WALLET;
  if (!isAdmin) return null;

  async function handleClaim() {
    setBusy(true); setMsg("");
    try {
      const { txId } = await claimPlatformFeeFromVault({ wallet, onStatus: setMsg });
      setMsg(`Claimed to treasury.${txId ? " Tx: " + txId.slice(0, 12) + "…" : ""}`);
    } catch (e) {
      setMsg("Error: " + (e.message || String(e)));
    } finally { setBusy(false); }
  }

  return (
    <div style={box}>
      <div style={title}>Admin · claim fees</div>
      <div style={sub}>Sweeps all accrued platform fees (from every coin) to your treasury.</div>
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
const btn = {
  width: "100%", height: 42, background: GREEN, color: "#08210f",
  fontWeight: 800, fontSize: 13.5, border: "none", borderRadius: 9,
};
const note = { marginTop: 10, fontSize: 11.5, wordBreak: "break-all", lineHeight: 1.4 };
