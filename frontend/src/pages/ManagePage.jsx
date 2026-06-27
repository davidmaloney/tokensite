import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import SocialLinksInput from "../components/SocialLinksInput";
import ImageUpload from "../components/ImageUpload";
import TemplateSelector from "../components/TemplateSelector";
import PagePreview from "../components/PagePreview";
import PaymentModal from "../components/PaymentModal";

const BUY_LINK_TYPES = [
  { key: "raydium", label: "Raydium", prefix: "https://raydium.io/swap/?inputMint=sol&outputMint=", placeholder: "CA", hint: "Solana — Enter your token CA" },
  { key: "pumpfun", label: "Pump.fun", prefix: "https://pump.fun/coin/", placeholder: "CA", hint: "Solana — Enter your token CA" },
  { key: "uniswap", label: "Uniswap", prefix: "https://app.uniswap.org/swap?outputCurrency=", placeholder: "0x...", hint: "Ethereum / Base / Arbitrum / Polygon" },
  { key: "pancakeswap", label: "PancakeSwap", prefix: "https://pancakeswap.finance/swap?outputCurrency=", placeholder: "0x...", hint: "BSC" },
  { key: "sushiswap", label: "SushiSwap", prefix: "https://www.sushi.com/swap?token1=", placeholder: "0x...", hint: "Multi-chain" },
];

