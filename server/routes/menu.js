import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// UNIFIED MENU — single endpoint that returns the full public menu in one
// response, so the frontend never has to fan out N parallel requests on load.
router.get('/api/menu', async (req, res) => {
  try {
    const [categoriesRes, productsRes, variantsRes, combosRes, promotionsRes] = await Promise.all([
      pool.query('SELECT * FROM categories ORDER BY id'),
      pool.query('SELECT * FROM products'),
      pool.query('SELECT * FROM menu_variants WHERE activo IS DISTINCT FROM false'),
      pool.query('SELECT * FROM menu_combos WHERE activo IS DISTINCT FROM false'),
      pool.query('SELECT * FROM menu_promotions WHERE activo IS DISTINCT FROM false ORDER BY activo DESC'),
    ]);

    res.json({
      categories: categoriesRes.rows,
      products: productsRes.rows,
      variants: variantsRes.rows,
      combos: combosRes.rows.map((c) => ({ ...c, productos: c.productos || [] })),
      promotions: promotionsRes.rows,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: 'Error fetching menu' });
  }
});

export default router;
