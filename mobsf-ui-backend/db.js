const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch {}

const DB_PATH = path.join(DATA_DIR, 'mobsf-ui.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS report_metadata (
    hash TEXT PRIMARY KEY,
    favorite INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS report_tags (
    hash TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (hash, tag),
    FOREIGN KEY (hash) REFERENCES report_metadata(hash) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS annotations (
    id TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    text TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TEXT NOT NULL,
    created_by TEXT,
    finding_id TEXT,
    FOREIGN KEY (hash) REFERENCES report_metadata(hash) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS shareable_links (
    token TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    expires_at TEXT,
    max_views INTEGER,
    views INTEGER DEFAULT 0,
    password_hash TEXT,
    created_at TEXT NOT NULL,
    created_by TEXT,
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_report_tags_tag ON report_tags(tag)`,
  `CREATE INDEX IF NOT EXISTS idx_annotations_hash ON annotations(hash)`
];

migrations.forEach(sql => db.prepare(sql).run());

module.exports = db;

