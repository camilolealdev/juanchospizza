import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createInventoryItemSchema, updateInventoryItemSchema, inventoryMovementSchema } from '../schemas/inventory.js';

const router = express.Router();

// --- INVENTORY ---
router.get('/api/inventory', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_items ORDER BY nombre');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching inventory' }); }
});

router.post('/api/inventory', authMiddleware, requireRole('ADMIN', 'OPERATOR'), validate(createInventoryItemSchema), async (req, res) => {
  try {
    const { nombre, categoria, stockActual, stockMinimo, stockMaximo, unidad, costoUnitario, proveedor, lote, fechaVencimiento, ubicacion } = req.body;
    const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    await pool.query(
      `INSERT INTO inventory_items (id, nombre, categoria, "stockActual", "stockMinimo", "stockMaximo", unidad, "costoUnitario", proveedor, lote, "fechaVencimiento", ubicacion) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, nombre, categoria, stockActual, stockMinimo, stockMaximo, unidad, costoUnitario, proveedor, lote, fechaVencimiento, ubicacion]
    );
    res.status(201).json({ id, nombre });
  } catch (e) { res.status(500).json({ error: 'Error creating inventory item' }); }
});

router.put('/api/inventory/:id', authMiddleware, requireRole('ADMIN', 'OPERATOR'), validate(updateInventoryItemSchema), async (req, res) => {
  try {
    const { nombre, categoria, stockMinimo, stockMaximo, unidad, costoUnitario, proveedor, lote, fechaVencimiento, ubicacion, activo } = req.body;
    // Stock actual NO se toca acá a propósito -- eso solo cambia vía
    // /api/inventory/movement, que deja rastro en inventory_movements.
    // Update dinámico (antes esta ruta sobreescribía TODAS las columnas
    // aunque no vinieran en el body, pisando datos existentes con NULL).
    const updates = []; const params = [];
    if (nombre !== undefined) { params.push(nombre); updates.push(`nombre = $${params.length}`); }
    if (categoria !== undefined) { params.push(categoria); updates.push(`categoria = $${params.length}`); }
    if (stockMinimo !== undefined) { params.push(stockMinimo); updates.push(`"stockMinimo" = $${params.length}`); }
    if (stockMaximo !== undefined) { params.push(stockMaximo); updates.push(`"stockMaximo" = $${params.length}`); }
    if (unidad !== undefined) { params.push(unidad); updates.push(`unidad = $${params.length}`); }
    if (costoUnitario !== undefined) { params.push(costoUnitario); updates.push(`"costoUnitario" = $${params.length}`); }
    if (proveedor !== undefined) { params.push(proveedor); updates.push(`proveedor = $${params.length}`); }
    if (lote !== undefined) { params.push(lote); updates.push(`lote = $${params.length}`); }
    if (fechaVencimiento !== undefined) { params.push(fechaVencimiento); updates.push(`"fechaVencimiento" = $${params.length}`); }
    if (ubicacion !== undefined) { params.push(ubicacion); updates.push(`ubicacion = $${params.length}`); }
    if (activo !== undefined) { params.push(activo); updates.push(`activo = $${params.length}`); }

    if (!updates.length) return res.status(400).json({ error: 'Nada para actualizar' });

    params.push(req.params.id);
    const result = await pool.query(`UPDATE inventory_items SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Ítem no encontrado' });
    res.json({ id: req.params.id });
  } catch (e) { res.status(500).json({ error: 'Error updating inventory item' }); }
});

router.post('/api/inventory/movement', authMiddleware, requireRole('ADMIN', 'OPERATOR'), validate(inventoryMovementSchema), async (req, res) => {
  try {
    const { itemId, tipo, cantidad, motivo, referencia, usuario } = req.body;
    const item = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [itemId]);
    if (!item.rows.length) return res.status(404).json({ error: 'Item not found' });
    const saldoAnterior = item.rows[0].stockActual;
    const saldoNuevo = tipo === 'entrada' ? saldoAnterior + cantidad : saldoAnterior - cantidad;
    const movId = `mov_${Date.now()}`;
    await pool.query(
      `INSERT INTO inventory_movements (id, "itemId", tipo, cantidad, "saldoAnterior", "saldoNuevo", motivo, referencia, usuario) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [movId, itemId, tipo, cantidad, saldoAnterior, saldoNuevo, motivo, referencia, usuario]
    );
    await pool.query('UPDATE inventory_items SET "stockActual" = $1 WHERE id = $2', [saldoNuevo, itemId]);
    res.status(201).json({ id: movId, saldoNuevo });
  } catch (e) { res.status(500).json({ error: 'Error registering movement' }); }
});

router.get('/api/inventory/movements', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_movements ORDER BY creado DESC LIMIT 50');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching movements' }); }
});


export default router;
