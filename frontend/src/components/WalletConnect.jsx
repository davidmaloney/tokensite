import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function WalletConnect() {
  const { connected, publicKey } = useWallet();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      {connected && publicKey && (
        <span style={{ fontSize: "12px", color: "#14F195", fontFamily: "monospace" }}>
          {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
        </span>
      )}
      <WalletMultiButton
        style={{
          background: "linear-gradient(135deg, #9945FF, #14F195)",
          color: "#000",
          fontWeight: 700,
          fontSize: "13px",
          borderRadius: "8px",
          border: "none",
          height: "38px",
        }}
      />
    </div>
  );
}
