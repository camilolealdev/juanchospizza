import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createPizzaSizeSchema, updatePizzaSizeSchema } from '../schemas/pizzaSizes.js';

const router = express.Router();

// PIZZA SIZES -- tamaños de pizza (Small/Junior/Mediana/Familiar), usados por
// el menú de sabores fijos y por el armador "Crea tu pizza". Ver server/db.js.
router.get('/api/pizza-sizes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pizza_sizes ORDER BY precio ASC');
    res.json(result.rows);
  } catch (_e) {
    res.status(500).json({ error: 'Error fetching pizza sizes' });
  }
});

router.post(
  '/api/pizza-sizes',
  authMiddleware,
  requireRole('ADMIN', 'MARKETING'),
  validate(createPizzaSizeSchema),
  async (req, res) => {
    try {
      const sanitized = req.body;
      const id = `psz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await pool.query(
        `INSERT INTO pizza_sizes (id, nombre, precio, incluidos, porciones, activo) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, sanitized.nombre, sanitized.precio, sanitized.incluidos, sanitized.porciones, sanitized.activo]
      );

      res.status(201).json({ id, ...sanitized });
    } catch (_e) {
      res.status(500).json({ error: 'Error creating pizza size' });
    }
  }
);

router.put(
  '/api/pizza-sizes/:id',
  authMiddleware,
  requireRole('ADMIN', 'MARKETING'),
  validate(updatePizzaSizeSchema),
  async (req, res) => {
    try {
      const { nombre, precio, incluidos, porciones, activo } = req.body;

      const updates = [];
      const params = [];
      if (nombre !== undefined) {
        params.push(nombre);
        updates.push(`nombre = $${params.length}`);
      }
      if (precio !== undefined) {
        params.push(precio);
        updates.push(`precio = $${params.length}`);
      }
      if (incluidos !== undefined) {
        params.push(incluidos);
        updates.push(`incluidos = $${params.length}`);
      }
      if (porciones !== undefined) {
        params.push(porciones);
        updates.push(`porciones = $${params.length}`);
      }
      if (activo !== undefined) {
        params.push(activo);
        updates.push(`activo = $${params.length}`);
      }

      if (updates.length) {
        params.push(req.params.id);
        await pool.query(`UPDATE pizza_sizes SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
      }

      const result = await pool.query('SELECT * FROM pizza_sizes WHERE id = $1', [req.params.id]);

      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Pizza size not found' });
      }
    } catch (_e) {
      res.status(500).json({ error: 'Error updating pizza size' });
    }
  }
);

router.delete('/api/pizza-sizes/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pizza_sizes WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pizza size not found' });
    }

    res.json({ success: true });
  } catch (_e) {
    res.status(500).json({ error: 'Error deleting pizza size' });
  }
});

export default router;
