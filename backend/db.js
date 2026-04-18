const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'autoprime.db');

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'Used',
      power_type TEXT NOT NULL DEFAULT 'Fuel',
      status TEXT NOT NULL DEFAULT 'Available',
      images TEXT NOT NULL DEFAULT '[]',
      description TEXT NOT NULL DEFAULT '',
      video_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'bespoke',
      name TEXT,
      phone TEXT,
      email TEXT,
      make TEXT,
      model TEXT,
      budget TEXT,
      message TEXT,
      vehicle_id TEXT,
      vehicle_name TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  seedDefaults();
}

function seedDefaults() {
  // Seed default admin if none exists
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCount.count === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'changeme123';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log(`[DB] Default admin created: username="${username}"`);
  }

  // Seed default settings
  const defaults = [
    ['exchange_rate', '1600'],
    ['whatsapp_number', '+2349122503132'],
    ['business_name', 'AutoPrime'],
    ['google_sheet_url', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0qeDSTiJkeT9UkU0XvKaoSRpjT6wxCDNeRaiXonPBvpUUo176DlEIxk_qYBDF_2v5Qu4XLim5w3ia/pub?gid=0&single=true&output=csv'],
    ['sheet_sync_enabled', 'true'],
  ];
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO NOTHING
  `);
  for (const [key, value] of defaults) {
    upsert.run(key, value);
  }
}

module.exports = { getDb };