export default function ManagePage() {
  const { pageId } = useParams();
  const { connected, publicKey } = useWallet();
  const navigate = useNavigate();

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [activeTab, setActiveTab] = useState("edit");

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContractAddress, setEditContractAddress] = useState("");
  const [editBuyLinks, setEditBuyLinks] = useState({ raydium: "", pumpfun: "", uniswap: "", pancakeswap: "", sushiswap: "" });
  const [editTokenomics, setEditTokenomics] = useState({});
  const [editAvatar, setEditAvatar] = useState(null);
  const [editBanner, setEditBanner] = useState(null);
  const [editSocials, setEditSocials] = useState({});
  const [editTemplateId, setEditTemplateId] = useState("template_1");

  const [editShowTicker, setEditShowTicker] = useState(false);
  const [editShowChart, setEditShowChart] = useState(false);
  const [editCountdownDate, setEditCountdownDate] = useState("");
  const [editCountdownLabel, setEditCountdownLabel] = useState("");
  const [editAboutText, setEditAboutText] = useState("");
  const [editTeam, setEditTeam] = useState([{ name: "", role: "", twitter: "", photo: null }]);
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
      setEditBuyLinks({
        raydium: c.buyLinks?.raydium || "",
        pumpfun: c.buyLinks?.pumpfun || "",
        uniswap: c.buyLinks?.uniswap || "",
        pancakeswap: c.buyLinks?.pancakeswap || "",
        sushiswap: c.buyLinks?.sushiswap || "",
      });
      setEditTokenomics(c.tokenomics || {});
      setEditSocials(c.socials || {});
      setEditTemplateId(p.template_id || "template_1");
      setEditShowTicker(c.showTicker || false);
      setEditShowChart(c.showChart || false);
      setEditCountdownDate(c.countdown?.date ? c.countdown.date.slice(0, 16) : "");
      setEditCountdownLabel(c.countdown?.label || "");
      setEditAboutText(c.about?.text || "");
      setEditTeam(c.about?.team?.length > 0 ? c.about.team.map((m) => ({ name: m.name || "", role: m.role || "", twitter: m.twitter || "", photo: m.photo ? { preview: window.location.origin + m.photo, file: null, url: m.photo } : null })) : [{ name: "", role: "", twitter: "", photo: null }]);
      setEditRoadmap(c.roadmap?.length > 0 ? c.roadmap : [{ title: "", description: "", status: "upcoming" }]);
      if (c.avatar) setEditAvatar({ preview: window.location.origin + c.avatar, file: null });
      if (c.banner) setEditBanner({ preview: window.location.origin + c.banner, file: null });
    } catch {
      setPage(null);
    }
    setLoading(false);
  };

  const getBuyLinkDisplay = (key) => {
    const type = BUY_LINK_TYPES.find((t) => t.key === key);
    if (!type) return editBuyLinks[key];
    const full = editBuyLinks[key] || "";
    return full.startsWith(type.prefix) ? full.slice(type.prefix.length) : full;
  };

  const setBuyLinkDisplay = (key, val) => {
    const type = BUY_LINK_TYPES.find((t) => t.key === key);
    if (!type) return;
    setEditBuyLinks({ ...editBuyLinks, [key]: val ? type.prefix + val.replace(type.prefix, "") : "" });
  };

  const addTeamMember = () => {
    if (editTeam.length < 4) setEditTeam([...editTeam, { name: "", role: "", twitter: "", photo: null }]);
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
      const filteredRoadmap = editRoadmap.filter((m) => m.title && m.title.trim());

      const content = {};
      if (editName) content.name = editName;
      if (editDescription) content.description = editDescription;
      if (editContractAddress) content.contractAddress = editContractAddress;
      if (Object.keys(filteredBuyLinks).length > 0) content.buyLinks = filteredBuyLinks;
      if (Object.keys(filteredTokenomics).length > 0) content.tokenomics = filteredTokenomics;
      content.socials = Object.fromEntries(Object.entries(editSocials).filter(([, v]) => v && v.trim()));
      if (editContractAddress) content.showTicker = editShowTicker;
      if (editContractAddress) content.showChart = editShowChart;
      if (editCountdownDate) content.countdown = { date: editCountdownDate, label: editCountdownLabel || "Countdown" };
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

      // Build team, uploading any new member photos and preserving existing ones.
      const teamWithPhotos = await Promise.all(
        editTeam
          .filter((m) => m.name && m.name.trim())
          .map(async (m) => {
            const member = { name: m.name, role: m.role };
            if (m.twitter && m.twitter.trim()) member.twitter = m.twitter.trim();
            if (m.photo?.file) {
              const form = new FormData();
              form.append("image", m.photo.file);
              form.append("type", "avatar");
              const r = await axios.post("/api/media/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
              member.photo = r.data.url;
            } else if (m.photo?.url) {
              member.photo = m.photo.url;
            }
            return member;
          })
      );
      if (editAboutText.trim() || teamWithPhotos.length > 0) content.about = { text: editAboutText, team: teamWithPhotos };

      await axios.put("/api/pages/" + pageId, {
        walletAddress: publicKey.toString(),
        templateId: editTemplateId,
        content,
      });

      setSaveMessage("Saved!");
      setTimeout(() => setSaveMessage(""), 2500);
      fetchPage();
    } catch (err) {
      setSaveMessage(err.response?.data?.error || "Save failed. Please try again.");
    }
    setSaving(false);
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "80px 20px", color: "#666" }}>Loading…</div>;
  }

  if (!page) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "#888" }}>
        <div style={{ marginBottom: "16px" }}>Page not found.</div>
        <Link to="/"><button className="btn-primary">Back to Dashboard</button></Link>
      </div>
    );
  }

  const isOwner = connected && publicKey && page.wallet_address === publicKey.toString();
  if (!isOwner) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "#888" }}>
        <div style={{ marginBottom: "16px" }}>You don't have permission to edit this page.</div>
        <Link to="/"><button className="btn-primary">Back to Dashboard</button></Link>
      </div>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const isActive = page.status === "active" && page.expires_at && page.expires_at > now;
  const daysLeft = isActive ? Math.ceil((page.expires_at - now) / 86400) : 0;

  const TOKENOMICS_FIELDS = [
    { key: "totalSupply", label: "Total Supply", hint: "e.g. 1,000,000,000" },
    { key: "tax", label: "Buy/Sell Tax", hint: "e.g. 0% / 0%" },
    { key: "liquidity", label: "Liquidity", hint: "e.g. Locked" },
    { key: "renounced", label: "Contract Renounced", hint: "Yes or No" },
    { key: "launchDate", label: "Launch Date", hint: "e.g. June 2025" },
    { key: "network", label: "Network", hint: "e.g. Solana" },
  ];

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800 }}>{page.slug}.shillit.fun</h1>
          <div style={{ fontSize: "13px", marginTop: "4px" }}>
            {isActive ? (
              <span style={{ color: "#14F195" }}>● Live · {daysLeft} day{daysLeft !== 1 ? "s" : ""} left</span>
            ) : (
              <span style={{ color: "#ff6464" }}>● Inactive</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => navigate("/")} className="btn-secondary" style={{ fontSize: "13px" }}>← Dashboard</button>
          {isActive && (
            <a href={"https://" + page.slug + ".shillit.fun"} target="_blank" rel="noreferrer">
              <button className="btn-secondary" style={{ fontSize: "13px" }}>View Live ↗</button>
            </a>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
        <button onClick={() => setShowPayment(true)} className="btn-primary" style={{ fontSize: "13px" }}>
          {isActive ? "Extend / Top Up" : "Activate Page"}
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        {["edit", "preview"].map((tab) => (
          <div key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "8px 18px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            background: activeTab === tab ? "linear-gradient(135deg, #9945FF, #14F195)" : "rgba(255,255,255,0.05)",
            color: activeTab === tab ? "#000" : "#888",
          }}>
            {tab === "edit" ? "Edit" : "Preview"}
          </div>
        ))}
      </div>

      {activeTab === "edit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="glass" style={{ borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Basic Info</h2>
            <div>
              <label>Project Name</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. PepeCoin" />
            </div>
            <div>
              <label>Description</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={4} style={{ resize: "vertical" }} />
            </div>
            <div>
              <label>Contract Address</label>
              <input value={editContractAddress} onChange={(e) => setEditContractAddress(e.target.value)} style={{ fontFamily: "monospace", fontSize: "12px" }} />
            </div>
            <div>
              <label>Buy Links</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "6px" }}>
                {BUY_LINK_TYPES.map(({ key, label, prefix, placeholder, hint }) => (
                  <div key={key}>
                    <div style={{ fontSize: "12px", color: "#14F195", marginBottom: "4px", fontWeight: 600 }}>{label}</div>
                    <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", overflow: "hidden" }}>
                      <span style={{ padding: "10px 10px 10px 12px", fontSize: "10px", color: "#555", whiteSpace: "nowrap", borderRight: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>{prefix}</span>
                      <input value={getBuyLinkDisplay(key)} onChange={(e) => setBuyLinkDisplay(key, e.target.value)} placeholder={placeholder} style={{ border: "none", background: "transparent", flex: 1, padding: "10px 12px", fontSize: "13px", outline: "none", color: "#fff" }} />
                    </div>
                    <div style={{ fontSize: "11px", color: "#555", marginTop: "4px", paddingLeft: "2px" }}>{hint}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label>Tokenomics</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                {TOKENOMICS_FIELDS.map(({ key, label, hint }) => (
                  <div key={key}>
                    <div style={{ fontSize: "11px", color: "#9945FF", marginBottom: "3px", fontWeight: 600 }}>{label}</div>
                    <input value={editTokenomics[key] || ""} onChange={(e) => setEditTokenomics({ ...editTokenomics, [key]: e.target.value })} placeholder={hint} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass" style={{ borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Media</h2>
            <ImageUpload label="Avatar" hint="Recommended 400×400px · Max 2MB" value={editAvatar} onChange={setEditAvatar} />
            <ImageUpload label="Banner" hint="Recommended 1200×300px · Max 5MB" value={editBanner} onChange={setEditBanner} />
          </div>

          <div className="glass" style={{ borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Social Links</h2>
            <SocialLinksInput value={editSocials} onChange={setEditSocials} />
          </div>

          <div className="glass" style={{ borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Template</h2>
            <TemplateSelector value={editTemplateId} onChange={setEditTemplateId} />
          </div>

          <div className="glass" style={{ borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Extras</h2>

            {editContractAddress && (
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
            )}

            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px", color: "#9945FF" }}>Countdown Timer</div>
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

            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px", color: "#9945FF" }}>About & Team</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label>About text <span style={{ color: "#555" }}>(max 500 chars)</span></label>
                  <textarea value={editAboutText} onChange={(e) => setEditAboutText(e.target.value.slice(0, 500))} rows={3} style={{ resize: "vertical" }} />
                  <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{editAboutText.length}/500</div>
                </div>
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
                        <input value={member.twitter} onChange={(e) => updateTeamMember(i, "twitter", e.target.value.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").replace(/^(x|twitter)\.com\//i, "").replace(/^@+/, "").replace(/[^a-zA-Z0-9_]/g, ""))} placeholder="X / Twitter handle (optional)" maxLength={15} />
                        <ImageUpload label="Photo" hint="Optional · square works best · Max 2MB" value={member.photo} onChange={(val) => updateTeamMember(i, "photo", val)} />
                      </div>
                    </div>
                  ))}
                  {editTeam.length < 4 && (
                    <button className="btn-secondary" style={{ fontSize: "12px" }} onClick={addTeamMember}>+ Add Team Member</button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "10px", color: "#9945FF" }}>Roadmap</div>
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
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", position: "sticky", bottom: "20px" }}>
            <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "14px" }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saveMessage && (
              <span style={{ fontSize: "13px", color: saveMessage === "Saved!" ? "#14F195" : "#ff6464", fontWeight: 600 }}>{saveMessage}</span>
            )}
          </div>
        </div>
      )}

      {activeTab === "preview" && (
        <PagePreview
          data={{
            name: editName, description: editDescription, avatar: editAvatar, banner: editBanner,
            socials: editSocials, contractAddress: editContractAddress, buyLinks: editBuyLinks,
            tokenomics: editTokenomics, showTicker: editShowTicker, showChart: editShowChart,
            countdownDate: editCountdownDate, countdownLabel: editCountdownLabel,
            aboutText: editAboutText, team: editTeam, roadmap: editRoadmap,
          }}
          templateId={editTemplateId}
        />
      )}

      {showPayment && (
        <PaymentModal
          pageId={page.id}
          slug={page.slug}
          onClose={() => setShowPayment(false)}
          onActivated={() => { setShowPayment(false); fetchPage(); }}
        />
      )}
    </div>
  );
}
