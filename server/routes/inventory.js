import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const router = express.Router();

// --- INVENTORY ---
router.get('/api/inventory', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_items ORDER BY nombre');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching inventory' }); }
});

router.post('/api/inventory', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { nombre, categoria, stockActual, stockMinimo, stockMaximo, unidad, costoUnitario, proveedor, lote, fechaVencimiento, ubicacion } = req.body;
    const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    await pool.query(
      `INSERT INTO inventory_items (id, nombre, categoria, "stockActual", "stockMinimo", "stockMaximo", unidad, "costoUnitario", proveedor, lote, "fechaVencimiento", ubicacion) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, nombre, categoria, stockActual||0, stockMinimo||10, stockMaximo||100, unidad||'unidad', costoUnitario||0, proveedor, lote, fechaVencimiento, ubicacion]
    );
    res.status(201).json({ id, nombre });
  } catch (e) { res.status(500).json({ error: 'Error creating inventory item' }); }
});

router.put('/api/inventory/:id', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { nombre, categoria, stockMinimo, stockMaximo, unidad, costoUnitario, proveedor, lote, fechaVencimiento, ubicacion, activo } = req.body;
    // Stock actual NO se toca acá a propósito -- eso solo cambia vía
    // /api/inventory/movement, que deja rastro en inventory_movements.
    const result = await pool.query(
      `UPDATE inventory_items SET nombre=$1, categoria=$2, "stockMinimo"=$3, "stockMaximo"=$4, unidad=$5, "costoUnitario"=$6, proveedor=$7, lote=$8, "fechaVencimiento"=$9, ubicacion=$10, activo=$11 WHERE id=$12`,
      [nombre, categoria, stockMinimo, stockMaximo, unidad, costoUnitario, proveedor, lote, fechaVencimiento, ubicacion, activo !== undefined ? !!activo : true, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Ítem no encontrado' });
    res.json({ id: req.params.id });
  } catch (e) { res.status(500).json({ error: 'Error updating inventory item' }); }
});

router.post('/api/inventory/movement', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { itemId, tipo, cantidad, motivo, referencia, usuario } = req.body;
    const item = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [itemId]);
    if (!item.rows.length) return res.status(404).json({ error: 'Item not found' });
    const saldoAnterior = item.rows[0].stockActual;
    const saldoNuevo = tipo === 'entrada' ? saldoAnterior + cantidad : saldoAnterior - cantidad;
    const movId = `mov_${Date.now()}`;
    await pool.query(
      `INSERT INTO inventory_movements (id, "itemId", tipo, cantidad, "saldoAnterior", "saldoNuevo", motivo, referencia, usuario) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [movId, itemId, tipo, cantidad, saldoAnterior, saldoNuevo, motivo, referencia, usuario||'sistema']
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
