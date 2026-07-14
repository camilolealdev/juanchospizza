import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { str, strOpt, clampedNumber } from '../schemas/helpers.js';

const router = express.Router();

// ===================== CASH REGISTER =====================

// GET /api/cash-register — listar registros de caja
router.get('/api/cash-register', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { locationId, status } = req.query;
    let query = 'SELECT * FROM cash_register';
    const conditions = [];
    const params = [];

    if (locationId) {
      params.push(locationId);
      conditions.push(`"locationId" = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY "openedAt" DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching cash register entries' });
  }
});

// POST /api/cash-register/open — abrir caja
router.post(
  '/api/cash-register/open',
  authMiddleware,
  requireRole('ADMIN'),
  validate(
    z.object({
      locationId: z.enum(['nemocon', 'zipaquira']),
      openedBy: str(100),
      initialAmount: clampedNumber(0, 99999999, 0),
      notes: strOpt(200),
    })
  ),
  async (req, res) => {
    try {
      const { locationId, openedBy, initialAmount, notes } = req.body;

      // Verificar que no haya una caja abierta en esta sede
      const openRegister = await pool.query(
        'SELECT id FROM cash_register WHERE "locationId" = $1 AND status = \'open\'',
        [locationId]
      );
      if (openRegister.rows.length > 0) {
        return res
          .status(409)
          .json({ error: 'Ya hay una caja abierta en esta sede. Ciérrala antes de abrir una nueva.' });
      }

      const id = `cr_${Date.now()}`;
      await pool.query(
        `INSERT INTO cash_register (id, "locationId", "openedBy", "initialAmount", "expectedAmount", status, notes)
         VALUES ($1, $2, $3, $4, $5, 'open', $6)`,
        [id, locationId, openedBy, initialAmount, initialAmount, notes || null]
      );

      res.status(201).json({ id, locationId, openedBy, initialAmount, status: 'open', notes: notes || null });
    } catch (e) {
      res.status(500).json({ error: 'Error opening cash register' });
    }
  }
);

// POST /api/cash-register/:id/close — cerrar caja
router.post(
  '/api/cash-register/:id/close',
  authMiddleware,
  requireRole('ADMIN'),
  validate(
    z.object({
      finalAmount: z.coerce.number().min(0, 'El monto final no puede ser negativo'),
      closedBy: str(100),
      notes: strOpt(200),
    })
  ),
  async (req, res) => {
    try {
      const { finalAmount, closedBy, notes } = req.body;

      const register = await pool.query("SELECT * FROM cash_register WHERE id = $1 AND status = 'open'", [
        req.params.id,
      ]);
      if (!register.rows.length) {
        return res.status(404).json({ error: 'Caja no encontrada o ya está cerrada' });
      }

      const entry = register.rows[0];
      const expectedAmount = entry.expectedAmount;
      const difference = finalAmount - expectedAmount;

      await pool.query(
        `UPDATE cash_register SET "closedAt" = NOW(), "closedBy" = $1, "finalAmount" = $2, difference = $3, status = 'closed', notes = COALESCE($4, notes) WHERE id = $5`,
        [closedBy, finalAmount, difference, notes || null, req.params.id]
      );

      res.json({
        id: req.params.id,
        locationId: entry.locationId,
        openedBy: entry.openedBy,
        openedAt: entry.openedAt,
        closedBy,
        closedAt: new Date().toISOString(),
        initialAmount: entry.initialAmount,
        expectedAmount,
        finalAmount,
        difference,
        status: 'closed',
      });
    } catch (e) {
      res.status(500).json({ error: 'Error closing cash register' });
    }
  }
);

// ===================== TIPS =====================

// GET /api/tips — listar propinas
router.get('/api/tips', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { locationId, desde, hasta } = req.query;
    let query = 'SELECT * FROM tips';
    const conditions = [];
    const params = [];

    if (locationId) {
      params.push(locationId);
      conditions.push(`"locationId" = $${params.length}`);
    }
    if (desde) {
      params.push(desde);
      conditions.push(`"createdAt" >= $${params.length}`);
    }
    if (hasta) {
      params.push(hasta);
      conditions.push(`"createdAt" <= $${params.length}`);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY "createdAt" DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching tips' });
  }
});

// POST /api/tips — registrar propina
router.post(
  '/api/tips',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(
    z.object({
      orderId: str(50),
      amount: z.coerce.number().min(1, 'La propina debe ser mayor a 0'),
      method: str(20).optional().default('cash'),
      waiterName: strOpt(100),
      locationId: z.enum(['nemocon', 'zipaquira']).optional().default('nemocon'),
    })
  ),
  async (req, res) => {
    try {
      const { orderId, amount, method, waiterName, locationId } = req.body;
      const id = `tip_${Date.now()}`;

      await pool.query(
        `INSERT INTO tips (id, "orderId", amount, method, "waiterName", "locationId") VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, orderId, amount, method, waiterName || null, locationId]
      );

      res.status(201).json({ id, orderId, amount, method, waiterName: waiterName || null, locationId });
    } catch (e) {
      res.status(500).json({ error: 'Error creating tip' });
    }
  }
);

// GET /api/tips/summary — resumen de propinas
router.get('/api/tips/summary', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { locationId, desde, hasta } = req.query;
    let query = 'SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM tips';
    const conditions = [];
    const params = [];

    if (locationId) {
      params.push(locationId);
      conditions.push(`"locationId" = $${params.length}`);
    }
    if (desde) {
      params.push(desde);
      conditions.push(`"createdAt" >= $${params.length}`);
    }
    if (hasta) {
      params.push(hasta);
      conditions.push(`"createdAt" <= $${params.length}`);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching tips summary' });
  }
});

export default router;
