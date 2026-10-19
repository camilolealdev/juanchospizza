import express from 'express';
import crypto from 'crypto';
import { pool } from '../db.js';
import { authMiddleware, requireRole, hashPin, generateSalt } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createEmployeeSchema, updateEmployeeSchema, setPasswordSchema } from '../schemas/employees.js';
import logger from '../services/logger.js';

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
const BASE_COLUMNS =
  'id, nombre, role, username, email, "isSuperAdmin", "locationId", activo, creado, ("passwordHash" IS NOT NULL) AS "tienePassword"';
const EMPLOYEE_COLUMNS = `${BASE_COLUMNS}, "passwordChangedAt"`;

// "passwordChangedAt" (migración #17) es solo informativa. Si por cualquier
// motivo la columna aún no existe (el runner de migraciones traga errores),
// estas rutas deben seguir funcionando como antes en vez de caerse: se
// reintenta con el SQL anterior (42703 = undefined_column).
async function queryWithLegacyFallback(sql, params, legacySql, legacyParams = params) {
  try {
    return await pool.query(sql, params);
  } catch (e) {
    if (e?.code !== '42703') throw e;
    logger.warn({ err: e.message }, 'employees."passwordChangedAt" no existe aún; usando SQL anterior');
    return pool.query(legacySql, legacyParams);
  }
}

router.get('/api/employees', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await queryWithLegacyFallback(
      `SELECT ${EMPLOYEE_COLUMNS} FROM employees ORDER BY nombre`,
      [],
      `SELECT ${BASE_COLUMNS} FROM employees ORDER BY nombre`
    );
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
      const { nombre, role, pin, locationId, username, email, password } = req.body;
      // ponytail: emp_<timestamp>_<random corto> era adivinable (auditoria
      // BAJA) -- crypto.randomUUID() da 122 bits de entropia real, mismo
      // prefijo emp_ para no romper filtros/logs que ya esperan ese formato.
      const id = `emp_${crypto.randomUUID()}`;
      const salt = generateSalt();
      // Sin PIN en el alta: se siembra uno aleatorio que nadie conoce (la
      // columna es obligatoria; el login web usa contraseña).
      const pinHash = hashPin(pin ?? String(crypto.randomInt(0, 10000)).padStart(4, '0'), salt);
      const passwordSalt = password ? generateSalt() : null;
      const passwordHash = password ? hashPin(password, passwordSalt) : null;
      const values = [
        id,
        nombre,
        role,
        pinHash,
        salt,
        locationId ?? null,
        username ?? null,
        email ?? null,
        passwordHash,
        passwordSalt,
      ];
      await queryWithLegacyFallback(
        `INSERT INTO employees (id, nombre, role, "pinHash", salt, "locationId", username, email, "passwordHash", "passwordSalt", "passwordChangedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CASE WHEN $9::text IS NULL THEN NULL ELSE NOW() END)`,
        values,
        `INSERT INTO employees (id, nombre, role, "pinHash", salt, "locationId", username, email, "passwordHash", "passwordSalt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`
      );
      res.status(201).json({
        id,
        nombre,
        role,
        locationId: locationId ?? null,
        username: username ?? null,
        email: email ?? null,
        activo: true,
      });
    } catch (e) {
      // username (migración #004) y email (#012) tienen índice único parcial --
      // chocan si ya existe otro empleado con el mismo valor.
      if (e.code === '23505') {
        const campo = String(e.constraint || '').includes('email') ? 'correo' : 'nombre de usuario';
        return res.status(409).json({ error: `Ese ${campo} ya está en uso` });
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
      const { nombre, role, locationId, activo, username, email } = req.body;
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
      if (email !== undefined) {
        params.push(email);
        updates.push(`email = $${params.length}`);
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
        const campo = String(e.constraint || '').includes('email') ? 'correo' : 'nombre de usuario';
        return res.status(409).json({ error: `Ese ${campo} ya está en uso` });
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
      // Auditoría de seguridad #1 (revisión de arquitectura): antes CUALQUIER
      // ADMIN podía resetear la password de CUALQUIER otro empleado -- incluido
      // otro ADMIN o el super admin -- sin re-autenticarse y sin dejar rastro.
      // Toma de cuenta silenciosa. Ahora: (a) un ADMIN no super-admin no puede
      // tocar la password de una cuenta isSuperAdmin salvo que sea la suya
      // propia, y (b) todo reset queda logueado (actor + target).
      const target = await pool.query('SELECT id, "isSuperAdmin" FROM employees WHERE id = $1', [req.params.id]);
      if (target.rowCount === 0) return res.status(404).json({ error: 'Empleado no encontrado' });

      const actorId = req.auth?.sub;
      const isSelfReset = actorId === req.params.id;
      if (target.rows[0].isSuperAdmin && !isSelfReset) {
        logger.warn(
          { actorId, targetId: req.params.id, ip: req.ip },
          'Intento bloqueado: reset de password de super admin por otra cuenta'
        );
        return res.status(403).json({ error: 'Solo el super admin puede cambiar su propia contraseña' });
      }

      const { password } = req.body;
      const passwordSalt = generateSalt();
      const passwordHash = hashPin(password, passwordSalt);
      const result = await queryWithLegacyFallback(
        `UPDATE employees SET "passwordHash" = $1, "passwordSalt" = $2, "passwordChangedAt" = NOW(), "failedLoginAttempts" = 0, "lockedUntil" = NULL WHERE id = $3`,
        [passwordHash, passwordSalt, req.params.id],
        `UPDATE employees SET "passwordHash" = $1, "passwordSalt" = $2, "failedLoginAttempts" = 0, "lockedUntil" = NULL WHERE id = $3`
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Empleado no encontrado' });
      logger.info({ actorId, targetId: req.params.id, isSelfReset, ip: req.ip }, 'Contraseña de empleado actualizada');
      res.status(204).end();
    } catch (e) {
      res.status(500).json({ error: 'Error setting password' });
    }
  }
);

// Soft-delete: marcar como inactivo en vez de borrar el registro. Los
// empleados inactivos dejan de poder iniciar sesión (auth.js chequea
// activo) pero el registro histórico se conserva para referencias FK
// (shifts.openedBy, refresh_tokens.employeeId) y auditoría.
// El PUT general ya permite reactivar (PUT activo=true) manualmente.
router.delete('/api/employees/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('UPDATE employees SET activo = false WHERE id = $1 AND activo = true', [
      req.params.id,
    ]);
    if (result.rowCount === 0) {
      // Puede ser que ya esté inactivo o que no exista. Distinguir para
      // dar mejor feedback al admin.
      const exists = await pool.query('SELECT id, activo FROM employees WHERE id = $1', [req.params.id]);
      if (exists.rows.length === 0) {
        return res.status(404).json({ error: 'Empleado no encontrado' });
      }
      return res.status(409).json({ error: 'El empleado ya está inactivo' });
    }
    console.log(`[Employees] Soft-delete: empleado ${req.params.id} marcado como inactivo`);
    res.status(204).end();
  } catch (e) {
    // UPDATE no toca PK así que FK constraints (shifts.openedBy,
    // refresh_tokens.employeeId) nunca se violan. Si algo falla acá
    // es error real de DB, no de integridad referencial.
    res.status(500).json({ error: 'Error al desactivar empleado' });
  }
});

export default router;
