<div>
  <label>Buy Links <span style={{ color: "#555" }}>(optional)</span></label>
  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
    {[
      { key: "raydium", label: "Raydium", prefix: "https://raydium.io/swap/?inputMint=sol&outputMint=", placeholder: "your-token-mint-address" },
      { key: "jupiter", label: "Jupiter", prefix: "https://jup.ag/swap/SOL-", placeholder: "your-token-mint-address" },
      { key: "pumpfun", label: "Pump.fun", prefix: "https://pump.fun/coin/", placeholder: "your-token-address" },
    ].map(({ key, label, prefix, placeholder }) => (
      <div key={key}>
        <div style={{ fontSize: "11px", color: "#14F195", marginBottom: "3px", fontWeight: 600 }}>{label}</div>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{ position: "absolute", left: "12px", fontSize: "10px", color: "#555", pointerEvents: "none", whiteSpace: "nowrap" }}>
            {prefix}
          </span>
          <input
            value={buyLinks[key].replace(prefix, "")}
            onChange={(e) => setBuyLinks({ ...buyLinks, [key]: e.target.value ? prefix + e.target.value.replace(prefix, "") : "" })}
            placeholder={placeholder}
            style={{ paddingLeft: (prefix.length * 6 + 12) + "px", fontSize: "11px" }}
          />
        </div>
      </div>
    ))}
  </div>
</div>
