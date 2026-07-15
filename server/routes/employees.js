import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole, hashPin, generateSalt } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createEmployeeSchema, updateEmployeeSchema, setPasswordSchema } from '../schemas/employees.js';

const router = express.Router();

// --- EMPLOYEES (staff roster) ---
// Sistema de autenticación principal. El login ahora consulta esta tabla
// en server/auth.js — los usuarios por defecto (admin/cocina/repartidor/marketing)
// fueron insertados por la migración #001 con ON CONFLICT DO NOTHING.
// Para agregar más usuarios, usar este CRUD.
//
// username/password (migración #004) son OPCIONALES: el PIN de 4 dígitos
// sigue alcanzando para roles de terminal compartida. isSuperAdmin no se
// otorga acá -- ver nota en schemas/employees.js.

// pinHash/salt/passwordHash/passwordSalt nunca salen de la API -- son secretos.
const EMPLOYEE_COLUMNS = 'id, nombre, role, username, "isSuperAdmin", "locationId", activo, creado';

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
      const { nombre, role, pin, locationId, username, password } = req.body;
      const id = `emp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const salt = generateSalt();
      const pinHash = hashPin(pin, salt);
      const passwordSalt = password ? generateSalt() : null;
      const passwordHash = password ? hashPin(password, passwordSalt) : null;
      await pool.query(
        `INSERT INTO employees (id, nombre, role, "pinHash", salt, "locationId", username, "passwordHash", "passwordSalt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, nombre, role, pinHash, salt, locationId ?? null, username ?? null, passwordHash, passwordSalt]
      );
      res
        .status(201)
        .json({ id, nombre, role, locationId: locationId ?? null, username: username ?? null, activo: true });
    } catch (e) {
      // username tiene índice único parcial (ver migración #004) -- choca si
      // ya existe otro empleado con el mismo username.
      if (e.code === '23505') {
        return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso' });
      }
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
      const { nombre, role, locationId, activo, username } = req.body;
      // Update dinámico -- PIN y password nunca aparecen acá a propósito,
      // cambiarlos son flujos separados que este endpoint no cubre.
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
      if (username !== undefined) {
        params.push(username);
        updates.push(`username = $${params.length}`);
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
      if (e.code === '23505') {
        return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso' });
      }
      res.status(500).json({ error: 'Error updating employee' });
    }
  }
);

// Separado del PUT general a propósito, igual que el PIN nunca se toca ahí --
// cambiar un secreto de autenticación merece su propio endpoint explícito,
// no un campo más en un update genérico donde es fácil pisarlo sin querer.
router.patch(
  '/api/employees/:id/password',
  authMiddleware,
  requireRole('ADMIN'),
  validate(setPasswordSchema),
  async (req, res) => {
    try {
      const { password } = req.body;
      const passwordSalt = generateSalt();
      const passwordHash = hashPin(password, passwordSalt);
      const result = await pool.query(`UPDATE employees SET "passwordHash" = $1, "passwordSalt" = $2 WHERE id = $3`, [
        passwordHash,
        passwordSalt,
        req.params.id,
      ]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
      res.status(204).end();
    } catch (e) {
      res.status(500).json({ error: 'Error setting password' });
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
