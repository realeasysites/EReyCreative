const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// On Render, point DB_PATH at the persistent disk (e.g. /var/data/erik.db) so inquiries survive deploys.
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'erik.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS inquiries (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  category     TEXT    NOT NULL DEFAULT 'general',   -- architecture | photography | general
  topic        TEXT    NOT NULL DEFAULT '',
  name         TEXT    NOT NULL,
  email        TEXT    NOT NULL,
  phone        TEXT    NOT NULL DEFAULT '',
  project_type TEXT    NOT NULL DEFAULT '',
  location     TEXT    NOT NULL DEFAULT '',
  timeline     TEXT    NOT NULL DEFAULT '',
  budget       TEXT    NOT NULL DEFAULT '',
  message      TEXT    NOT NULL DEFAULT '',
  status       TEXT    NOT NULL DEFAULT 'new',       -- new | contacted | in progress | won | closed
  notes        TEXT    NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_category ON inquiries (category);
`);

module.exports = db;
