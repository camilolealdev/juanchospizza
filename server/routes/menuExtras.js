import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const router = express.Router();

// --- MENU VARIANTS ---
router.get('/api/menu/variants', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menu_variants ORDER BY "productoId"');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching variants' }); }
});

router.post('/api/menu/variants', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { productoId, nombre, precioModificador, activo } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const sanitized = {
      productoId: (productoId !== undefined && productoId !== null) ? String(productoId).slice(0, 50) : null,
      nombre: String(nombre).slice(0, 100),
      precioModificador: Math.max(-999999999, Math.min(Number(precioModificador || 0), 999999999)),
      activo: activo !== undefined ? !!activo : true
    };

    const id = `mva_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO menu_variants (id, "productoId", nombre, "precioModificador", activo) VALUES ($1,$2,$3,$4,$5)`,
      [id, sanitized.productoId, sanitized.nombre, sanitized.precioModificador, sanitized.activo]
    );

    res.status(201).json({ id, ...sanitized });
  } catch (e) {
    res.status(500).json({ error: 'Error creating variant' });
  }
});

router.put('/api/menu/variants/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { productoId, nombre, precioModificador, activo } = req.body;

    const updates = [];
    const params = [];
    if (productoId !== undefined) { params.push(productoId !== null ? String(productoId).slice(0, 50) : null); updates.push(`"productoId" = $${params.length}`); }
    if (nombre !== undefined) { params.push(String(nombre).slice(0, 100)); updates.push(`nombre = $${params.length}`); }
    if (precioModificador !== undefined) { params.push(Math.max(-999999999, Math.min(Number(precioModificador), 999999999))); updates.push(`"precioModificador" = $${params.length}`); }
    if (activo !== undefined) { params.push(!!activo); updates.push(`activo = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE menu_variants SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM menu_variants WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Variant not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating variant' });
  }
});

router.delete('/api/menu/variants/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM menu_variants WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting variant' });
  }
});

router.get('/api/menu/combos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menu_combos ORDER BY id');
    // productos es JSON nativo: el driver ya lo devuelve parseado (array u null)
    res.json(result.rows.map(r => ({ ...r, productos: r.productos || [] })));
  } catch (e) { res.status(500).json({ error: 'Error fetching combos' }); }
});

router.post('/api/menu/combos', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { nombre, descripcion, productos, precioTotal, ahorro, imagen, activo } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const productosForDb = JSON.stringify(Array.isArray(productos) ? productos : []);
    if (productosForDb.length > 5000) {
      return res.status(400).json({ error: 'Productos demasiado grandes' });
    }

    const sanitized = {
      nombre: String(nombre).slice(0, 100),
      descripcion: (descripcion !== undefined && descripcion !== null) ? String(descripcion).slice(0, 300) : null,
      precioTotal: Math.max(0, Math.min(Number(precioTotal || 0), 999999999)),
      ahorro: Math.max(0, Math.min(Number(ahorro || 0), 999999999)),
      imagen: (imagen !== undefined && imagen !== null) ? String(imagen).slice(0, 300) : null,
      activo: activo !== undefined ? !!activo : true
    };

    const id = `mco_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO menu_combos (id, nombre, descripcion, productos, "precioTotal", ahorro, imagen, activo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, sanitized.nombre, sanitized.descripcion, productosForDb, sanitized.precioTotal, sanitized.ahorro, sanitized.imagen, sanitized.activo]
    );

    res.status(201).json({ id, ...sanitized, productos: Array.isArray(productos) ? productos : [] });
  } catch (e) {
    res.status(500).json({ error: 'Error creating combo' });
  }
});

