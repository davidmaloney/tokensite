export async function applySchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      wallet_address TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      template_id TEXT NOT NULL DEFAULT 'template_1',
      content_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'inactive',
      expires_at INTEGER,
      soft_deleted_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER,
      updated_at INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER,
      FOREIGN KEY (wallet_address) REFERENCES users(wallet_address)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      page_id TEXT NOT NULL,
      tx_hash TEXT,
      reference_id TEXT NOT NULL UNIQUE,
      amount_sol REAL,
      amount_usd REAL,
      plan TEXT,
      confirmed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER,
      confirmed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS deleted_slugs (
      slug TEXT PRIMARY KEY,
      deleted_at INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER,
      reason TEXT
    );

    CREATE TABLE IF NOT EXISTS system_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pages_wallet ON pages(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
    CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
    CREATE INDEX IF NOT EXISTS idx_pages_expires_at ON pages(expires_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_page ON transactions(page_id);
  `);

  // --- Migration: contract-address change counter (safe, idempotent) ---
  // Adds ca_changes_used to existing 'pages' tables without disturbing rows.
  // Postgres ADD COLUMN IF NOT EXISTS does nothing if the column already exists;
  // existing rows automatically receive the DEFAULT 0 (i.e. a full 3 changes left).
  await pool.query(
    "ALTER TABLE pages ADD COLUMN IF NOT EXISTS ca_changes_used INTEGER NOT NULL DEFAULT 0"
  );

  // --- Migration: buy-links change counter (safe, idempotent) ---
  // NOTE: the buy button is now derived from the contract address (+ chain pick),
  // which has its own change limit, so there is no longer a separate buy-links
  // lock. This column is kept (unused) so existing databases and rows are never
  // broken by its removal; the code simply carries its value unchanged.
  await pool.query(
    "ALTER TABLE pages ADD COLUMN IF NOT EXISTS buylinks_changes_used INTEGER NOT NULL DEFAULT 0"
  );
}
