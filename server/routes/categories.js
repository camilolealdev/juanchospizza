import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const router = express.Router();

// CATEGORIES
router.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

router.post('/api/categories', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, icon, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const sanitized = {
      name: String(name).slice(0, 100),
      icon: (icon !== undefined && icon !== null) ? String(icon).slice(0, 50) : null,
      color: (color !== undefined && color !== null) ? String(color).slice(0, 50) : null
    };

    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO categories (id, name, icon, color) VALUES ($1,$2,$3,$4)`,
      [id, sanitized.name, sanitized.icon, sanitized.color]
    );

    res.status(201).json({ id, ...sanitized });
  } catch (e) {
    res.status(500).json({ error: 'Error creating category' });
  }
});

router.put('/api/categories/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, icon, color } = req.body;

    const updates = [];
    const params = [];
    if (name !== undefined) { params.push(String(name).slice(0, 100)); updates.push(`name = $${params.length}`); }
    if (icon !== undefined) { params.push(icon !== null ? String(icon).slice(0, 50) : null); updates.push(`icon = $${params.length}`); }
    if (color !== undefined) { params.push(color !== null ? String(color).slice(0, 50) : null); updates.push(`color = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Category not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating category' });
  }
});

router.delete('/api/categories/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting category' });
  }
});

export default router;
