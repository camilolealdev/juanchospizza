// Comandas — pedidos de mesa (dine-in orders).
// Asocia mesas con items para el flujo cocina/mesero.
import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole, requireSameLocation } from '../auth.js';
import { validate } from '../middleware/validate.js';
import {
  createComandaSchema,
  updateComandaSchema,
  closeComandaSchema,
  createComandaItemSchema,
  updateComandaItemSchema,
  bulkAddItemsSchema,
} from '../schemas/comandas.js';
import { notifyComandaUpdate, notifyTableUpdate } from '../websocket.js';

const router = express.Router();

// GET /api/comandas — listar comandas activas
router.get(
  '/api/comandas',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  requireSameLocation((req) => req.query.locationId),
  async (req, res) => {
    try {
      const { status, locationId, tableId } = req.query;
      let query = 'SELECT * FROM comandas';
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
      if (tableId) {
        params.push(tableId);
        conditions.push(`"tableId" = $${params.length}`);
      }

      if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
      query += ' ORDER BY "openedAt" DESC';

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (_e) {
      res.status(500).json({ error: 'Error al listar comandas' });
    }
  }
);

// GET /api/comandas/:id — detalle con items
router.get('/api/comandas/:id', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const comanda = await pool.query('SELECT * FROM comandas WHERE id = $1', [req.params.id]);
    if (!comanda.rows.length) return res.status(404).json({ error: 'Comanda no encontrada' });
    // La sede a validar es la de la comanda existente, no una que el
    // cliente pudiera mandar por query/body -- mismo criterio que
    // shifts.js al cerrar un turno.
    if (req.auth.role !== 'ADMIN' && req.auth.locationId && comanda.rows[0].locationId !== req.auth.locationId) {
      return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
    }

    const items = await pool.query('SELECT * FROM comanda_items WHERE "comandaId" = $1 ORDER BY "createdAt"', [
      req.params.id,
    ]);

    res.json({ ...comanda.rows[0], items: items.rows });
  } catch (_e) {
    res.status(500).json({ error: 'Error al obtener comanda' });
  }
});

// POST /api/comandas — abrir nueva comanda en una mesa
router.post(
  '/api/comandas',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(createComandaSchema),
  requireSameLocation((req) => req.body.locationId),
  async (req, res) => {
    try {
      const { tableId, waiterName, guestCount, notes, locationId } = req.body;

      // Verificar que la mesa existe y está disponible
      const tableCheck = await pool.query('SELECT * FROM dining_tables WHERE id = $1', [tableId]);
      if (!tableCheck.rows.length) return res.status(404).json({ error: 'Mesa no encontrada' });
      // requireSameLocation ya validó que locationId (body) coincide con la
      // sede del operador -- pero eso no impide que mande un tableId real de
      // OTRA sede junto con su propio locationId. Sin este chequeo, un
      // OPERATOR podía ocupar/mutar una mesa de otra sede aunque la comanda
      // "dijera" ser de la suya.
      if (tableCheck.rows[0].locationId !== locationId) {
        return res.status(400).json({ error: 'La mesa no pertenece a la sede indicada' });
      }

      // Marcar la mesa como ocupada
      await pool.query('UPDATE dining_tables SET status = $1 WHERE id = $2', ['occupied', tableId]);

      const id = `com_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await pool.query(
        `INSERT INTO comandas (id, "tableId", "waiterName", "guestCount", notes, status, "locationId")
       VALUES ($1, $2, $3, $4, $5, 'open', $6)`,
        [id, tableId, waiterName || null, guestCount, notes || null, locationId]
      );

      const created = await pool.query('SELECT * FROM comandas WHERE id = $1', [id]);
      res.status(201).json({ ...created.rows[0], items: [] });

      // Notificar WebSocket
      setImmediate(() => {
        notifyComandaUpdate(id, 'created');
        notifyTableUpdate(tableId, 'occupied');
      });
    } catch (_e) {
      res.status(500).json({ error: 'Error al crear comanda' });
    }
  }
);

// PUT /api/comandas/:id — actualizar comanda
router.put(
  '/api/comandas/:id',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(updateComandaSchema),
  async (req, res) => {
    try {
      const existing = await pool.query('SELECT "locationId" FROM comandas WHERE id = $1', [req.params.id]);
      if (!existing.rows.length) return res.status(404).json({ error: 'Comanda no encontrada' });
      if (req.auth.role !== 'ADMIN' && req.auth.locationId && existing.rows[0].locationId !== req.auth.locationId) {
        return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
      }

      const { guestCount, notes, total } = req.body;
      const updates = [];
      const params = [];

      if (guestCount !== undefined) {
        params.push(guestCount);
        updates.push(`"guestCount" = $${params.length}`);
      }
      if (notes !== undefined) {
        params.push(notes);
        updates.push(`notes = $${params.length}`);
      }
      if (total !== undefined) {
        params.push(total);
        updates.push(`total = $${params.length}`);
      }

      if (!updates.length) return res.status(400).json({ error: 'Nada que actualizar' });

      params.push(req.params.id);
      await pool.query(`UPDATE comandas SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

      const result = await pool.query('SELECT * FROM comandas WHERE id = $1', [req.params.id]);
      const items = await pool.query('SELECT * FROM comanda_items WHERE "comandaId" = $1 ORDER BY "createdAt"', [
        req.params.id,
      ]);
      res.json({ ...result.rows[0], items: items.rows });

      // Notificar WebSocket
      setImmediate(() => {
        notifyComandaUpdate(req.params.id, 'updated');
      });
    } catch (_e) {
      res.status(500).json({ error: 'Error al actualizar comanda' });
    }
  }
);

