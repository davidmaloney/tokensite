import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { applySchema } from "./schema.js";

const DB_PATH = process.env.DB_PATH || "/data/database.sqlite";

let db;

export function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    applySchema(db);
  }
  return db;
}
