// Client-side Raydium LaunchLab. The user's own wallet signs every transaction.
// We never take custody of coins or funds.
import {
  Raydium, TxVersion, LAUNCHPAD_PROGRAM,
  getPdaLaunchpadConfigId, LaunchpadConfig, PlatformConfig,
  getPdaLaunchpadPoolId, getPdaPlatformVault, getPdaPlatformFeeVaultAuth,
} from "@raydium-io/raydium-sdk-v2";
import {
  NATIVE_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import { LAUNCH_CONFIG, PLATFORM_ID, RPC_URL } from "../config/launchConfig.js";

// ---- load an SDK instance bound to the connected browser wallet ----
async function loadRaydium(wallet) {
  const connection = new Connection(RPC_URL, "confirmed");
  return Raydium.load({
    owner: wallet.publicKey,
    connection,
    cluster: "mainnet",
    disableFeatureCheck: true,
    disableLoadToken: true,
    blockhashCommitment: "confirmed",
    signAllTransactions: wallet.signAllTransactions,
  });
}

// The SDK's execute() returns the tx id in different shapes by version.
// Dig it out safely instead of String()-ing an object (the "[object Object]" bug).
function extractTxId(result) {
  if (!result) return "";
  if (typeof result === "string") return result;
  if (result.txId) return result.txId;
  if (Array.isArray(result.txIds) && result.txIds.length) return result.txIds[0];
  if (Array.isArray(result.signatures) && result.signatures.length) return result.signatures[0];
  if (result.signature) return result.signature;
  return "";
}

// execute() only submits the raw transaction and returns immediately — it
// never checks whether the network actually confirmed it (no confirmation,
// no websocket on our free RPC tier). Without this, the app can report
// "success" on a transaction that silently gets dropped. Poll for a real
// confirmed/finalized status (or an on-chain error) before trusting it.
async function waitForConfirmation(connection, signature, onStatus, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const info = value && value[0];
    if (info) {
      if (info.err) throw new Error("Transaction failed on-chain: " + JSON.stringify(info.err));
      if (info.confirmationStatus === "confirmed" || info.confirmationStatus === "finalized") return;
    }
    onStatus && onStatus(`Confirming… (${Math.round((Date.now() - start) / 1000)}s)`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(
    `Not confirmed after ${Math.round(timeoutMs / 1000)}s — it may still land. Check manually: https://solscan.io/tx/${signature}`
  );
}

// ---- upload the logo to our backend, get back a permanent metadata URI ----
// Backend stores the image + a metadata JSON and returns the JSON's URL, which
// becomes the token's on-chain `uri` so wallets/explorers can render the logo.
export async function uploadLogo(file, name, symbol) {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("name", name);
  fd.append("symbol", symbol);
  const r = await fetch("/api/launch/metadata", { method: "POST", body: fd });
  if (!r.ok) throw new Error("Logo upload failed. Try again.");
  const j = await r.json();
  if (!j.uri) throw new Error("Logo upload returned no URI.");
  return j.uri;
}

// ---- launch a coin ----
export async function launchToken({ wallet, name, symbol, uri, solPrice, onStatus }) {
  const status = (m) => onStatus && onStatus(m);
  if (!wallet || !wallet.publicKey) throw new Error("Connect a wallet first.");
  if (!PLATFORM_ID) throw new Error("Platform not configured.");
  if (!wallet.signTransaction) throw new Error("This wallet can't sign transactions.");

  status("Loading Raydium…");
  const raydium = await loadRaydium(wallet);
  const connection = raydium.connection;

  const programId = LAUNCHPAD_PROGRAM;
  const configId = getPdaLaunchpadConfigId(programId, NATIVE_MINT, 0, 0).publicKey;
  const configData = await connection.getAccountInfo(configId);
  if (!configData) throw new Error("Launchpad config not found.");
  const configInfo = LaunchpadConfig.decode(configData.data);
  const mintBInfo = await raydium.token.getTokenInfo(configInfo.mintB);

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
    supply, totalSellA, totalFundRaisingB,
    totalLockedAmount: totalLocked,
    cliffPeriod, unlockPeriod,
  });

  status("Approve in your wallet…");
  const result = await execute({ sequentially: true });
  const txId = extractTxId(result);
  if (!txId) throw new Error("Transaction was not sent.");

  status("Confirming on-chain…");
  await waitForConfirmation(connection, txId, status);

  return { mint: mintPair.publicKey.toBase58(), txId, poolInfo: extInfo };
}