// PATCH /api/comandas/:id/close — cerrar comanda (libera la mesa)
router.patch(
  '/api/comandas/:id/close',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(closeComandaSchema),
  async (req, res) => {
    try {
      // La sede a validar viene de la comanda existente en DB, no del
      // request -- un cliente podría mandar cualquier body en el close.
      const comanda = await pool.query('SELECT * FROM comandas WHERE id = $1', [req.params.id]);
      if (!comanda.rows.length) return res.status(404).json({ error: 'Comanda no encontrada' });
      if (req.auth.role !== 'ADMIN' && req.auth.locationId && comanda.rows[0].locationId !== req.auth.locationId) {
        return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
      }

      const { total, notes } = req.body;
      const closedAt = new Date().toISOString();

      await pool.query(`UPDATE comandas SET status = 'closed', total = $1, notes = $2, "closedAt" = $3 WHERE id = $4`, [
        total,
        notes || null,
        closedAt,
        req.params.id,
      ]);

      // Liberar la mesa
      if (comanda.rows[0].tableId) {
        await pool.query('UPDATE dining_tables SET status = $1 WHERE id = $2', ['available', comanda.rows[0].tableId]);
      }

      const result = await pool.query('SELECT * FROM comandas WHERE id = $1', [req.params.id]);
      res.json(result.rows[0]);

      // Notificar WebSocket
      setImmediate(() => {
        notifyComandaUpdate(req.params.id, 'closed');
        if (comanda.rows[0].tableId) {
          notifyTableUpdate(comanda.rows[0].tableId, 'available');
        }
      });
    } catch (_e) {
      res.status(500).json({ error: 'Error al cerrar comanda' });
    }
  }
);

// === COMANDA ITEMS ===

// POST /api/comandas/items — agregar item a comanda
router.post(
  '/api/comandas/items',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(createComandaItemSchema),
  async (req, res) => {
    try {
      const { comandaId, productId, productName, quantity, unitPrice, notes } = req.body;

      // La sede a validar es la de la comanda destino, no una que el
      // cliente pudiera mandar directamente -- este endpoint no recibe
      // locationId, solo comandaId.
      const comandaCheck = await pool.query('SELECT "locationId" FROM comandas WHERE id = $1', [comandaId]);
      if (!comandaCheck.rows.length) return res.status(404).json({ error: 'Comanda no encontrada' });
      if (req.auth.role !== 'ADMIN' && req.auth.locationId && comandaCheck.rows[0].locationId !== req.auth.locationId) {
        return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
      }

      const subtotal = quantity * unitPrice;

      const id = `cmi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await pool.query(
        `INSERT INTO comanda_items (id, "comandaId", "productId", "productName", quantity, "unitPrice", subtotal, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
        [id, comandaId, productId || null, productName, quantity, unitPrice, subtotal, notes || null]
      );

      // Actualizar total de la comanda
      await pool.query(
        'UPDATE comandas SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM comanda_items WHERE "comandaId" = $1) WHERE id = $1',
        [comandaId]
      );

      const created = await pool.query('SELECT * FROM comanda_items WHERE id = $1', [id]);
      res.status(201).json(created.rows[0]);

      // Notificar WebSocket
      setImmediate(() => {
        notifyComandaUpdate(comandaId, 'items_updated');
      });
    } catch (_e) {
      res.status(500).json({ error: 'Error al agregar producto' });
    }
  }
);

