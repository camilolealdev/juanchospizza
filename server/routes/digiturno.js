// Digiturno — sistema de turnos digitales para pedidos en local/mesas.
// Separa los pedidos de delivery de los de consumo en el local, evitando
// que se mezclen en la pantalla de cocina.
import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { broadcast, notifyDigiturnoNew, notifyDigiturnoUpdate } from '../websocket.js';
import { createDigiturnoSchema, updateDigiturnoStatusSchema, updateDigiturnoSchema } from '../schemas/digiturno.js';

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
  } catch (_e) {
    res.status(500).json({ error: 'Error al listar tickets' });
  }
});

// GET /api/digiturno/stats — estadísticas diarias del digiturno
// Retorna: tickets hoy, servidos hoy, tiempo promedio de espera, etc.
router.get('/api/digiturno/stats', async (req, res) => {
  try {
    const { locationId } = req.query;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let baseWhere = '"createdAt" >= $1 AND "createdAt" <= $2';
    const params = [todayStart.toISOString(), todayEnd.toISOString()];

    if (locationId) {
      baseWhere += ` AND "locationId" = $${params.length + 1}`;
      params.push(locationId);
    }

    // Tickets creados hoy
    const createdToday = await pool.query(`SELECT COUNT(*) AS count FROM digiturno_tickets WHERE ${baseWhere}`, params);

    // Tickets servidos hoy (status = served)
    const servedToday = await pool.query(
      `SELECT COUNT(*) AS count FROM digiturno_tickets WHERE status = 'served' AND ${baseWhere}`,
      params
    );

    // Tickets cancelados hoy
    const cancelledToday = await pool.query(
      `SELECT COUNT(*) AS count FROM digiturno_tickets WHERE status = 'cancelled' AND ${baseWhere}`,
      params
    );

    // Tiempo promedio de espera (minutos) desde creación hasta llamado/completado
    // Usa la misma lógica de baseWhere + params que las demás consultas
    let avgWhere = '"calledAt" IS NOT NULL AND "createdAt" >= $1 AND "createdAt" <= $2';
    const avgParams = [todayStart.toISOString(), todayEnd.toISOString()];
    if (locationId) {
      avgWhere += ` AND "locationId" = $${avgParams.length + 1}`;
      avgParams.push(locationId);
    }
    const avgWait = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM ("calledAt" - "createdAt")) / 60) AS avg_min
       FROM digiturno_tickets WHERE ${avgWhere}`,
      avgParams
    );

    // Cola actual
    let queueQuery = `SELECT COUNT(*) AS count FROM digiturno_tickets WHERE status IN ('waiting', 'preparing', 'ready')`;
    const queueParams = [];
    if (locationId) {
      queueParams.push(locationId);
      queueQuery += ` AND "locationId" = $1`;
    }
    const queueCount = await pool.query(queueQuery, queueParams);

    res.json({
      ticketsToday: parseInt(createdToday.rows[0]?.count || '0', 10),
      servedToday: parseInt(servedToday.rows[0]?.count || '0', 10),
      cancelledToday: parseInt(cancelledToday.rows[0]?.count || '0', 10),
      averageWaitMinutes: Math.round(parseFloat(avgWait.rows[0]?.avg_min || '0') * 10) / 10,
      currentQueueCount: parseInt(queueCount.rows[0]?.count || '0', 10),
    });
  } catch (_e) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
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
  } catch (_e) {
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
  } catch (_e) {
    res.status(500).json({ error: 'Error al obtener cola' });
  }
});

// GET /api/digiturno/queue/live — SSE endpoint para pantalla de clientes en tiempo real
// Emite eventos `data` con la cola actual cada 3 segundos.
// El cliente se conecta vía EventSource y recibe actualizaciones automáticas.
router.get('/api/digiturno/queue/live', async (req, res) => {
  const { locationId } = req.query;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Enviar keepalive cada 30s para evitar timeouts de proxy
  const keepAlive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 30000);

  // Enviar datos cada 3s
  const sendQueue = async () => {
    try {
      let query = `SELECT id, "ticketNumber", status, "guestCount", "customerName", source, "tableName", "createdAt"
                   FROM digiturno_tickets WHERE status IN ('waiting', 'preparing', 'ready')`;
      const params = [];
      if (locationId) {
        params.push(locationId);
        query += ` AND "locationId" = $1`;
      }
      query += ' ORDER BY "ticketNumber" ASC';

      const result = await pool.query(query, params);
      res.write(`data: ${JSON.stringify(result.rows)}\n\n`);
    } catch {
      res.write(`event: error\ndata: {"error":"Error al obtener cola"}\n\n`);
    }
  };

  // Enviar datos inicial inmediatamente
  await sendQueue();

  const interval = setInterval(sendQueue, 3000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(keepAlive);
  });
});

// POST /api/digiturno — crear nuevo ticket
// Incluye retry loop para race condition en números secuenciales.
// Si dos peticiones simultáneas calculan el mismo MAX+1, el INSERT
// falla con unique_violation (código 23505) y se reintenta automáticamente.
const MAX_RETRIES = 5;

router.post(
  '/api/digiturno',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(createDigiturnoSchema),
  async (req, res) => {
    const { orderType, locationId, tableId, tableName, customerName, guestCount, source, items, total, notes } =
      req.body;

    const id = `dig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const ticketNumber = await getNextTicketNumber(locationId);

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
          try {
            notifyDigiturnoNew(created.rows[0]);
          } catch (err) {
            console.error('[WS] Error notificando nuevo ticket:', err.message);
          }
        });
        return; // Éxito — salir del handler
      } catch (e) {
        // Si es unique_violation (23505) y quedan intentos, reintentar
        if (e.code === '23505' && attempt < MAX_RETRIES - 1) {
          console.warn(
            '[Digiturno] Race condition en ticket # para',
            locationId,
            '- retry',
            attempt + 1,
            '/',
            MAX_RETRIES
          );
          continue;
        }
        // Si es el último intento o no es unique_violation, retornar error
        return res.status(e.code === '23505' ? 409 : 500).json({
          error:
            e.code === '23505'
              ? 'Conflicto de concurrencia al asignar número de ticket. Intentá de nuevo.'
              : 'Error al crear ticket',
        });
      }
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
        try {
          notifyDigiturnoUpdate(updated.rows[0]);
        } catch (err) {
          console.error('[WS] Error notificando cambio de ticket:', err.message);
        }
      });
    } catch (_e) {
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

      if (orderType !== undefined) {
        params.push(orderType);
        updates.push(`"orderType" = $${params.length}`);
      }
      if (customerName !== undefined) {
        params.push(customerName);
        updates.push(`"customerName" = $${params.length}`);
      }
      if (guestCount !== undefined) {
        params.push(guestCount);
        updates.push(`"guestCount" = $${params.length}`);
      }
      if (notes !== undefined) {
        params.push(notes);
        updates.push(`notes = $${params.length}`);
      }
      if (items !== undefined) {
        params.push(JSON.stringify(items));
        updates.push(`items = $${params.length}`);
      }
      if (total !== undefined) {
        params.push(total);
        updates.push(`total = $${params.length}`);
      }

      if (!updates.length) return res.status(400).json({ error: 'Nada que actualizar' });

      params.push(req.params.id);
      await pool.query(`UPDATE digiturno_tickets SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

      const result = await pool.query('SELECT * FROM digiturno_tickets WHERE id = $1', [req.params.id]);
      res.json(result.rows[0]);
    } catch (_e) {
      res.status(500).json({ error: 'Error al actualizar ticket' });
    }
  }
);

// DELETE /api/digiturno/:id — cancelar/eliminar ticket
router.delete('/api/digiturno/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM digiturno_tickets WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Ticket no encontrado' });
    res.json({ deleted: true });

    setImmediate(() => {
      try {
        broadcast('digiturno:deleted', { id: req.params.id });
      } catch (err) {
        console.error('[WS] Error notificando eliminación de ticket:', err.message);
      }
    });
  } catch (_e) {
    res.status(500).json({ error: 'Error al eliminar ticket' });
  }
});

export default router;
