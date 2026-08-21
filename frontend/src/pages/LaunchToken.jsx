import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import ImageUpload from "../components/ImageUpload";
import { LAUNCH_CONFIG, LAUNCH_ENABLED, PLATFORM_ID } from "../config/launchConfig.js";
import { launchToken, getSolPrice } from "../lib/raydiumLaunch.js";

const PURPLE = "#9945FF", GREEN = "#14F195";
const grad = `linear-gradient(135deg, ${PURPLE}, ${GREEN})`;

export default function LaunchToken() {
  const wallet = useWallet();
  const { connected } = wallet;
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [solPrice, setSolPrice] = useState(0);

  useEffect(() => { getSolPrice().then(setSolPrice); }, []);

  if (!LAUNCH_ENABLED) {
    return (
      <div style={s.wrap}>
        <div style={s.notLive}>This feature isn't live yet.</div>
      </div>
    );
  }

  const cfg = LAUNCH_CONFIG;
  const targetSol = solPrice ? Math.round(cfg.targetUsd / solPrice) : "…";

  async function handleLaunch() {
    setBusy(true); setResult(null); setStatus("");
    try {
      if (!name.trim()) throw new Error("Add a token name to continue.");
      if (!ticker.trim()) throw new Error("Add a ticker to continue.");
      const price = solPrice || (await getSolPrice());
      if (!price) throw new Error("Couldn't reach the SOL price feed. Try again in a moment.");
      const res = await launchToken({
        wallet, name: name.trim(), symbol: ticker.trim(),
        uri: "https://arweave.net/placeholder",
        solPrice: price,
        onStatus: setStatus,
      });
      setResult(res);
      setStatus("");
    } catch (e) {
      setStatus("Error: " + (e.message || String(e)));
    } finally { setBusy(false); }
  }

  return (
    <div style={s.wrap}>
      <div style={s.inner}>

        {/* HERO */}
        <div style={s.eyebrow}>SHILLIT LAUNCH</div>
        <h1 style={s.h1}>
          Launch a token<br/>
          <span style={s.h1grad}>built to outlast the first minute.</span>
        </h1>
        <p style={s.sub}>
          Most launches are won by whoever's fastest in the opening seconds — and everyone
          after is exit liquidity. This one is built the other way around: a calm start,
          a deep pool, and the real move saved for the open market.
        </p>

        {/* THE DEV DEAL — lead with what they get */}
        <div style={s.dealRow}>
          <div style={s.dealBig}>
            <div style={s.dealPct}>5%</div>
            <div style={s.dealPctLabel}>of total supply, gifted to you</div>
          </div>
          <div style={s.dealText}>
            <strong style={{color:"#fff"}}>Locked 3 years, then vested over 3 more.</strong>{" "}
            It's yours — but time-locked, so the market can see from day one that you're
            not here to dump. That lock is the most valuable thing you bring to your own launch.
          </div>
        </div>

        {/* TWO COLUMN: story + form */}
        <div style={s.cols}>

          {/* LEFT — how it works, as a real sequence */}
          <div style={s.col}>
            <Step n="01" title="Build your holders on a calm curve">
              The price climbs only ~20% across the whole bonding phase. No first-minute
              spike to chase, which gives your token time to gather real holders and attention
              instead of snipers.
            </Step>
            <Step n="02" title={`Graduate at $${cfg.targetUsd.toLocaleString()}`}>
              Once buys reach the target (~{targetSol} SOL), the bonding curve ends and your
              token migrates to a normal AMM pool automatically.
            </Step>
            <Step n="03" title="45% of supply seeds a deep pool">
              Nearly half the supply plus every SOL raised is saved for that pool — real depth,
              not spent inflating an early chart that fades.
            </Step>
            <Step n="04" title="The flat curve is gone" last>
              After graduation the ~20% ceiling is lifted. On the open market, the same buying
              can move the price far faster — you're early to the part that matters.
            </Step>
          </div>

          {/* RIGHT — the form */}
          <div style={s.col}>
            <div style={s.card}>
              <div style={s.cardTitle}>Your token</div>

              <Field label="Token name" value={name} onChange={setName} placeholder="e.g. Good Dog" />
              <Field label="Ticker" value={ticker} onChange={(v)=>setTicker(v.toUpperCase())} placeholder="e.g. GDOG" maxLength={10} />

              <label style={s.label}>Coin logo</label>
              <ImageUpload
                label=""
                hint="This is the face of your coin — shown in wallets, on Raydium and DexScreener."
                value={logoPreview}
                onChange={(img)=>setLogoPreview(img ? img.preview : "")}
              />

              <div style={s.tokenomics}>
                <span>1B supply</span><span style={s.dot}>·</span>
                <span>50% curve</span><span style={s.dot}>·</span>
                <span>45% pool</span><span style={s.dot}>·</span>
                <span>5% you, locked</span>
              </div>

              {!connected ? (
                <div style={{marginTop:18}}><WalletMultiButton style={s.btn} /></div>
              ) : (
                <button onClick={handleLaunch} disabled={busy}
                  style={{...s.btn, marginTop:18, opacity:busy?0.65:1, cursor:busy?"wait":"pointer"}}>
                  {busy ? "Launching…" : "Launch token"}
                </button>
              )}

              {connected && (
                <div style={s.buyNote}>
                  You can buy your own token at launch, in the same wallet, exactly like any
                  other buyer — no special access, no head start.
                </div>
              )}

              {!PLATFORM_ID && (
                <p style={s.warn}>Platform not configured yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* STATUS */}
        {status && (
          <div style={{...s.status, color: status.startsWith("Error") ? "#ff6b6b" : GREEN}}>
            {status.startsWith("Error") ? status : `${status}`}
          </div>
        )}

        {/* RESULT */}
        {result && (
          <div style={s.result}>
            <div style={s.resultHead}>Your token is live.</div>
            <div style={s.resultRow}><span style={s.resultKey}>Name</span><span>{name} ({ticker})</span></div>
            <div style={s.resultRow}><span style={s.resultKey}>Mint</span><span style={s.mono}>{result.mint}</span></div>
            {result.txId && <div style={s.resultRow}><span style={s.resultKey}>Transaction</span><span style={s.mono}>{result.txId}</span></div>}
            <a href={`https://solscan.io/token/${result.mint}`} target="_blank" rel="noreferrer" style={s.solscan}>
              View on Solscan →
            </a>
          </div>
        )}

        <p style={s.legal}>
          A launch tool — not investment advice. Crypto is volatile and you can lose money.
          Always do your own research.
        </p>
      </div>
    </div>
  );
}

/* ---------- little components ---------- */
function Step({ n, title, children, last }) {
  return (
    <div style={{...st.step, borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.07)"}}>
      <div style={st.stepN}>{n}</div>
      <div>
        <div style={st.stepTitle}>{title}</div>
        <div style={st.stepBody}>{children}</div>
      </div>
    </div>
  );
}
function Field({ label, value, onChange, placeholder, maxLength }) {
  return (
    <div style={{marginBottom:16}}>
      <label style={st.fieldLabel}>{label}</label>
      <input value={value} maxLength={maxLength} placeholder={placeholder}
        onChange={(e)=>onChange(e.target.value)} style={st.input}
        onFocus={(e)=>e.target.style.borderColor=GREEN}
        onBlur={(e)=>e.target.style.borderColor="rgba(255,255,255,0.12)"} />
    </div>
  );
}

/* ---------- styles ---------- */
const s = {
  wrap: { minHeight:"100vh", background:"#0d0d0d", color:"#f0f0f0", padding:"48px 20px",
    fontFamily:"Inter, system-ui, sans-serif" },
  inner: { maxWidth:960, margin:"0 auto", width:"100%" },
  notLive: { textAlign:"center", color:"#666", marginTop:100, fontSize:15 },
  eyebrow: { fontSize:12, letterSpacing:3, color:GREEN, fontWeight:700, marginBottom:16 },
  h1: { fontSize:"clamp(30px, 6vw, 52px)", fontWeight:800, lineHeight:1.08, margin:"0 0 20px",
    letterSpacing:-1 },
  h1grad: { background:grad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
  sub: { fontSize:"clamp(15px, 2vw, 18px)", color:"#9a9a9a", lineHeight:1.6, maxWidth:620,
    margin:"0 0 40px" },
  dealRow: { display:"flex", gap:24, flexWrap:"wrap", alignItems:"center", padding:"28px",
    borderRadius:18, background:"linear-gradient(135deg, rgba(153,69,255,0.12), rgba(20,241,149,0.08))",
    border:"1px solid rgba(255,255,255,0.08)", marginBottom:48 },
  dealBig: { flex:"0 0 auto" },
  dealPct: { fontSize:64, fontWeight:800, lineHeight:1, background:grad,
    WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
  dealPctLabel: { fontSize:13, color:"#9a9a9a", marginTop:6, maxWidth:160 },
  dealText: { flex:"1 1 320px", fontSize:15, color:"#b8b8b8", lineHeight:1.6 },
  cols: { display:"flex", gap:32, flexWrap:"wrap", alignItems:"flex-start" },
  col: { flex:"1 1 360px", minWidth:300 },
  card: { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.09)",
    borderRadius:18, padding:24 },
  cardTitle: { fontSize:13, letterSpacing:2, color:"#777", fontWeight:700, marginBottom:20,
    textTransform:"uppercase" },
  label: { display:"block", color:"#aaa", fontSize:13, marginBottom:8, marginTop:4 },
  tokenomics: { display:"flex", flexWrap:"wrap", gap:8, alignItems:"center", justifyContent:"center",
    margin:"22px 0 4px", fontSize:13, color:"#8a8a8a" },
  dot: { color:"#444" },
  btn: { width:"100%", background:grad, color:"#000", fontWeight:800, fontSize:15,
    borderRadius:12, border:"none", height:52, cursor:"pointer" },
  buyNote: { marginTop:14, fontSize:12.5, color:"#777", lineHeight:1.5, textAlign:"center" },
  warn: { color:"#e0a800", fontSize:13, marginTop:12 },
  status: { marginTop:24, padding:16, borderRadius:12, background:"rgba(255,255,255,0.04)",
    fontSize:14, wordBreak:"break-all" },
  result: { marginTop:24, padding:24, borderRadius:18, background:"rgba(20,241,149,0.05)",
    border:`1px solid ${GREEN}` },
  resultHead: { color:GREEN, fontWeight:800, fontSize:18, marginBottom:16 },
  resultRow: { display:"flex", justifyContent:"space-between", gap:16, padding:"8px 0",
    borderBottom:"1px solid rgba(255,255,255,0.06)", fontSize:13.5 },
  resultKey: { color:"#888", flex:"0 0 auto" },
  mono: { fontFamily:"ui-monospace, monospace", fontSize:12, wordBreak:"break-all", textAlign:"right" },
  solscan: { color:GREEN, fontSize:13.5, display:"inline-block", marginTop:14, fontWeight:600 },
  legal: { marginTop:40, fontSize:12, color:"#5a5a5a", lineHeight:1.6, maxWidth:560 },
};
const st = {
  step: { display:"flex", gap:18, padding:"20px 0", alignItems:"flex-start" },
  stepN: { fontSize:13, fontWeight:800, color:GREEN, fontFamily:"ui-monospace, monospace",
    flex:"0 0 auto", paddingTop:2, opacity:0.8 },
  stepTitle: { fontSize:16, fontWeight:700, color:"#fff", marginBottom:6 },
  stepBody: { fontSize:14, color:"#9a9a9a", lineHeight:1.6 },
  fieldLabel: { display:"block", color:"#aaa", fontSize:13, marginBottom:8 },
  input: { width:"100%", height:46, background:"rgba(255,255,255,0.04)",
    border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, color:"#fff",
    padding:"0 14px", fontSize:15, boxSizing:"border-box", outline:"none", transition:"border-color .15s" },
};