router.put('/api/menu/combos/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { nombre, descripcion, productos, precioTotal, ahorro, imagen, activo } = req.body;

    const updates = [];
    const params = [];
    if (nombre !== undefined) { params.push(String(nombre).slice(0, 100)); updates.push(`nombre = $${params.length}`); }
    if (descripcion !== undefined) { params.push(descripcion !== null ? String(descripcion).slice(0, 300) : null); updates.push(`descripcion = $${params.length}`); }
    if (productos !== undefined) {
      const productosForDb = JSON.stringify(Array.isArray(productos) ? productos : []);
      if (productosForDb.length > 5000) {
        return res.status(400).json({ error: 'Productos demasiado grandes' });
      }
      params.push(productosForDb); updates.push(`productos = $${params.length}`);
    }
    if (precioTotal !== undefined) { params.push(Math.max(0, Math.min(Number(precioTotal), 999999999))); updates.push(`"precioTotal" = $${params.length}`); }
    if (ahorro !== undefined) { params.push(Math.max(0, Math.min(Number(ahorro), 999999999))); updates.push(`ahorro = $${params.length}`); }
    if (imagen !== undefined) { params.push(imagen !== null ? String(imagen).slice(0, 300) : null); updates.push(`imagen = $${params.length}`); }
    if (activo !== undefined) { params.push(!!activo); updates.push(`activo = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE menu_combos SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM menu_combos WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json({ ...result.rows[0], productos: result.rows[0].productos || [] });
    } else {
      res.status(404).json({ error: 'Combo not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating combo' });
  }
});

router.delete('/api/menu/combos/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM menu_combos WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Combo not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting combo' });
  }
});

router.get('/api/menu/promotions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menu_promotions ORDER BY activo DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching promotions' }); }
});

router.post('/api/menu/promotions', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { nombre, descripcion, tipo, valor, productoId, categoriaId, montoMinimo, inicia, termina, activo, limite } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const sanitized = {
      nombre: String(nombre).slice(0, 100),
      descripcion: (descripcion !== undefined && descripcion !== null) ? String(descripcion).slice(0, 300) : null,
      tipo: (tipo !== undefined && tipo !== null) ? String(tipo).slice(0, 30) : null,
      valor: Math.max(0, Math.min(Number(valor || 0), 999999999)),
      productoId: (productoId !== undefined && productoId !== null) ? String(productoId).slice(0, 50) : null,
      categoriaId: (categoriaId !== undefined && categoriaId !== null) ? String(categoriaId).slice(0, 50) : null,
      montoMinimo: Math.max(0, Math.min(Number(montoMinimo || 0), 999999999)),
      inicia: inicia || null,
      termina: termina || null,
      activo: activo !== undefined ? !!activo : true,
      limite: Math.max(0, Math.min(Number(limite || 100), 999999))
    };

    const id = `mpr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO menu_promotions (id, nombre, descripcion, tipo, valor, "productoId", "categoriaId", "montoMinimo", inicia, termina, activo, usado, limite) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, sanitized.nombre, sanitized.descripcion, sanitized.tipo, sanitized.valor, sanitized.productoId, sanitized.categoriaId, sanitized.montoMinimo, sanitized.inicia, sanitized.termina, sanitized.activo, 0, sanitized.limite]
    );

    res.status(201).json({ id, ...sanitized, usado: 0 });
  } catch (e) {
    res.status(500).json({ error: 'Error creating promotion' });
  }
});

router.put('/api/menu/promotions/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { nombre, descripcion, tipo, valor, productoId, categoriaId, montoMinimo, inicia, termina, activo, usado, limite } = req.body;

    const updates = [];
    const params = [];
    if (nombre !== undefined) { params.push(String(nombre).slice(0, 100)); updates.push(`nombre = $${params.length}`); }
    if (descripcion !== undefined) { params.push(descripcion !== null ? String(descripcion).slice(0, 300) : null); updates.push(`descripcion = $${params.length}`); }
    if (tipo !== undefined) { params.push(tipo !== null ? String(tipo).slice(0, 30) : null); updates.push(`tipo = $${params.length}`); }
    if (valor !== undefined) { params.push(Math.max(0, Math.min(Number(valor), 999999999))); updates.push(`valor = $${params.length}`); }
    if (productoId !== undefined) { params.push(productoId !== null ? String(productoId).slice(0, 50) : null); updates.push(`"productoId" = $${params.length}`); }
    if (categoriaId !== undefined) { params.push(categoriaId !== null ? String(categoriaId).slice(0, 50) : null); updates.push(`"categoriaId" = $${params.length}`); }
    if (montoMinimo !== undefined) { params.push(Math.max(0, Math.min(Number(montoMinimo), 999999999))); updates.push(`"montoMinimo" = $${params.length}`); }
    if (inicia !== undefined) { params.push(inicia || null); updates.push(`inicia = $${params.length}`); }
    if (termina !== undefined) { params.push(termina || null); updates.push(`termina = $${params.length}`); }
    if (activo !== undefined) { params.push(!!activo); updates.push(`activo = $${params.length}`); }
    if (usado !== undefined) { params.push(Math.max(0, Math.min(Number(usado), 999999))); updates.push(`usado = $${params.length}`); }
    if (limite !== undefined) { params.push(Math.max(0, Math.min(Number(limite), 999999))); updates.push(`limite = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE menu_promotions SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM menu_promotions WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Promotion not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating promotion' });
  }
});

router.delete('/api/menu/promotions/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM menu_promotions WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting promotion' });
  }
});

export default router;
