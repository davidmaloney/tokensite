import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Link } from "react-router-dom";
import axios from "axios";
import PageCard from "../components/PageCard";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const DOMAIN = import.meta.env.VITE_DOMAIN || "shillit.fun";

export default function Dashboard() {
 const { connected, publicKey } = useWallet();
 const [pages, setPages] = useState([]);
 const [loading, setLoading] = useState(false);

 useEffect(() => {
   if (connected && publicKey) {
     fetchPages();
   }
 }, [connected, publicKey]);

 const fetchPages = async () => {
   setLoading(true);
   try {
     const res = await axios.get(`/api/pages?wallet=${publicKey.toString()}`);
     setPages(res.data.pages || []);
   } catch {
     setPages([]);
   }
   setLoading(false);
 };

 if (!connected) {
   return (
     <div style={{
       display: "flex",
       flexDirection: "column",
       alignItems: "center",
       justifyContent: "center",
       minHeight: "calc(100vh - 64px)",
       gap: "32px",
       textAlign: "center",
       padding: "24px 20px",
     }}>

       {/* Logo */}
       <div style={{
         fontSize: "56px",
         fontWeight: 900,
         background: "linear-gradient(135deg, #9945FF, #14F195)",
         WebkitBackgroundClip: "text",
         WebkitTextFillColor: "transparent",
         lineHeight: 1.1,
       }}>
         SHILLit
       </div>

       {/* What it is */}
       <div style={{ fontSize: "20px", color: "#ccc", maxWidth: "380px", lineHeight: 1.5, fontWeight: 600 }}>
         Instant crypto landing pages for your token
       </div>

       {/* Tagline */}
       <div style={{ fontSize: "16px", fontWeight: 700, color: "#888", maxWidth: "340px", lineHeight: 1.6, marginTop: "-16px" }}>
         One wallet. One page. Yours in seconds.
       </div>

       {/* How it works + Pricing panel */}
       <div className="glass" style={{
         borderRadius: "16px",
         padding: "28px 24px",
         maxWidth: "460px",
         width: "100%",
         textAlign: "left",
         border: "1px solid rgba(153,69,255,0.2)",
         boxShadow: "0 0 40px rgba(153,69,255,0.08)",
       }}>

         <div style={{ marginBottom: "24px" }}>
           <div style={{ fontSize: "11px", fontWeight: 700, color: "#9945FF", letterSpacing: "1.5px", marginBottom: "16px" }}>
             HOW IT WORKS
           </div>
           <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
             {[
               "Connect your Solana wallet",
               "Pay as you go, leave when you're done",
             ].map((text) => (
               <div key={text} style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                 <span style={{ fontSize: "18px", color: "#9945FF", lineHeight: 1, flexShrink: 0 }}>●</span>
                 <span style={{ fontSize: "15px", fontWeight: 500, color: "#ccc", lineHeight: 1.4 }}>{text}</span>
               </div>
             ))}
           </div>
         </div>

         <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: "20px" }} />

         <div style={{ fontSize: "11px", fontWeight: 700, color: "#9945FF", letterSpacing: "1.5px", marginBottom: "14px" }}>
           SIMPLE PRICING
         </div>
         <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
           <div style={{
             flex: 1, minWidth: "120px",
             background: "rgba(255,255,255,0.03)",
             border: "1px solid rgba(255,255,255,0.08)",
             borderRadius: "10px", padding: "14px", textAlign: "center",
           }}>
             <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>MONTHLY</div>
             <div style={{ fontSize: "22px", fontWeight: 800, color: "#fff" }}>$4.99</div>
             <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>per month</div>
           </div>
           <div style={{
             flex: 1, minWidth: "120px",
             background: "rgba(153,69,255,0.08)",
             border: "1px solid rgba(153,69,255,0.3)",
             borderRadius: "10px", padding: "14px", textAlign: "center",
           }}>
             <div style={{ fontSize: "11px", color: "#9945FF", marginBottom: "6px" }}>YEARLY</div>
             <div style={{ fontSize: "22px", fontWeight: 800, color: "#fff" }}>$39</div>
             <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>save 35%</div>
           </div>
         </div>
       </div>

       {/* Connect button */}
       <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
         <WalletMultiButton style={{
           background: "linear-gradient(135deg, #9945FF, #14F195)",
           color: "#000",
           fontWeight: 800,
           fontSize: "16px",
           borderRadius: "12px",
           border: "none",
           height: "52px",
           padding: "0 32px",
           cursor: "pointer",
         }} />
         <div style={{ fontSize: "12px", color: "#555" }}>
           Phantom, Solflare and Backpack supported
         </div>
       </div>

     </div>
   );
 }

 return (
   <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 20px" }}>
     <div style={{
       display: "flex",
       justifyContent: "space-between",
       alignItems: "center",
       marginBottom: "28px",
       flexWrap: "wrap",
       gap: "12px",
     }}>
       <div>
         <h1 style={{ fontSize: "24px", fontWeight: 800 }}>My Pages</h1>
         <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
           Wallet: <span style={{ fontFamily: "monospace", color: "#9945FF" }}>
             {publicKey.toString().slice(0, 8)}…{publicKey.toString().slice(-8)}
           </span>
         </div>
       </div>
       <Link to="/create">
         <button className="btn-primary">+ Create New Page</button>
       </Link>
     </div>

     {loading ? (
       <div style={{ color: "#666", textAlign: "center", padding: "40px" }}>Loading…</div>
     ) : pages.length === 0 ? (
       <div className="glass" style={{ borderRadius: "12px", padding: "48px", textAlign: "center" }}>
         <div style={{ fontSize: "36px", marginBottom: "12px" }}>🪙</div>
         <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>No pages yet</div>
         <div style={{ fontSize: "13px", color: "#666", marginBottom: "20px" }}>
           Create your first crypto landing page
         </div>
         <Link to="/create">
           <button className="btn-primary">Create Page</button>
         </Link>
       </div>
     ) : (
       <div style={{
         display: "grid",
         gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
         gap: "16px",
       }}>
         {pages.map((page) => (
           <PageCard key={page.id} page={page} domain={DOMAIN} />
         ))}
       </div>
     )}
   </div>
 );
}
