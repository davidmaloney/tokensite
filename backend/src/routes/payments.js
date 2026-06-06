router.post("/confirm-tx", async (req, res) => {
  const { referenceId, txHash } = req.body;
  if (!referenceId || !txHash) return res.status(400).json({ error: "Missing fields" });

  const tx = getTransactionByReference(referenceId);
  if (!tx) return res.status(404).json({ error: "Transaction not found" });

  if (isTransactionAlreadyConfirmed(txHash)) {
    return res.status(400).json({ error: "Transaction already used." });
  }

  await confirmTransaction(referenceId, txHash);
  await activatePage(tx.page_id, tx.plan);
  logger.info("tx_confirmed_direct", { referenceId, txHash });
  res.json({ confirmed: true });
});
