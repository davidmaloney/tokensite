import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import PaymentModal from "../components/PaymentModal";

const DOMAIN = import.meta.env.VITE_DOMAIN || "tokensite.fun";

export default function ManagePage() {
  const { pageId } = useParams();
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [ownerCode, setOwnerCode] = useState("");
  const [ownerVerified, setOwnerVerified] = useState(false);
  const [ownerError, setOwnerError] = useState("");
  const [ownerMessage, setOwnerMessage] = useState("");

  useEffect(() => {
    fetchPage();
  }, [pageId]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/pages/${pageId}`);
      setPage(res.data.page);
    } catch {
      navigate("/");
    }
    setLoading(false);
  };

  const verifyOwnerCode = async () => {
    try {
      const res = await axios.post("/api/admin/verify-code", { code: ownerCode });
      if (res.data.valid) {
        setOwnerVerified(true);
        setOwnerError("");
      } else {
        setOwnerError("Invalid code.");
      }
    } catch {
      setOwnerError("Error verifying code.");
    }
  };

  const ownerAction = async (action) => {
    setOwnerMessage("");
    try {
      const res = await axios.post(`/api/admin/page-action`, {
        pageId,
        action,
        code: ownerCode,
      });
      setOwnerMessage(res.data.message || "Done.");
      fetchPage();
    } catch (e) {
      setOwnerMessage(e.response?.data?.error || "Action failed.");
    }
  };

  if (loading) return <div style={{ padding: "60px", textAlign: "center", color: "#666" }}>Loading…</div>;
  if (!page) return null;

  const isActive = page.status === "active";
  const expires = page.expires_at ? new Date(page.expires_at).toLocaleString() : "—";

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "32px 20px" }}>
      <button
        onClick={() => navigate("/")}
        style={{ background: "none", border: "none", color: "#888", cursor: "pointer", marginBottom: "16px", fontSize: "13px" }}
      >
        ← Back to Dashboard
      </button>

      <h1 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "6px" }}>{page.slug}</h1>
      <div style={{ fontSize: "13px", color: "#666", marginBottom: "24px" }}>
        {page.slug}.{DOMAIN}
      </div>

      <div className="glass" style={{ borderRadius: "12px", padding: "24px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "13px", color: "#888" }}>Status</div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: isActive ? "#14F195" : "#ff6464",
                marginTop: "4px",
              }}
            >
              {isActive ? "● Active" : "● Inactive"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "#888" }}>Template</div>
            <div style={{ fontWeight: 600, marginTop: "4px" }}>{page.template_id}</div>
          </div>
          <div>
            <div style={{ fontSize: "13px", color: "#888" }}>Expires</div>
            <div style={{ fontWeight: 600, marginTop: "4px" }}>{expires}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        {isActive && (
          <a href={`https://${page.slug}.${DOMAIN}`} target="_blank" rel="noreferrer">
            <button className="btn-primary">View Live →</button>
          </a>
        )}
        <button className="btn-secondary" onClick={() => setShowPayment(true)}>
          {isActive ? "Extend / Renew" : "Activate Page"}
        </button>
      </div>

      {/* Owner Controls */}
      <div className="glass" style={{ borderRadius: "12px", padding: "20px" }}>
        <div style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>Owner Controls</div>
        {!ownerVerified ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="password"
              placeholder="Owner access code"
              value={ownerCode}
              onChange={(e) => setOwnerCode(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn-secondary" onClick={verifyOwnerCode}>Verify</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <button className="btn-secondary" style={{ fontSize: "12px" }} onClick={() => ownerAction("activate")}>Force Active</button>
              <button className="btn-secondary" style={{ fontSize: "12px" }} onClick={() => ownerAction("deactivate")}>Force Inactive</button>
              <button className="btn-secondary" style={{ fontSize: "12px" }} onClick={() => ownerAction("simulate_expiry")}>Simulate Expiry</button>
              <button className="btn-secondary" style={{ fontSize: "12px" }} onClick={() => ownerAction("extend_7days")}>Extend 7 Days</button>
              <button className="btn-secondary" style={{ fontSize: "12px" }} onClick={() => ownerAction("shorten_1day")}>Shorten 1 Day</button>
            </div>
            {ownerMessage && (
              <div style={{ fontSize: "12px", color: "#14F195" }}>{ownerMessage}</div>
            )}
          </div>
        )}
        {ownerError && <div style={{ fontSize: "12px", color: "#ff6464", marginTop: "8px" }}>{ownerError}</div>}
      </div>

      {showPayment && (
        <PaymentModal
          pageId={page.id}
          slug={page.slug}
          onClose={() => { setShowPayment(false); fetchPage(); }}
          onActivated={() => { setShowPayment(false); fetchPage(); }}
        />
      )}
    </div>
  );
}