// ---- ADMIN: claim accrued platform fees for a given coin's pool ----
// Only meaningful when the connected wallet is the platform admin. Sweeps that
// pool's accrued 0.5% platform fee to the platform's claim-fee wallet (treasury).
export async function claimPlatformFees({ wallet, mint, onStatus }) {
  const status = (m) => onStatus && onStatus(m);
  if (!wallet?.publicKey) throw new Error("Connect the admin wallet.");
  status("Loading…");
  const raydium = await loadRaydium(wallet);

  const platformId = new PublicKey(PLATFORM_ID);
  const pAcc = await raydium.connection.getAccountInfo(platformId);
  if (!pAcc) throw new Error("Platform not found.");
  const platform = PlatformConfig.decode(pAcc.data);

  const poolId = getPdaLaunchpadPoolId(LAUNCHPAD_PROGRAM, new PublicKey(mint), NATIVE_MINT).publicKey;

  status("Building claim…");
  // Don't pass mintB here: passing it makes the SDK skip its own step of
  // looking up the pool's vault address on-chain, leaving vaultB blank and
  // causing "cannot found mint info" even though the pool/vault exist.
  // Leaving mintB out lets the SDK fetch both mintB and vaultB itself.
  const { execute } = await raydium.launchpad.claimPlatformFee({
    programId: LAUNCHPAD_PROGRAM,
    platformId,
    poolId,
    platformClaimFeeWallet: platform.platformClaimFeeWallet,
    txVersion: TxVersion.V0,
  });

  status("Approve in your wallet…");
  const result = await execute({ sequentially: true });
  const txId = extractTxId(result);
  if (!txId) throw new Error("Transaction was not sent.");

  status("Confirming on-chain…");
  await waitForConfirmation(raydium.connection, txId, status);

  return { txId };
}

// ---- ADMIN: claim ALL accrued platform fees in one go, from the shared ----
// platform-wide fee vault — instead of claiming coin by coin. Built by hand
// (raw instruction) because the installed SDK version doesn't wrap this
// instruction yet; account layout + discriminator taken directly from
// Raydium's own published on-chain program IDL (raydium_launchpad.json).
const CLAIM_PLATFORM_FEE_FROM_VAULT_DISCRIMINATOR = Buffer.from([117, 241, 198, 168, 248, 218, 80, 29]);

export async function claimPlatformFeeFromVault({ wallet, onStatus }) {
  const status = (m) => onStatus && onStatus(m);
  if (!wallet?.publicKey) throw new Error("Connect the treasury wallet.");
  if (!wallet.signAllTransactions) throw new Error("This wallet can't sign transactions.");
  status("Loading…");
  const raydium = await loadRaydium(wallet);
  const connection = raydium.connection;

  const platformId = new PublicKey(PLATFORM_ID);
  const feeVaultAuthority = getPdaPlatformFeeVaultAuth(LAUNCHPAD_PROGRAM).publicKey;
  const platformFeeVault = getPdaPlatformVault(LAUNCHPAD_PROGRAM, platformId, NATIVE_MINT).publicKey;
  const recipientTokenAccount = getAssociatedTokenAddressSync(NATIVE_MINT, wallet.publicKey);

  const claimIx = new TransactionInstruction({
    programId: LAUNCHPAD_PROGRAM,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: feeVaultAuthority, isSigner: false, isWritable: false },
      { pubkey: platformId, isSigner: false, isWritable: false },
      { pubkey: platformFeeVault, isSigner: false, isWritable: true },
      { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
      { pubkey: NATIVE_MINT, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: CLAIM_PLATFORM_FEE_FROM_VAULT_DISCRIMINATOR,
  });

  status("Building transaction…");
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, recipientTokenAccount, wallet.publicKey, NATIVE_MINT),
    claimIx
  );
  tx.feePayer = wallet.publicKey;
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  status("Approve in your wallet…");
  const [signedTx] = await wallet.signAllTransactions([tx]);
  const txId = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: true });

  status("Confirming on-chain…");
  await waitForConfirmation(connection, txId, status);

  return { txId };
}

// ---- live SOL price to convert the USD graduation target to SOL at launch ----
export async function getSolPrice() {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const j = await r.json();
    return j?.solana?.usd || 0;
  } catch { return 0; }
}
