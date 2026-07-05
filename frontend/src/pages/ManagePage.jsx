import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import SocialLinksInput from "../components/SocialLinksInput";
import ImageUpload from "../components/ImageUpload";
import TemplateSelector from "../components/TemplateSelector";
import PagePreview from "../components/PagePreview";
import PaymentModal from "../components/PaymentModal";

// --- Buy-link system (identical logic to CreatePage.jsx & the backend renderer) --
// The contract address gives the chain FAMILY (solana / evm / tron). For EVM the
// address can't say which evm chain, so the creator picks it (buyChain). From
// (family + CA + buyChain) we build the finished buy buttons automatically.

const EVM_CHAINS = [
  { id: "ethereum", label: "Ethereum", dex: "uniswap",     uniChain: "mainnet"  },
  { id: "bsc",      label: "BNB Chain (BSC)", dex: "pancakeswap"                 },
  { id: "base",     label: "Base",     dex: "uniswap",     uniChain: "base"     },
  { id: "arbitrum", label: "Arbitrum", dex: "uniswap",     uniChain: "arbitrum" },
  { id: "polygon",  label: "Polygon",  dex: "uniswap",     uniChain: "polygon"  },
];

function detectChain(ca) {
  const a = (ca || "").trim();
  if (!a) return null;
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return "evm";
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return "tron";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return "solana";
  return "other";
}

function buildBuyLinks(family, ca, evmChain) {
  const a = (ca || "").trim();
  if (!a) return [];
  if (family === "solana") {
    return [
      { key: "raydium", label: "Buy on Raydium", url: "https://raydium.io/swap/?inputMint=sol&outputMint=" + a },
      { key: "pumpfun", label: "Buy on Pump.fun", url: "https://pump.fun/coin/" + a },
    ];
  }
  if (family === "tron") {
    return [
      { key: "sunswap", label: "Copy CA & Buy on SunSwap", url: "https://sunswap.com", tron: true, ca: a },
    ];
  }
  if (family === "evm") {
    const chain = EVM_CHAINS.find((c) => c.id === evmChain);
    if (!chain) return [];
    if (chain.dex === "uniswap") {
      return [
        { key: "uniswap", label: "Buy on Uniswap", url: "https://app.uniswap.org/swap?chain=" + chain.uniChain + "&inputCurrency=ETH&outputCurrency=" + a },
      ];
    }
    if (chain.dex === "pancakeswap") {
      return [
        { key: "pancakeswap", label: "Buy on PancakeSwap", url: "https://pancakeswap.finance/swap?chain=bsc&outputCurrency=" + a },
      ];
    }
  }
  return [];
}