// POST /api/comandas/items/bulk — agregar múltiples items
router.post(
  '/api/comandas/items/bulk',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(bulkAddItemsSchema),
  async (req, res) => {
    try {
      const { comandaId, items } = req.body;

      const comandaCheck = await pool.query('SELECT "locationId" FROM comandas WHERE id = $1', [comandaId]);
      if (!comandaCheck.rows.length) return res.status(404).json({ error: 'Comanda no encontrada' });
      if (req.auth.role !== 'ADMIN' && req.auth.locationId && comandaCheck.rows[0].locationId !== req.auth.locationId) {
        return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
      }

      const inserted = [];

      for (const item of items) {
        const id = `cmi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const subtotal = item.quantity * item.unitPrice;
        await pool.query(
          `INSERT INTO comanda_items (id, "comandaId", "productId", "productName", quantity, "unitPrice", subtotal, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
          [
            id,
            comandaId,
            item.productId || null,
            item.productName,
            item.quantity,
            item.unitPrice,
            subtotal,
            item.notes || null,
          ]
        );
        inserted.push(id);
      }

      // Actualizar total
      await pool.query(
        'UPDATE comandas SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM comanda_items WHERE "comandaId" = $1) WHERE id = $1',
        [comandaId]
      );

      res.status(201).json({ inserted: inserted.length, ids: inserted });

      // Notificar WebSocket
      setImmediate(() => {
        notifyComandaUpdate(comandaId, 'items_updated');
      });
    } catch (_e) {
      res.status(500).json({ error: 'Error al agregar productos' });
    }
  }
);

