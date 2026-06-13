import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import PaymentModal from "../components/PaymentModal";
import SocialLinksInput from "../components/SocialLinksInput";
import ImageUpload from "../components/ImageUpload";
import TemplateSelector from "../components/TemplateSelector";

const DOMAIN = import.meta.env.VITE_DOMAIN || "shillit.fun";

const TOKENOMICS_FIELDS = [
  { key: "totalSupply", label: "Total Supply", hint: "e.g. 1,000,000,000" },
  { key: "tax", label: "Buy/Sell Tax", hint: "e.g. 0% / 0%" },
  { key: "liquidity", label: "Liquidity", hint: "e.g. Locked on Raydium" },
  { key: "renounced", label: "Contract Renounced", hint: "Yes or No" },
  { key: "launchDate", label: "Launch Date", hint: "e.g. June 2025" },
  { key: "network", label: "Network", hint: "e.g. Solana" },
];

const BUY_LINK_TYPES = [
  {
    key: "raydium",
    label: "Raydium",
    prefix: "https://raydium.io/swap/?inputMint=sol&outputMint=",
    placeholder: "CA",
    hint: "Enter your token CA",
  },
  {
    key: "jupiter",
    label: "Jupiter",
    prefix: "https://jup.ag/swap/So11111111111111111111111111111111111111112-",
    placeholder: "CA",
    hint: "Enter your token CA",
  },
  {
    key: "pumpfun",
    label: "Pump.fun",
    prefix: "https://pump.fun/coin/",
    placeholder: "CA",
    hint: "Enter your token CA",
  },
];

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
  const [editTokenomics, setEditTokenomics] = useState({});
  const [editSocials, setEditSocials] = useState({});
  const [editAvatar, setEditAvatar] = useState(null);
  const [editBanner, setEditBanner] = useState(null);
  const [editTemplateId, setEditTemplateId] = useState("template_1");

  const [editShowTicker, setEditShowTicker] = useState(false);
  const [editShowChart, setEditShowChart] = useState(false);
  const [editCountdownDate, setEditCountdownDate] = useState("");
  const [editCountdownLabel, setEditCountdownLabel] = useState("");
  const [editAboutText, setEditAboutText] = useState("");
  const [editTeam, setEditTeam] = useState([{ name: "", role: "", twitter: "" }]);
  const [editRoadmap, setEditRoadmap] = useState([{ title: "", description: "", status: "upcoming" }]);

  useEffect(() => {
    fetchPage();
  }, [pageId]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/pages/" + pageId);
      const p = res.data.page;
      setPage(p);
      const c = JSON.parse(p.content_json || "{}");
      setEditName(c.name || "");
      setEditDescription(c.description || "");
      setEditContractAddress(c.contractAddress || "");
      setEditBuyLinks({ raydium: c.buyLinks?.raydium || "", jupiter: c.buyLinks?.jupiter || "", pumpfun: c.buyLinks?.pumpfun || "" });
      setEditTokenomics(c.tokenomics || {});
      setEditSocials(c.socials || {});
      setEditTemplateId(p.template_id || "template_1");
      setEditShowTicker(c.showTicker || false);
      setEditShowChart(c.showChart || false);
      setEditCountdownDate(c.countdown?.date ? c.countdown.date.slice(0, 16) : "");
      setEditCountdownLabel(c.countdown?.label || "");
      setEditAboutText(c.about?.text || "");
      setEditTeam(c.about?.team?.length > 0 ? c.about.team : [{ name: "", role: "", twitter: "" }]);
      setEditRoadmap(c.roadmap?.length > 0 ? c.roadmap : [{ title: "", description: "", status: "upcoming" }]);
      if (c.avatar) setEditAvatar({ preview: window.location.origin + c.avatar, file: null });
      if (c.banner) setEditBanner({ preview: window.location.origin + c.banner, file: null });
    } catch {
      navigate("/");
    }
    setLoading(false);
  };

  const getBuyLinkDisplay = (key) => {
    const type = BUY_LINK_TYPES.find((t) => t.key === key);
    if (!type) return editBuyLinks[key];
    const full = editBuyLinks[key] || "";
    return full.startsWith(type.prefix) ? full.slice(type.prefix.length) : full;
  };

  const setEditBuyLinkDisplay = (key, val) => {
    const type = BUY_LINK_TYPES.find((t) => t.key === key);
    if (!type) return;
    setEditBuyLinks({ ...editBuyLinks, [key]: val ? type.prefix + val.replace(type.prefix, "") : "" });
  };

  const addTeamMember = () => {
    if (editTeam.length < 4) setEditTeam([...editTeam, { name: "", role: "", twitter: "" }]);
  };

  const updateTeamMember = (i, field, val) => {
    const updated = [...editTeam];
    updated[i][field] = val;
    setEditTeam(updated);
  };

  const removeTeamMember = (i) => {
    setEditTeam(editTeam.filter((_, idx) => idx !== i));
  };

  const addMilestone = () => {
    if (editRoadmap.length < 8) setEditRoadmap([...editRoadmap, { title: "", description: "", status: "upcoming" }]);
  };

  const updateMilestone = (i, field, val) => {
    const updated = [...editRoadmap];
    updated[i][field] = val;
    setEditRoadmap(updated);
  };

  const removeMilestone = (i) => {
    setEditRoadmap(editRoadmap.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const filteredBuyLinks = Object.fromEntries(Object.entries(editBuyLinks).filter(([, v]) => v && v.trim()));
      const filteredTokenomics = Object.fromEntries(Object.entries(editTokenomics).filter(([, v]) => v && v.trim()));
      const filteredTeam = editTeam.filter((m) => m.name && m.name.trim());
      const filteredRoadmap = editRoadmap.filter((m) => m.title && m.title.trim());

      const content = {};
      if (editName) content.name = editName;
      if (editDescription) content.description = editDescription;
      if (editContractAddress) content.contractAddress = editContractAddress;
      if (Object.keys(filteredBuyLinks).length > 0) content.buyLinks = filteredBuyLinks;
      if (Object.keys(filteredTokenomics).length > 0) content.tokenomics = filteredTokenomics;
      content.socials = Object.fromEntries(Object.entries(editSocials).filter(([, v]) => v && v.trim()));
      if (editContractAddress && editShowTicker) content.showTicker = true;
      if (editContractAddress && editShowChart) content.showChart = true;
      if (editCountdownDate) content.countdown = { date: editCountdownDate, label: editCountdownLabel || "Countdown" };
      if (editAboutText.trim() || filteredTeam.length > 0) content.about = { text: editAboutText, team: filteredTeam };
      if (filteredRoadmap.length > 0) content.roadmap = filteredRoadmap;

      const existing = JSON.parse(page.content_json || "{}");

      if (editAvatar?.file) {
        const form = new FormData();
        form.append("image", editAvatar.file);
        form.append("type", "avatar");
        const r = await axios.post("/api/media/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
        content.avatar = r.data.url;
      } else if (existing.avatar) {
        content.avatar = existing.avatar;
      }

      if (editBanner?.file) {
        const form = new FormData();
        form.append("image", editBanner.file);
        form.append("type", "banner");
        const r = await axios.post("/api/media/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
        content.banner = r.data.url;
      } else if (existing.banner) {
        content.banner = existing.banner;
      }

      await axios.put("/api/pages/" + pageId, {
        walletAddress: publicKey.toString(),
        templateId: editTemplateId,
        content,
      });

      setSaveMessage("Saved successfully!");
      fetchPage();
    } catch (err) {
      setSaveMessage(err.response?.data?.error || "Save failed.");
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
      const res = await axios.post("/api/admin/page-action", { pageId, action, code: ownerCode });
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
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "6px" }}>
              {BUY_LINK_TYPES.map(({ key, label, prefix, placeholder, hint }) => (
                <div key={key}>
                  <div style={{ fontSize: "12px", color: "#14F195", marginBottom: "4px", fontWeight: 600 }}>{label}</div>
                  <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", overflow: "hidden" }}>
                    <span style={{
                      padding: "10px 10px 10px 12px",
                      fontSize: "10px",
                      color: "#555",
                      whiteSpace: "nowrap",
                      borderRight: "1px solid rgba(255,255,255,0.08)",
                      flexShrink: 0,
                      maxWidth: "200px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {prefix}
                    </span>
                    <input
                      value={getBuyLinkDisplay(key)}
                      onChange={(e) => setEditBuyLinkDisplay(key, e.target.value)}
                      placeholder={placeholder}
                      style={{
                        border: "none",
                        background: "transparent",
                        flex: 1,
                        padding: "10px 12px",
                        fontSize: "13px",
                        outline: "none",
                        color: "#fff",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "11px", color: "#555", marginTop: "4px", paddingLeft: "2px" }}>{hint}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label>Tokenomics <span style={{ color: "#555" }}>(optional)</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
              {TOKENOMICS_FIELDS.map(({ key, label, hint }) => (
                <div key={key}>
                  <div style={{ fontSize: "11px", color: "#9945FF", marginBottom: "3px", fontWeight: 600 }}>{label}</div>
                  <input value={editTokenomics[key] || ""} onChange={(e) => setEditTokenomics({ ...editTokenomics, [key]: e.target.value })} placeholder={hint} />
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

          {editContractAddress && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px", color: "#9945FF" }}>Live Data</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={editShowTicker} onChange={(e) => setEditShowTicker(e.target.checked)} style={{ width: "auto" }} />
                  <span style={{ fontSize: "14px" }}>Show live price ticker</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={editShowChart} onChange={(e) => setEditShowChart(e.target.checked)} style={{ width: "auto" }} />
                  <span style={{ fontSize: "14px" }}>Show price chart</span>
                </label>
              </div>
            </div>
          )}

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px", color: "#9945FF" }}>Countdown Timer</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label>Label</label>
                <input value={editCountdownLabel} onChange={(e) => setEditCountdownLabel(e.target.value.slice(0, 30))} placeholder="Token Launch" />
              </div>
              <div>
                <label>Target Date & Time</label>
                <input type="datetime-local" value={editCountdownDate} onChange={(e) => setEditCountdownDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px", color: "#9945FF" }}>About & Team</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label>About text <span style={{ color: "#555" }}>(max 500 chars)</span></label>
                <textarea value={editAboutText} onChange={(e) => setEditAboutText(e.target.value.slice(0, 500))}
                  placeholder="Tell your story…" rows={3} style={{ resize: "vertical" }} />
                <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{editAboutText.length}/500</div>
              </div>
              <div>
                <label>Team Members <span style={{ color: "#555" }}>(max 4)</span></label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                  {editTeam.map((member, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ fontSize: "12px", color: "#9945FF", fontWeight: 600 }}>Member {i + 1}</div>
                        {editTeam.length > 1 && (
                          <button onClick={() => removeTeamMember(i)} style={{ background: "none", border: "none", color: "#ff6464", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <input value={member.name} onChange={(e) => updateTeamMember(i, "name", e.target.value)} placeholder="Name" />
                        <input value={member.role} onChange={(e) => updateTeamMember(i, "role", e.target.value)} placeholder="Role" />
                        <input value={member.twitter} onChange={(e) => updateTeamMember(i, "twitter", e.target.value)} placeholder="Twitter @handle (optional)" />
                      </div>
                    </div>
                  ))}
                  {editTeam.length < 4 && (
                    <button className="btn-secondary" style={{ fontSize: "12px" }} onClick={addTeamMember}>+ Add Team Member</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px", color: "#9945FF" }}>Roadmap <span style={{ fontSize: "11px", color: "#555", fontWeight: 400 }}>(max 8)</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {editRoadmap.map((item, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ fontSize: "12px", color: "#9945FF", fontWeight: 600 }}>Milestone {i + 1}</div>
                    {editRoadmap.length > 1 && (
                      <button onClick={() => removeMilestone(i)} style={{ background: "none", border: "none", color: "#ff6464", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <input value={item.title} onChange={(e) => updateMilestone(i, "title", e.target.value.slice(0, 40))} placeholder="Milestone title" />
                    <input value={item.description} onChange={(e) => updateMilestone(i, "description", e.target.value.slice(0, 100))} placeholder="Short description" />
                    <select value={item.status} onChange={(e) => updateMilestone(i, "status", e.target.value)}>
                      <option value="upcoming">⚪ Upcoming</option>
                      <option value="inprogress">🔵 In Progress</option>
                      <option value="completed">✅ Completed</option>
                    </select>
                  </div>
                </div>
              ))}
              {editRoadmap.length < 8 && (
                <button className="btn-secondary" style={{ fontSize: "12px" }} onClick={addMilestone}>+ Add Milestone</button>
              )}
            </div>
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
          <a href={"https://" + page.slug + "." + DOMAIN} target="_blank" rel="noreferrer">
            <button className="btn-primary">View Live →</button>
          </a>
        )}
        <button className="btn-secondary" onClick={() => setShowPayment(true)}>
          {isActive ? "Top Up / Extend" : "Activate Page"}
        </button>
        <button className="btn-secondary" onClick={() => { setSaveMessage(""); setShowEdit(true); }}>
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
