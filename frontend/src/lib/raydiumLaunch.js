// Builds + sends a Raydium LaunchLab token launch using the connected browser
// wallet (Phantom etc). Client-side: the user's wallet signs. No server custody.
import {
  Raydium, TxVersion, LAUNCHPAD_PROGRAM,
  getPdaLaunchpadConfigId, LaunchpadConfig,
} from "@raydium-io/raydium-sdk-v2";
import { NATIVE_MINT } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { LAUNCH_CONFIG, PLATFORM_ID, RPC_URL } from "../config/launchConfig.js";

// solPrice: current SOL/USD (fetched live) so we hit the USD graduation target.
export async function launchToken({ wallet, name, symbol, uri, solPrice, onStatus }) {
  const status = (m) => onStatus && onStatus(m);
  if (!wallet || !wallet.publicKey) throw new Error("Connect a wallet first.");
  if (!PLATFORM_ID) throw new Error("Platform ID not set. Create your platform first.");

  const connection = new Connection(RPC_URL, "confirmed");
  status("Loading Raydium…");

  const raydium = await Raydium.load({
    owner: wallet.publicKey,
    connection,
    cluster: "mainnet",
    disableFeatureCheck: true,
    disableLoadToken: true,
    blockhashCommitment: "confirmed",
  });

  const programId = LAUNCHPAD_PROGRAM;
  const configId = getPdaLaunchpadConfigId(programId, NATIVE_MINT, 0, 0).publicKey;
  const configData = await connection.getAccountInfo(configId);
  if (!configData) throw new Error("Launchpad config not found.");
  const configInfo = LaunchpadConfig.decode(configData.data);
  const mintBInfo = await raydium.token.getTokenInfo(configInfo.mintB);

  // --- config → chain units ---
  const { supplyWhole, decimals, sellPct, lockPct, targetUsd, cliffYears, unlockYears, devBuySol } = LAUNCH_CONFIG;
  const supply = new BN(supplyWhole).mul(new BN(10).pow(new BN(decimals)));
  const totalSellA = supply.muln(sellPct).divn(100);
  const totalLocked = supply.muln(lockPct).divn(100);
  const targetSol = targetUsd / solPrice;
  const totalFundRaisingB = new BN(Math.round(targetSol * 1e9));
  const cliffPeriod = new BN(cliffYears * 365 * 24 * 60 * 60);
  const unlockPeriod = new BN(unlockYears * 365 * 24 * 60 * 60);
  const devBuyLamports = new BN(Math.round((devBuySol || 0) * 1e9));

  const mintPair = Keypair.generate();
  status("Building transaction…");

  const { execute, extInfo } = await raydium.launchpad.createLaunchpad({
    programId,
    mintA: mintPair.publicKey,
    decimals,
    name, symbol, uri,
    migrateType: "cpmm",
    configId, configInfo,
    mintBDecimals: mintBInfo.decimals,
    platformId: new PublicKey(PLATFORM_ID),
    txVersion: TxVersion.V0,
    slippage: new BN(100),
    buyAmount: devBuyLamports,
    createOnly: devBuyLamports.isZero(),
    extraSigners: [mintPair],
    supply,
    totalSellA,
    totalFundRaisingB,
    totalLockedAmount: totalLocked,
    cliffPeriod,
    unlockPeriod,
  });

  status("Approve in your wallet…");
  // wallet-adapter signs via the raydium owner; execute sends through the connection
  const result = await execute({ sequentially: true });

  return {
    mint: mintPair.publicKey.toBase58(),
    txId: result?.txId || result,
    poolInfo: extInfo,
  };
}

// Live SOL price (used to convert the USD target to SOL at launch time).
export async function getSolPrice() {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const j = await r.json();
    return j?.solana?.usd || 0;
  } catch { return 0; }
}
