import pg from "pg";
import { applySchema } from "./schema.js";
const { Pool } = pg;

let pool;

export function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    pool.on("error", (err) => {
      console.error("Unexpected PostgreSQL pool error", err);
    });
  }
  return pool;
}

export async function initDb() {
  const pool = getDb();
  await applySchema(pool);
}
