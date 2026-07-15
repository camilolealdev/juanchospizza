// Digiturno — sistema de turnos digitales para pedidos en local/mesas.
// Separa los pedidos de delivery de los de consumo en el local, evitando
// que se mezclen en la pantalla de cocina.
import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { broadcast, notifyDigiturnoNew, notifyDigiturnoUpdate } from '../websocket.js';
import {
  createDigiturnoSchema,
  updateDigiturnoStatusSchema,
  updateDigiturnoSchema,
} from '../schemas/digiturno.js';

const router = express.Router();

// Helper: obtener el siguiente número de ticket para una sede
async function getNextTicketNumber(locationId) {
  const result = await pool.query(
    'SELECT COALESCE(MAX("ticketNumber"), 0) + 1 AS next FROM digiturno_tickets WHERE "locationId" = $1',
    [locationId]
  );
  return result.rows[0].next;
}

// GET /api/digiturno — listar tickets activos (con filtros)
router.get('/api/digiturno', authMiddleware, async (req, res) => {
  try {
    const { status, locationId, orderType } = req.query;
    let query = 'SELECT * FROM digiturno_tickets';
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (locationId) {
      params.push(locationId);
      conditions.push(`"locationId" = $${params.length}`);
    }
    if (orderType) {
      params.push(orderType);
      conditions.push(`"orderType" = $${params.length}`);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY "ticketNumber" ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error al listar tickets' });
  }
});

// GET /api/digiturno/current — obtener el ticket actual (el más antiguo en preparing)
router.get('/api/digiturno/current', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { locationId } = req.query;
    let query = `SELECT * FROM digiturno_tickets WHERE status IN ('preparing', 'waiting')`;
    const params = [];

    if (locationId) {
      params.push(locationId);
      query += ` AND "locationId" = $1`;
    }

    query += ' ORDER BY "ticketNumber" ASC LIMIT 1';

    const result = await pool.query(query, params);
    res.json(result.rows[0] || null);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener ticket actual' });
  }
});

// GET /api/digiturno/queue — cola completa para pantalla de clientes
router.get('/api/digiturno/queue', async (req, res) => {
  try {
    const { locationId } = req.query;
    let query = `SELECT id, "ticketNumber", status, "guestCount", "customerName", source, "tableName", "createdAt"
                 FROM digiturno_tickets WHERE status IN ('waiting', 'preparing', 'ready')`;
    const params = [];

    if (locationId) {
      params.push(locationId);
      query += ` AND "locationId" = $1`;
    }

    query += ' ORDER BY "ticketNumber" ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener cola' });
  }
});

// POST /api/digiturno — crear nuevo ticket
router.post(
  '/api/digiturno',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(createDigiturnoSchema),
  async (req, res) => {
    try {
      const { orderType, locationId, tableId, tableName, customerName, guestCount, source, items, total, notes } =
        req.body;

      const ticketNumber = await getNextTicketNumber(locationId);
      const id = `dig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await pool.query(
        `INSERT INTO digiturno_tickets (id, "ticketNumber", "orderType", status, "locationId", "tableId", "tableName",
         "customerName", "guestCount", source, items, total, notes)
         VALUES ($1, $2, $3, 'waiting', $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          id,
          ticketNumber,
          orderType,
          locationId,
          tableId || null,
          tableName || null,
          customerName || null,
          guestCount,
          source,
          JSON.stringify(items || []),
          total,
          notes || null,
        ]
      );

      const created = await pool.query('SELECT * FROM digiturno_tickets WHERE id = $1', [id]);
      res.status(201).json(created.rows[0]);

      // Notificar WebSocket
      setImmediate(() => {
        try { notifyDigiturnoNew(created.rows[0]); }
        catch (err) { console.error('[WS] Error notificando nuevo ticket:', err.message); }
      });
    } catch (e) {
      res.status(500).json({ error: 'Error al crear ticket' });
    }
  }
);

// PATCH /api/digiturno/:id/status — cambiar estado del ticket
router.patch(
  '/api/digiturno/:id/status',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(updateDigiturnoStatusSchema),
  async (req, res) => {
    try {
      const { status } = req.body;
      const now = new Date().toISOString();

      // Actualizar campos según el nuevo estado
      const extraFields = [];
      const extraParams = [];
      if (status === 'preparing') {
        extraFields.push('"calledAt" = $' + (extraParams.length + 1));
        extraParams.push(now);
      }
      if (status === 'ready' || status === 'served') {
        extraFields.push('"completedAt" = $' + (extraParams.length + 1));
        extraParams.push(now);
      }

      const query = extraFields.length
        ? `UPDATE digiturno_tickets SET status = $1, ${extraFields.join(', ')} WHERE id = $2`
        : 'UPDATE digiturno_tickets SET status = $1 WHERE id = $2';

      await pool.query(query, [status, req.params.id, ...extraParams]);

      const updated = await pool.query('SELECT * FROM digiturno_tickets WHERE id = $1', [req.params.id]);
      if (!updated.rows.length) return res.status(404).json({ error: 'Ticket no encontrado' });
      res.json(updated.rows[0]);

      // Notificar WebSocket
      setImmediate(() => {
        try { notifyDigiturnoUpdate(updated.rows[0]); }
        catch (err) { console.error('[WS] Error notificando cambio de ticket:', err.message); }
      });
    } catch (e) {
      res.status(500).json({ error: 'Error al actualizar ticket' });
    }
  }
);

// PUT /api/digiturno/:id — actualizar ticket completo
router.put(
  '/api/digiturno/:id',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(updateDigiturnoSchema),
  async (req, res) => {
    try {
      const { orderType, customerName, guestCount, notes, items, total } = req.body;
      const updates = [];
      const params = [];

      if (orderType !== undefined) { params.push(orderType); updates.push(`"orderType" = $${params.length}`); }
      if (customerName !== undefined) { params.push(customerName); updates.push(`"customerName" = $${params.length}`); }
      if (guestCount !== undefined) { params.push(guestCount); updates.push(`"guestCount" = $${params.length}`); }
      if (notes !== undefined) { params.push(notes); updates.push(`notes = $${params.length}`); }
      if (items !== undefined) { params.push(JSON.stringify(items)); updates.push(`items = $${params.length}`); }
      if (total !== undefined) { params.push(total); updates.push(`total = $${params.length}`); }

      if (!updates.length) return res.status(400).json({ error: 'Nada que actualizar' });

      params.push(req.params.id);
      await pool.query(`UPDATE digiturno_tickets SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

      const result = await pool.query('SELECT * FROM digiturno_tickets WHERE id = $1', [req.params.id]);
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: 'Error al actualizar ticket' });
    }
  }
);

// DELETE /api/digiturno/:id — cancelar/eliminar ticket
router.delete(
  '/api/digiturno/:id',
  authMiddleware,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const result = await pool.query('DELETE FROM digiturno_tickets WHERE id = $1 RETURNING id', [req.params.id]);
      if (!result.rows.length) return res.status(404).json({ error: 'Ticket no encontrado' });
      res.json({ deleted: true });

      setImmediate(() => {
        try { broadcast('digiturno:deleted', { id: req.params.id }); }
        catch (err) { console.error('[WS] Error notificando eliminación de ticket:', err.message); }
      });
    } catch (e) {
      res.status(500).json({ error: 'Error al eliminar ticket' });
    }
  }
);

export default router;
