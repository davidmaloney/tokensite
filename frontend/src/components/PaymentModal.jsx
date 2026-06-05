import React, { useState, useEffect } from "react";
import axios from "axios";

const PLANS = [
  { id: "1month", label: "1 Month", usd: 15 },
  { id: "3months", label: "3 Months", usd: 35 },
  { id: "12months", label: "12 Months", usd: 99 },
];

export default function PaymentModal({ pageId, slug, onClose, onActivated }) {
  const [selectedPlan, setSelectedPlan] = useState(PLANS[0]);
  const [solPrice, setSolPrice] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [polling, setPolling] = useState(false);
  const [status, setStatus] = useState("idle");
  const [ownerCode, setOwnerCode] = useState("");
  const [showOwnerField, setShowOwnerField] = useState(false);

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

  const initiatePayment = async () => {
    setStatus("initiating");
    try {
      const res = await axios.post("/api/payments/initiate", {
        pageId,
        plan: selectedPlan.id,
        ownerCode: ownerCode || undefined,
      });
      if (res.data.activated) {
        setStatus("activated");
        onActivated && onActivated();
        return;
      }
      setPaymentInfo(res.data);
      setStatus("awaiting");
      startPolling(res.data.referenceId);
    } catch (err) {
      setStatus("error");
    }
  };

  const startPolling = (referenceId) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 60;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await axios.get(`/api/payments/status/${referenceId}`);
        if (res.data.confirmed) {
          clearInterval(interval);
          setPolling(false);
          setStatus("activated");
          onActivated && onActivated();
        }
      } catch {}
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setPolling(false);
        setStatus("timeout");
      }
    }, 5000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        className="glass"
        style={{
          borderRadius: "16px",
          padding: "28px",
          width: "100%",
          maxWidth: "440px",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            color: "#888",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>
          Activate Page
        </h2>
        <p style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>
          <strong style={{ color: "#ffcc44" }}>⚠ Notice:</strong> All pages are automatically
          deleted after 3 months of inactivity or non-renewal. Renew before expiry to keep your page.
        </p>

        {status === "idle" || status === "initiating" ? (
          <>
            <div style={{ marginBottom: "20px" }}>
              <label>Select Plan</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                {PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      border:
                        selectedPlan.id === plan.id
                          ? "2px solid #9945FF"
                          : "2px solid rgba(255,255,255,0.08)",
                      background:
                        selectedPlan.id === plan.id
                          ? "rgba(153,69,255,0.1)"
                          : "rgba(255,255,255,0.03)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{plan.label}</span>
                    <span>
                      <span style={{ color: "#9945FF", fontWeight: 700 }}>
                        {getSolAmount(plan.usd)} SOL
                      </span>
                      <span style={{ color: "#555", fontSize: "12px", marginLeft: "6px" }}>
                        (${plan.usd})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <button
                onClick={() => setShowOwnerField(!showOwnerField)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#555",
                  fontSize: "12px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Have an access code?
              </button>
              {showOwnerField && (
                <input
                  type="password"
                  placeholder="Owner access code"
                  value={ownerCode}
                  onChange={(e) => setOwnerCode(e.target.value)}
                  style={{ marginTop: "8px" }}
                />
              )}
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%", fontSize: "15px", padding: "13px" }}
              onClick={initiatePayment}
              disabled={status === "initiating"}
            >
              {status === "initiating" ? "Processing…" : "Continue →"}
            </button>
          </>
        ) : status === "awaiting" && paymentInfo ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "#888", marginBottom: "6px" }}>Send exactly</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#14F195" }}>
                {paymentInfo.amountSol} SOL
              </div>
              <div style={{ fontSize: "12px", color: "#666" }}>(≈ ${selectedPlan.usd})</div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>To wallet</div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "12px",
                  background: "rgba(255,255,255,0.05)",
                  padding: "10px",
                  borderRadius: "8px",
                  wordBreak: "break-all",
                  color: "#fff",
                }}
              >
                {paymentInfo.treasuryWallet}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>
                Reference ID (include in transaction memo)
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "13px",
                  color: "#9945FF",
                  background: "rgba(153,69,255,0.1)",
                  padding: "10px",
                  borderRadius: "8px",
                }}
              >
                {paymentInfo.referenceId}
              </div>
            </div>

            <div style={{ fontSize: "13px", color: "#888" }}>
              {polling ? "⏳ Awaiting confirmation…" : "Checking payment…"}
            </div>
          </div>
        ) : status === "activated" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#14F195", marginBottom: "8px" }}>
              Page Activated!
            </div>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>
              Your page is now live at{" "}
              <span style={{ color: "#9945FF" }}>{slug}</span>
            </div>
            <button className="btn-primary" style={{ width: "100%" }} onClick={onClose}>
              Done
            </button>
          </div>
        ) : status === "timeout" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#ff6464", marginBottom: "12px" }}>
              Payment verification timed out. If you sent SOL, it will be confirmed shortly.
            </div>
            <button className="btn-secondary" style={{ width: "100%" }} onClick={onClose}>
              Close
            </button>
          </div>
        ) : status === "error" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#ff6464", marginBottom: "12px" }}>Something went wrong. Please try again.</div>
            <button className="btn-secondary" style={{ width: "100%" }} onClick={() => setStatus("idle")}>
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
