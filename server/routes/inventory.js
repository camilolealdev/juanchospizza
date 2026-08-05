import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole, requireSameLocation } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createInventoryItemSchema, updateInventoryItemSchema, inventoryMovementSchema } from '../schemas/inventory.js';

const router = express.Router();

// Auditoría de arquitectura (crítico #2): ninguna ruta de este archivo
// filtraba por sede -- un OPERATOR de Nemocón veía y podía editar el
// inventario completo de Zipaquirá y viceversa. requireSameLocation por sí
// solo NO alcanza: solo bloquea si el request TRAE explícitamente un
// locationId distinto al del token; si se omite, deja pasar sin filtrar
// nada (mismo hueco que auth.js documenta para otras rutas). Por eso acá
// forzamos el locationId efectivo server-side para roles no-ADMIN en vez de
// confiar en que el query param venga.
function effectiveLocationId(req) {
  if (req.auth?.role === 'ADMIN') return req.query.locationId || null;
  return req.auth?.locationId || req.query.locationId || null;
}

// --- INVENTORY ---
router.get(
  '/api/inventory',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  requireSameLocation((req) => req.query.locationId),
  async (req, res) => {
    try {
      const locationId = effectiveLocationId(req);
      const conditions = [];
      const params = [];
      if (req.query.includeInactive !== 'true') conditions.push('activo IS DISTINCT FROM false');
      if (locationId) {
        params.push(locationId);
        conditions.push(`"locationId" = $${params.length}`);
      }
      const query =
        'SELECT * FROM inventory_items' +
        (conditions.length ? ' WHERE ' + conditions.join(' AND ') : '') +
        ' ORDER BY nombre';
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (_e) {
      res.status(500).json({ error: 'Error fetching inventory' });
    }
  }
);

router.post(
  '/api/inventory',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(createInventoryItemSchema),
  async (req, res) => {
    try {
      const {
        nombre,
        categoria,
        stockActual,
        stockMinimo,
        stockMaximo,
        unidad,
        costoUnitario,
        proveedor,
        lote,
        fechaVencimiento,
        ubicacion,
        locationId,
      } = req.body;
      const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      // Un OPERATOR no-ADMIN no puede crear el ítem en otra sede que no sea
      // la suya (antes locationId del body, si venía, se aceptaba tal cual;
      // si no venía, caía siempre a 'nemocon' hardcodeado sin importar la
      // sede real del operador que lo estaba creando).
      const resolvedLocationId =
        req.auth?.role === 'ADMIN' ? locationId || 'nemocon' : req.auth?.locationId || locationId || 'nemocon';
      if (req.auth?.role !== 'ADMIN' && req.auth?.locationId && locationId && locationId !== req.auth.locationId) {
        return res.status(403).json({ error: 'No autorizado para crear ítems en otra sede' });
      }
      await pool.query(
        `INSERT INTO inventory_items (id, nombre, categoria, "stockActual", "stockMinimo", "stockMaximo", unidad, "costoUnitario", proveedor, lote, "fechaVencimiento", ubicacion, "locationId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          id,
          nombre,
          categoria,
          stockActual,
          stockMinimo,
          stockMaximo,
          unidad,
          costoUnitario,
          proveedor,
          lote,
          fechaVencimiento,
          ubicacion,
          resolvedLocationId,
        ]
      );
      res.status(201).json({ id, nombre });
    } catch (_e) {
      res.status(500).json({ error: 'Error creating inventory item' });
    }
  }
);

router.put(
  '/api/inventory/:id',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(updateInventoryItemSchema),
  async (req, res) => {
    try {
      const {
        nombre,
        categoria,
        stockMinimo,
        stockMaximo,
        unidad,
        costoUnitario,
        proveedor,
        lote,
        fechaVencimiento,
        ubicacion,
        locationId,
        activo,
      } = req.body;
      // Un OPERATOR no-ADMIN no puede editar un ítem de otra sede, ni
      // reasignar un ítem propio a otra sede -- antes esta ruta no
      // verificaba la sede del ítem en absoluto.
      if (req.auth?.role !== 'ADMIN' && req.auth?.locationId) {
        const current = await pool.query('SELECT "locationId" FROM inventory_items WHERE id = $1', [req.params.id]);
        if (!current.rows.length) return res.status(404).json({ error: 'Ítem no encontrado' });
        if (current.rows[0].locationId !== req.auth.locationId) {
          return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
        }
        if (locationId !== undefined && locationId !== req.auth.locationId) {
          return res.status(403).json({ error: 'No autorizado para reasignar a otra sede' });
        }
      }

      // Stock actual NO se toca acá a propósito -- eso solo cambia vía
      // /api/inventory/movement, que deja rastro en inventory_movements.
      // Update dinámico (antes esta ruta sobreescribía TODAS las columnas
      // aunque no vinieran en el body, pisando datos existentes con NULL).
      const updates = [];
      const params = [];
      if (nombre !== undefined) {
        params.push(nombre);
        updates.push(`nombre = $${params.length}`);
      }
      if (categoria !== undefined) {
        params.push(categoria);
        updates.push(`categoria = $${params.length}`);
      }
      if (stockMinimo !== undefined) {
        params.push(stockMinimo);
        updates.push(`"stockMinimo" = $${params.length}`);
      }
      if (stockMaximo !== undefined) {
        params.push(stockMaximo);
        updates.push(`"stockMaximo" = $${params.length}`);
      }
      if (unidad !== undefined) {
        params.push(unidad);
        updates.push(`unidad = $${params.length}`);
      }
      if (costoUnitario !== undefined) {
        params.push(costoUnitario);
        updates.push(`"costoUnitario" = $${params.length}`);
      }
      if (proveedor !== undefined) {
        params.push(proveedor);
        updates.push(`proveedor = $${params.length}`);
      }
      if (lote !== undefined) {
        params.push(lote);
        updates.push(`lote = $${params.length}`);
      }
      if (fechaVencimiento !== undefined) {
        params.push(fechaVencimiento);
        updates.push(`"fechaVencimiento" = $${params.length}`);
      }
      if (ubicacion !== undefined) {
        params.push(ubicacion);
        updates.push(`ubicacion = $${params.length}`);
      }
      if (locationId !== undefined) {
        params.push(locationId);
        updates.push(`"locationId" = $${params.length}`);
      }
      if (activo !== undefined) {
        params.push(activo);
        updates.push(`activo = $${params.length}`);
      }

      if (!updates.length) return res.status(400).json({ error: 'Nada para actualizar' });

      params.push(req.params.id);
      const result = await pool.query(
        `UPDATE inventory_items SET ${updates.join(', ')} WHERE id = $${params.length}`,
        params
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Ítem no encontrado' });
      res.json({ id: req.params.id });
    } catch (_e) {
      res.status(500).json({ error: 'Error updating inventory item' });
    }
  }
);

// DELETE /api/inventory/:id — baja lógica (activo = false) en vez de
// borrar la fila: inventory_movements referencia itemId y el historial de
// movimientos es evidencia de auditoría que no debe perder el vínculo.
// Mismo criterio de sede que PUT: un OPERATOR solo puede dar de baja ítems
// de su propia sede.
router.delete('/api/inventory/:id', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    if (req.auth?.role !== 'ADMIN' && req.auth?.locationId) {
      const current = await pool.query('SELECT "locationId" FROM inventory_items WHERE id = $1', [req.params.id]);
      if (!current.rows.length) return res.status(404).json({ error: 'Ítem no encontrado' });
      if (current.rows[0].locationId !== req.auth.locationId) {
        return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
      }
    }
    const result = await pool.query('UPDATE inventory_items SET activo = false WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Ítem no encontrado' });
    res.json({ id: req.params.id, activo: false });
  } catch (_e) {
    res.status(500).json({ error: 'Error deleting inventory item' });
  }
});

router.post(
  '/api/inventory/movement',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(inventoryMovementSchema),
  async (req, res) => {
    try {
      const { itemId, tipo, cantidad, motivo, referencia } = req.body;
      // [2026-07-30] Backlog: `usuario` era aceptado desde el body — un
      // staff podía registrar movimientos bajo el nombre de otro (o
      // cualquier string). Ahora se toma SIEMPRE de req.auth.sub (el id
      // del empleado autenticado por el JWT) y el valor del body se ignora.
      const usuario = req.auth?.sub || 'sistema';
      const item = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [itemId]);
      if (!item.rows.length) return res.status(404).json({ error: 'Item not found' });
      // Un OPERATOR de una sede podía registrar entradas/salidas sobre
      // insumos de la OTRA sede -- itemId nunca se validaba contra la sede
      // del token, a diferencia de comandas.js que sí valida esto mismo
      // para comandaId.
      if (req.auth?.role !== 'ADMIN' && req.auth?.locationId && item.rows[0].locationId !== req.auth.locationId) {
        return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
      }
      const saldoAnterior = item.rows[0].stockActual;
      const saldoNuevo = tipo === 'entrada' ? saldoAnterior + cantidad : saldoAnterior - cantidad;
      if (saldoNuevo < 0) {
        return res.status(400).json({ error: `Stock insuficiente, disponible: ${saldoAnterior}` });
      }
      const movId = `mov_${Date.now()}`;
      await pool.query(
        `INSERT INTO inventory_movements (id, "itemId", tipo, cantidad, "saldoAnterior", "saldoNuevo", motivo, referencia, usuario) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [movId, itemId, tipo, cantidad, saldoAnterior, saldoNuevo, motivo, referencia, usuario]
      );
      await pool.query('UPDATE inventory_items SET "stockActual" = $1 WHERE id = $2', [saldoNuevo, itemId]);
      res.status(201).json({ id: movId, saldoNuevo });
    } catch (_e) {
      res.status(500).json({ error: 'Error registering movement' });
    }
  }
);

router.get(
  '/api/inventory/movements',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  requireSameLocation((req) => req.query.locationId),
  async (req, res) => {
    try {
      // inventory_movements no tiene locationId propio -- se resuelve vía
      // join contra inventory_items, igual criterio de sede efectiva que
      // GET /api/inventory (antes esta ruta no filtraba por sede en
      // absoluto: cualquier OPERATOR veía el historial completo de ambas).
      const locationId = effectiveLocationId(req);
      const params = [];
      let query = 'SELECT m.* FROM inventory_movements m';
      if (locationId) {
        params.push(locationId);
        query += ` JOIN inventory_items i ON i.id = m."itemId" AND i."locationId" = $${params.length}`;
      }
      query += ' ORDER BY m.creado DESC LIMIT 50';
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (_e) {
      res.status(500).json({ error: 'Error fetching movements' });
    }
  }
);

export default router;
