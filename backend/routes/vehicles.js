const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function parseVehicle(row) {
  if (!row) return null;
  return {
    ...row,
    images: JSON.parse(row.images || '[]'),
    price: Number(row.price),
  };
}

// GET /api/vehicles  — public, used by storefront
router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM vehicles ORDER BY created_at DESC').all();
  res.json(rows.map(parseVehicle));
});

// GET /api/vehicles/:id  — public
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Vehicle not found' });
  res.json(parseVehicle(row));
});

// POST /api/vehicles  — admin only
router.post('/', requireAuth, (req, res) => {
  const { name, price, category, power_type, status, images, description, video_url } = req.body || {};

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Vehicle name is required' });
  }

  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO vehicles (id, name, price, category, power_type, status, images, description, video_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name.trim(),
    Number(price) || 0,
    category || 'Used',
    power_type || 'Fuel',
    status || 'Available',
    JSON.stringify(Array.isArray(images) ? images : []),
    description || '',
    video_url || '',
    now,
    now
  );

  const vehicle = parseVehicle(db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id));
  res.status(201).json(vehicle);
});

// PUT /api/vehicles/:id  — admin only
router.put('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

  const { name, price, category, power_type, status, images, description, video_url } = req.body || {};

  db.prepare(`
    UPDATE vehicles
    SET name = ?, price = ?, category = ?, power_type = ?, status = ?,
        images = ?, description = ?, video_url = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name !== undefined ? name.trim() : existing.name,
    price !== undefined ? Number(price) : existing.price,
    category !== undefined ? category : existing.category,
    power_type !== undefined ? power_type : existing.power_type,
    status !== undefined ? status : existing.status,
    images !== undefined ? JSON.stringify(Array.isArray(images) ? images : []) : existing.images,
    description !== undefined ? description : existing.description,
    video_url !== undefined ? video_url : existing.video_url,
    new Date().toISOString(),
    req.params.id
  );

  const vehicle = parseVehicle(db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id));
  res.json(vehicle);
});

// DELETE /api/vehicles/:id  — admin only
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM vehicles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Vehicle not found' });

  db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
  res.json({ message: 'Vehicle deleted' });
});

// POST /api/vehicles/import-sheet  — admin only, import from Google Sheets CSV
router.post('/import-sheet', requireAuth, async (req, res) => {
  const db = getDb();
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'google_sheet_url'").get();
  const sheetUrl = setting ? setting.value : null;

  if (!sheetUrl) {
    return res.status(400).json({ error: 'Google Sheet URL not configured in settings' });
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${sheetUrl}&t=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csv = await response.text();

    const lines = csv.trim().split('\n').slice(1); // skip header
    let imported = 0;
    let skipped = 0;
    let rateUpdated = false;

    const upsert = db.prepare(`
      INSERT INTO vehicles (id, name, price, category, power_type, status, images, description, video_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, price = excluded.price, category = excluded.category,
        power_type = excluded.power_type, status = excluded.status,
        images = excluded.images, description = excluded.description,
        video_url = excluded.video_url, updated_at = datetime('now')
    `);

    for (const line of lines) {
      const cols = parseCSVLine(line);
      if (cols.length < 2) { skipped++; continue; }

      const [id, name, price, category, power, status, imagesRaw, description, video] = cols;

      if (!id || !name || name.trim().length <= 2) { skipped++; continue; }

      if (id.trim().toUpperCase() === 'RATE') {
        const rate = parseFloat(price);
        if (!isNaN(rate)) {
          db.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'exchange_rate'").run(String(rate));
          rateUpdated = true;
        }
        skipped++;
        continue;
      }

      const imageList = (imagesRaw || '').split(',').map(u => u.trim()).filter(Boolean);

      upsert.run(
        id.trim(),
        name.trim(),
        parseFloat(price) || 0,
        category || 'Used',
        power || 'Fuel',
        status || 'Available',
        JSON.stringify(imageList),
        description || '',
        video || ''
      );
      imported++;
    }

    res.json({ imported, skipped, rateUpdated, message: `Imported ${imported} vehicles from Google Sheet` });
  } catch (err) {
    console.error('[Import] Error:', err.message);
    res.status(500).json({ error: `Import failed: ${err.message}` });
  }
});

// GET /api/vehicles/stats/summary  — admin only
router.get('/stats/summary', requireAuth, (req, res) => {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM vehicles').get().count;
  const available = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'Available'").get().count;
  const sold = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'Sold'").get().count;
  const totalValue = db.prepare("SELECT SUM(price) as total FROM vehicles WHERE status = 'Available'").get().total || 0;
  const newCount = db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE LOWER(category) = 'new'").get().count;
  const usedCount = total - newCount;

  res.json({ total, available, sold, totalValue, newCount, usedCount });
});

function parseCSVLine(line) {
  const result = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(field.trim());
      field = '';
    } else {
      field += ch;
    }
  }
  result.push(field.trim());
  return result;
}

module.exports = router;
