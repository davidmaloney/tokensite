import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { RPC_RETRY_ATTEMPTS, RPC_RETRY_DELAY_MS } from "../config/constants.js";
import { logger } from "../utils/logger.js";

function getConnection() {
  return new Connection(
    process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    { commitment: "finalized" }
  );
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

async function verifySpecificTransaction({ conn, txHash, treasuryWallet, expectedAmountSol, walletAddress }) {
  const expectedLamports = Math.round(expectedAmountSol * LAMPORTS_PER_SOL);
  const toleranceLamports = Math.round(expectedLamports * 0.02);

  // Retry until transaction is found or max attempts reached
  let tx = null;
  for (let i = 0; i < 10; i++) {
    try {
      tx = await conn.getTransaction(txHash, {
        commitment: "finalized",
        maxSupportedTransactionVersion: 0,
      });
      if (tx) break;
    } catch (err) {
      logger.warn("get_transaction_retry", { attempt: i + 1, err: err.message });
    }
    logger.info("waiting_for_finalization", { attempt: i + 1, txHash });
    await sleep(4000);
  }

  if (!tx || tx.meta?.err) {
    logger.warn("transaction_not_found_or_failed", { txHash });
    return false;
  }

  const accountKeys = tx.transaction.message.getAccountKeys
    ? tx.transaction.message.getAccountKeys().staticAccountKeys
    : tx.transaction.message.accountKeys;

  // Find treasury wallet in any position
  const receiverIndex = accountKeys.findIndex((k) => k.toString() === treasuryWallet);
  if (receiverIndex === -1) {
    logger.warn("treasury_not_found_in_tx", { txHash, treasuryWallet });
    return false;
  }

  const preBalance = tx.meta.preBalances[receiverIndex];
  const postBalance = tx.meta.postBalances[receiverIndex];
  const received = postBalance - preBalance;

  const verified = Math.abs(received - expectedLamports) <= toleranceLamports;
  if (!verified) {
    logger.warn("amount_mismatch", { received, expectedLamports, txHash });
  }
  return verified;
}

export async function verifyPayment({ treasuryWallet, expectedAmountSol, walletAddress, txHash }) {
  if (process.env.MOCK_MODE === "true") {
    logger.info("mock_payment_verified", { walletAddress, expectedAmountSol });
    return { verified: true, txHash: "MOCK_" + Date.now() };
  }

  try {
    const conn = getConnection();

    if (txHash) {
      const verified = await verifySpecificTransaction({
        conn,
        txHash,
        treasuryWallet,
        expectedAmountSol,
        walletAddress,
      });

      if (verified) {
        logger.info("payment_verified_by_hash", { txHash, walletAddress });
        return { verified: true, txHash };
      }

      logger.warn("payment_hash_verification_failed", { txHash, walletAddress });
      return { verified: false, txHash: null };
    }

    const treasury = new PublicKey(treasuryWallet);
    const signatures = await withRetry(() =>
      conn.getSignaturesForAddress(treasury, { limit: 50 }, "finalized")
    );

    const expectedLamports = Math.round(expectedAmountSol * LAMPORTS_PER_SOL);
    const toleranceLamports = Math.round(expectedLamports * 0.02);

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

        const receiverIndex = accountKeys.findIndex((k) => k.toString() === treasuryWallet);
        if (receiverIndex === -1) continue;

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
