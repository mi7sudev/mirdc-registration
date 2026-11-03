import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export type AttendeeRow = {
  id: string;
  attendance: "yes" | "no";
  surname: string | null;
  first_name: string | null;
  middle_initial: string | null;
  extension_name: string | null;
  agency: string | null;
  position: string | null;
  email: string | null;
  contact_number: string | null;
  privacy_consent: number;
  qr_token: string | null;
  checked_in_at: string | null;
  created_at: string;
};

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const dbPath =
    process.env.DB_PATH || path.join(dataDir, "attendees.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendees (
      id TEXT PRIMARY KEY,
      attendance TEXT NOT NULL CHECK (attendance IN ('yes','no')),
      surname TEXT,
      first_name TEXT,
      middle_initial TEXT,
      extension_name TEXT,
      agency TEXT,
      position TEXT,
      email TEXT,
      contact_number TEXT,
      privacy_consent INTEGER NOT NULL DEFAULT 0,
      qr_token TEXT UNIQUE,
      checked_in_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      email_sent_at TEXT -- ISO datetime of last successful QR email (null = never sent)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_attendees_qr ON attendees(qr_token);
    CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  // Lightweight migration for DBs created before email tracking existed.
  try {
    const cols = db.prepare(`PRAGMA table_info(attendees)`).all() as { name: string }[];
    if (!cols.some((c) => c.name === "email_sent_at")) {
      db.exec(`ALTER TABLE attendees ADD COLUMN email_sent_at TEXT`);
    }
  } catch {
    /* fresh DBs already include the column below */
  }
  return db;
}

const TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateToken(): string {
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += TOKEN_ALPHABET[Math.floor(Math.random() * TOKEN_ALPHABET.length)];
  }
  return `MIRDC-${s}`;
}

export function newId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}
