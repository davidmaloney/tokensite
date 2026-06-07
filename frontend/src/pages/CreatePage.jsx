import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SocialLinksInput from "../components/SocialLinksInput";
import ImageUpload from "../components/ImageUpload";
import TemplateSelector from "../components/TemplateSelector";
import PagePreview from "../components/PagePreview";
import PaymentModal from "../components/PaymentModal";

export default function CreatePage() {
  const { connected, publicKey } = useWallet();
  const navigate = useNavigate();

  const [showWarning, setShowWarning] = useState(true);
  const [step, setStep] = useState(1);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [buyLinks, setBuyLinks] = useState({ raydium: "", jupiter: "", pumpfun: "" });
  const [avatar, setAvatar] = useState(null);
  const [banner, setBanner] = useState(null);
  const [socials, setSocials] = useState({});
  const [templateId, setTemplateId] = useState("template_1");
  const [slugError, setSlugError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdPage, setCreatedPage] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

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
          <div style={{ fontSize: "36px", marginBottom: "16px" }}>🚀</div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "12px" }}>Before you launch</h2>
          <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.7, marginBottom: "20px" }}>
            Take a moment to get everything ready. Once your page is live, some things cannot be changed — so make sure your details are good to go before you hit launch.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px", textAlign: "left" }}>
            {[
              "Your slug is permanent — choose it carefully",
              "Everything else can be updated anytime",
              "Meme culture and crypto slang are totally welcome",
            ].map((item) => (
              <div key={item} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ color: "#9945FF", flexShrink: 0, marginTop: "2px" }}>●</span>
                <span style={{ fontSize: "13px", color: "#aaa", lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
          <button
            className="btn-primary"
            style={{ width: "100%", fontSize: "15px", padding: "13px" }}
            onClick={() => setShowWarning(false)}
          >
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
      const res = await axios.get(`/api/pages/check-slug/${slug}`);
      if (!res.data.available) setSlugError("That slug is already taken — try another!");
    } catch {
      setSlugError("Could not check availability right now.");
    }
  };

  const uploadImage = async (imageObj, type) => {
    if (!imageObj?.file) return null;
    const form = new FormData();
    form.append("image", imageObj.file);
    form.append("type", type);
    const res = await axios.post("/api/media/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.url;
  };

  const handleSubmit = async () => {
    const err = validateSlug(slug);
    if (err) { setSlugError(err); return; }
    setSubmitting(true);
    try {
      const avatarUrl = await uploadImage(avatar, "avatar");
      const bannerUrl = await uploadImage(banner, "banner");

      const filteredBuyLinks = Object.fromEntries(
        Object.entries(buyLinks).filter(([, v]) => v && v.trim())
      );

      const content = {};
      if (name) content.name = name;
      if (description) content.description = description;
      if (contractAddress) content.contractAddress = contractAddress;
      if (Object.keys(filteredBuyLinks).length > 0) content.buyLinks = filteredBuyLinks;
      if (avatarUrl) content.avatar = avatarUrl;
      if (bannerUrl) content.banner = bannerUrl;
      content.socials = Object.fromEntries(
        Object.entries(socials).filter(([, v]) => v && v.trim())
      );

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

  const STEPS = ["Info", "Media", "Socials", "Template", "Review"];

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "6px" }}>Create Your Page</h1>
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
        gridTemplateColumns: step === 5 ? "1fr 1fr" : "1fr",
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
                <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>
                  Your page: {slug || "yourslug"}.tokensite.fun
                </div>
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
                  placeholder="e.g. So11111111111111111111111111111111111111112"
                  style={{ fontFamily: "monospace", fontSize: "12px" }} />
                <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>Shows on your page with a copy button</div>
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
                      <input value={buyLinks[key]} onChange={(e) => setBuyLinks({ ...buyLinks, [key]: e.target.value })}
                        placeholder={placeholder} style={{ paddingLeft: pl }} />
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
              <ImageUpload label="Banner" hint="Recommended 1200×300px · Max 5MB" value={banner} onChange={setBanner} />
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
                <button className="btn-primary" onClick={() => setStep(5)}>Review →</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Almost there!</h2>
              <div style={{ fontSize: "13px", color: "#aaa" }}>
                <div>Page: <strong style={{ color: "#fff" }}>{slug}.tokensite.fun</strong></div>
                {name && <div style={{ marginTop: "4px" }}>Name: <strong style={{ color: "#fff" }}>{name}</strong></div>}
                {contractAddress && <div style={{ marginTop: "4px" }}>Contract: <strong style={{ color: "#9945FF", fontFamily: "monospace", fontSize: "11px" }}>{contractAddress.slice(0, 8)}…{contractAddress.slice(-8)}</strong></div>}
                <div style={{ marginTop: "4px" }}>Template: <strong style={{ color: "#fff" }}>{templateId}</strong></div>
              </div>

              <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(255,204,68,0.08)", border: "1px solid rgba(255,204,68,0.2)", fontSize: "12px", color: "#ffcc44" }}>
                ⚡ Your page stays live as long as it's topped up. If you don't renew within 30 days of expiry, the slug gets released.
              </div>

              <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "12px", color: "#888" }}>
                📋 No illegal content — racism, explicit material or extremist content will result in permanent deletion. Crypto slang and meme culture are totally fine.
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-secondary" onClick={() => setStep(4)}>← Back</button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Creating…" : "Let's go →"}
                </button>
              </div>
            </div>
          )}
        </div>

        {step === 5 && (
          <div>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "10px" }}>Preview</div>
            <PagePreview data={{ name, description, avatar, banner, socials }} templateId={templateId} />
          </div>
        )}
      </div>

      {showPayment && createdPage && (
        <PaymentModal
          pageId={createdPage.id}
          slug={createdPage.slug}
          onClose={() => { setShowPayment(false); navigate(`/manage/${createdPage.id}`); }}
          onActivated={() => { setTimeout(() => navigate(`/manage/${createdPage.id}`), 2000); }}
        />
      )}
    </div>
  );
}
