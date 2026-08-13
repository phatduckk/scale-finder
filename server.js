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

// Finds a name that isn't already taken (the UNIQUE constraint on songs.name
// applies regardless of trash state), appending " 2", " 3", etc. as needed —
// used so naming/renaming never has to block on a conflict dialog.
async function uniqueName(base, excludeId) {
  let name = base;
  let n = 2;
  while (true) {
    const [rows] = excludeId
      ? await pool.query('SELECT id FROM songs WHERE name = ? AND id != ?', [name, excludeId])
      : await pool.query('SELECT id FROM songs WHERE name = ?', [name]);
    if (rows.length === 0) return name;
    name = `${base} ${n}`;
    n++;
  }
}

// List all (non-trashed) songs
app.get('/api/songs', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM songs WHERE trashed_at IS NULL ORDER BY created_at DESC');
  res.json(rows);
});

// List trashed songs
app.get('/api/songs/trash', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM songs WHERE trashed_at IS NOT NULL ORDER BY trashed_at DESC');
  res.json(rows);
});

// Save a song
app.post('/api/songs', async (req, res) => {
  const { name, notes } = req.body;
  if (!name || !Array.isArray(notes)) return res.status(400).json({ error: 'name and notes required' });
  try {
    const { scales } = req.body;
    const finalName = await uniqueName(name);
    const [result] = await pool.query(
      'INSERT INTO songs (name, notes, scales) VALUES (?, ?, ?)',
      [finalName, JSON.stringify(notes), scales ? JSON.stringify(scales) : null]
    );
    const [rows]   = await pool.query('SELECT * FROM songs WHERE id = ?', [result.insertId]);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'duplicate' });
    throw err;
  }
});

// Update a song (notes, scales, and/or rename)
app.patch('/api/songs/:id', async (req, res) => {
  const { notes, scales, name } = req.body;
  const sets = [], vals = [];
  if (notes  !== undefined) { sets.push('notes = ?');  vals.push(JSON.stringify(notes)); }
  if (scales !== undefined) { sets.push('scales = ?'); vals.push(JSON.stringify(scales)); }
  if (name   !== undefined) { sets.push('name = ?');   vals.push(await uniqueName(name, req.params.id)); }
  if (!sets.length) return res.status(400).json({ error: 'nothing to update' });
  vals.push(req.params.id);
  await pool.query(`UPDATE songs SET ${sets.join(', ')} WHERE id = ?`, vals);
  const [rows] = await pool.query('SELECT * FROM songs WHERE id = ?', [req.params.id]);
  res.json(rows[0]);
});

// Move a song to trash (soft delete — recoverable via restore)
app.put('/api/songs/:id/trash', async (req, res) => {
  await pool.query('UPDATE songs SET trashed_at = NOW() WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// Restore a trashed song — renamed automatically if its name was taken while it was gone
app.put('/api/songs/:id/restore', async (req, res) => {
  const [rows] = await pool.query('SELECT name FROM songs WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'not found' });
  const restoredName = await uniqueName(rows[0].name, req.params.id);
  await pool.query('UPDATE songs SET trashed_at = NULL, name = ? WHERE id = ?', [restoredName, req.params.id]);
  const [out] = await pool.query('SELECT * FROM songs WHERE id = ?', [req.params.id]);
  res.json(out[0]);
});

// Permanently delete a song (only ever reachable from the Trash section)
app.delete('/api/songs/:id', async (req, res) => {
  await pool.query('DELETE FROM songs WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Scale Finder running at http://localhost:${PORT}`));
