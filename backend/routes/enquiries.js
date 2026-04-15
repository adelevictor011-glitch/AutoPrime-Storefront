const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/enquiries  — public, called by storefront forms
router.post('/', (req, res) => {
  const { type, name, phone, email, make, model, budget, message, vehicle_id, vehicle_name } = req.body || {};

  if (!type) {
    return res.status(400).json({ error: 'Enquiry type is required' });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO enquiries (type, name, phone, email, make, model, budget, message, vehicle_id, vehicle_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    type,
    name || null,
    phone || null,
    email || null,
    make || null,
    model || null,
    budget || null,
    message || null,
    vehicle_id || null,
    vehicle_name || null
  );

  res.status(201).json({ id: result.lastInsertRowid, message: 'Enquiry submitted' });
});

// GET /api/enquiries  — admin only
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { status, type, limit = 100, offset = 0 } = req.query;

  let query = 'SELECT * FROM enquiries WHERE 1=1';
  const params = [];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (type) { query += ' AND type = ?'; params.push(type); }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const rows = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM enquiries').get().count;
  const newCount = db.prepare("SELECT COUNT(*) as count FROM enquiries WHERE status = 'new'").get().count;

  res.json({ enquiries: rows, total, newCount });
});

// GET /api/enquiries/:id  — admin only
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Enquiry not found' });
  res.json(row);
});

// PUT /api/enquiries/:id  — admin only (update status)
router.put('/:id', requireAuth, (req, res) => {
  const { status, message } = req.body || {};
  const VALID_STATUSES = ['new', 'in_progress', 'closed'];

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Enquiry not found' });

  db.prepare(`
    UPDATE enquiries SET status = ?, message = ?, updated_at = datetime('now') WHERE id = ?
  `).run(
    status || existing.status,
    message !== undefined ? message : existing.message,
    Number(req.params.id)
  );

  res.json(db.prepare('SELECT * FROM enquiries WHERE id = ?').get(Number(req.params.id)));
});

// DELETE /api/enquiries/:id  — admin only
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM enquiries WHERE id = ?').get(Number(req.params.id));
  if (!existing) return res.status(404).json({ error: 'Enquiry not found' });
  db.prepare('DELETE FROM enquiries WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'Enquiry deleted' });
});

module.exports = router;
