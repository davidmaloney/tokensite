import { getDb } from "../db/index.js";
import crypto from "crypto";

let cachedSecret = null;

export async function getOrCreateWalletAuthSecret() {
  if (cachedSecret) return cachedSecret;

  if (process.env.WALLET_AUTH_SECRET) {
    cachedSecret = process.env.WALLET_AUTH_SECRET;
    return cachedSecret;
  }

  const pool = getDb();
  const existing = await pool.query(
    "SELECT value FROM system_kv WHERE key = 'wallet_auth_secret'"
  );
  if (existing.rows[0]) {
    cachedSecret = existing.rows[0].value;
    return cachedSecret;
  }

  const secret = crypto.randomBytes(48).toString("hex");
  await pool.query(
    "INSERT INTO system_kv (key, value) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    ["wallet_auth_secret", secret]
  );
  cachedSecret = secret;
  return cachedSecret;
}
