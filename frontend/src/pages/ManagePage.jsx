import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import PaymentModal from "../components/PaymentModal";
import SocialLinksInput from "../components/SocialLinksInput";
import ImageUpload from "../components/ImageUpload";
import TemplateSelector from "../components/TemplateSelector";

const DOMAIN = import.meta.env.VITE_DOMAIN || "tokensite.fun";

export default function ManagePage() {
  const { pageId } = useParams();
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [ownerCode, setOwnerCode] = useState("");
  const [ownerVerified, setOwnerVerified] = useState(false);
  const [ownerError, setOwnerError] = useState("");
  const [ownerMessage, setOwnerMessage] = useState("");

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContractAddress, setEditContractAddress] = useState("");
  const [editBuyLinks, setEditBuyLinks] = useState({ raydium: "", jupiter: "", pumpfun: "" });
  const [editSocials, setEditSocials] = useState({});
  const [editAvatar, setEditAvatar] = useState(null);
  const [editBanner, setEditBanner] = useState(null);
  const [editTemplateId, setEditTemplateId] = useState("template_1");

  useEffect(() => {
    fetchPage();
  }, [pageId]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/pages/${pageId}`);
      const p = res.data.page;
      setPage(p);
      const c = JSON.parse(p.content_json || "{}");
      setEditName(c.name || "");
      setEditDescription(c.description || "");
      setEditContractAddress(c.contractAddress || "");
      setEditBuyLinks({ raydium: c.buyLinks?.raydium || "", jupiter: c.buyLinks?.jupiter || "", pumpfun: c.buyLinks?.pumpfun || "" });
      setEditSocials(c.socials || {});
      setEditTemplateId(p.template_id || "template_1");
    } catch {
      navigate("/");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const filteredBuyLinks = Object.fromEntries(
        Object.entries(editBuyLinks).filter(([, v]) => v && v.trim())
      );
      const content = {};
      if (editName) content.name = editName;
      if (editDescription) content.description = editDescription;
      if (editContractAddress) content.contractAddress = editContractAddress;
      if (Object.keys(filteredBuyLinks).length > 0) content.buyLinks = filteredBuyLinks;
      content.socials = Object.fromEntries(
        Object.entries(editSocials).filter(([, v]) => v && v.trim())
      );

      if (editAvatar?.file) {
        const form = new FormData();
        form.append("image", editAvatar.file);
        form.append("type", "avatar");
        const r = await axios.post("/api/media/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
        content.avatar = r.data.url;
      } else if (page) {
        const existing = JSON.parse(page.content_json || "{}");
        if (existing.avatar) content.avatar = existing.avatar;
      }

      if (editBanner?.file) {
        const form = new FormData();
        form.append("image", editBanner.file);
        form.append("type", "banner");
        const r = await axios.post("/api/media/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
        content.banner = r.data.url;
      } else if (page) {
        const existing = JSON.parse(page.content_json || "{}");
        if (existing.banner) content.banner = existing.banner;
      }

      await axios.put(`/api/pages/${pageId}`, {
        walletAddress: publicKey.toString(),
        templateId: editTemplateId,
        content,
      });

      setSaveMessage("Saved successfully!");
      setShowEdit(false);
      fetchPage();
    } catch (err) {
      setSaveMessage(err.response?.data?.error || "Failed to save.");
    }
    setSaving(false);
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
      const res = await axios.post(`/api/admin/page-action`, { pageId, action, code: ownerCode });
      setOwnerMessage(res.data.message || "Done.");
      fetchPage();
    } catch (e) {
      setOwnerMessage(e.response?.data?.error || "Action failed.");
    }
  };

  if (loading) return <div style={{ padding: "60px", textAlign: "center", color: "#666" }}>Loading…</div>;
  if (!page) return null;

  const isActive = page.status === "active";
  const expires = page.expires_at ? new Date(page.expires_at * 1000).toLocaleString() : "—";

  if (showEdit) {
    return (
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "32px 20px" }}>
        <button onClick={() => setShowEdit(false)}
          style={{ background: "none", border: "none", color: "#9945FF", cursor: "pointer", marginBottom: "16px", fontSize: "15px", fontWeight: 600 }}>
          ← Back
        </button>

        <h1 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "6px" }}>Edit Page</h1>
        <div style={{ fontSize: "13px", color: "#666", marginBottom: "24px" }}>
          Slug <strong style={{ color: "#9945FF" }}>{page.slug}</strong> cannot be changed.
        </div>

        <div className="glass" style={{ borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          <div>
            <label>Project Name <span style={{ color: "#555" }}>(optional)</span></label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. PepeCoin" />
          </div>

          <div>
            <label>Description <span style={{ color: "#555" }}>(optional)</span></label>
            <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Tell people what your project is about…" rows={4} style={{ resize: "vertical" }} />
          </div>

          <div>
            <label>Contract Address <span style={{ color: "#555" }}>(optional)</span></label>
            <input value={editContractAddress} onChange={(e) => setEditContractAddress(e.target.value)}
              placeholder="e.g. So11111111111111111111111111111111111111112"
              style={{ fontFamily: "monospace", fontSize: "12px" }} />
          </div>

          <div>
            <label>Buy Links <span style={{ color: "#555" }}>(optional)</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
              {[
                { key: "raydium", label: "Raydium", pl: "78px", placeholder: "https://raydium.io/swap/..." },
                { key: "jupiter", label: "Jupiter", pl: "72px", placeholder: "https://jup.ag/swap/..." },
                { key: "pumpfun", label: "Pump.fun", pl: "82px", placeholder: "https://pump.fun/..." },
              ].map(({ key, label, pl, placeholder }) => (
                <div key={key} style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#14F195", pointerEvents: "none" }}>{label}</span>
                  <input value={editBuyLinks[key]} onChange={(e) => setEditBuyLinks({ ...editBuyLinks, [key]: e.target.value })}
                    placeholder={placeholder} style={{ paddingLeft: pl }} />
                </div>
              ))}
            </div>
          </div>

          <SocialLinksInput value={editSocials} onChange={setEditSocials} />

          <ImageUpload label="Avatar" hint="Recommended 400×400px · Max 2MB" value={editAvatar} onChange={setEditAvatar} />
          <ImageUpload label="Banner" hint="Recommended 1200×300px · Max 5MB" value={editBanner} onChange={setEditBanner} />

          <div>
            <label>Template</label>
            <TemplateSelector value={editTemplateId} onChange={setEditTemplateId} />
          </div>

          {saveMessage && (
            <div style={{ fontSize: "13px", color: saveMessage.includes("success") ? "#14F195" : "#ff6464" }}>
              {saveMessage}
            </div>
          )}

          <button className="btn-primary" style={{ fontSize: "15px", padding: "13px" }}
            onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes →"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "32px 20px" }}>
      <button onClick={() => navigate("/")}
        style={{ background: "none", border: "none", color: "#9945FF", cursor: "pointer", marginBottom: "16px", fontSize: "15px", fontWeight: 600 }}>
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
            <div style={{ fontSize: "16px", fontWeight: 700, color: isActive ? "#14F195" : "#ff6464", marginTop: "4px" }}>
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
          {isActive ? "Top Up / Extend" : "Activate Page"}
        </button>
        <button className="btn-secondary" onClick={() => setShowEdit(true)}>
          Edit Page
        </button>
      </div>

      <div className="glass" style={{ borderRadius: "12px", padding: "20px" }}>
        <div style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>Owner Controls</div>
        {!ownerVerified ? (
          <div style={{ display: "flex", gap: "8px" }}>
            <input type="password" placeholder="Owner access code" value={ownerCode}
              onChange={(e) => setOwnerCode(e.target.value)} style={{ flex: 1 }} />
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
            {ownerMessage && <div style={{ fontSize: "12px", color: "#14F195" }}>{ownerMessage}</div>}
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
