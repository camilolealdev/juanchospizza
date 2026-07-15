import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole, hashPin, generateSalt } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createEmployeeSchema, updateEmployeeSchema } from '../schemas/employees.js';

const router = express.Router();

// --- EMPLOYEES (staff roster) ---
// Sistema de autenticación principal. El login ahora consulta esta tabla
// en server/auth.js — los usuarios por defecto (admin/cocina/repartidor/marketing)
// fueron insertados por la migración #001 con ON CONFLICT DO NOTHING.
// Para agregar más usuarios, usar este CRUD.

// pinHash/salt nunca salen de la API -- son secretos de autenticación.
const EMPLOYEE_COLUMNS = 'id, nombre, role, "locationId", activo, creado';

router.get('/api/employees', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${EMPLOYEE_COLUMNS} FROM employees ORDER BY nombre`);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching employees' });
  }
});

router.post(
  '/api/employees',
  authMiddleware,
  requireRole('ADMIN'),
  validate(createEmployeeSchema),
  async (req, res) => {
    try {
      const { nombre, role, pin, locationId } = req.body;
      const id = `emp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const salt = generateSalt();
      const pinHash = hashPin(pin, salt);
      await pool.query(
        `INSERT INTO employees (id, nombre, role, "pinHash", salt, "locationId") VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, nombre, role, pinHash, salt, locationId ?? null]
      );
      res.status(201).json({ id, nombre, role, locationId: locationId ?? null, activo: true });
    } catch (e) {
      res.status(500).json({ error: 'Error creating employee' });
    }
  }
);

router.put(
  '/api/employees/:id',
  authMiddleware,
  requireRole('ADMIN'),
  validate(updateEmployeeSchema),
  async (req, res) => {
    try {
      const { nombre, role, locationId, activo } = req.body;
      // Update dinámico -- el PIN nunca aparece acá a propósito, cambiar el
      // PIN es un flujo separado que este endpoint no cubre.
      const updates = [];
      const params = [];
      if (nombre !== undefined) {
        params.push(nombre);
        updates.push(`nombre = $${params.length}`);
      }
      if (role !== undefined) {
        params.push(role);
        updates.push(`role = $${params.length}`);
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
        `UPDATE employees SET ${updates.join(', ')} WHERE id = $${params.length}`,
        params
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Empleado no encontrado' });

      const updated = await pool.query(`SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE id = $1`, [req.params.id]);
      res.json(updated.rows[0]);
    } catch (e) {
      res.status(500).json({ error: 'Error updating employee' });
    }
  }
);

// Real DELETE, not soft-delete -- nothing else references employees.id yet
// (this table isn't wired into orders/auth), so there's no history to lose.
// activo already covers "deactivate but keep the record" for callers who want that.
router.delete('/api/employees/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: 'Error deleting employee' });
  }
});

export default router;
