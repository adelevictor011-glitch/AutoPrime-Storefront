const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings  — public (storefront needs exchange_rate, whatsapp_number)
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

// PUT /api/settings  — admin only (bulk upsert)
router.put('/', requireAuth, (req, res) => {
  const updates = req.body || {};
  if (typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'Body must be a JSON object of key-value pairs' });
  }

  const ALLOWED_KEYS = new Set([
    'exchange_rate',
    'whatsapp_number',
    'business_name',
    'google_sheet_url',
    'sheet_sync_enabled',
  ]);

  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
  `);

  const updated = [];
  for (const [key, value] of Object.entries(updates)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    upsert.run(key, String(value));
    updated.push(key);
  }

  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;

  res.json({ updated, settings });
});

module.exports = router;
