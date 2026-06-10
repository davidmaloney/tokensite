import React, { useState, useEffect } from "react";
import axios from "axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction } from "@solana/web3.js";

const PLANS = [
  { id: "1month", label: "Top up monthly", usd: 4.99 },
  { id: "12months", label: "Top up yearly", usd: 39 },
];

const PAYMENTS_COMING_SOON = true;

export default function PaymentModal({ pageId, slug, onClose, onActivated }) {
  const { publicKey, sendTransaction } = useWallet();
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [solPrice, setSolPrice] = useState(null);
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
        setError("Invalid access code.");
        setStatus("idle");
        return;
      }

      const res = await axios.post("/api/payments/initiate", {
        pageId,
        plan: selectedPlan.id,
      });

      if (res.data.activated) {
        setStatus("activated");
        onActivated && onActivated();
        return;
      }

      const { amountSol, treasuryWallet, referenceId } = res.data;
      const { data: { blockhash } } = await axios.get("/api/payments/blockhash");

      const lamports = Math.round(parseFloat(amountSol) * LAMPORTS_PER_SOL);

      const memoText = "SHILLit payment " + referenceId + " for " + slug;
      const memoInstruction = new TransactionInstruction({
        keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
        programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
        data: Buffer.from(memoText, "utf-8"),
      });

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(treasuryWallet.trim()),
          lamports,
        }),
        memoInstruction
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      setStatus("signing");
      const { Connection } = await import("@solana/web3.js");
      const conn = new Connection("https://api.mainnet-beta.solana.com", { commitment: "finalized" });
      const signature = await sendTransaction(transaction, conn);

      setStatus("confirming");
      await axios.post("/api/payments/confirm-tx", { referenceId, txHash: signature });

      setStatus("activated");
      onActivated && onActivated();

    } catch (err) {
      if (err.message?.includes("rejected") || err.message?.includes("cancelled") || err.message?.includes("User rejected")) {
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

        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>Activate Page</h2>

        {PAYMENTS_COMING_SOON ? (
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🚧</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#ffcc44", marginBottom: "8px" }}>
              Payments launching very soon!
            </div>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "20px", lineHeight: 1.6 }}>
              We are putting the finishing touches on our payment system. Check back shortly — it won't be long!
            </div>

            <button onClick={() => setShowOwnerField(!showOwnerField)} style={{
              background: "none", border: "none", color: "#9945FF",
              fontSize: "13px", cursor: "pointer", textDecoration: "underline", marginBottom: "12px", display: "block", margin: "0 auto 12px",
            }}>
              Have an access code?
            </button>

            {showOwnerField && (
              <div style={{ marginBottom: "12px" }}>
                <input type="password" placeholder="Access code"
                  value={ownerCode} onChange={(e) => setOwnerCode(e.target.value)}
                  style={{ marginBottom: "8px" }} />
                {error && <div style={{ color: "#ff6464", fontSize: "12px", marginBottom: "8px" }}>{error}</div>}
                <button className="btn-primary" style={{ width: "100%" }}
                  onClick={handlePayment} disabled={status === "initiating"}>
                  {status === "initiating" ? "Processing…" : "Activate with code →"}
                </button>
              </div>
            )}

            {!showOwnerField && (
              <button className="btn-secondary" style={{ width: "100%" }} onClick={onClose}>
                Got it
              </button>
            )}
          </div>
        ) : (
          <>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>
              <strong style={{ color: "#ffcc44" }}>⚠ Heads up:</strong> Your page stays live as long as it is topped up. Page deleted on expiry.
            </p>

            {(status === "idle" || status === "initiating") && (
              <>
                <div style={{ marginBottom: "8px" }}>
                  <label>Pick your plan</label>
                  <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                    {PLANS.map((plan) => (
                      <div key={plan.id} onClick={() => setSelectedPlan(plan)} style={{
                        flex: 1, padding: "14px 12px", borderRadius: "10px", cursor: "pointer",
                        border: selectedPlan.id === plan.id ? "2px solid #9945FF" : "2px solid rgba(255,255,255,0.08)",
                        background: selectedPlan.id === plan.id ? "rgba(153,69,255,0.1)" : "rgba(255,255,255,0.03)",
                        textAlign: "center",
                      }}>
                        <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "6px", color: "#ccc" }}>{plan.label}</div>
                        <div style={{ color: "#9945FF", fontWeight: 800, fontSize: "20px" }}>${plan.usd}</div>
                        <div style={{ color: "#555", fontSize: "11px", marginTop: "2px" }}>{getSolAmount(plan.usd)} SOL</div>
                        {plan.id === "12months" && (
                          <div style={{ color: "#14F195", fontSize: "10px", fontWeight: 700, marginTop: "4px" }}>SAVE 35%</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ textAlign: "center", marginTop: "8px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ fontSize: "12px", color: "#fff", fontWeight: 600 }}>
                    Stays online while funded
                  </div>
                  <div style={{ fontSize: "11px", color: "#555" }}>
                    Page deleted on expiry
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
                    <input type="password" placeholder="Access code"
                      value={ownerCode} onChange={(e) => setOwnerCode(e.target.value)}
                      style={{ marginTop: "8px" }} />
                  )}
                </div>

                {error && <div style={{ color: "#ff6464", fontSize: "12px", marginBottom: "12px" }}>{error}</div>}

                <button className="btn-primary"
                  style={{ width: "100%", fontSize: "15px", padding: "13px" }}
                  onClick={handlePayment} disabled={status === "initiating"}>
                  {status === "initiating" ? "Processing…" : "Pay with Phantom →"}
                </button>
              </>
            )}

            {status === "signing" && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>👻</div>
                <div style={{ fontSize: "16px", fontWeight: 700 }}>Approve in your wallet</div>
                <div style={{ fontSize: "13px", color: "#888", marginTop: "8px" }}>Check your Phantom app</div>
              </div>
            )}

            {status === "confirming" && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>✅</div>
                <div style={{ fontSize: "16px", fontWeight: 700 }}>Transaction sent!</div>
                <div style={{ fontSize: "13px", color: "#888", marginTop: "8px" }}>Activating your page…</div>
              </div>
            )}

            {status === "activated" && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#14F195", marginBottom: "8px" }}>You're live!</div>
                <div style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>
                  Your page is ready at <span style={{ color: "#9945FF" }}>{slug}.shillit.fun</span>
                </div>
                <button className="btn-primary" style={{ width: "100%" }} onClick={onClose}>Let's go →</button>
              </div>
            )}

            {status === "error" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "#ff6464", marginBottom: "12px" }}>{error || "Something went wrong."}</div>
                <button className="btn-secondary" style={{ width: "100%" }} onClick={() => { setStatus("idle"); setError(""); }}>Try again</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
