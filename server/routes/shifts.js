import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole, requireSameLocation } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { openShiftSchema, closeShiftSchema } from '../schemas/shifts.js';

const router = express.Router();

// --- SHIFTS (turnos y control de caja) ---
// openedBy/closedBy se resuelven del token (req.auth.sub), nunca del body --
// mismo criterio que clientId en orders.js: no confiar en que el cliente
// diga quién es.

router.get('/api/shifts/current', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { locationId } = req.query;
    const conditions = [`status = 'open'`];
    const params = [];
    if (locationId) {
      params.push(locationId);
      conditions.push(`"locationId" = $${params.length}`);
    }
    const result = await pool.query(
      `SELECT * FROM shifts WHERE ${conditions.join(' AND ')} ORDER BY "openedAt" DESC LIMIT 1`,
      params
    );
    res.json(result.rows[0] || null);
  } catch (_e) {
    res.status(500).json({ error: 'Error fetching current shift' });
  }
});

router.get('/api/shifts', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { locationId, status } = req.query;
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
    let query = 'SELECT * FROM shifts';
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY "openedAt" DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (_e) {
    res.status(500).json({ error: 'Error fetching shifts' });
  }
});

router.post(
  '/api/shifts',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(openShiftSchema),
  requireSameLocation((req) => req.body.locationId),
  async (req, res) => {
    try {
      const { locationId, openingCash } = req.body;

      const existing = await pool.query(`SELECT id FROM shifts WHERE "locationId" = $1 AND status = 'open' LIMIT 1`, [
        locationId,
      ]);
      if (existing.rows.length) {
        return res.status(409).json({ error: 'Ya hay un turno abierto para esta sede' });
      }

      const id = `shift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const openedBy = req.auth.sub;
      await pool.query(
        `INSERT INTO shifts (id, "locationId", "openedBy", "openingCash", status) VALUES ($1, $2, $3, $4, 'open')`,
        [id, locationId, openedBy, openingCash]
      );

      const result = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);
      res.status(201).json(result.rows[0]);
    } catch (_e) {
      res.status(500).json({ error: 'Error opening shift' });
    }
  }
);

router.patch(
  '/api/shifts/:id/close',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(closeShiftSchema),
  async (req, res) => {
    try {
      const { closingCash, notas } = req.body;

      const shiftResult = await pool.query('SELECT * FROM shifts WHERE id = $1', [req.params.id]);
      if (!shiftResult.rows.length) {
        return res.status(404).json({ error: 'Turno no encontrado' });
      }
      const shift = shiftResult.rows[0];
      if (shift.status === 'closed') {
        return res.status(400).json({ error: 'El turno ya está cerrado' });
      }
      // Mismo criterio que al abrir: un OPERATOR solo cierra turnos de su
      // propia sede. Va después del lookup porque la sede del turno viene
      // de la fila, no del request.
      if (req.auth.role !== 'ADMIN' && req.auth.locationId && shift.locationId !== req.auth.locationId) {
        return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
      }

      // Ventas en efectivo/pagadas dentro de la ventana del turno, para la
      // misma sede -- mismo criterio "paidOnly" que orders.js (cash/card
      // siempre cuentan, online solo si el webhook ya lo confirmó).
      const salesResult = await pool.query(
        `SELECT COALESCE(SUM(total), 0)::int as total FROM orders
       WHERE "locationId" = $1 AND "createdAt" >= $2 AND "createdAt" <= NOW()
       AND ("paymentStatus" = 'paid' OR "paymentMethod" IN ('cash', 'card'))`,
        [shift.locationId, shift.openedAt]
      );
      const salesTotal = salesResult.rows[0]?.total || 0;
      const expectedCash = (shift.openingCash || 0) + salesTotal;
      const difference = closingCash - expectedCash;

      await pool.query(
        `UPDATE shifts SET "closedBy" = $1, "closedAt" = NOW(), "closingCash" = $2, "expectedCash" = $3, difference = $4, status = 'closed'${notas !== undefined ? ', notas = $5' : ''} WHERE id = $${notas !== undefined ? 6 : 5}`,
        notas !== undefined
          ? [req.auth.sub, closingCash, expectedCash, difference, notas, req.params.id]
          : [req.auth.sub, closingCash, expectedCash, difference, req.params.id]
      );

      const result = await pool.query('SELECT * FROM shifts WHERE id = $1', [req.params.id]);
      res.json(result.rows[0]);
    } catch (_e) {
      res.status(500).json({ error: 'Error closing shift' });
    }
  }
);

export default router;
