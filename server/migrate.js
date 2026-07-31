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
import logger from './services/logger.js';

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

  // ── 004: username + password (2do factor para super admin) ──────
  {
    id: 4,
    name: 'Add username/password columns to employees, promote admin_default to super admin',
    up: async (pool) => {
      // username es el identificador de login real (reemplaza el "escanear
      // todos los del rol y probar el PIN de a uno" que auth.js usa hoy --
      // ese approach es O(n) por intento Y no distingue dos empleados del
      // mismo rol con el mismo PIN, dos problemas reales, no cosméticos).
      await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS username TEXT');
      await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS "passwordHash" TEXT');
      await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS "passwordSalt" TEXT');
      // Cuenta con privilegios totales que exige password Y pin (dos
      // secretos) para iniciar sesión, no solo uno u otro. No hay más de
      // una hoy, pero es un flag, no un rol nuevo, por si eso cambia.
      await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN DEFAULT FALSE');
      await pool.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_username ON employees(username) WHERE username IS NOT NULL'
      );

      // Backfill: los 4 sembrados por la migración #001 conservan su
      // username fijo de siempre para no romper el login existente.
      const seeded = {
        admin_default: 'admin',
        cocina_default: 'cocina',
        repartidor_default: 'repartidor',
        marketing_default: 'marketing',
      };
      for (const [id, username] of Object.entries(seeded)) {
        await pool.query('UPDATE employees SET username = $1 WHERE id = $2 AND username IS NULL', [username, id]);
      }

      // admin_default pasa a super admin. passwordHash queda NULL a
      // propósito -- no hay password "por defecto" segura para hardcodear
      // en una migración (sería el mismo anti-patrón que el salt viejo).
      // Con isSuperAdmin=true y passwordHash NULL, el login debe exigir
      // que se configure un password real antes de aceptar esta cuenta
      // (responsabilidad de auth.js, no de esta migración).
      await pool.query(`UPDATE employees SET "isSuperAdmin" = true WHERE id = 'admin_default'`);
    },
  },

  // ── 005: Ley 1581/2012 (Habeas Data, Colombia) ──────────────────
  // Agrega columnas de consentimiento a `clients` y crea dos tablas de
  // evidencia: consent_eventos (log histórico de cada decisión) y
  // derechos_solicitudes (consulta / rectificación / supresión / reclamo
  // Art. 14-15 Ley 1581 con plazo de 10 días hábiles para responder).
  //
  // Idempotente: usa ADD COLUMN IF NOT EXISTS y CREATE TABLE IF NOT
  // EXISTS, igual que los ALTER del initDB. Para instalaciones NUEVAS el
  // initDB ya crea las columnas y tablas; esta migración queda como no-op.
  {
    id: 5,
    name: 'Habeas Data: columns + consent_eventos + derechos_solicitudes',
    up: async (pool) => {
      await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS "dataTreatmentAuthorized" BOOLEAN DEFAULT FALSE');
      await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS "marketingAuthorized" BOOLEAN DEFAULT FALSE');
      await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS "consentAt" TIMESTAMPTZ');
      await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS "consentIp" VARCHAR(45)');
      await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS "consentUserAgent" TEXT');
      await pool.query('ALTER TABLE clients ADD COLUMN IF NOT EXISTS "consentVersion" VARCHAR(20)');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS consent_eventos (
          id TEXT PRIMARY KEY,
          "clientId" TEXT REFERENCES clients(id),
          "consentType" TEXT NOT NULL,
          granted BOOLEAN NOT NULL,
          ip VARCHAR(45),
          "userAgent" TEXT,
          source TEXT DEFAULT 'web',
          path TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_consent_eventos_clientId ON consent_eventos("clientId")');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_consent_eventos_created ON consent_eventos(created_at)');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS derechos_solicitudes (
          id TEXT PRIMARY KEY,
          "clientId" TEXT REFERENCES clients(id),
          tipo TEXT NOT NULL,
          descripcion TEXT,
          "identificador" TEXT,
          estado TEXT DEFAULT 'pendiente',
          "respuesta" TEXT,
          "respondedBy" TEXT,
          "respondedAt" TIMESTAMPTZ,
          "ipOrigen" VARCHAR(45),
          "userAgent" TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_derechos_clientId ON derechos_solicitudes("clientId")');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_derechos_estado ON derechos_solicitudes(estado)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_derechos_created ON derechos_solicitudes(created_at)');
    },
  },

  // ── 006: Menú real (carta actualizada) ──────────────────────────
  // subcategory agrupa productos dentro de una misma categoría (ej. las 3
  // cartas de hamburguesa "A la plancha/Apanadas/De la casa", o las
  // subsecciones de bebidas) sin inventar una jerarquía de categorías nueva.
  // pizza_sizes es tabla nueva -- en instalaciones nuevas initDB ya la crea,
  // acá queda como no-op idempotente.
  {
    id: 6,
    name: 'Add subcategory to products, create pizza_sizes table',
    up: async (pool) => {
      await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS pizza_sizes (
          id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          precio INTEGER NOT NULL,
          incluidos INTEGER NOT NULL,
          porciones INTEGER,
          activo BOOLEAN DEFAULT TRUE
        )
      `);
    },
  },

  // ── 007: UNIQUE constraint en invoices.orderId (cierra race TOCTOU) ──
  // POST /api/invoices hacía SELECT id FROM invoices WHERE "orderId"=$1
  // seguido de un INSERT separado, sin transacción/lock, apoyado solo en
  // el índice NO-único idx_invoices_orderId. Dos requests concurrentes
  // para la misma orden podían pasar el chequeo y ambas insertar,
  // generando doble factura para un solo pedido (bug real de cumplimiento
  // de facturación electrónica + doble conteo de ingresos). El índice
  // UNIQUE cierra la carrera a nivel de DB; el endpoint ahora además
  // captura el error 23505 (unique_violation) y responde 409 en vez de
  // confiar únicamente en el SELECT previo.
  //
  // Para instalaciones NUEVAS, db.js/schema.sql ya crean el índice como
  // UNIQUE directamente (idx_invoices_orderId_unique) -- acá el DROP no
  // encuentra nada que borrar y el CREATE es no-op idempotente.
  //
  // ⚠️ Si la tabla ya tiene orderId duplicados (el bug ya ocurrió en
  // producción antes de este fix), el CREATE UNIQUE INDEX fallará y esta
  // migración quedará pendiente hasta limpiar los duplicados a mano
  // (mismo criterio que el resto de este archivo: nunca enmascarar datos
  // inconsistentes silenciosamente).
  {
    id: 7,
    name: 'Replace non-unique idx_invoices_orderId with a UNIQUE index to prevent duplicate invoices',
    up: async (pool) => {
      await pool.query('DROP INDEX IF EXISTS idx_invoices_orderId');
      await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_orderId_unique ON invoices("orderId")');
    },
  },

  // ── 008: processed_webhooks (idempotencia de webhooks de pago) ────
  // Previene doble procesamiento cuando Bold/MercadoPago/Wompi reintentan
  // un webhook. El INSERT con ON CONFLICT es la barrera atómica: dos
  // handlers concurrentes con el mismo (provider, sourceId) no pueden
  // pasar ambos. Para instalaciones nuevas, initDB() en db.js ya crea
  // esta tabla — la migración queda como no-op idempotente.
  {
    id: 8,
    name: 'Create processed_webhooks table for payment webhook idempotency',
    up: async (pool) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS processed_webhooks (
          provider TEXT NOT NULL,
          "sourceId" TEXT NOT NULL,
          "processedAt" TIMESTAMPTZ DEFAULT NOW(),
          "orderId" TEXT,
          PRIMARY KEY (provider, "sourceId")
        )
      `);
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
        logger.warn(
          { migrationId: migration.id, name: migration.name },
          `Migración #${migration.id} "${migration.name}" cambió desde que se aplicó. Ignorando.`
        );
      }
      continue;
    }

    // Aplicar migración pendiente
    // Usa un único client dedicado (pool.connect()) para todo el ciclo
    // BEGIN/up/INSERT/COMMIT: emitir BEGIN/COMMIT/ROLLBACK como pool.query()
    // separados no garantiza que las tres lleguen a la misma conexión física
    // (pg.Pool puede servir cada .query() con un cliente distinto del pool),
    // rompiendo la atomicidad de la transacción bajo un pooler transaccional
    // (Neon/RDS-style) o bajo concurrencia real.
    logger.info({ migrationId: migration.id }, `Migración #${migration.id}: ${migration.name}...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await migration.up(client);
      await client.query(`INSERT INTO "${MIGRATIONS_TABLE}" (id, name, hash) VALUES ($1, $2, $3)`, [
        migration.id,
        migration.name,
        hash,
      ]);
      await client.query('COMMIT');
      logger.info({ migrationId: migration.id }, `Migración #${migration.id} aplicada`);
      pending++;
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ err, migrationId: migration.id }, `Migración #${migration.id} falló: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  if (pending === 0) {
    logger.info('No hay migraciones pendientes');
  } else {
    logger.info({ pending }, `${pending} migración(es) aplicada(s)`);
  }
}
