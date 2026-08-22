// Client-side Raydium LaunchLab. The user's own wallet signs every transaction.
// We never take custody of coins or funds.
import {
  Raydium, TxVersion, LAUNCHPAD_PROGRAM,
  getPdaLaunchpadConfigId, LaunchpadConfig,
  getPdaPlatformVault, getPdaPlatformFeeVaultAuth,
  getPdaLaunchpadPoolId, getPdaVestId, getPdaLaunchpadAuth, getPdaLaunchpadVaultId,
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

// Locking dev tokens via `totalLockedAmount`/`cliffPeriod`/`unlockPeriod` on
// createLaunchpad only reserves the share and sets the pool's overall vesting
// schedule — it does NOT assign that share to anyone. A separate instruction
// (create_vesting_account) is required to actually name a beneficiary who can
// later claim it. Built by hand from Raydium's own IDL, same as the platform
// fee vault claim.
const CREATE_VESTING_ACCOUNT_DISCRIMINATOR = Buffer.from([129, 178, 2, 13, 217, 172, 230, 218]);

// TEMPORARY TEST OVERRIDE — cliff/unlock forced to ~2 minutes total so the
// real claim flow can be proven on mainnet without waiting 3 years. Revert
// to LAUNCH_CONFIG.cliffYears/unlockYears (the real 3yr/3yr) once verified.
const TEST_CLIFF_SECONDS = 120;
const TEST_UNLOCK_SECONDS = 1;

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
  // TEMPORARY: using the short test window instead of the real years while
  // we prove the vesting lock + claim flow on mainnet. Swap back to the
  // commented-out line once verified.
  const cliffPeriod = new BN(TEST_CLIFF_SECONDS);
  const unlockPeriod = new BN(TEST_UNLOCK_SECONDS);
  // const cliffPeriod = new BN(cliffYears * 365 * 24 * 60 * 60);
  // const unlockPeriod = new BN(unlockYears * 365 * 24 * 60 * 60);
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

  // ---- lock the dev's 5% to their own wallet, in the same launch flow ----
  // Non-custodial: the beneficiary is always the wallet that just launched,
  // never our treasury. Only they can ever claim it, and only after the
  // cliff/unlock schedule set above.
  if (!totalLocked.isZero()) {
    status("Locking dev vesting…");
    const poolId = getPdaLaunchpadPoolId(programId, mintPair.publicKey, NATIVE_MINT).publicKey;
    const vestingRecord = getPdaVestId(programId, poolId, wallet.publicKey).publicKey;

    const vestIx = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },  // creator
        { pubkey: wallet.publicKey, isSigner: false, isWritable: true }, // beneficiary
        { pubkey: poolId, isSigner: false, isWritable: true },
        { pubkey: vestingRecord, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([CREATE_VESTING_ACCOUNT_DISCRIMINATOR, totalLocked.toArrayLike(Buffer, "le", 8)]),
    });

    const vestTx = new Transaction().add(vestIx);
    vestTx.feePayer = wallet.publicKey;
    const { blockhash: vestBlockhash } = await connection.getLatestBlockhash("confirmed");
    vestTx.recentBlockhash = vestBlockhash;

    status("Approve the vesting lock…");
    const [signedVestTx] = await wallet.signAllTransactions([vestTx]);
    const vestTxId = await connection.sendRawTransaction(signedVestTx.serialize(), { skipPreflight: true });

    status("Confirming vesting lock…");
    await waitForConfirmation(connection, vestTxId, status);
  }

  return { mint: mintPair.publicKey.toBase58(), txId, poolInfo: extInfo };
}

// ---- claim vested dev tokens once the cliff/unlock schedule allows it ----
// Anyone can call this for their own wallet + a coin mint; only the wallet
// that originally launched (the vesting record's beneficiary) can actually
// receive anything — enforced on-chain, not by our UI.
const CLAIM_VESTED_TOKEN_DISCRIMINATOR = Buffer.from([49, 33, 104, 30, 189, 157, 79, 35]);

export async function claimVestedTokens({ wallet, mint, onStatus }) {
  const status = (m) => onStatus && onStatus(m);
  if (!wallet?.publicKey) throw new Error("Connect your wallet.");
  if (!wallet.signAllTransactions) throw new Error("This wallet can't sign transactions.");
  status("Loading…");
  const raydium = await loadRaydium(wallet);
  const connection = raydium.connection;

  const mintA = new PublicKey(mint);
  const poolId = getPdaLaunchpadPoolId(LAUNCHPAD_PROGRAM, mintA, NATIVE_MINT).publicKey;
  const vestingRecord = getPdaVestId(LAUNCHPAD_PROGRAM, poolId, wallet.publicKey).publicKey;
  const authority = getPdaLaunchpadAuth(LAUNCHPAD_PROGRAM).publicKey;
  const baseVault = getPdaLaunchpadVaultId(LAUNCHPAD_PROGRAM, poolId, mintA).publicKey;
  const userBaseToken = getAssociatedTokenAddressSync(mintA, wallet.publicKey);

  const claimIx = new TransactionInstruction({
    programId: LAUNCHPAD_PROGRAM,
    keys: [
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: poolId, isSigner: false, isWritable: true },
      { pubkey: vestingRecord, isSigner: false, isWritable: true },
      { pubkey: baseVault, isSigner: false, isWritable: true },
      { pubkey: userBaseToken, isSigner: false, isWritable: true },
      { pubkey: mintA, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: CLAIM_VESTED_TOKEN_DISCRIMINATOR,
  });

  status("Building transaction…");
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, userBaseToken, wallet.publicKey, mintA),
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
