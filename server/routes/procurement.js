// Procurement / Purchase Orders — compras a proveedores
import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createPurchaseOrderSchema, updatePurchaseOrderSchema } from '../schemas/procurement.js';

const router = express.Router();

// GET /api/procurement — listar órdenes de compra
router.get('/api/procurement', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { status, locationId } = req.query;
    let query = 'SELECT * FROM purchase_orders';
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

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY "fechaSolicitud" DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (_e) {
    res.status(500).json({ error: 'Error al listar órdenes de compra' });
  }
});

// GET /api/procurement/:id
router.get('/api/procurement/:id', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM purchase_orders WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(result.rows[0]);
  } catch (_e) {
    res.status(500).json({ error: 'Error al obtener orden' });
  }
});

// POST /api/procurement
router.post(
  '/api/procurement',
  authMiddleware,
  requireRole('ADMIN'),
  validate(createPurchaseOrderSchema),
  async (req, res) => {
    try {
      const { proveedor, items, fechaEntrega, notas, locationId, createdBy } = req.body;
      const id = `po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const orderNumber = `PO-${String(Date.now()).slice(-6)}`;
      const total = items.reduce((sum, it) => sum + it.cantidad * it.precioUnitario, 0);

      await pool.query(
        `INSERT INTO purchase_orders (id, "orderNumber", proveedor, items, total, "fechaEntrega", notas, status, "createdBy", "locationId")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente', $8, $9)`,
        [
          id,
          orderNumber,
          proveedor,
          JSON.stringify(items),
          total,
          fechaEntrega || null,
          notas || null,
          createdBy || null,
          locationId,
        ]
      );

      const created = await pool.query('SELECT * FROM purchase_orders WHERE id = $1', [id]);
      res.status(201).json(created.rows[0]);
    } catch (_e) {
      res.status(500).json({ error: 'Error al crear orden de compra' });
    }
  }
);

// PUT /api/procurement/:id
router.put(
  '/api/procurement/:id',
  authMiddleware,
  requireRole('ADMIN'),
  validate(updatePurchaseOrderSchema),
  async (req, res) => {
    try {
      const { proveedor, items, fechaEntrega, status, notas } = req.body;
      const updates = [];
      const params = [];

      if (proveedor !== undefined) {
        params.push(proveedor);
        updates.push(`proveedor = $${params.length}`);
      }
      if (items !== undefined) {
        const total = items.reduce((sum, it) => sum + it.cantidad * it.precioUnitario, 0);
        params.push(JSON.stringify(items));
        updates.push(`items = $${params.length}`);
        params.push(total);
        updates.push(`total = $${params.length}`);
      }
      if (fechaEntrega !== undefined) {
        params.push(fechaEntrega);
        updates.push(`"fechaEntrega" = $${params.length}`);
      }
      if (status !== undefined) {
        params.push(status);
        updates.push(`status = $${params.length}`);
      }
      if (notas !== undefined) {
        params.push(notas);
        updates.push(`notas = $${params.length}`);
      }

      if (!updates.length) return res.status(400).json({ error: 'Nada que actualizar' });

      params.push(req.params.id);
      await pool.query(`UPDATE purchase_orders SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

      const updated = await pool.query('SELECT * FROM purchase_orders WHERE id = $1', [req.params.id]);
      res.json(updated.rows[0]);
    } catch (_e) {
      res.status(500).json({ error: 'Error al actualizar orden' });
    }
  }
);

// PATCH /api/procurement/:id/receive — recibir orden (actualiza inventario)
router.patch('/api/procurement/:id/receive', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const order = await pool.query('SELECT * FROM purchase_orders WHERE id = $1', [req.params.id]);
    if (!order.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    if (order.rows[0].status === 'recibida') return res.status(400).json({ error: 'La orden ya fue recibida' });

    const items = order.rows[0].items || [];
    const recibidos = [];
    const omitidos = [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Actualizar inventario para cada item
      for (const item of items) {
        if (!item.itemId) {
          omitidos.push({ item, motivo: 'sin itemId — no vinculado a inventario' });
          continue;
        }

        const existingItem = await client.query('SELECT * FROM inventory_items WHERE id = $1', [item.itemId]);
        if (!existingItem.rows.length) {
          omitidos.push({ item, motivo: 'itemId no existe en inventory_items' });
          continue;
        }

        const newStock = (existingItem.rows[0].stockActual || 0) + (item.cantidad || 0);
        await client.query('UPDATE inventory_items SET "stockActual" = $1 WHERE id = $2', [newStock, item.itemId]);

        // Registrar movimiento
        const movId = `mov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await client.query(
          `INSERT INTO inventory_movements (id, "itemId", tipo, cantidad, "saldoAnterior", "saldoNuevo", motivo, referencia)
           VALUES ($1, $2, 'entrada', $3, $4, $5, $6, $7)`,
          [
            movId,
            item.itemId,
            item.cantidad,
            existingItem.rows[0].stockActual || 0,
            newStock,
            `Recepción orden ${order.rows[0].orderNumber}`,
            req.params.id,
          ]
        );
        recibidos.push(item);
      }

      await client.query('UPDATE purchase_orders SET status = $1 WHERE id = $2', ['recibida', req.params.id]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.json({
      received: true,
      itemsUpdated: recibidos.length,
      orderNumber: order.rows[0].orderNumber,
      recibidos,
      omitidos,
    });
  } catch (_e) {
    res.status(500).json({ error: 'Error al recibir orden' });
  }
});

// DELETE /api/procurement/:id
router.delete('/api/procurement/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM purchase_orders WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json({ deleted: true });
  } catch (_e) {
    res.status(500).json({ error: 'Error al eliminar orden' });
  }
});

export default router;
