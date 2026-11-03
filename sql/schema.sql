-- DOST-MIRDC 3D Concrete Printing — local SQLite schema
-- For local-server deployment. DB file: ./data/attendees.db (auto-created).
-- If you prefer a real .db file checked in, run: sqlite3 data/attendees.db < sql/schema.sql

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
  qr_token TEXT UNIQUE, -- only for attendance='yes', e.g. 'MIRDC-' + 8 chars
  checked_in_at TEXT,   -- ISO datetime UTC, set on check-in
  created_at TEXT DEFAULT (datetime('now')),
  email_sent_at TEXT    -- ISO datetime of last successful QR email (null = never sent)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendees_qr ON attendees(qr_token);
CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email);
