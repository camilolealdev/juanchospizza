import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createRewardSchema, updateRewardSchema, addPointsSchema } from '../schemas/loyalty.js';

const router = express.Router();

// --- LOYALTY ---
router.get('/api/loyalty/rewards', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM loyalty_rewards WHERE vigente = 1');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching rewards' }); }
});

router.post('/api/loyalty/rewards', authMiddleware, requireRole('ADMIN', 'MARKETING'), validate(createRewardSchema), async (req, res) => {
  try {
    const sanitized = req.body;
    const id = `rwd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO loyalty_rewards (id, nombre, descripcion, "puntosCosto", tipo, valor, vigente) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, sanitized.nombre, sanitized.descripcion, sanitized.puntosCosto, sanitized.tipo, sanitized.valor, sanitized.vigente]
    );

    res.status(201).json({ id, ...sanitized });
  } catch (e) {
    res.status(500).json({ error: 'Error creating reward' });
  }
});

router.put('/api/loyalty/rewards/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), validate(updateRewardSchema), async (req, res) => {
  try {
    const { nombre, descripcion, puntosCosto, tipo, valor, vigente } = req.body;

    const updates = [];
    const params = [];
    if (nombre !== undefined) { params.push(nombre); updates.push(`nombre = $${params.length}`); }
    if (descripcion !== undefined) { params.push(descripcion); updates.push(`descripcion = $${params.length}`); }
    if (puntosCosto !== undefined) { params.push(puntosCosto); updates.push(`"puntosCosto" = $${params.length}`); }
    if (tipo !== undefined) { params.push(tipo); updates.push(`tipo = $${params.length}`); }
    if (valor !== undefined) { params.push(valor); updates.push(`valor = $${params.length}`); }
    if (vigente !== undefined) { params.push(vigente); updates.push(`vigente = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE loyalty_rewards SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM loyalty_rewards WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Reward not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating reward' });
  }
});

router.delete('/api/loyalty/rewards/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM loyalty_rewards WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting reward' });
  }
});

router.post('/api/loyalty/points', authMiddleware, requireRole('ADMIN', 'MARKETING'), validate(addPointsSchema), async (req, res) => {
  try {
    const { clientId, puntos, concepto, referencia } = req.body;
    const id = `lpt_${Date.now()}`;
    await pool.query(
      `INSERT INTO loyalty_points (id, "clientId", puntos, concepto, referencia) VALUES ($1,$2,$3,$4,$5)`,
      [id, clientId, puntos, concepto, referencia]
    );
    await pool.query(`UPDATE clients SET puntos = puntos + $1 WHERE id = $2`, [puntos, clientId]);
    res.status(201).json({ id });
  } catch (e) { res.status(500).json({ error: 'Error adding points' }); }
});

router.get('/api/loyalty/points/:clientId', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM loyalty_points WHERE "clientId" = $1 ORDER BY creado DESC',
      [req.params.clientId]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching loyalty points' }); }
});


export default router;
