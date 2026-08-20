import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createIngredientSchema, updateIngredientSchema } from '../schemas/ingredients.js';

const router = express.Router();

// INGREDIENTS
router.get('/api/ingredients', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM ingredients';
    const params = [];

    if (category) {
      query += ' WHERE categoria = $1';
      params.push(category);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching ingredients' });
  }
});

router.post('/api/ingredients', authMiddleware, requireRole('ADMIN'), validate(createIngredientSchema), async (req, res) => {
  try {
    const sanitized = req.body;
    const id = `ing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO ingredients (id, nombre, descripcion, precio_extra, categoria, vegetariano, vegano, premium, dulce, disponible, "defaultIng") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, sanitized.nombre, sanitized.descripcion, sanitized.precio_extra, sanitized.categoria, sanitized.vegetariano, sanitized.vegano, sanitized.premium, sanitized.dulce, sanitized.disponible, sanitized.defaultIng]
    );

    res.status(201).json({ id, ...sanitized });
  } catch (e) {
    res.status(500).json({ error: 'Error creating ingredient' });
  }
});

router.put('/api/ingredients/:id', authMiddleware, requireRole('ADMIN'), validate(updateIngredientSchema), async (req, res) => {
  try {
    const { nombre, descripcion, precio_extra, categoria, vegetariano, vegano, premium, dulce, disponible, defaultIng } = req.body;

    const updates = [];
    const params = [];
    if (nombre !== undefined) { params.push(nombre); updates.push(`nombre = $${params.length}`); }
    if (descripcion !== undefined) { params.push(descripcion); updates.push(`descripcion = $${params.length}`); }
    if (precio_extra !== undefined) { params.push(precio_extra); updates.push(`precio_extra = $${params.length}`); }
    if (categoria !== undefined) { params.push(categoria); updates.push(`categoria = $${params.length}`); }
    if (vegetariano !== undefined) { params.push(vegetariano); updates.push(`vegetariano = $${params.length}`); }
    if (vegano !== undefined) { params.push(vegano); updates.push(`vegano = $${params.length}`); }
    if (premium !== undefined) { params.push(premium); updates.push(`premium = $${params.length}`); }
    if (dulce !== undefined) { params.push(dulce); updates.push(`dulce = $${params.length}`); }
    if (disponible !== undefined) { params.push(disponible); updates.push(`disponible = $${params.length}`); }
    if (defaultIng !== undefined) { params.push(defaultIng); updates.push(`"defaultIng" = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE ingredients SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM ingredients WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Ingredient not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating ingredient' });
  }
});

router.delete('/api/ingredients/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ingredients WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting ingredient' });
  }
});

export default router;
