// SHILLit Fair Launch — front-end config. Mirrors the verified spec.
export const LAUNCH_CONFIG = {
  supplyWhole: 1_000_000_000,   // 1B tokens
  decimals: 6,
  sellPct: 50,                  // % on bonding curve
  lockPct: 5,                   // % locked (dev, 3yr cliff + 3yr unlock)
  poolPct: 45,                  // % to liquidity pool at graduation
  targetUsd: 6000,              // graduation target in USD (converted to SOL at launch)
  cliffYears: 3,
  unlockYears: 3,
  platformFeePct: 0.5,          // your platform fee
  // dev's optional initial liquid buy, in SOL (small; can be 0)
  devBuySol: 0,
};

// Feature flag + env
export const LAUNCH_ENABLED = import.meta.env.VITE_LAUNCH_ENABLED === "true";
export const PLATFORM_ID = import.meta.env.VITE_LAUNCH_PLATFORM_ID || "";
export const RPC_URL =
  import.meta.env.VITE_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
