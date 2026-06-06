import React, { useState, useEffect } from "react";
import axios from "axios";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

const PLANS = [
  { id: "1month", label: "1 Month", usd: 15 },
  { id: "3months", label: "3 Months", usd: 35 },
  { id: "12months", label: "12 Months", usd: 99 },
];

export default function PaymentModal({ pageId, slug, onClose, onActivated }) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [solPrice, setSolPrice] = useState(null);
  const [polling, setPolling] = useState(false);
  const [status, setStatus] = useState("idle");
  const [ownerCode, setOwnerCode] = useState("");
  const [showOwnerField, setShowOwnerField] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSolPrice();
  }, []);

  const fetchSolPrice = async () => {
    try {
      const res = await axios.get("/api/pricing/sol-rate");
      setSolPrice(res.data.solPerUsd);
    } catch {
      setSolPrice(null);
    }
  };

  const getSolAmount = (usd) => {
    if (!solPrice) return "…";
    return (usd * solPrice).toFixed(4);
  };

  const handlePayment = async () => {
    setError("");
    setStatus("initiating");

    try {
      // Owner code or mock mode — instant activation
      if (ownerCode) {
        const res = await axios.post("/api/payments/initiate", {
          pageId,
          plan: selectedPlan.id,
          ownerCode,
        });
        if (res.data.activated) {
          setStatus("activated");
          onActivated && onActivated();
          return;
        }
      }

      // Get payment details from backend
      const res = await axios.post("/api/payments/initiate", {
        pageId,
        plan: selectedPlan.id,
      });

      // Mock mode — instant activation
      if (res.data.activated) {
        setStatus("activated");
        onActivated && onActivated();
        return;
      }

      const { amountSol, treasuryWallet, referenceId } = res.data;

      // Build Solana transaction
      const lamports = Math.round(parseFloat(amountSol) * LAMPORTS_PER_SOL);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(treasuryWallet),
          lamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send via Phantom — wallet popup appears here
      setStatus("signing");
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      setStatus("confirming");
      await connection.confirmTransaction(signature, "finalized");

      // Tell backend to activate
      await axios.post(`/api/payments/confirm-tx`, {
        referenceId,
        txHash: signature,
      });

      setStatus("activated");
      onActivated && onActivated();

    } catch (err) {
      if (err.message?.includes("rejected") || err.message?.includes("cancelled")) {
        setStatus("idle");
        setError("Transaction cancelled.");
      } else {
        setStatus("error");
        setError(err.response?.data?.error || err.message || "Payment failed.");
      }
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: "16px",
    }}>
      <div className="glass" style={{
        borderRadius: "16px", padding: "28px",
        width: "100%", maxWidth: "440px", position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: "16px", right: "16px",
          background: "none", border: "none", color: "#888",
          fontSize: "20px", cursor: "pointer",
        }}>×</button>

        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>Activate Page</h2>
        <p style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>
          <strong style={{ color: "#ffcc44" }}>⚠ Notice:</strong> Pages are automatically deleted after 3 months of non-renewal.
        </p>

        {(status === "idle" || status === "initiating") && (
          <>
            <div style={{ marginBottom: "20px" }}>
              <label>Select Plan</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                {PLANS.map((plan) => (
                  <div key={plan.id} onClick={() => setSelectedPlan(plan)} style={{
                    padding: "12px 16px", borderRadius: "10px", cursor: "pointer",
                    border: selectedPlan.id === plan.id ? "2px solid #9945FF" : "2px solid rgba(255,255,255,0.08)",
                    background: selectedPlan.id === plan.id ? "rgba(153,69,255,0.1)" : "rgba(255,255,255,0.03)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontWeight: 600 }}>{plan.label}</span>
                    <span>
                      <span style={{ color: "#9945FF", fontWeight: 700 }}>{getSolAmount(plan.usd)} SOL</span>
                      <span style={{ color: "#555", fontSize: "12px", marginLeft: "6px" }}>(${plan.usd})</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <button onClick={() => setShowOwnerField(!showOwnerField)} style={{
                background: "none", border: "none", color: "#555",
                fontSize: "12px", cursor: "pointer", textDecoration: "underline",
              }}>
                Have an access code?
              </button>
              {showOwnerField && (
                <input type="password" placeholder="Owner access code"
                  value={ownerCode} onChange={(e) => setOwnerCode(e.target.value)}
                  style={{ marginTop: "8px" }}
                />
              )}
            </div>

            {error && <div style={{ color: "#ff6464", fontSize: "12px", marginBottom: "12px" }}>{error}</div>}

            <button className="btn-primary"
              style={{ width: "100%", fontSize: "15px", padding: "13px" }}
              onClick={handlePayment}
              disabled={status === "initiating"}
            >
              {status === "initiating" ? "Processing…" : "Pay with Phantom →"}
            </button>
          </>
        )}

        {status === "signing" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>👻</div>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>Waiting for wallet approval…</div>
            <div style={{ fontSize: "13px", color: "#888", marginTop: "8px" }}>Check your Phantom wallet</div>
          </div>
        )}

        {status === "confirming" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⛓</div>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>Confirming on Solana…</div>
            <div style={{ fontSize: "13px", color: "#888", marginTop: "8px" }}>This takes a few seconds</div>
          </div>
        )}

        {status === "activated" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#14F195", marginBottom: "8px" }}>Page Activated!</div>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>
              Your page is live at <span style={{ color: "#9945FF" }}>{slug}.tokensite.fun</span>
            </div>
            <button className="btn-primary" style={{ width: "100%" }} onClick={onClose}>Done</button>
          </div>
        )}

        {status === "error" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#ff6464", marginBottom: "12px" }}>{error || "Something went wrong."}</div>
            <button className="btn-secondary" style={{ width: "100%" }} onClick={() => { setStatus("idle"); setError(""); }}>Retry</button>
          </div>
        )}
      </div>
    </div>
  );
}
