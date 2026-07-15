// 🗄️ Sistema de migraciones versionadas
// Cada migración es una función que recibe el pool y ejecuta SQL.
// Se ejecutan en orden numérico y solo una vez.
//
// USO:
//   import { runMigrations } from './migrate.js';
//   await runMigrations(pool);
//
// AGREGAR UNA MIGRACIÓN:
//   1. Crear una función asíncrona en MIGRATIONS debajo
//   2. Darle el siguiente número secuencial
//   3. Nunca modificar migraciones ya existentes
//   4. Si necesitas cambiar algo, escribe una NUEVA migración

import crypto from 'crypto';

const MIGRATIONS_TABLE = '_schema_migrations';

// ─── Registro de migraciones ────────────────────────────────────────
// Cada entrada tiene:
//   id     — número secuencial (único, ascendente)
//   name   — descripción corta de lo que hace
//   up     — función async (pool) => { ... } que aplica la migración
//
// ⚠️ REGLA DE ORO: Nunca modificar ni eliminar migraciones existentes.
//    Siempre agregar una nueva al final del array.

const MIGRATIONS = [
  // ── 001: Seed de usuarios por defecto ─────────────────────────
  {
    id: 1,
    name: 'Seed default admin/operator/delivery/marketing users',
    up: async (pool) => {
      // Estos usuarios ya existen hardcodeados en server/auth.js desde el
      // inicio del proyecto. Esta migración los pasa a la DB para que el
      // login pueda autenticar contra la tabla employees en lugar del array
      // en memoria.
      //
      // Los salts y PINs son idénticos a los del archivo auth.js original
      // (rotados 2026-07-09 para eliminar el anti-patrón salt=username+pin).
      // Los PINs de producción DEBEN cambiarse post-deploy vía el CRUD de
      // empleados del CRM.
      const defaultUsers = [
        {
          id: 'admin_default',
          nombre: 'Admin',
          role: 'ADMIN',
          pinHash:
            '8e5d8021909b49b5348d09be091a43d155648eb3476380a7e6dccaf6c2d2568eaeda23e1facb55e78332aab21df2dbe3547c04daab240f2ab55f9dbd29e082c4',
          salt: '1f60d58e3fdaed5a2c891abdb6c97802',
          locationId: 'nemocon',
        },
        {
          id: 'cocina_default',
          nombre: 'Chef Principal',
          role: 'OPERATOR',
          pinHash:
            '367522e4972ee9963efe1f9f1e05b7f75962857cbeedcebad68413f02268e01649b62c6159222961c5a6b3bdfdabbb9be1da489548a1c5a209eb5b8904ecd2d4',
          salt: 'c02d2416277251b5b166299d4460370d',
          locationId: 'nemocon',
        },
        {
          id: 'repartidor_default',
          nombre: 'Repartidor',
          role: 'REPARTIDOR',
          pinHash:
            'dde694168749243d81e9eb22fd6e674d2546b1f7eda5c7bc764339b56fb464ee79d058c752e31af475bad714d1c23d05cbf02f1245260646953b36a651236b31',
          salt: '449fb9c5f1d91593894092d51ef46eea',
          locationId: 'nemocon',
        },
        {
          id: 'marketing_default',
          nombre: 'Marketing',
          role: 'MARKETING',
          pinHash:
            'fc520073c3d1a43726422e9b10a0926d9027d9bed599664202ae48ebd04e358b762988ec6285f8ca5f8f7b35eeede4d4ba0a8722c15b9ff7268731be4327fce0',
          salt: '755e3acdf526949c9a9dc434daeb50cf',
          locationId: 'nemocon',
        },
      ];

      for (const user of defaultUsers) {
        await pool.query(
          `INSERT INTO employees (id, nombre, role, "pinHash", salt, "locationId", activo, creado)
           VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [user.id, user.nombre, user.role, user.pinHash, user.salt, user.locationId]
        );
      }
    },
  },

  // ── 002: Agregar columna email a employees (para login alternativo) ──
  {
    id: 2,
    name: 'Add email column and unique index to employees',
    up: async (pool) => {
      await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS email TEXT');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email)');
    },
  },

  // ── 003: Refresh tokens table ──────────────────────────────────
  {
    id: 3,
    name: 'Create refresh_tokens table for persisted refresh token tracking',
    up: async (pool) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id TEXT PRIMARY KEY,
          "employeeId" TEXT REFERENCES employees(id),
          token_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          revoked BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_employee ON refresh_tokens("employeeId")');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at)');
    },
  },
];

// ─── Runner ────────────────────────────────────────────────────────
// 1. Crea la tabla de tracking si no existe
// 2. Consulta cuáles migraciones ya corrieron
// 3. Ejecuta las pendientes en orden, cada una en su propia transacción
// 4. Registra cada migración ejecutada

export async function runMigrations(pool) {
  // Crear tabla de tracking
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      hash TEXT NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Obtener migraciones ya aplicadas
  const { rows: applied } = await pool.query(`SELECT id, hash FROM "${MIGRATIONS_TABLE}" ORDER BY id`);
  const appliedMap = new Map(applied.map((r) => [r.id, r.hash]));

  let pending = 0;
  for (const migration of MIGRATIONS) {
    const existingHash = appliedMap.get(migration.id);

    // Calcular hash del contenido de la migración para detectar cambios
    const hash = crypto.createHash('sha256').update(migration.up.toString()).digest('hex').slice(0, 16);

    if (existingHash) {
      if (existingHash !== hash) {
        console.warn(
          `⚠️ Migración #${migration.id} "${migration.name}" cambió desde que se aplicó. ` +
            `Ignorando (no se puede re-aplicar). Creá una nueva migración.`
        );
      }
      continue;
    }

    // Aplicar migración pendiente
    console.log(`🔄 Migración #${migration.id}: ${migration.name}...`);
    try {
      await pool.query('BEGIN');
      await migration.up(pool);
      await pool.query(`INSERT INTO "${MIGRATIONS_TABLE}" (id, name, hash) VALUES ($1, $2, $3)`, [
        migration.id,
        migration.name,
        hash,
      ]);
      await pool.query('COMMIT');
      console.log(`✅ Migración #${migration.id} aplicada`);
      pending++;
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error(`❌ Migración #${migration.id} falló:`, err.message);
      throw err;
    }
  }

  if (pending === 0) {
    console.log('📋 No hay migraciones pendientes');
  } else {
    console.log(`📋 ${pending} migración(es) aplicada(s)`);
  }
}
