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

  // ── 009: Multi-sede para inventario y gastos + índice compuesto ────
  // Cierre del backlog 2026-07-30: inventory_items y expenses no tenían
  // locationId (el resto del CRM multi-sede sí: orders, comandas, shifts,
  // cash_register, digiturno, purchase_orders, invoices, tips). Sin esto,
  // los reportes por sede de Finanzas/Inventario mezclaban las dos sedes.
  // También agrega el índice compuesto (locationId, createdAt) en orders,
  // la query más frecuente del dashboard/ventas por sede. Para
  // instalaciones nuevas, initDB() en db.js ya aplica columnas e índices
  // — la migración queda como no-op idempotente.
  {
    id: 9,
    name: 'Add locationId to inventory_items and expenses, composite index on orders',
    up: async (pool) => {
      await pool.query(`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS "locationId" TEXT DEFAULT 'nemocon'`);
      await pool.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS "locationId" TEXT DEFAULT 'nemocon'`);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_inventory_locationId ON inventory_items("locationId")');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_expenses_locationId ON expenses("locationId")');
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_orders_locationId_createdAt ON orders("locationId", "createdAt")'
      );
    },
  },

  // ── 010: Lockout de cuenta por intentos fallidos de login ─────────
  // server/middleware/rateLimit.js limita login por IP vía Redis, pero es
  // fail-open si Redis cae y no distingue cuentas -- un atacante rotando
  // IP puede fuerza-bruta el PIN de 4 dígitos de una cuenta puntual sin
  // tope real. Este contador vive en la fila del empleado (no en Redis),
  // así que sigue aplicando aunque Redis esté caído. Ver server/auth.js
  // `authenticate()` para la lógica de incremento/lock/reset.
  {
    id: 10,
    name: 'Add failedLoginAttempts/lockedUntil to employees for per-account lockout',
    up: async (pool) => {
      await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER DEFAULT 0');
      await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMPTZ');
    },
  },
  // ── 011: scheduleAt para campañas programadas ─────────────────
  // Habilita el scheduler de campañas (server/services/campaignScheduler.js):
  // el cron del server pasa las campañas `scheduled` con scheduleAt <= NOW()
  // a `active`. La columna es nullable -- una campaña `draft`/`active` sin
  // fecha programada sigue siendo válida.
  {
    id: 11,
    name: 'Add scheduleAt to campaigns for the scheduled-campaign scheduler',
    up: async (pool) => {
      await pool.query('ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS "scheduleAt" TIMESTAMPTZ');
    },
  },
  // ── 012: email único para login con Google ────────────────────
  // La columna `email` ya existía desde la migración #002 ("login
  // alternativo"), pero con un índice NO único -- nunca llegó a usarse para
  // loguear, así que nadie notó que dos empleados podían compartir el mismo
  // email. server/auth.js `authenticateGoogle()` hace SELECT ... WHERE
  // email = $1 y toma rows[0]: sin unicidad, dos filas con el mismo email
  // matchean ambas y cuál gana es arbitrario (orden de la fila en disco) --
  // un empleado podría autenticarse como otro. Se reemplaza el índice viejo
  // por uno único y parcial (WHERE email IS NOT NULL, porque NULL no cuenta
  // como duplicado en Postgres de todos modos, pero lo deja explícito).
  {
    id: 12,
    name: 'Make employees.email unique for Google login',
    up: async (pool) => {
      await pool.query('DROP INDEX IF EXISTS idx_employees_email');
      await pool.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email ON employees(email) WHERE email IS NOT NULL'
      );
    },
  },
  // ── 013: correo del admin para el login con Google ────────────────
  // Ninguna migración ni ruta llenaba employees.email, así que el login con
  // Google nunca encontraba a nadie. Se asigna el correo del dueño al
  // super admin sembrado (ADMIN_EMAIL en el entorno lo sobreescribe). Solo
  // si todavía no tiene correo, para no pisar uno puesto a mano.
  {
    id: 13,
    name: 'Set admin_default email for Google login',
    up: async (pool) => {
      const email = (process.env.ADMIN_EMAIL || 'juanchospizzanz@gmail.com').trim().toLowerCase();
      await pool.query(`UPDATE employees SET email = $1 WHERE id = 'admin_default' AND email IS NULL`, [email]);
    },
  },
  // ── 014: normaliza employees.email a minuscula ────────────────────
  // authenticate() ya compara LOWER(email), pero authenticateGoogle() seguía
  // comparando la columna sin normalizar -- un email guardado con mayúscula
  // (PATCH manual, o seedInitialCredentialsFromEnv con ADMIN_EMAIL con
  // mayúsculas) nunca podía loguearse con Google pese a token válido.
  {
    id: 14,
    name: 'Lowercase existing employees.email values',
    up: async (pool) => {
      await pool.query(`UPDATE employees SET email = lower(email) WHERE email IS NOT NULL AND email != lower(email)`);
    },
  },
  // ── 015: catálogo real GastroPro (copia 8-oct-2026) ───────────────
  // Carga 73 productos, 8 categorías, 8 tamaños y 18 variantes "Combo".
  // Solo upserts: NO borra nada, así que pedidos y clientes no se tocan.
  // Corre una sola vez (queda en _schema_migrations); después el CRM edita
  // el menú, no el código.
  {
    id: 15,
    name: 'Carga catálogo real GastroPro (73 productos, 8 categorías, tamaños, combos)',
    up: async (pool) => {
      const categories = [
        ['adicionales', 'Adicionales'],
        ['bebidas', 'Bebidas'],
        ['calientes', 'Salchipapas & Perros calientes'],
        ['especiales', 'Especiales'],
        ['hamburguesas', 'Hamburguesas'],
        ['pastas', 'Lasagnas & Spaghettis'],
        ['pizzas', 'Pizza'],
        ['postres', 'Postres'],
      ];
      for (const [id, name] of categories) {
        await pool.query('INSERT INTO categories (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = $2', [
          id,
          name,
        ]);
      }

      // [id, categoryId, nombre, descripcion, basePrice, type, popularidad, vegetariano, subcategory]
      const products = [
        ['pz-hawaiana', 'pizzas', 'Hawaiana', 'Piña, Jamón', 30000, 'tradicional', 0, false, null],
        [
          'pz-pollo-champinones',
          'pizzas',
          'Pollo y champiñones',
          'Jamón, Champiñones, Pollo desmechado',
          30000,
          'tradicional',
          0,
          false,
          null,
        ],
        ['pz-carnes', 'pizzas', 'Carnes', 'Jamón, Salami, Cabano', 30000, 'tradicional', 0, false, null],
        [
          'pz-costillitas-bbq',
          'pizzas',
          'Costillitas BBQ',
          'Jamón, Costillas BBQ, Maíz tierno',
          30000,
          'tradicional',
          0,
          false,
          null,
        ],
        ['pz-criolla', 'pizzas', 'Criolla', 'Carne desmechada, Maíz tierno', 30000, 'tradicional', 0, false, null],
        [
          'pz-mexicana',
          'pizzas',
          'Mexicana',
          'Carne molida, Maíz tierno, Tomate, Cilantro, Tostacos',
          30000,
          'tradicional',
          0,
          false,
          null,
        ],
        [
          'pz-espanola',
          'pizzas',
          'Española',
          'Espinaca, Tocineta, Maíz tierno, Champiñón',
          30000,
          'tradicional',
          0,
          false,
          null,
        ],
        ['pz-napolitana', 'pizzas', 'Napolitana', 'Tomate, Orégano', 30000, 'tradicional', 0, false, null],
        [
          'pz-vegetariana',
          'pizzas',
          'Vegetariana',
          'Champiñón, Maíz tierno, Cebolla',
          30000,
          'tradicional',
          0,
          true,
          null,
        ],
        [
          'pz-tropical',
          'pizzas',
          'Tropical',
          'Cerezas, Piña, Duraznos, Uvas pasas',
          30000,
          'tradicional',
          0,
          true,
          null,
        ],
        ['pz-queso-bocadillo', 'pizzas', 'Queso y bocadillo', 'Queso y bocadillo', 30000, 'tradicional', 0, true, null],
        [
          'pz-porcion',
          'pizzas',
          'Porción individual',
          'Porción individual de pizza',
          9200,
          'tradicional',
          0,
          false,
          'Porción',
        ],
        [
          'pz-de-la-casa',
          'pizzas',
          'De la casa',
          'Champiñones, Cebolla, Carne desmechada',
          30000,
          'tradicional',
          0,
          false,
          null,
        ],
        [
          'pz-ranchera',
          'pizzas',
          'Ranchera',
          'Champiñones, Cebolla, Maíz tierno, Chorizo',
          30000,
          'tradicional',
          0,
          false,
          null,
        ],
        [
          'ham-plancha-sencilla',
          'hamburguesas',
          'Hamburguesa sencilla',
          'Tomate, lechuga, cebolla, queso, pan',
          17500,
          'tradicional',
          0,
          false,
          'A la plancha',
        ],
        [
          'ham-plancha-especial',
          'hamburguesas',
          'Hamburguesa especial',
          'Tomate, lechuga, cebolla, queso, pan, champiñones, pollo, salsas showy',
          18000,
          'tradicional',
          0,
          false,
          'A la plancha',
        ],
        [
          'ham-plancha-sencilla-doble',
          'hamburguesas',
          'Sencilla doble carne',
          'Tomate, lechuga, cebolla, queso, pan, champiñones, pollo, salsas showy',
          21500,
          'tradicional',
          0,
          false,
          'A la plancha',
        ],
        [
          'ham-plancha-especial-doble',
          'hamburguesas',
          'Especial doble carne',
          'Tomate, lechuga, cebolla, queso, pan, champiñones, pollo, salsas showy',
          22000,
          'tradicional',
          0,
          false,
          'A la plancha',
        ],
        [
          'ham-apanada-sencilla',
          'hamburguesas',
          'Sencilla apanada',
          'Tomate, lechuga, cebolla, queso, pan',
          20000,
          'tradicional',
          0,
          false,
          'Apanadas',
        ],
        [
          'ham-apanada-especial',
          'hamburguesas',
          'Especial apanada',
          'Tomate, lechuga, cebolla, queso, pan',
          21000,
          'tradicional',
          0,
          false,
          'Apanadas',
        ],
        [
          'ham-apanada-2carnes',
          'hamburguesas',
          'Especial apanada 2 carnes',
          'Tomate, lechuga, cebolla, queso, pan, champiñones, pollo',
          22000,
          'tradicional',
          0,
          false,
          'Apanadas',
        ],
        [
          'ham-apanada-tocineta',
          'hamburguesas',
          'Especial apanada tocineta',
          'Tomate, lechuga, cebolla, queso, pan, pollo, champiñones',
          22000,
          'tradicional',
          0,
          false,
          'Apanadas',
        ],
        [
          'ham-apanada-mixta',
          'hamburguesas',
          'Especial mixta',
          'Tomate, lechuga, cebolla, queso, pan, pollo, champiñones, carne de res y de pollo',
          23500,
          'tradicional',
          0,
          false,
          'Apanadas',
        ],
        [
          'ham-casa-sencilla',
          'hamburguesas',
          'Sencilla de la casa',
          'Tomate, lechuga, cebolla, queso, pan, carne',
          17000,
          'tradicional',
          0,
          false,
          'De la casa',
        ],
        [
          'ham-casa-especial',
          'hamburguesas',
          'Especial de la casa',
          'Tomate, lechuga, cebolla, queso, pan, carne, champiñones, pollo, maíz, chorizo, carne desmechada',
          18000,
          'tradicional',
          0,
          false,
          'De la casa',
        ],
        [
          'pasta-champinones',
          'pastas',
          'Champiñones',
          'Salsa boloñesa, pasta, champiñones, queso, pan tajado. Disponible en lasagna o spaghetti, mismo precio.',
          19000,
          'tradicional',
          0,
          true,
          null,
        ],
        [
          'pasta-mixta',
          'pastas',
          'Mixta',
          'Salsa boloñesa, pasta, champiñón, pollo, jamón, queso, pan tajado. Disponible en lasagna o spaghetti, mismo precio.',
          21000,
          'tradicional',
          0,
          false,
          null,
        ],
        [
          'pasta-pollo',
          'pastas',
          'Pollo',
          'Salsa boloñesa, pasta, pollo, queso, pan tajado. Disponible en lasagna o spaghetti, mismo precio.',
          23000,
          'tradicional',
          0,
          false,
          null,
        ],
        [
          'pasta-jamon',
          'pastas',
          'Jamón',
          'Salsa boloñesa, pasta, jamón, queso, pan tajado. Disponible en lasagna o spaghetti, mismo precio.',
          23500,
          'tradicional',
          0,
          false,
          null,
        ],
        [
          'salchi-sencilla',
          'calientes',
          'Sencilla',
          'Papa francesa, chorizo, salchicha, queso, salami',
          16000,
          'tradicional',
          0,
          false,
          'Salchipapas',
        ],
        [
          'salchi-americana',
          'calientes',
          'Americana',
          'Papa francesa, chorizo, salchicha americana, queso, costillas de cerdo',
          17000,
          'tradicional',
          0,
          false,
          'Salchipapas',
        ],
        [
          'salchi-super-especial',
          'calientes',
          'Súper especial',
          'Papa francesa, chorizo, salchicha americana, champiñón, pollo, queso, costillas de cerdo',
          20000,
          'tradicional',
          0,
          false,
          'Salchipapas',
        ],
        [
          'perro-sencillo',
          'calientes',
          'Sencillo',
          'Pan, salchicha, queso, salsas, papa en fósforos',
          15500,
          'tradicional',
          0,
          false,
          'Perros calientes',
        ],
        [
          'perro-americano',
          'calientes',
          'Americano',
          'Pan, salchicha americana, queso, salsas, papa en fósforos, cebolla y piña en trozos',
          16500,
          'tradicional',
          0,
          false,
          'Perros calientes',
        ],
        [
          'perro-super-especial',
          'calientes',
          'Súper especial',
          'Cebolla, piña en trozos, champiñón y pollo',
          18000,
          'tradicional',
          0,
          false,
          'Perros calientes',
        ],
        [
          'esp-mazorcada',
          'especiales',
          'Mazorcada',
          'Champiñones, pollo, carne desmechada, maíz, chorizo, queso + francesa',
          27000,
          'tradicional',
          0,
          false,
          null,
        ],
        [
          'esp-pechuga-gratinada',
          'especiales',
          'Pechuga gratinada',
          'Queso, francesas, ensalada, arepa',
          28000,
          'tradicional',
          0,
          false,
          null,
        ],
        [
          'esp-pechuga-rancho',
          'especiales',
          'Pechuga al rancho',
          'Champiñones, pollo, carne desmechada, maíz, chorizo, queso + francesa',
          31000,
          'tradicional',
          0,
          false,
          null,
        ],
        [
          'esp-churrasco',
          'especiales',
          'Churrasco',
          'Carne 350 gramos, francesa, ensalada, arepa',
          29000,
          'tradicional',
          0,
          false,
          null,
        ],
        [
          'esp-costillitas-bbq',
          'especiales',
          'Costillitas BBQ',
          'Costilla 350 gramos, francesa, ensalada, arepa',
          29000,
          'tradicional',
          0,
          false,
          null,
        ],
        [
          'add-ingrediente',
          'adicionales',
          'Adicional de ingrediente',
          'Súmale un ingrediente extra a cualquier plato del menú: pizza / hamburguesa / salchipapa / perro caliente',
          3500,
          'entrada',
          0,
          true,
          null,
        ],
        [
          'add-francesa',
          'adicionales',
          'Porción de francesa',
          'Porción de papa francesa sola -- para acompañar o compartir',
          7000,
          'entrada',
          0,
          true,
          null,
        ],
        [
          'add-criolla',
          'adicionales',
          'Porción de criolla',
          'Porción de papa criolla sola -- para acompañar o compartir',
          7000,
          'entrada',
          0,
          true,
          null,
        ],
        [
          'beb-agua-pequena',
          'bebidas',
          'Agua pequeña',
          'Botella de agua pequeña',
          2000,
          'bebida',
          0,
          true,
          'Botella de agua',
        ],
        [
          'beb-gaseosa-350',
          'bebidas',
          'Gaseosa 350 ml',
          'Gaseosa personal 350 ml',
          3800,
          'bebida',
          0,
          true,
          'Gaseosas',
        ],
        [
          'beb-gaseosa-250-plastica',
          'bebidas',
          'Gaseosa 250 ml (plástica)',
          'Gaseosa en botella plástica 250 ml',
          2800,
          'bebida',
          0,
          true,
          'Gaseosas',
        ],
        [
          'beb-jugo-agua',
          'bebidas',
          'Jugo natural con agua',
          'Jugo natural preparado con agua',
          6000,
          'bebida',
          0,
          true,
          'Jugos naturales',
        ],
        [
          'beb-jugo-leche',
          'bebidas',
          'Jugo natural con leche',
          'Jugo natural preparado con leche',
          7000,
          'bebida',
          0,
          true,
          'Jugos naturales',
        ],
        [
          'beb-agua-grande',
          'bebidas',
          'Agua grande',
          'Botella de agua grande',
          3000,
          'bebida',
          0,
          true,
          'Botella de agua',
        ],
        [
          'beb-agua-bretana',
          'bebidas',
          'Agua Bretaña',
          'Botella de agua Bretaña',
          3500,
          'bebida',
          0,
          true,
          'Botella de agua',
        ],
        [
          'beb-cocacola-15l',
          'bebidas',
          'Coca-Cola 1.5L',
          'Gaseosa Coca-Cola 1.5 litros',
          8500,
          'bebida',
          0,
          true,
          'Gaseosas',
        ],
        [
          'beb-postobon-15l',
          'bebidas',
          'Postobón 1.5L',
          'Gaseosa Postobón 1.5 litros',
          7500,
          'bebida',
          0,
          true,
          'Gaseosas',
        ],
        ['beb-hit-litro', 'bebidas', 'Hit de Litro', 'Hit de litro', 6000, 'bebida', 0, true, 'Gaseosas'],
        [
          'beb-gaseosa-500',
          'bebidas',
          'Gaseosa 500 ml',
          'Gaseosa personal 500 ml',
          4800,
          'bebida',
          0,
          true,
          'Gaseosas',
        ],
        [
          'beb-gaseosa-250-vidrio',
          'bebidas',
          'Gaseosa 250 ml (vidrio)',
          'Gaseosa en botella de vidrio 250 ml',
          2800,
          'bebida',
          0,
          true,
          'Gaseosas',
        ],
        [
          'pos-hel-sencillo',
          'postres',
          'Helado Sencillo',
          'Cono, 1 helado, salsa, 1 topping',
          3000,
          'postre',
          0,
          true,
          'Helados',
        ],
        [
          'pos-hel-doble',
          'postres',
          'Helado Doble',
          'Cono, 2 helados, salsa, 1 topping',
          5000,
          'postre',
          0,
          true,
          'Helados',
        ],
        [
          'pos-hel-triple',
          'postres',
          'Helado Triple',
          'Cono, 3 helados, salsa, 1 topping premium',
          7500,
          'postre',
          0,
          true,
          'Helados',
        ],
        [
          'pos-waf-sencillo',
          'postres',
          'Waffle Sencillo',
          '2 frutas a elección, queso, crema, 1 helado',
          12500,
          'postre',
          0,
          true,
          'Waffles',
        ],
        [
          'pos-waf-achocolatado',
          'postres',
          'Waffle Achocolatado',
          '2 frutas a elección, base de nutella, crema, queso, chantilly, 1 helado, decoración',
          15500,
          'postre',
          0,
          true,
          'Waffles',
        ],
        [
          'pos-esp-banana-split',
          'postres',
          'Banana Split',
          '2 helados, banano, 2 frutas a elección',
          14000,
          'postre',
          0,
          true,
          'Especiales',
        ],
        [
          'pos-ens-junior',
          'postres',
          'Ensalada Junior',
          'Picado de fruta, crema, queso, 1 mini bola de helado',
          10000,
          'postre',
          0,
          true,
          'Ensaladas de Fruta',
        ],
        [
          'pos-ens-mixta',
          'postres',
          'Ensalada Mixta',
          'Picado de fruta, crema, queso, 2 bolas de helado',
          16000,
          'postre',
          0,
          true,
          'Ensaladas de Fruta',
        ],
        [
          'pos-ens-sencilla',
          'postres',
          'Ensalada Sencilla',
          'Picado de fruta, crema, queso, 1 bola de helado',
          12000,
          'postre',
          0,
          true,
          'Ensaladas de Fruta',
        ],
        [
          'pos-ens-mega',
          'postres',
          'Ensalada Mega',
          'Picado de fruta, queso, crema, 3 bolas de helado + 1 topping',
          23000,
          'postre',
          0,
          true,
          'Ensaladas de Fruta',
        ],
        [
          'pos-malt-clasica',
          'postres',
          'Malteada',
          'Helado a elección, decoración',
          14000,
          'postre',
          0,
          true,
          'Malteadas',
        ],
        [
          'pos-can-tradicional',
          'postres',
          'Canasta Tradicional',
          'Tres bolas de helado, crema, queso y decoración',
          9000,
          'postre',
          0,
          true,
          'Canastas',
        ],
        [
          'pos-can-chococanasta',
          'postres',
          'Chococanasta',
          '2 bolas de helado, crema, queso, salsa de chocolate, maní, chocolate rayado',
          10500,
          'postre',
          0,
          true,
          'Canastas',
        ],
        [
          'pos-fre-sencillas',
          'postres',
          'Fresas Sencillas',
          'Fresas, crema de la casa, nutella + 1 topping',
          8000,
          'postre',
          0,
          true,
          'Fresas con Crema',
        ],
        [
          'pos-fre-biscolatta',
          'postres',
          'Fresas Biscolatta',
          'Fresas, crema de la casa, cereal/biscolata, queso',
          10000,
          'postre',
          0,
          true,
          'Fresas con Crema',
        ],
        [
          'pos-mer-juancho',
          'postres',
          'Merengón Juancho',
          'Merengón, fruta a elección, queso, salsa de caramelo y decoración',
          15000,
          'postre',
          0,
          true,
          'Obleas y Merengues',
        ],
        [
          'pos-oblea-tradicional',
          'postres',
          'Oblea Tradicional',
          'Arequipe, queso',
          3500,
          'postre',
          0,
          true,
          'Obleas y Merengues',
        ],
        [
          'pos-oblea-especial',
          'postres',
          'Oblea Especial',
          'Arequipe, queso, salsa a elección + 1 topping (fruta a elección)',
          5500,
          'postre',
          0,
          true,
          'Obleas y Merengues',
        ],
      ];
      for (const [
        id,
        categoryId,
        nombre,
        descripcion,
        basePrice,
        type,
        popularidad,
        vegetariano,
        subcategory,
      ] of products) {
        await pool.query(
          `INSERT INTO products (id, "categoryId", nombre, descripcion, "basePrice", type, tiempo, popularidad, vegetariano, "isPremium", exclusiva, subcategory)
           VALUES ($1,$2,$3,$4,$5,$6,20,$7,$8,false,false,$9)
           ON CONFLICT (id) DO UPDATE SET "categoryId"=$2, nombre=$3, descripcion=$4, "basePrice"=$5, type=$6, popularidad=$7, vegetariano=$8, subcategory=$9`,
          [id, categoryId, nombre, descripcion, basePrice, type, popularidad, vegetariano, subcategory]
        );
      }

      // Combos: [productoId, precioModificador]
      const combos = [
        ['ham-plancha-sencilla', 8000],
        ['ham-plancha-especial', 8500],
        ['ham-plancha-sencilla-doble', 6500],
        ['ham-plancha-especial-doble', 7000],
        ['ham-apanada-sencilla', 7000],
        ['ham-apanada-especial', 7000],
        ['ham-apanada-2carnes', 6500],
        ['ham-apanada-tocineta', 7000],
        ['ham-apanada-mixta', 6500],
        ['ham-casa-sencilla', 8000],
        ['ham-casa-especial', 8000],
        ['perro-sencillo', 6500],
        ['perro-americano', 7500],
        ['perro-super-especial', 7000],
        ['pos-fre-biscolatta', 2000],
      ];
      for (const [productoId, precio] of combos) {
        await pool.query(
          `INSERT INTO menu_variants (id, "productoId", nombre, "precioModificador", activo)
           VALUES ($1, $2, 'Combo', $3, true)
           ON CONFLICT (id) DO UPDATE SET "precioModificador"=$3`,
          [`mva_${productoId}_combo`, productoId, precio]
        );
      }

      // [id, nombre, precio, incluidos, porciones]
      const sizes = [
        ['psz_personal', 'Personal', 18000, 1, 4],
        ['small', 'Small', 30000, 1, 4],
        ['psz_mediana', 'Mediana', 32000, 2, 8],
        ['junior', 'Junior', 42000, 2, 6],
        ['psz_familiar', 'Familiar', 48000, 3, 12],
        ['mediana', 'Mediana', 52000, 2, 8],
        ['psz_extra_familiar', 'Extra Familiar', 65000, 4, 16],
        ['familiar', 'Familiar', 88000, 3, 10],
      ];
      for (const [id, nombre, precio, incluidos, porciones] of sizes) {
        await pool.query(
          `INSERT INTO pizza_sizes (id, nombre, precio, incluidos, porciones, activo)
           VALUES ($1,$2,$3,$4,$5,true)
           ON CONFLICT (id) DO UPDATE SET nombre=$2, precio=$3, incluidos=$4, porciones=$5`,
          [id, nombre, precio, incluidos, porciones]
        );
      }
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
