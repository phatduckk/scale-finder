const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const pool = mysql.createPool({
  host:     'localhost',
  user:     'scales',
  password: '',
  database: 'scales',
  waitForConnections: true,
});

// Get all settings
app.get('/api/settings', async (req, res) => {
  const [rows] = await pool.query('SELECT key_name, value FROM settings');
  const out = {};
  rows.forEach(r => out[r.key_name] = r.value);
  res.json(out);
});

// Upsert a setting
app.put('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  if (!key || value === undefined) return res.status(400).json({ error: 'key and value required' });
  await pool.query(
    'INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?',
    [key, value, value]
  );
  res.json({ ok: true });
});

// List all songs
app.get('/api/songs', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM songs ORDER BY created_at DESC');
  res.json(rows);
});

// Save a song
app.post('/api/songs', async (req, res) => {
  const { name, notes } = req.body;
  if (!name || !Array.isArray(notes)) return res.status(400).json({ error: 'name and notes required' });
  try {
    const { scales } = req.body;
    const [result] = await pool.query(
      'INSERT INTO songs (name, notes, scales) VALUES (?, ?, ?)',
      [name, JSON.stringify(notes), scales ? JSON.stringify(scales) : null]
    );
    const [rows]   = await pool.query('SELECT * FROM songs WHERE id = ?', [result.insertId]);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'duplicate' });
    throw err;
  }
});

// Delete a song
app.delete('/api/songs/:id', async (req, res) => {
  await pool.query('DELETE FROM songs WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Scale Finder running at http://localhost:${PORT}`));
