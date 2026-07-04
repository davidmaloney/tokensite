import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SocialLinksInput from "../components/SocialLinksInput";
import ImageUpload from "../components/ImageUpload";
import TemplateSelector from "../components/TemplateSelector";
import PagePreview from "../components/PagePreview";
import PaymentModal from "../components/PaymentModal";

// Each buy button belongs to one or more address "families" (chains). We detect
// the family from the contract address the user typed (see detectChain below) and
// only enable the buttons that can actually work for it — the rest are greyed out.
// "chains" lists which detected families this button supports.
const BUY_LINK_TYPES = [
  {
    key: "raydium",
    label: "Raydium",
    prefix: "https://raydium.io/swap/?inputMint=sol&outputMint=",
    placeholder: "CA",
    hint: "Solana — Enter your token CA",
    chains: ["solana"],
  },
  {
    key: "pumpfun",
    label: "Pump.fun",
    prefix: "https://pump.fun/coin/",
    placeholder: "CA",
    hint: "Solana — Enter your token CA",
    chains: ["solana"],
  },
  {
    key: "uniswap",
    label: "Uniswap",
    // Uniswap web app now supports EVM chains AND Solana. The #/ hash route is
    // required for the token to pre-fill. We append the outputCurrency at save time.
    prefix: "https://app.uniswap.org/#/swap?outputCurrency=",
    placeholder: "0x... or Solana CA",
    hint: "Ethereum / Base / Arbitrum / Polygon / Solana — Enter your token address",
    chains: ["evm", "solana"],
  },
  {
    key: "pancakeswap",
    label: "PancakeSwap",
    // BSC. inputCurrency=BNB + chain=bsc makes the swap box pre-fill reliably.
    prefix: "https://pancakeswap.finance/swap?chain=bsc&inputCurrency=BNB&outputCurrency=",
    placeholder: "0x...",
    hint: "BSC — Enter your token address",
    chains: ["evm"],
  },
  {
    key: "sushiswap",
    label: "SushiSwap",
    // Sushi puts the chain in the path. Defaulting to Ethereum; users can switch
    // network on the Sushi page if their token is on another EVM chain.
    prefix: "https://www.sushi.com/ethereum/swap?token1=",
    placeholder: "0x...",
    hint: "Ethereum & other EVM chains — Enter your token address",
    chains: ["evm"],
  },
  {
    key: "sunswap",
    label: "SunSwap",
    // Tron's main DEX (Uniswap fork). Likely pre-fills via outputCurrency; if not,
    // it still opens SunSwap where the user can paste the CA.
    prefix: "https://sunswap.com/#/?outputCurrency=",
    placeholder: "T...",
    hint: "Tron — Enter your token address",
    chains: ["tron"],
  },
];

// Detect the address "family" from the contract address, using the same formats
// the backend validates. Returns "solana" | "evm" | "tron" | "other" | null.
// null = nothing typed yet (buttons stay available but inert until a CA exists).
function detectChain(ca) {
  const a = (ca || "").trim();
  if (!a) return null;
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return "evm";            // Ethereum/BSC/Base/etc
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return "tron";   // Tron
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return "solana"; // Solana base58
  return "other";                                             // Sui/Aptos/unknown
}

