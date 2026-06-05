import { getDb } from "../db/index.js";
import crypto from "crypto";

let cachedSecret = null;

export function getOrCreateWalletAuthSecret() {
  if (cachedSecret) return cachedSecret;

  if (process.env.WALLET_AUTH_SECRET) {
    cachedSecret = process.env.WALLET_AUTH_SECRET;
    return cachedSecret;
  }

  const db = getDb();
  const existing = db.prepare("SELECT value FROM system_kv WHERE key = 'wallet_auth_secret'").get();
  if (existing) {
    cachedSecret = existing.value;
    return cachedSecret;
  }

  const secret = crypto.randomBytes(48).toString("hex");
  db.prepare("INSERT INTO system_kv (key, value) VALUES (?, ?)").run("wallet_auth_secret", secret);
  cachedSecret = secret;
  return cachedSecret;
}
