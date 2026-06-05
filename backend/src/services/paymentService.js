import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/index.js";
import { dbWriteQueue } from "../utils/asyncQueue.js";
import { logger } from "../utils/logger.js";

export function createPendingTransaction({ walletAddress, pageId, amountSol, amountUsd, plan }) {
  const db = getDb();
  const id = uuidv4();
  const referenceId = `REF-${uuidv4().split("-")[0].toUpperCase()}`;
  const now = Math.floor(Date.now() / 1000);

  db.prepare(`
    INSERT INTO transactions (id, wallet_address, page_id, reference_id, amount_sol, amount_usd, plan, confirmed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, walletAddress, pageId, referenceId, amountSol, amountUsd, plan, now);

  logger.info("transaction_created", { id, referenceId, pageId, amountSol });
  return { id, referenceId };
}

export function getTransactionByReference(referenceId) {
  const db = getDb();
  return db.prepare("SELECT * FROM transactions WHERE reference_id = ?").get(referenceId);
}

export function isTransactionAlreadyConfirmed(txHash) {
  const db = getDb();
  const row = db.prepare("SELECT id FROM transactions WHERE tx_hash = ? AND confirmed = 1").get(txHash);
  return !!row;
}

export async function confirmTransaction(referenceId, txHash) {
  return dbWriteQueue.push(() => {
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      UPDATE transactions SET confirmed = 1, tx_hash = ?, confirmed_at = ? WHERE reference_id = ?
    `).run(txHash || "mock", now, referenceId);
    logger.info("transaction_confirmed", { referenceId, txHash });
  });
}
