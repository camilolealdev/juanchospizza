import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createExpenseSchema, updateExpenseSchema } from '../schemas/finance.js';

const router = express.Router();

// --- EXPENSES ---
router.get('/api/expenses', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let query = 'SELECT * FROM expenses';
    const params = [];
    if (desde && hasta) { query += ' WHERE fecha >= $1 AND fecha <= $2'; params.push(desde, hasta); }
    query += ' ORDER BY fecha DESC LIMIT 100';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching expenses' }); }
});

router.post('/api/expenses', authMiddleware, requireRole('ADMIN'), validate(createExpenseSchema), async (req, res) => {
  try {
    const { categoria, descripcion, monto, fecha, metodo, proveedor, factura, notas, recurrente } = req.body;
    const id = `exp_${Date.now()}`;
    await pool.query(
      `INSERT INTO expenses (id, categoria, descripcion, monto, fecha, metodo, proveedor, factura, notas, recurrente) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, categoria, descripcion, monto, fecha || new Date().toISOString(), metodo, proveedor, factura, notas, recurrente]
    );
    res.status(201).json({ id });
  } catch (e) { res.status(500).json({ error: 'Error creating expense' }); }
});

router.put('/api/expenses/:id', authMiddleware, requireRole('ADMIN'), validate(updateExpenseSchema), async (req, res) => {
  try {
    const { categoria, descripcion, monto, fecha, metodo, proveedor, factura, notas, recurrente } = req.body;
    // Update dinámico -- la versión anterior (agregada esta misma sesión,
    // fase 2) sobrescribía las 9 columnas siempre, aunque el body solo
    // trajera un campo, pisando el resto con NULL/false.
    const updates = []; const params = [];
    if (categoria !== undefined) { params.push(categoria); updates.push(`categoria = $${params.length}`); }
    if (descripcion !== undefined) { params.push(descripcion); updates.push(`descripcion = $${params.length}`); }
    if (monto !== undefined) { params.push(monto); updates.push(`monto = $${params.length}`); }
    if (fecha !== undefined) { params.push(fecha); updates.push(`fecha = $${params.length}`); }
    if (metodo !== undefined) { params.push(metodo); updates.push(`metodo = $${params.length}`); }
    if (proveedor !== undefined) { params.push(proveedor); updates.push(`proveedor = $${params.length}`); }
    if (factura !== undefined) { params.push(factura); updates.push(`factura = $${params.length}`); }
    if (notas !== undefined) { params.push(notas); updates.push(`notas = $${params.length}`); }
    if (recurrente !== undefined) { params.push(recurrente); updates.push(`recurrente = $${params.length}`); }

    if (!updates.length) return res.status(400).json({ error: 'Nada para actualizar' });

    params.push(req.params.id);
    const result = await pool.query(`UPDATE expenses SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Gasto no encontrado' });
    res.json({ id: req.params.id });
  } catch (e) { res.status(500).json({ error: 'Error updating expense' }); }
});

router.delete('/api/expenses/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Gasto no encontrado' });
    res.status(204).send();
  } catch (e) { res.status(500).json({ error: 'Error deleting expense' }); }
});


// --- FINANCE REPORTS ---
router.get('/api/finance/summary', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const ingresos = await pool.query("SELECT COALESCE(SUM(total),0)::int as total FROM orders WHERE status != 'CANCELLED'");
    const egresos = await pool.query("SELECT COALESCE(SUM(monto),0)::int as total FROM expenses");
    const ordenes = await pool.query('SELECT COUNT(*)::int as count FROM orders');
    const clientes = await pool.query('SELECT COUNT(*)::int as count FROM clients');
    const gastosCat = await pool.query('SELECT categoria, COALESCE(SUM(monto),0)::int as total FROM expenses GROUP BY categoria');
    res.json({
      ingresos: ingresos.rows[0]?.total || 0,
      egresos: egresos.rows[0]?.total || 0,
      utilidad: (ingresos.rows[0]?.total || 0) - (egresos.rows[0]?.total || 0),
      totalOrdenes: ordenes.rows[0]?.count || 0,
      totalClientes: clientes.rows[0]?.count || 0,
      gastosPorCategoria: gastosCat.rows
    });
  } catch (e) { res.status(500).json({ error: 'Error fetching finance summary' }); }
});


export default router;
