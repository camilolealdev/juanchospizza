import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createProductSchema, updateProductSchema } from '../schemas/products.js';

const router = express.Router();

// PRODUCTS
router.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM products';
    const params = [];

    if (category && category !== 'all') {
      query += ' WHERE "categoryId" = $1';
      params.push(category);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching products' });
  }
});

router.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error fetching product' });
  }
});

router.post('/api/products', authMiddleware, requireRole('ADMIN'), validate(createProductSchema), async (req, res) => {
  try {
    const sanitized = req.body;
    const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO products (id, "categoryId", nombre, descripcion, "basePrice", type, image, tiempo, popularidad, vegetariano, "isPremium", exclusiva) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        id,
        sanitized.categoryId,
        sanitized.nombre,
        sanitized.descripcion,
        sanitized.basePrice,
        sanitized.type,
        sanitized.image,
        sanitized.tiempo,
        sanitized.popularidad,
        sanitized.vegetariano,
        sanitized.isPremium,
        sanitized.exclusiva,
      ]
    );

    res.status(201).json({ id, ...sanitized });
  } catch (e) {
    res.status(500).json({ error: 'Error creating product' });
  }
});

// Bulk import (CSV upload from the frontend, parsed client-side into rows --
// no multipart/file handling needed here, just an array of the same shape
// POST /api/products already accepts). Best-effort per row: one bad row
// (missing name, category that doesn't exist, etc.) doesn't block the rest --
// a 500-row CSV with 3 typos shouldn't force re-uploading the other 497.
router.post('/api/products/bulk', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  const rows = Array.isArray(req.body?.products) ? req.body.products : null;
  if (!rows || rows.length === 0) {
    return res.status(400).json({ error: 'Se esperaba { products: [...] } con al menos un producto' });
  }
  if (rows.length > 1000) {
    return res.status(400).json({ error: 'Máximo 1000 productos por carga' });
  }

  const errors = [];
  let inserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const parsed = createProductSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errors.push({
        row: i + 1,
        nombre: rows[i]?.nombre,
        error: parsed.error.issues.map((iss) => iss.message).join('; '),
      });
      continue;
    }
    const sanitized = parsed.data;
    try {
      const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${i}`;
      await pool.query(
        `INSERT INTO products (id, "categoryId", nombre, descripcion, "basePrice", type, image, tiempo, popularidad, vegetariano, "isPremium", exclusiva) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          id,
          sanitized.categoryId,
          sanitized.nombre,
          sanitized.descripcion,
          sanitized.basePrice,
          sanitized.type,
          sanitized.image,
          sanitized.tiempo,
          sanitized.popularidad,
          sanitized.vegetariano,
          sanitized.isPremium,
          sanitized.exclusiva,
        ]
      );
      inserted++;
    } catch (e) {
      errors.push({ row: i + 1, nombre: sanitized.nombre, error: 'Error de base de datos' });
    }
  }

  res.status(errors.length && !inserted ? 400 : 201).json({ inserted, errors });
});

router.put(
  '/api/products/:id',
  authMiddleware,
  requireRole('ADMIN'),
  validate(updateProductSchema),
  async (req, res) => {
    try {
      const {
        categoryId,
        nombre,
        descripcion,
        basePrice,
        type,
        image,
        tiempo,
        popularidad,
        vegetariano,
        isPremium,
        exclusiva,
      } = req.body;

      const updates = [];
      const params = [];
      if (categoryId !== undefined) {
        params.push(categoryId);
        updates.push(`"categoryId" = $${params.length}`);
      }
      if (nombre !== undefined) {
        params.push(nombre);
        updates.push(`nombre = $${params.length}`);
      }
      if (descripcion !== undefined) {
        params.push(descripcion);
        updates.push(`descripcion = $${params.length}`);
      }
      if (basePrice !== undefined) {
        params.push(basePrice);
        updates.push(`"basePrice" = $${params.length}`);
      }
      if (type !== undefined) {
        params.push(type);
        updates.push(`type = $${params.length}`);
      }
      if (image !== undefined) {
        params.push(image);
        updates.push(`image = $${params.length}`);
      }
      if (tiempo !== undefined) {
        params.push(tiempo);
        updates.push(`tiempo = $${params.length}`);
      }
      if (popularidad !== undefined) {
        params.push(popularidad);
        updates.push(`popularidad = $${params.length}`);
      }
      if (vegetariano !== undefined) {
        params.push(vegetariano);
        updates.push(`vegetariano = $${params.length}`);
      }
      if (isPremium !== undefined) {
        params.push(isPremium);
        updates.push(`"isPremium" = $${params.length}`);
      }
      if (exclusiva !== undefined) {
        params.push(exclusiva);
        updates.push(`exclusiva = $${params.length}`);
      }

      if (updates.length) {
        params.push(req.params.id);
        await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
      }

      const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);

      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Product not found' });
      }
    } catch (e) {
      res.status(500).json({ error: 'Error updating product' });
    }
  }
);

router.delete('/api/products/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting product' });
  }
});

export default router;
