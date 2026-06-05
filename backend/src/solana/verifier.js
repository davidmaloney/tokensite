import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { RPC_RETRY_ATTEMPTS, RPC_RETRY_DELAY_MS } from "../config/constants.js";
import { logger } from "../utils/logger.js";

let connection = null;

function getConnection() {
  if (!connection) {
    connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
      { commitment: "finalized" }
    );
  }
  return connection;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, attempts = RPC_RETRY_ATTEMPTS, delayMs = RPC_RETRY_DELAY_MS) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      logger.warn("rpc_retry", { attempt: i + 1, err: err.message });
      if (i < attempts - 1) await sleep(delayMs * Math.pow(2, i));
    }
  }
  throw lastErr;
}

export async function verifyPayment({ treasuryWallet, expectedAmountSol, walletAddress }) {
  if (process.env.MOCK_MODE === "true") {
    logger.info("mock_payment_verified", { walletAddress, expectedAmountSol });
    return { verified: true, txHash: `MOCK_${Date.now()}` };
  }

  try {
    const conn = getConnection();
    const treasury = new PublicKey(treasuryWallet);

    const signatures = await withRetry(() =>
      conn.getSignaturesForAddress(treasury, { limit: 20 }, "finalized")
    );

    const expectedLamports = Math.round(expectedAmountSol * LAMPORTS_PER_SOL);
    const toleranceLamports = Math.round(expectedLamports * 0.01);

    for (const sig of signatures) {
      try {
        const tx = await withRetry(() =>
          conn.getTransaction(sig.signature, {
            commitment: "finalized",
            maxSupportedTransactionVersion: 0,
          })
        );
        if (!tx || tx.meta?.err) continue;

        const accountKeys = tx.transaction.message.getAccountKeys
          ? tx.transaction.message.getAccountKeys().staticAccountKeys
          : tx.transaction.message.accountKeys;

        const senderIndex = accountKeys.findIndex(
          (k) => k.toString() === walletAddress
        );
        const receiverIndex = accountKeys.findIndex(
          (k) => k.toString() === treasuryWallet
        );

        if (senderIndex === -1 || receiverIndex === -1) continue;

        const preBalance = tx.meta.preBalances[receiverIndex];
        const postBalance = tx.meta.postBalances[receiverIndex];
        const received = postBalance - preBalance;

        if (Math.abs(received - expectedLamports) <= toleranceLamports) {
          return { verified: true, txHash: sig.signature };
        }
      } catch {
        continue;
      }
    }

    return { verified: false, txHash: null };
  } catch (err) {
    logger.error("payment_verification_error", { err: err.message });
    return { verified: false, txHash: null };
  }
}
