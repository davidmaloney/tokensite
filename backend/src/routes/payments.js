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
import { isValidUrl } from "../utils/slugValidator.js";

const router = express.Router();

router.use(paymentRateLimiter);

router.get("/sol-rate", async (req, res) => {
  const price = await getSolPriceUsd();
  res.json({ usdPerSol: price, solPerUsd: 1 / price });
});

router.get("/blockhash", async (req, res) => {
  try {
    const conn = new Connection(process.env.SOLANA_RPC_URL, "finalized");
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
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

  const page = getPageById(pageId);
  if (!page) return res.status(404).json({ error: "Page not found" });

  if (ownerCode && ownerCode === process.env.OWNER_ACCESS_CODE) {
    await activatePage(pageId, plan);
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    db.prepare(
      "INSERT OR IGNORE INTO transactions (id, wallet_address, page_id, reference_id, amount_sol, amount_usd, plan, confirmed, created_at, confirmed_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, 0, 0, ?, 1, ?, ?)"
    ).run(page.wallet_address, pageId, "OWNER-" + pageId, plan, now, now);
    logger.info("owner_code_activation", { pageId, plan });
    return res.json({ activated: true });
  }

  try {
    const planData = await getPlanWithSol(plan);
    const tx = createPendingTransaction({
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
  const tx = getTransactionByReference(referenceId);
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
      if (result.txHash && isTransactionAlreadyConfirmed(result.txHash)) {
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

  const tx = getTransactionByReference(referenceId);
  if (!tx) return res.status(404).json({ error: "Transaction not found" });

  if (isTransactionAlreadyConfirmed(txHash)) {
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
