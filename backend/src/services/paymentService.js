import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/index.js";
import { logger } from "../utils/logger.js";

export async function createPendingTransaction({ walletAddress, pageId, amountSol, amountUsd, plan }) {
  const pool = getDb();
  const id = uuidv4();
  const referenceId = "REF-" + uuidv4().split("-")[0].toUpperCase();
  const now = Math.floor(Date.now() / 1000);

  await pool.query(
    "INSERT INTO transactions (id, wallet_address, page_id, reference_id, amount_sol, amount_usd, plan, confirmed, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)",
    [id, walletAddress, pageId, referenceId, amountSol, amountUsd, plan, now]
  );

  logger.info("transaction_created", { id, referenceId, pageId, amountSol });
  return { id, referenceId };
}

export async function getTransactionByReference(referenceId) {
  const pool = getDb();
  const result = await pool.query(
    "SELECT * FROM transactions WHERE reference_id = $1",
    [referenceId]
  );
  return result.rows[0] || null;
}

export async function isTransactionAlreadyConfirmed(txHash) {
  const pool = getDb();
  const result = await pool.query(
    "SELECT id FROM transactions WHERE tx_hash = $1 AND confirmed = 1",
    [txHash]
  );
  return result.rows.length > 0;
}

export async function confirmTransaction(referenceId, txHash) {
  const pool = getDb();
  const now = Math.floor(Date.now() / 1000);
  await pool.query(
    "UPDATE transactions SET confirmed = 1, tx_hash = $1, confirmed_at = $2 WHERE reference_id = $3",
    [txHash || "mock", now, referenceId]
  );
  logger.info("transaction_confirmed", { referenceId, txHash });
}
