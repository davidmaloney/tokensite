import express from "express";
import { Connection, Transaction } from "@solana/web3.js";
import { getPlanWithSol, getSolPriceUsd } from "../services/pricingService.js";
import {
  createPendingTransaction,
  getTransactionByReference,
  confirmTransaction,
  isTransactionAlreadyConfirmed,
} from "../services/paymentService.js";
import { getPageById, activatePage } from "../services/pageService.js";
import { verifyPayment } from "../solana/verifier.js";
import { logger } from "../utils/logger.js";
import { getDb } from "../db/index.js";
import { paymentRateLimiter } from "../middleware/rateLimiter.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

router.use(paymentRateLimiter);

let blockhashCache = null;
let blockhashCacheTs = 0;
const BLOCKHASH_TTL = 10 * 1000;

async function getCachedBlockhash() {
  if (blockhashCache && Date.now() - blockhashCacheTs < BLOCKHASH_TTL) {
    return blockhashCache;
  }
  const conn = new Connection(process.env.SOLANA_RPC_URL, "finalized");
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  blockhashCache = { blockhash, lastValidBlockHeight };
  blockhashCacheTs = Date.now();
  return blockhashCache;
}

router.get("/sol-rate", async (req, res) => {
  try {
    const price = await getSolPriceUsd();
    res.json({ usdPerSol: price, solPerUsd: 1 / price });
  } catch (err) {
    logger.error("sol_rate_error", { err: err.message });
    res.status(500).json({ error: "Failed to get SOL price" });
  }
});

router.get("/blockhash", async (req, res) => {
  try {
    const { blockhash, lastValidBlockHeight } = await getCachedBlockhash();
    res.json({ blockhash, lastValidBlockHeight });
  } catch (err) {
    logger.error("blockhash_error", { err: err.message });
    res.status(500).json({ error: "Failed to get blockhash" });
  }
});

router.post("/simulate", async (req, res) => {
  const { transaction: serializedTx } = req.body;
  if (!serializedTx) return res.status(400).json({ error: "transaction required" });

  try {
    const conn = new Connection(process.env.SOLANA_RPC_URL, "finalized");
    const txBuffer = Buffer.from(serializedTx, "base64");
    const tx = Transaction.from(txBuffer);

    const simulation = await conn.simulateTransaction(tx, {
      sigVerify: false,
      replaceRecentBlockhash: true,
    });

    if (simulation.value.err) {
      logger.warn("simulation_failed", { err: simulation.value.err });
      return res.json({ success: false, error: simulation.value.err });
    }

    logger.info("simulation_passed");
    res.json({ success: true });
  } catch (err) {
    logger.error("simulate_error", { err: err.message });
    res.status(500).json({ error: "Simulation failed" });
  }
});

router.post("/initiate", async (req, res) => {
  const { pageId, plan, ownerCode } = req.body;
  if (!pageId || !plan) return res.status(400).json({ error: "pageId and plan required" });

  const page = await getPageById(pageId);
  if (!page) return res.status(404).json({ error: "Page not found" });

  // Owner code — full access, any plan
  if (ownerCode && ownerCode === process.env.OWNER_ACCESS_CODE) {
    await activatePage(pageId, plan);
    const pool = getDb();
    const now = Math.floor(Date.now() / 1000);
    const ownerId = uuidv4();
    await pool.query(
      "INSERT INTO transactions (id, wallet_address, page_id, reference_id, amount_sol, amount_usd, plan, confirmed, created_at, confirmed_at) VALUES ($1, $2, $3, $4, 0, 0, $5, 1, $6, $7)",
      [ownerId, page.wallet_address, pageId, "OWNER-" + uuidv4(), plan, now, now]
    );
    logger.info("owner_code_activation", { pageId, plan });
    return res.json({ activated: true });
  }

  // Promo code — always 1 month free, regardless of selected plan
  if (ownerCode && process.env.PROMO_CODE && ownerCode === process.env.PROMO_CODE) {
    await activatePage(pageId, "1month");
    const pool = getDb();
    const now = Math.floor(Date.now() / 1000);
    const promoId = uuidv4();
    await pool.query(
      "INSERT INTO transactions (id, wallet_address, page_id, reference_id, amount_sol, amount_usd, plan, confirmed, created_at, confirmed_at) VALUES ($1, $2, $3, $4, 0, 0, $5, 1, $6, $7)",
      [promoId, page.wallet_address, pageId, "PROMO-" + uuidv4(), "1month", now, now]
    );
    logger.info("promo_code_activation", { pageId });
    return res.json({ activated: true });
  }

  try {
    const planData = await getPlanWithSol(plan);
    const tx = await createPendingTransaction({
      walletAddress: page.wallet_address,
      pageId,
      amountSol: planData.solAmount,
      amountUsd: planData.usd,
      plan,
    });

    res.json({
      referenceId: tx.referenceId,
      amountSol: planData.solAmount,
      amountUsd: planData.usd,
      treasuryWallet: process.env.TREASURY_WALLET,
      plan: planData,
    });
  } catch (err) {
    logger.error("payment_initiate_error", { err: err.message });
    res.status(500).json({ error: "Failed to initiate payment." });
  }
});

router.get("/status/:referenceId", async (req, res) => {
  const { referenceId } = req.params;
  const tx = await getTransactionByReference(referenceId);
  if (!tx) return res.status(404).json({ error: "Transaction not found" });

  if (tx.confirmed) {
    return res.json({ confirmed: true, referenceId });
  }

  try {
    const result = await verifyPayment({
      treasuryWallet: process.env.TREASURY_WALLET,
      expectedAmountSol: tx.amount_sol,
      walletAddress: tx.wallet_address,
    });

    if (result.verified) {
      if (result.txHash && await isTransactionAlreadyConfirmed(result.txHash)) {
        return res.status(400).json({ error: "Transaction already used." });
      }
      await confirmTransaction(referenceId, result.txHash);
      await activatePage(tx.page_id, tx.plan);
      return res.json({ confirmed: true, referenceId });
    }

    res.json({ confirmed: false, referenceId });
  } catch (err) {
    logger.error("payment_status_error", { err: err.message });
    res.status(500).json({ error: "Verification error." });
  }
});

router.post("/confirm-tx", async (req, res) => {
  const { referenceId, txHash } = req.body;
  if (!referenceId || !txHash) return res.status(400).json({ error: "Missing fields" });

  const tx = await getTransactionByReference(referenceId);
  if (!tx) return res.status(404).json({ error: "Transaction not found" });

  if (await isTransactionAlreadyConfirmed(txHash)) {
    return res.status(400).json({ error: "Transaction already used." });
  }

  try {
    const result = await verifyPayment({
      treasuryWallet: process.env.TREASURY_WALLET,
      expectedAmountSol: tx.amount_sol,
      walletAddress: tx.wallet_address,
      txHash,
    });

    if (!result.verified) {
      logger.warn("confirm_tx_verification_failed", { referenceId, txHash });
      return res.status(400).json({ error: "Transaction could not be verified on-chain." });
    }

    await confirmTransaction(referenceId, txHash);
    await activatePage(tx.page_id, tx.plan);
    logger.info("tx_confirmed_direct", { referenceId, txHash });
    res.json({ confirmed: true });
  } catch (err) {
    logger.error("confirm_tx_error", { err: err.message });
    res.status(500).json({ error: "Verification failed." });
  }
});

export default router;