export default function ManagePage() {
  const { pageId } = useParams();
  const { connected, publicKey } = useWallet();
  const navigate = useNavigate();

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editContractAddress, setEditContractAddress] = useState("");
  const [originalCA, setOriginalCA] = useState("");
  const [editBuyChain, setEditBuyChain] = useState("");       // EVM chain pick (only used for EVM CAs)
  const [editTokenomics, setEditTokenomics] = useState({});
  const [editAvatar, setEditAvatar] = useState(null);
  const [editBanner, setEditBanner] = useState(null);
  const [editSocials, setEditSocials] = useState({});
  const [editTemplateId, setEditTemplateId] = useState("template_1");

  const [editShowTicker, setEditShowTicker] = useState(false);
  const [editShowChart, setEditShowChart] = useState(false);
  const [editShowBuyButtons, setEditShowBuyButtons] = useState(true); // buy buttons on by default
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
      setOriginalCA(c.contractAddress || "");
      setEditBuyChain(c.buyChain || "");
      setEditTokenomics(c.tokenomics || {});
      setEditSocials(c.socials || {});
      setEditTemplateId(p.template_id || "template_1");
      setEditShowTicker(c.showTicker || false);
      setEditShowChart(c.showChart || false);
      setEditShowBuyButtons(!c.hideBuyButtons);
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

  // Is the page currently live? Used to decide whether the CA limit applies.
  const nowSecTop = Math.floor(Date.now() / 1000);
  const pageIsActive = page && page.status === "active" && page.expires_at && page.expires_at > nowSecTop;

  // Which chain family the current contract address belongs to (null until typed).
  const detectedChain = detectChain(editContractAddress);

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
    // Contract-address change guard: if the page is live and the CA is actually
    // being changed, warn the user first (each change is limited and then locks).
    const caChanging = (editContractAddress || "").trim() !== (originalCA || "").trim();
    const nowSec = Math.floor(Date.now() / 1000);
    const pageActive = page && page.status === "active" && page.expires_at && page.expires_at > nowSec;
    if (caChanging && pageActive) {
      const used = Number(page.ca_changes_used || 0);
      const remainingBefore = 3 - used;
      if (remainingBefore <= 0) {
        setSaveMessage("Contract address is locked — no changes remaining.");
        return;
      }
      const afterThis = remainingBefore - 1;
      const msg = afterThis > 0
        ? "You're about to change the contract address. You'll have " + afterThis + " change" + (afterThis === 1 ? "" : "s") + " left after this. Are you sure it's correct?"
        : "This is your LAST allowed contract-address change. After saving, the contract address will be locked permanently. Are you absolutely sure it's correct?";
      if (!window.confirm(msg)) return;
    }

    setSaving(true);
    setSaveMessage("");
    try {
      // Build the finished buy links from (chain family + CA + chosen EVM chain).
      const builtLinks = buildBuyLinks(detectedChain, editContractAddress, editBuyChain);
      const filteredBuyLinks = Object.fromEntries(builtLinks.map((b) => [b.key, b.url]));
      const filteredTokenomics = Object.fromEntries(Object.entries(editTokenomics).filter(([, v]) => v && v.trim()));
      const filteredRoadmap = editRoadmap.filter((m) => m.title && m.title.trim());

      const content = {};
      if (editName) content.name = editName;
      if (editDescription) content.description = editDescription;
      if (editContractAddress) content.contractAddress = editContractAddress;
      content.buyLinks = filteredBuyLinks;
      if (detectedChain === "evm" && editBuyChain) content.buyChain = editBuyChain;
      if (Object.keys(filteredTokenomics).length > 0) content.tokenomics = filteredTokenomics;
      content.socials = Object.fromEntries(Object.entries(editSocials).filter(([, v]) => v && v.trim()));
      if (editContractAddress) content.showTicker = editShowTicker;
      if (editContractAddress) content.showChart = editShowChart;
      if (!editShowBuyButtons) content.hideBuyButtons = true;
      if (editCountdownDate) content.countdown = { date: editCountdownDate, label: editCountdownLabel || "Countdown" };
      if (filteredRoadmap.length > 0) content.roadmap = filteredRoadmap;

      const existing = JSON.parse(page.content_json || "{}");

      if (editAvatar?.file) {
        const form = new FormData();
        form.append("image", editAvatar.file);
        form.append("type", "avatar");
        const r = await axios.post("/api/media/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
        content.avatar = r.data.url;
      } else if (editAvatar?.preview) {
        // Existing image kept (no new file chosen) — preserve it.
        content.avatar = existing.avatar;
      } else {
        // Field was cleared by the user — send empty string so the backend removes it.
        content.avatar = "";
      }

      if (editBanner?.file) {
        const form = new FormData();
        form.append("image", editBanner.file);
        form.append("type", "banner");
        const r = await axios.post("/api/media/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
        content.banner = r.data.url;
      } else if (editBanner?.preview) {
        // Existing image kept (no new file chosen) — preserve it.
        content.banner = existing.banner;
      } else {
        // Field was cleared by the user — send empty string so the backend removes it.
        content.banner = "";
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

      {(
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
              {(() => {
                const nowSec = Math.floor(Date.now() / 1000);
                const pageActive = page && page.status === "active" && page.expires_at && page.expires_at > nowSec;
                const used = Number((page && page.ca_changes_used) || 0);
                const remaining = 3 - used;
                const locked = pageActive && remaining <= 0;
                return (
                  <>
                    <input
                      value={editContractAddress}
                      onChange={(e) => { if (!locked) setEditContractAddress(e.target.value); }}
                      readOnly={locked}
                      style={{ fontFamily: "monospace", fontSize: "12px", opacity: locked ? 0.6 : 1, cursor: locked ? "not-allowed" : "text" }}
                    />
                    {pageActive && !locked && (
                      <div style={{ fontSize: "11px", color: "#ffcc44", marginTop: "4px" }}>
                        ⚠️ The contract address locks after a limited number of changes. You have {remaining} change{remaining === 1 ? "" : "s"} remaining — please make sure it's correct.
                      </div>
                    )}
                    {locked && (
                      <div style={{ fontSize: "11px", color: "#ff6464", marginTop: "4px" }}>
                        🔒 The contract address is locked — you've used all available changes.
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div>
              <label>Buy Button</label>

              {!editContractAddress && (
                <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>
                  Add a contract address above and we'll set up the right buy button automatically.
                </div>
              )}

              {detectedChain === "solana" && (
                <div style={{ fontSize: "11px", color: "#14F195", marginTop: "6px" }}>
                  ✓ Solana — buyers get Raydium &amp; Pump.fun buttons.
                </div>
              )}

              {detectedChain === "tron" && (
                <div style={{ fontSize: "11px", color: "#14F195", marginTop: "6px" }}>
                  ✓ Tron — buyers get a one-tap button that copies your CA and opens SunSwap.
                </div>
              )}

              {detectedChain === "evm" && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "6px" }}>
                    Which chain is your token on?
                  </div>
                  <select
                    value={editBuyChain}
                    onChange={(e) => setEditBuyChain(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", fontSize: "13px", cursor: "pointer" }}
                  >
                    <option value="">Select your chain…</option>
                    {EVM_CHAINS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                  {editBuyChain && (
                    <div style={{ fontSize: "11px", color: "#14F195", marginTop: "6px" }}>
                      ✓ {EVM_CHAINS.find((c) => c.id === editBuyChain)?.label} — buyers get a{" "}
                      {EVM_CHAINS.find((c) => c.id === editBuyChain)?.dex === "pancakeswap" ? "PancakeSwap" : "Uniswap"} button.
                    </div>
                  )}
                </div>
              )}

              {detectedChain === "other" && (
                <div style={{ fontSize: "11px", color: "#ffcc44", marginTop: "6px" }}>
                  Buy buttons aren't available for this network yet — the DEXs we support don't list it. Buyers can still copy your contract address to trade manually.
                </div>
              )}

              {/* Preview of the actual buttons buyers will see */}
              {buildBuyLinks(detectedChain, editContractAddress, editBuyChain).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                  {buildBuyLinks(detectedChain, editContractAddress, editBuyChain).map((b) => (
                    <div key={b.key} style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(20,241,149,0.08)", border: "1px solid rgba(20,241,149,0.25)", borderRadius: "8px", padding: "10px 12px" }}>
                      <span style={{ fontSize: "13px", color: "#14F195", fontWeight: 600 }}>{b.label}</span>
                      <span style={{ fontSize: "10px", color: "#555" }}>▸ buyers land here</span>
                    </div>
                  ))}
                </div>
              )}
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
            <ImageUpload label="Banner" hint="Recommended 1200×480px · Max 5MB" value={editBanner} onChange={setEditBanner} />
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
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={editShowBuyButtons} onChange={(e) => setEditShowBuyButtons(e.target.checked)} style={{ width: "auto" }} />
                  <span style={{ fontSize: "14px" }}>Show buy buttons</span>
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
                        <input value={member.twitter} onChange={(e) => updateTeamMember(i, "twitter", e.target.value.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").replace(/^(x|twitter)\.com\//i, "").replace(/^@+/, ""))} placeholder="X / Twitter handle (optional)" />
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

      <div style={{ marginTop: "28px" }}>
        <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>Live Preview</div>
        <PagePreview
          data={{
            name: editName, description: editDescription, avatar: editAvatar, banner: editBanner,
            socials: editSocials, contractAddress: editContractAddress, buyChain: editBuyChain,
            tokenomics: editTokenomics, showTicker: editShowTicker, showChart: editShowChart, hideBuyButtons: !editShowBuyButtons,
            countdownDate: editCountdownDate, countdownLabel: editCountdownLabel,
            aboutText: editAboutText, team: editTeam, roadmap: editRoadmap,
          }}
          templateId={editTemplateId}
          debounceMs={1500}
        />
      </div>

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