// PATCH /api/comandas/items/:id — actualizar item (cantidad, estado, notas)
router.patch(
  '/api/comandas/items/:id',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(updateComandaItemSchema),
  async (req, res) => {
    try {
      // La sede a validar es la de la comanda dueña del item -- hay que
      // resolverla vía comandaId, el item en sí no tiene locationId propio.
      const existingItem = await pool.query('SELECT "comandaId" FROM comanda_items WHERE id = $1', [req.params.id]);
      if (!existingItem.rows.length) return res.status(404).json({ error: 'Item no encontrado' });

      const comandaCheck = await pool.query('SELECT "locationId" FROM comandas WHERE id = $1', [
        existingItem.rows[0].comandaId,
      ]);
      if (
        req.auth.role !== 'ADMIN' &&
        req.auth.locationId &&
        comandaCheck.rows[0]?.locationId !== req.auth.locationId
      ) {
        return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
      }

      const { quantity, notes, status } = req.body;
      const updates = [];
      const params = [];

      if (quantity !== undefined) {
        params.push(quantity);
        updates.push(`quantity = $${params.length}`);
      }
      if (notes !== undefined) {
        params.push(notes);
        updates.push(`notes = $${params.length}`);
      }
      if (status) {
        params.push(status);
        updates.push(`status = $${params.length}`);
      }

      if (!updates.length) return res.status(400).json({ error: 'Nada que actualizar' });

      params.push(req.params.id);
      await pool.query(`UPDATE comanda_items SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

      // Obtener el item actualizado
      const updatedItem = await pool.query('SELECT * FROM comanda_items WHERE id = $1', [req.params.id]);
      if (!updatedItem.rows.length) return res.status(404).json({ error: 'Item no encontrado' });

      // Recalcular subtotal si cambió quantity
      if (quantity !== undefined) {
        const newSubtotal = updatedItem.rows[0].quantity * updatedItem.rows[0].unitPrice;
        await pool.query('UPDATE comanda_items SET subtotal = $1 WHERE id = $2', [newSubtotal, req.params.id]);

        // Actualizar total de comanda
        await pool.query(
          'UPDATE comandas SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM comanda_items WHERE "comandaId" = $1) WHERE id = $1',
          [updatedItem.rows[0].comandaId]
        );
      }

      res.json(updatedItem.rows[0]);

      // Notificar WebSocket
      setImmediate(() => {
        notifyComandaUpdate(updatedItem.rows[0].comandaId, 'items_updated');
      });
    } catch (_e) {
      res.status(500).json({ error: 'Error al actualizar item' });
    }
  }
);

// DELETE /api/comandas/items/:id — eliminar item de comanda
router.delete('/api/comandas/items/:id', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const item = await pool.query('SELECT * FROM comanda_items WHERE id = $1', [req.params.id]);
    if (!item.rows.length) return res.status(404).json({ error: 'Item no encontrado' });

    const comandaId = item.rows[0].comandaId;
    const comandaCheck = await pool.query('SELECT "locationId" FROM comandas WHERE id = $1', [comandaId]);
    if (req.auth.role !== 'ADMIN' && req.auth.locationId && comandaCheck.rows[0]?.locationId !== req.auth.locationId) {
      return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
    }

    await pool.query('DELETE FROM comanda_items WHERE id = $1', [req.params.id]);

    // Actualizar total
    await pool.query(
      'UPDATE comandas SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM comanda_items WHERE "comandaId" = $1) WHERE id = $1',
      [comandaId]
    );

    res.json({ deleted: true, comandaId });

    // Notificar WebSocket
    setImmediate(() => {
      notifyComandaUpdate(comandaId, 'items_updated');
    });
  } catch (_e) {
    res.status(500).json({ error: 'Error al eliminar item' });
  }
});

// GET /api/comandas/:id/kitchen-ticket — datos para ticket de cocina
router.get('/api/comandas/:id/kitchen-ticket', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const comanda = await pool.query('SELECT * FROM comandas WHERE id = $1', [req.params.id]);
    if (!comanda.rows.length) return res.status(404).json({ error: 'Comanda no encontrada' });
    if (req.auth.role !== 'ADMIN' && req.auth.locationId && comanda.rows[0].locationId !== req.auth.locationId) {
      return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
    }

    const items = await pool.query(
      `SELECT * FROM comanda_items WHERE "comandaId" = $1 AND status != 'cancelled' ORDER BY "createdAt"`,
      [req.params.id]
    );

    const mesa = await pool.query('SELECT name, area FROM dining_tables WHERE id = $1', [comanda.rows[0].tableId]);

    res.json({
      comanda: comanda.rows[0],
      items: items.rows,
      mesa: mesa.rows[0] || null,
    });
  } catch (_e) {
    res.status(500).json({ error: 'Error al generar ticket de cocina' });
  }
});

// POST /api/comandas/:id/split — dividir comanda (para pagos separados)
router.post('/api/comandas/:id/split', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { items: splitItems, guestCount } = req.body;
    // splitItems: array de { productIds: string[], guestName?: string }
    if (!Array.isArray(splitItems) || splitItems.length < 1) {
      return res.status(400).json({ error: 'Debe especificar al menos una división' });
    }

    const comanda = await pool.query('SELECT * FROM comandas WHERE id = $1', [req.params.id]);
    if (!comanda.rows.length) return res.status(404).json({ error: 'Comanda no encontrada' });
    if (req.auth.role !== 'ADMIN' && req.auth.locationId && comanda.rows[0].locationId !== req.auth.locationId) {
      return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
    }

    const orig = comanda.rows[0];
    const results = [];

    for (const split of splitItems) {
      const id = `com_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_split`;
      await pool.query(
        `INSERT INTO comandas (id, "tableId", "waiterName", status, "guestCount", notes, "locationId", "openedAt")
         VALUES ($1, $2, $3, 'open', $4, $5, $6, $7)`,
        [
          id,
          orig.tableId,
          orig.waiterName,
          guestCount || 1,
          split.guestName ? `Subcuenta: ${split.guestName}` : 'Subcuenta',
          orig.locationId,
          new Date().toISOString(),
        ]
      );

      // Mover items seleccionados a la nueva comanda
      if (split.productIds?.length) {
        for (const itemId of split.productIds) {
          await pool.query('UPDATE comanda_items SET "comandaId" = $1 WHERE id = $2 AND "comandaId" = $3', [
            id,
            itemId,
            req.params.id,
          ]);
        }

        // Recalcular total de la nueva comanda
        await pool.query(
          'UPDATE comandas SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM comanda_items WHERE "comandaId" = $1) WHERE id = $1',
          [id]
        );
      }

      results.push(id);
    }

    // Recalcular total de la original
    await pool.query(
      'UPDATE comandas SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM comanda_items WHERE "comandaId" = $1) WHERE id = $1',
      [req.params.id]
    );

    res.status(201).json({ splitted: results.length, comandaIds: results });

    // Notificar WebSocket
    setImmediate(() => {
      notifyComandaUpdate(req.params.id, 'split');
    });
  } catch (_e) {
    res.status(500).json({ error: 'Error al dividir comanda' });
  }
});

export default router;