export default function CreatePage() {
  const { connected, publicKey } = useWallet();
  const navigate = useNavigate();

  const [showWarning, setShowWarning] = useState(true);
  const [step, setStep] = useState(1);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [buyLinks, setBuyLinks] = useState({ raydium: "", pumpfun: "", uniswap: "", pancakeswap: "", sushiswap: "", sunswap: "" });
  const [tokenomics, setTokenomics] = useState({});
  const [avatar, setAvatar] = useState(null);
  const [banner, setBanner] = useState(null);
  const [socials, setSocials] = useState({});
  const [templateId, setTemplateId] = useState("template_1");
  const [slugError, setSlugError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdPage, setCreatedPage] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  const [showTicker, setShowTicker] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [countdownDate, setCountdownDate] = useState("");
  const [countdownLabel, setCountdownLabel] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [team, setTeam] = useState([{ name: "", role: "", twitter: "", photo: null }]);
  const [roadmap, setRoadmap] = useState([{ title: "", description: "", status: "upcoming" }]);

  if (!connected) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "#888" }}>
        Connect your wallet to get started.
      </div>
    );
  }

  if (showWarning) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "calc(100vh - 64px)", padding: "24px",
      }}>
        <div className="glass" style={{
          borderRadius: "16px", padding: "32px", maxWidth: "440px", width: "100%",
          border: "1px solid rgba(153,69,255,0.2)",
          boxShadow: "0 0 40px rgba(153,69,255,0.08)",
          textAlign: "center",
        }}>
          <button onClick={() => navigate("/")}
            style={{ background: "none", border: "none", color: "#9945FF", cursor: "pointer", fontSize: "13px", fontWeight: 600, marginBottom: "16px", display: "block" }}>
            ← Back to Dashboard
          </button>
          <div style={{ fontSize: "36px", marginBottom: "16px" }}>🚀</div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "12px" }}>A few things to get right</h2>
          <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.7, marginBottom: "20px" }}>
            Everything on your page is optional and can be edited freely before you activate. Just three things are worth double-checking, because they settle once your page goes live.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px", textAlign: "left" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ color: "#9945FF", flexShrink: 0, marginTop: "2px" }}>●</span>
              <span style={{ fontSize: "13px", color: "#aaa", lineHeight: 1.5 }}>
                <strong style={{ color: "#fff" }}>Your slug is permanent.</strong> The web address you choose can't be changed once the page is created.
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ color: "#9945FF", flexShrink: 0, marginTop: "2px" }}>●</span>
              <span style={{ fontSize: "13px", color: "#aaa", lineHeight: 1.5 }}>
                <strong style={{ color: "#fff" }}>Your contract address settles when you go live.</strong> Change it freely while your page is a draft — whatever's set when you activate is locked in. After that you get three changes in the editor to fix it, then it's final. No pressure: you can leave it untouched for as long as you like.
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ color: "#9945FF", flexShrink: 0, marginTop: "2px" }}>●</span>
              <span style={{ fontSize: "13px", color: "#aaa", lineHeight: 1.5 }}>
                <strong style={{ color: "#fff" }}>Your buy links work the same way.</strong> Edit them freely before activating; whatever's set when you go live is locked in. After that you get three changes shared across all your buy buttons, then they're final — so give them a quick check.
              </span>
            </div>
          </div>
          <button className="btn-primary" style={{ width: "100%", fontSize: "15px", padding: "13px" }}
            onClick={() => setShowWarning(false)}>
            Let's build it →
          </button>
        </div>
      </div>
    );
  }

  const validateSlug = (val) => {
    if (!val) return "Slug is required";
    if (!/^[a-z0-9-]{2,40}$/.test(val))
      return "Lowercase letters, numbers and hyphens only. 2–40 characters.";
    return "";
  };

  const handleSlugChange = (val) => {
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSlugError("");
  };

  const handleSlugBlur = async () => {
    const err = validateSlug(slug);
    if (err) { setSlugError(err); return; }
    try {
      const res = await axios.get("/api/pages/check-slug/" + slug);
      if (!res.data.available) setSlugError(res.data.reason || "That slug is not available — try another!");
    } catch {
      setSlugError("Could not check availability right now.");
    }
  };

  const uploadImage = async (imageObj, type) => {
    if (!imageObj?.file) return null;
    const form = new FormData();
    form.append("image", imageObj.file);
    form.append("type", type);
    const res = await axios.post("/api/media/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
    return res.data.url;
  };

  const getBuyLinkDisplay = (key) => {
    const type = BUY_LINK_TYPES.find((t) => t.key === key);
    if (!type) return buyLinks[key];
    const full = buyLinks[key] || "";
    return full.startsWith(type.prefix) ? full.slice(type.prefix.length) : full;
  };

  const setBuyLinkDisplay = (key, val) => {
    const type = BUY_LINK_TYPES.find((t) => t.key === key);
    if (!type) return;
    setBuyLinks({ ...buyLinks, [key]: val ? type.prefix + val.replace(type.prefix, "") : "" });
  };

  const addTeamMember = () => {
    if (team.length < 4) setTeam([...team, { name: "", role: "", twitter: "", photo: null }]);
  };

  const updateTeamMember = (i, field, val) => {
    const updated = [...team];
    updated[i][field] = val;
    setTeam(updated);
  };

  const removeTeamMember = (i) => {
    setTeam(team.filter((_, idx) => idx !== i));
  };

  const addMilestone = () => {
    if (roadmap.length < 8) setRoadmap([...roadmap, { title: "", description: "", status: "upcoming" }]);
  };

  const updateMilestone = (i, field, val) => {
    const updated = [...roadmap];
    updated[i][field] = val;
    setRoadmap(updated);
  };

  const removeMilestone = (i) => {
    setRoadmap(roadmap.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    const err = validateSlug(slug);
    if (err) { setSlugError(err); return; }
    setSubmitting(true);

    try {
      const [avatarUrl, bannerUrl] = await Promise.all([
        uploadImage(avatar, "avatar"),
        uploadImage(banner, "banner"),
      ]);

      // Keep only buy links that are non-empty AND belong to a button that matches
      // the detected chain — so a link left over from a different chain (if the user
      // changed the CA) is never saved.
      const filteredBuyLinks = Object.fromEntries(
        Object.entries(buyLinks).filter(([k, v]) => {
          if (!v || !v.trim()) return false;
          const def = BUY_LINK_TYPES.find((t) => t.key === k);
          if (!def) return false;
          return detectedChain === null || def.chains.includes(detectedChain);
        })
      );
      const filteredTokenomics = Object.fromEntries(Object.entries(tokenomics).filter(([, v]) => v && v.trim()));

      // Upload each team member's photo (if any), then build the clean team array.
      const teamWithPhotos = await Promise.all(
        team
          .filter((m) => m.name && m.name.trim())
          .map(async (m) => {
            const member = { name: m.name, role: m.role };
            if (m.twitter && m.twitter.trim()) member.twitter = m.twitter.trim();
            if (m.photo?.file) {
              const photoUrl = await uploadImage(m.photo, "avatar");
              if (photoUrl) member.photo = photoUrl;
            } else if (typeof m.photo === "string" && m.photo) {
              member.photo = m.photo;
            }
            return member;
          })
      );
      const filteredTeam = teamWithPhotos;
      const filteredRoadmap = roadmap.filter((m) => m.title && m.title.trim());

      const content = {};
      if (name) content.name = name;
      if (description) content.description = description;
      if (contractAddress) content.contractAddress = contractAddress;
      if (Object.keys(filteredBuyLinks).length > 0) content.buyLinks = filteredBuyLinks;
      if (Object.keys(filteredTokenomics).length > 0) content.tokenomics = filteredTokenomics;
      if (avatarUrl) content.avatar = avatarUrl;
      if (bannerUrl) content.banner = bannerUrl;
      content.socials = Object.fromEntries(Object.entries(socials).filter(([, v]) => v && v.trim()));
      if (contractAddress && showTicker) content.showTicker = true;
      if (contractAddress && showChart) content.showChart = true;
      if (countdownDate) content.countdown = { date: countdownDate, label: countdownLabel || "Countdown" };
      if (aboutText.trim() || filteredTeam.length > 0) content.about = { text: aboutText, team: filteredTeam };
      if (filteredRoadmap.length > 0) content.roadmap = filteredRoadmap;

      const res = await axios.post("/api/pages", {
        walletAddress: publicKey.toString(),
        slug,
        templateId,
        content,
      });

      setCreatedPage(res.data.page);
      setShowPayment(true);
    } catch (err) {
      alert(err.response?.data?.error || "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  const STEPS = ["Info", "Media", "Socials", "Template", "Extras", "Review"];

  const TOKENOMICS_FIELDS = [
    { key: "totalSupply", label: "Total Supply", hint: "e.g. 1,000,000,000" },
    { key: "tax", label: "Buy/Sell Tax", hint: "e.g. 0% / 0%" },
    { key: "liquidity", label: "Liquidity", hint: "e.g. Locked on Raydium" },
    { key: "renounced", label: "Contract Renounced", hint: "Yes or No" },
    { key: "launchDate", label: "Launch Date", hint: "e.g. June 2025" },
    { key: "network", label: "Network", hint: "e.g. Solana" },
  ];

  // Which chain family the typed contract address belongs to (null until typed).
  const detectedChain = detectChain(contractAddress);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800 }}>Create Your Page</h1>
        <button onClick={() => navigate("/")}
          style={{ background: "none", border: "none", color: "#9945FF", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
          ← Dashboard
        </button>
      </div>
      <p style={{ fontSize: "13px", color: "#666", marginBottom: "28px" }}>
        Everything is optional except your slug. Fill in as much or as little as you like.
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "28px", flexWrap: "wrap" }}>
        {STEPS.map((s, i) => (
          <div key={s} onClick={() => i + 1 < step && setStep(i + 1)} style={{
            padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
            cursor: i + 1 < step ? "pointer" : "default",
            background: step === i + 1 ? "linear-gradient(135deg, #9945FF, #14F195)" : step > i + 1 ? "rgba(20,241,149,0.1)" : "rgba(255,255,255,0.05)",
            color: step === i + 1 ? "#000" : step > i + 1 ? "#14F195" : "#555",
            border: step > i + 1 ? "1px solid rgba(20,241,149,0.3)" : "1px solid transparent",
          }}>
            {step > i + 1 ? "✓ " : ""}{s}
          </div>
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "24px", alignItems: "start",
      }}>
        <div className="glass" style={{ borderRadius: "12px", padding: "24px" }}>

          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Basic Info</h2>
              <div>
                <label>Slug (your subdomain) *</label>
                <input value={slug} onChange={(e) => handleSlugChange(e.target.value)} onBlur={handleSlugBlur} placeholder="e.g. pepecoin" />
                {slugError && <div style={{ color: "#ff6464", fontSize: "12px", marginTop: "4px" }}>{slugError}</div>}
                <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>Your page: {slug || "yourslug"}.shillit.fun</div>
              </div>
              <div>
                <label>Project Name <span style={{ color: "#555" }}>(optional)</span></label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PepeCoin" />
              </div>
              <div>
                <label>Description <span style={{ color: "#555" }}>(optional)</span></label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell people what your project is about…" rows={4} style={{ resize: "vertical" }} />
              </div>
              <div>
                <label>Contract Address <span style={{ color: "#555" }}>(optional)</span></label>
                <input value={contractAddress} onChange={(e) => setContractAddress(e.target.value)}
                  placeholder="e.g. 0x... or Solana CA"
                  style={{ fontFamily: "monospace", fontSize: "12px" }} />
                <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>Supports Solana, Ethereum, BSC, Base, Tron and more</div>
              </div>
              <div>
                <label>Buy Links <span style={{ color: "#555" }}>(optional)</span></label>
                {detectedChain === "other" && (
                  <div style={{ fontSize: "11px", color: "#ffcc44", marginTop: "4px" }}>
                    Buy buttons aren't available for this network yet — the DEXs we support don't list it.
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "6px" }}>
                  {BUY_LINK_TYPES.map(({ key, label, prefix, placeholder, hint, chains }) => {
                    // A button is usable when no CA is typed yet (detectedChain null),
                    // or when the detected chain is one this button supports.
                    const usable = detectedChain === null || chains.includes(detectedChain);
                    return (
                      <div key={key} style={{ opacity: usable ? 1 : 0.4 }}>
                        <div style={{ fontSize: "12px", color: usable ? "#14F195" : "#666", marginBottom: "4px", fontWeight: 600 }}>
                          {label}{!usable && <span style={{ color: "#666", fontWeight: 400 }}> — not for this chain</span>}
                        </div>
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
                            onChange={(e) => { if (usable) setBuyLinkDisplay(key, e.target.value); }}
                            readOnly={!usable}
                            placeholder={placeholder}
                            style={{
                              border: "none",
                              background: "transparent",
                              flex: 1,
                              padding: "10px 12px",
                              fontSize: "13px",
                              outline: "none",
                              color: "#fff",
                              cursor: usable ? "text" : "not-allowed",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: "11px", color: "#555", marginTop: "4px", paddingLeft: "2px" }}>{hint}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <label>Tokenomics <span style={{ color: "#555" }}>(optional)</span></label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                  {TOKENOMICS_FIELDS.map(({ key, label, hint }) => (
                    <div key={key}>
                      <div style={{ fontSize: "11px", color: "#9945FF", marginBottom: "3px", fontWeight: 600 }}>{label}</div>
                      <input value={tokenomics[key] || ""} onChange={(e) => setTokenomics({ ...tokenomics, [key]: e.target.value })} placeholder={hint} />
                    </div>
                  ))}
                </div>
              </div>
              <button className="btn-primary" style={{ marginTop: "8px" }}
                onClick={() => { const err = validateSlug(slug); if (err) { setSlugError(err); return; } setStep(2); }}>
                Next →
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Media</h2>
              <ImageUpload label="Avatar" hint="Recommended 400×400px · Max 2MB" value={avatar} onChange={setAvatar} />
              <ImageUpload label="Banner" hint="Recommended 1200×480px · Max 5MB" value={banner} onChange={setBanner} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(3)}>Next →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Social Links</h2>
              <p style={{ fontSize: "13px", color: "#888" }}>All optional. Add whichever apply to your project.</p>
              <SocialLinksInput value={socials} onChange={setSocials} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(4)}>Next →</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Pick a Template</h2>
              <TemplateSelector value={templateId} onChange={setTemplateId} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-secondary" onClick={() => setStep(3)}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(5)}>Next →</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Extras <span style={{ fontSize: "13px", color: "#666", fontWeight: 400 }}>(all optional)</span></h2>

              {contractAddress && (
                <div className="glass" style={{ borderRadius: "10px", padding: "16px", border: "1px solid rgba(153,69,255,0.2)" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px", color: "#9945FF" }}>Live Data</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                      <input type="checkbox" checked={showTicker} onChange={(e) => setShowTicker(e.target.checked)} style={{ width: "auto" }} />
                      <span style={{ fontSize: "14px" }}>Show live price ticker</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                      <input type="checkbox" checked={showChart} onChange={(e) => setShowChart(e.target.checked)} style={{ width: "auto" }} />
                      <span style={{ fontSize: "14px" }}>Show price chart</span>
                    </label>
                  </div>
                </div>
              )}

              {!contractAddress && (
                <div style={{ fontSize: "12px", color: "#555", padding: "10px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                  Add a contract address in Step 1 to enable live price ticker and chart
                </div>
              )}

              <div className="glass" style={{ borderRadius: "10px", padding: "16px", border: "1px solid rgba(153,69,255,0.2)" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px", color: "#9945FF" }}>Countdown Timer</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <label>Label <span style={{ color: "#555" }}>(e.g. Token Launch, Presale Ends)</span></label>
                    <input value={countdownLabel} onChange={(e) => setCountdownLabel(e.target.value.slice(0, 30))} placeholder="Token Launch" />
                  </div>
                  <div>
                    <label>Target Date & Time</label>
                    <input type="datetime-local" value={countdownDate} onChange={(e) => setCountdownDate(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="glass" style={{ borderRadius: "10px", padding: "16px", border: "1px solid rgba(153,69,255,0.2)" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px", color: "#9945FF" }}>About & Team</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label>About text <span style={{ color: "#555" }}>(max 500 chars)</span></label>
                    <textarea value={aboutText} onChange={(e) => setAboutText(e.target.value.slice(0, 500))}
                      placeholder="Tell your story…" rows={3} style={{ resize: "vertical" }} />
                    <div style={{ fontSize: "11px", color: "#555", marginTop: "2px" }}>{aboutText.length}/500</div>
                  </div>
                  <div>
                    <label>Team Members <span style={{ color: "#555" }}>(max 4)</span></label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                      {team.map((member, i) => (
                        <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <div style={{ fontSize: "12px", color: "#9945FF", fontWeight: 600 }}>Member {i + 1}</div>
                            {team.length > 1 && (
                              <button onClick={() => removeTeamMember(i)} style={{ background: "none", border: "none", color: "#ff6464", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <input value={member.name} onChange={(e) => updateTeamMember(i, "name", e.target.value)} placeholder="Name" />
                            <input value={member.role} onChange={(e) => updateTeamMember(i, "role", e.target.value)} placeholder="Role (e.g. Developer)" />
                            <input value={member.twitter} onChange={(e) => updateTeamMember(i, "twitter", e.target.value.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, "").replace(/^(x|twitter)\.com\//i, "").replace(/^@+/, ""))} placeholder="X / Twitter handle (optional)" />
                            <ImageUpload label="Photo" hint="Optional · square works best · Max 2MB" value={member.photo} onChange={(val) => updateTeamMember(i, "photo", val)} />
                          </div>
                        </div>
                      ))}
                      {team.length < 4 && (
                        <button className="btn-secondary" style={{ fontSize: "12px" }} onClick={addTeamMember}>+ Add Team Member</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass" style={{ borderRadius: "10px", padding: "16px", border: "1px solid rgba(153,69,255,0.2)" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px", color: "#9945FF" }}>Roadmap <span style={{ fontSize: "11px", color: "#555", fontWeight: 400 }}>(max 8 milestones)</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {roadmap.map((item, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <div style={{ fontSize: "12px", color: "#9945FF", fontWeight: 600 }}>Milestone {i + 1}</div>
                        {roadmap.length > 1 && (
                          <button onClick={() => removeMilestone(i)} style={{ background: "none", border: "none", color: "#ff6464", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <input value={item.title} onChange={(e) => updateMilestone(i, "title", e.target.value.slice(0, 40))} placeholder="Milestone title (max 40 chars)" />
                        <input value={item.description} onChange={(e) => updateMilestone(i, "description", e.target.value.slice(0, 100))} placeholder="Short description (max 100 chars)" />
                        <select value={item.status} onChange={(e) => updateMilestone(i, "status", e.target.value)}>
                          <option value="upcoming">⚪ Upcoming</option>
                          <option value="inprogress">🔵 In Progress</option>
                          <option value="completed">✅ Completed</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {roadmap.length < 8 && (
                    <button className="btn-secondary" style={{ fontSize: "12px" }} onClick={addMilestone}>+ Add Milestone</button>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-secondary" onClick={() => setStep(4)}>← Back</button>
                <button className="btn-primary" onClick={() => setStep(6)}>Review →</button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Almost there!</h2>
              <div style={{ fontSize: "13px", color: "#aaa" }}>
                <div>Page: <strong style={{ color: "#fff" }}>{slug}.shillit.fun</strong></div>
                {name && <div style={{ marginTop: "4px" }}>Name: <strong style={{ color: "#fff" }}>{name}</strong></div>}
                {contractAddress && <div style={{ marginTop: "4px" }}>Contract: <strong style={{ color: "#9945FF", fontFamily: "monospace", fontSize: "11px" }}>{contractAddress.slice(0, 8)}…{contractAddress.slice(-8)}</strong></div>}
                <div style={{ marginTop: "4px" }}>Template: <strong style={{ color: "#fff" }}>{templateId}</strong></div>
                {showTicker && <div style={{ marginTop: "4px", color: "#14F195" }}>✓ Live price ticker enabled</div>}
                {showChart && <div style={{ marginTop: "4px", color: "#14F195" }}>✓ Price chart enabled</div>}
                {countdownDate && <div style={{ marginTop: "4px", color: "#14F195" }}>✓ Countdown timer set</div>}
                {(aboutText || team.filter(m => m.name).length > 0) && <div style={{ marginTop: "4px", color: "#14F195" }}>✓ About section added</div>}
                {roadmap.filter(m => m.title).length > 0 && <div style={{ marginTop: "4px", color: "#14F195" }}>✓ Roadmap with {roadmap.filter(m => m.title).length} milestones</div>}
              </div>

              <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(255,204,68,0.08)", border: "1px solid rgba(255,204,68,0.2)", fontSize: "12px", color: "#ffcc44" }}>
                ⚡ Your page stays live as long as it's topped up. Page is permanently deleted on expiry.
              </div>

              <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "12px", color: "#888" }}>
                📋 No illegal content — racism, explicit material or extremist content will result in permanent deletion.
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-secondary" onClick={() => setStep(5)}>← Back</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Creating…" : "Let's go →"}
                </button>
              </div>
            </div>
          )}
        </div>

        {step === 6 && (
          <div>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "10px" }}>Preview</div>
            <PagePreview
              data={{ name, description, avatar, banner, socials, contractAddress, buyLinks, tokenomics, showTicker, showChart, countdownDate, countdownLabel, aboutText, team, roadmap }}
              templateId={templateId}
            />
          </div>
        )}
      </div>

      {showPayment && createdPage && (
        <PaymentModal
          pageId={createdPage.id}
          slug={createdPage.slug}
          onClose={() => { setShowPayment(false); navigate("/manage/" + createdPage.id); }}
          onActivated={() => { setTimeout(() => navigate("/manage/" + createdPage.id), 2000); }}
        />
      )}
    </div>
  );
}
