import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import ImageUpload from "../components/ImageUpload";
import { LAUNCH_CONFIG, LAUNCH_ENABLED, PLATFORM_ID } from "../config/launchConfig.js";
import { launchToken, getSolPrice, uploadLogo, claimVestedTokens } from "../lib/raydiumLaunch.js";

const GREEN = "#14F195";

export default function LaunchToken() {
  const wallet = useWallet();
  const { connected } = wallet;
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [logo, setLogo] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [solPrice, setSolPrice] = useState(0);
  const [claimMint, setClaimMint] = useState("");
  const [claimStatus, setClaimStatus] = useState("");
  const [claimBusy, setClaimBusy] = useState(false);

  useEffect(() => { getSolPrice().then(setSolPrice); }, []);

  if (!LAUNCH_ENABLED) {
    return <div style={s.wrap}><div style={s.notLive}>This feature isn't live yet.</div></div>;
  }

  const cfg = LAUNCH_CONFIG;
  const targetSol = solPrice ? Math.round(cfg.targetUsd / solPrice) : "…";

  async function handleLaunch() {
    setBusy(true); setResult(null); setStatus("");
    try {
      if (!name.trim()) throw new Error("Add a coin name to continue.");
      if (!ticker.trim()) throw new Error("Add a ticker to continue.");
      if (!logo?.file) throw new Error("Add a logo — it's the face of your coin.");
      const price = solPrice || (await getSolPrice());
      if (!price) throw new Error("Couldn't reach the SOL price feed. Try again in a moment.");

      setStatus("Uploading logo…");
      const uri = await uploadLogo(logo.file, name.trim(), ticker.trim());

      const res = await launchToken({
        wallet, name: name.trim(), symbol: ticker.trim(),
        uri, solPrice: price, onStatus: setStatus,
      });
      setResult(res);
      setStatus("");
    } catch (e) {
      setStatus("Error: " + (e.message || String(e)));
    } finally { setBusy(false); }
  }

  async function handleClaimVesting() {
    setClaimBusy(true); setClaimStatus("");
    try {
      if (!claimMint.trim()) throw new Error("Enter your coin's mint address.");
      const { txId } = await claimVestedTokens({ wallet, mint: claimMint.trim(), onStatus: setClaimStatus });
      setClaimStatus(`Claimed.${txId ? " Tx: " + txId.slice(0, 12) + "…" : ""}`);
    } catch (e) {
      setClaimStatus("Error: " + (e.message || String(e)));
    } finally { setClaimBusy(false); }
  }

  return (
    <div style={s.wrap}>
      <div style={s.inner}>

        <h1 style={s.h1}>
          The launch built for <span style={s.accent}>holders</span>, not snipers.
        </h1>
        <p style={s.sub}>
          On most launchpads the first bots buy cheap, the price spikes, and everyone after
          is exit liquidity. This flips it — a slow, even start where no one gets a head start,
          and the real move saved for after graduation. You sign every step from your own
          wallet; we never hold your coins.
        </p>

        <div style={s.deal}>
          <div style={s.dealLeft}>
            <div style={s.dealPct}>5%</div>
            <div style={s.dealPctSub}>of supply, free to you</div>
          </div>
          <div style={s.dealRight}>
            <div style={s.dealHead}>Your stake in your own project.</div>
            <p style={s.dealBody}>
              You keep 5% of the total supply — <strong style={{color:"#fff"}}>locked for 3 years,
              then released bit by bit over the next 3</strong>. A real long-term stake, and because
              it's time-locked on-chain, buyers can see from minute one you can't dump on them.
            </p>
          </div>
        </div>

        <div style={s.sectionLabel}>How your launch plays out</div>
        <div style={s.cols}>
          <div style={s.colLeft}>
            <Step n="1" title="A slow, even climb — on purpose">
              While your coin fills up, the price rises only about 20%. With no first-second spike
              to grab, bots gain nothing by being fastest — so real people have time to find your
              coin and buy in on the same footing. There's no transfer tax, so nothing is skimmed
              from trades along the way.
            </Step>
            <Step n="2" title={`It graduates at $${cfg.targetUsd.toLocaleString()} — always`}>
              The target is a fixed dollar amount, converted to SOL the moment you launch
              (about {targetSol} SOL right now). When SOL is worth more, fewer of your coins need
              to sell to reach it — so your holders keep more of the supply.
            </Step>
            <Step n="3" title="45% is saved to back real trading">
              Nearly half of every coin — plus all the SOL raised — is poured into the market at
              graduation, and that liquidity is 100% burned, so it can never be pulled back out.
              A genuinely deep, locked pool instead of a thin chart that fades in minutes.
            </Step>
            <Step n="4" title="Then the ceiling comes off" last>
              At graduation the slow curve ends and your coin trades on the open market. Now the
              same buying that barely moved it before can send it up fast — the part that matters,
              with real depth underneath.
            </Step>
          </div>

          <div style={s.colRight}>
            <div style={s.card}>
              <div style={s.cardTitle}>Create your coin</div>
              <Field label="Coin name" value={name} onChange={setName} placeholder="Good Dog" />
              <Field label="Ticker" value={ticker} onChange={(v)=>setTicker(v.toUpperCase())} placeholder="GDOG" maxLength={10} />
              <label style={s.fieldLabel}>Logo</label>
              <ImageUpload label="" hint="The face of your coin — shown in wallets and explorers."
                value={logo} onChange={setLogo} />

              <div style={s.tk}>
                <Row k="Total supply" v="1 billion coins" />
                <Row k="Sold to buyers on the curve" v="50%" />
                <Row k="Into the burned pool" v="45%" />
                <Row k="Yours, locked 3+3 years" v="5%" />
              </div>

              {!connected
                ? <div style={{marginTop:8}}><WalletMultiButton style={s.btn} /></div>
                : <button onClick={handleLaunch} disabled={busy}
                    style={{...s.btn, opacity:busy?0.6:1, cursor:busy?"wait":"pointer"}}>
                    {busy ? "Launching…" : "Launch coin"}
                  </button>}

              {connected && <div style={s.buyNote}>You can buy your own coin at launch from this same wallet — no special access, just like any other buyer.</div>}
              {!PLATFORM_ID && <p style={s.warn}>Platform not configured.</p>}

              {connected && (
                <div style={s.claimBox}>
                  <div style={s.claimTitle}>Already launched a coin? Claim your vested tokens</div>
                  <Field label="Coin mint" value={claimMint} onChange={setClaimMint} placeholder="Your coin's mint address" />
                  <button onClick={handleClaimVesting} disabled={claimBusy}
                    style={{...s.btn, opacity:claimBusy?0.6:1, cursor:claimBusy?"wait":"pointer"}}>
                    {claimBusy ? "Claiming…" : "Claim vested tokens"}
                  </button>
                  {claimStatus && (
                    <div style={{...s.status, color: claimStatus.startsWith("Error") ? "#ff6b6b" : GREEN, marginTop:12}}>{claimStatus}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {status && (
          <div style={{...s.status, color: status.startsWith("Error") ? "#ff6b6b" : GREEN}}>{status}</div>
        )}

        {result && (
          <div style={s.result}>
            <div style={s.resultHead}>Your coin is live.</div>
            <div style={s.rr}><span style={s.rk}>Name</span><span>{name} ({ticker})</span></div>
            <div style={s.rr}><span style={s.rk}>Mint</span><span style={s.mono}>{result.mint}</span></div>
            {result.txId && <div style={s.rr}><span style={s.rk}>Transaction</span><span style={s.mono}>{result.txId}</span></div>}
            <a href={`https://solscan.io/token/${result.mint}`} target="_blank" rel="noreferrer" style={s.solscan}>View on Solscan →</a>
          </div>
        )}

        <p style={s.legal}>Crypto is volatile and you can lose money. Launch responsibly.</p>
      </div>
    </div>
  );
}

function Step({ n, title, children, last }) {
  return (
    <div style={{...st.step, borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.06)"}}>
      <div style={st.n}>{n}</div>
      <div><div style={st.title}>{title}</div><div style={st.body}>{children}</div></div>
    </div>
  );
}
function Field({ label, value, onChange, placeholder, maxLength }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={s.fieldLabel}>{label}</label>
      <input value={value} maxLength={maxLength} placeholder={placeholder}
        onChange={(e)=>onChange(e.target.value)} style={st.input}
        onFocus={(e)=>e.target.style.borderColor=GREEN}
        onBlur={(e)=>e.target.style.borderColor="rgba(255,255,255,0.1)"} />
    </div>
  );
}
function Row({ k, v }) {
  return (
    <div style={st.row}>
      <span style={st.rowK}>{k}</span>
      <span style={st.rowV}>{v}</span>
    </div>
  );
}

const s = {
  wrap:{minHeight:"100vh",background:"#0b0b0c",color:"#ededed",padding:"60px 20px",fontFamily:"Inter,system-ui,sans-serif"},
  inner:{maxWidth:940,margin:"0 auto",width:"100%"},
  notLive:{textAlign:"center",color:"#666",marginTop:100,fontSize:15},
  h1:{fontSize:"clamp(29px,5vw,46px)",fontWeight:800,lineHeight:1.1,margin:"0 0 18px",letterSpacing:-1,color:"#fff"},
  accent:{color:GREEN},
  sub:{fontSize:"clamp(15px,1.8vw,17px)",color:"#9a9a9a",lineHeight:1.6,maxWidth:610,margin:"0 0 40px"},
  deal:{display:"flex",gap:26,alignItems:"stretch",padding:"26px",borderRadius:16,
    background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.08)",marginBottom:52,flexWrap:"wrap"},
  dealLeft:{display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",
    padding:"0 20px 0 6px",borderRight:"1px solid rgba(255,255,255,0.08)",flex:"0 0 auto",minWidth:120},
  dealPct:{fontSize:56,fontWeight:800,lineHeight:1,color:GREEN},
  dealPctSub:{fontSize:12.5,color:"#8a8a8a",marginTop:6,textAlign:"center"},
  dealRight:{flex:"1 1 300px"},
  dealHead:{fontSize:17,fontWeight:700,color:"#fff",marginBottom:8},
  dealBody:{fontSize:14,color:"#aeaeae",lineHeight:1.6,margin:0},
  sectionLabel:{fontSize:13,fontWeight:700,letterSpacing:1,color:"#777",textTransform:"uppercase",marginBottom:8},
  cols:{display:"flex",gap:40,flexWrap:"wrap",alignItems:"flex-start"},
  colLeft:{flex:"1 1 360px",minWidth:300},
  colRight:{flex:"1 1 300px",minWidth:280},
  card:{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:22,
    position:"sticky",top:24},
  cardTitle:{fontSize:15,fontWeight:700,color:"#fff",marginBottom:18},
  fieldLabel:{display:"block",color:"#9a9a9a",fontSize:13,marginBottom:7},
  tk:{margin:"18px 0",padding:"14px 0",borderTop:"1px solid rgba(255,255,255,0.07)",borderBottom:"1px solid rgba(255,255,255,0.07)"},
  btn:{width:"100%",background:GREEN,color:"#08210f",fontWeight:800,fontSize:15,borderRadius:11,border:"none",height:50,cursor:"pointer",marginTop:4},
  buyNote:{marginTop:12,fontSize:12,color:"#777",lineHeight:1.5,textAlign:"center"},
  warn:{color:"#e0a800",fontSize:13,marginTop:10},
  status:{marginTop:24,padding:15,borderRadius:11,background:"rgba(255,255,255,0.04)",fontSize:14,wordBreak:"break-all"},
  result:{marginTop:24,padding:22,borderRadius:16,background:"rgba(20,241,149,0.05)",border:"1px solid #14F195"},
  resultHead:{color:GREEN,fontWeight:800,fontSize:17,marginBottom:14},
  rr:{display:"flex",justifyContent:"space-between",gap:16,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.06)",fontSize:13},
  rk:{color:"#888",flex:"0 0 auto"},
  mono:{fontFamily:"ui-monospace,monospace",fontSize:11.5,wordBreak:"break-all",textAlign:"right"},
  solscan:{color:GREEN,fontSize:13,display:"inline-block",marginTop:12,fontWeight:600},
  claimBox:{marginTop:18,paddingTop:18,borderTop:"1px solid rgba(255,255,255,0.08)"},
  claimTitle:{fontSize:12.5,color:"#8a8a8a",marginBottom:10,lineHeight:1.4},
  legal:{marginTop:44,fontSize:11,color:"#555",lineHeight:1.6},
};
const st = {
  step:{display:"flex",gap:16,padding:"18px 0",alignItems:"flex-start"},
  n:{fontSize:14,fontWeight:800,color:"#08210f",background:GREEN,borderRadius:8,width:26,height:26,
    display:"flex",alignItems:"center",justifyContent:"center",flex:"0 0 auto"},
  title:{fontSize:16,fontWeight:700,color:"#fff",marginBottom:6},
  body:{fontSize:14,color:"#9a9a9a",lineHeight:1.6},
  input:{width:"100%",height:44,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",
    borderRadius:10,color:"#fff",padding:"0 13px",fontSize:15,boxSizing:"border-box",outline:"none",transition:"border-color .15s"},
  row:{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13},
  rowK:{color:"#8a8a8a"},
  rowV:{color:"#e0e0e0",fontWeight:600},
};
