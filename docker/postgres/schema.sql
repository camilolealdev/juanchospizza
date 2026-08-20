-- Postgres schema mirroring server/index.js initDB().
-- This file matches the app-level initDB() exactly; initDB() is what actually
-- runs against any pre-existing Postgres instance (this file only matters for
-- a fresh docker-entrypoint-initdb.d bootstrap of an empty volume).
--
-- Design decisions (must stay in sync with server/index.js):
--   * Column names stay camelCase, exactly as the existing frontend/API
--     already expects. Postgres folds unquoted identifiers to lowercase, so
--     every mixed-case identifier below is double-quoted to preserve case.
--   * SQLite INTEGER-as-boolean (0/1) columns become native BOOLEAN.
--   * SQLite TEXT columns holding ISO datetime strings become TIMESTAMPTZ
--     (or DATE for pure calendar dates like cumpleanos).
--   * SQLite TEXT columns holding JSON blobs (items, tags, productos) become
--     native JSON columns.
--   * No columns or constraints are added beyond this dialect/type
--     translation -- ids stay plain TEXT (app generates ids like
--     ord_<ts>_<rand>).
--   * Tables added later than the original SQLite schema (reviews,
--     push_subscriptions, GastroPro CRM tables, etc.) do carry FOREIGN KEY
--     constraints where server/db.js's initDB() defines them -- kept here to
--     match initDB() exactly, per this file's own stated goal above.

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  "categoryId" TEXT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  "basePrice" INTEGER,
  type TEXT,
  image TEXT,
  tiempo INTEGER,
  popularidad INTEGER,
  vegetariano BOOLEAN,
  "isPremium" BOOLEAN,
  exclusiva BOOLEAN,
  subcategory TEXT
);

-- Tamaños de pizza -- usados tanto por el menú fijo (sabores completos,
-- sección "Pizza") como por el armador "Crea tu pizza" (base + N
-- ingredientes incluidos, extras a precio_extra por ingrediente). precio
-- es el precio ABSOLUTO del tamaño, no un delta -- distinto de
-- menu_variants (que sí es delta) porque acá no hay "producto base" del
-- cual partir, el tamaño ES el precio.
-- No FK dependencies -- puede crearse en cualquier punto antes de que algo
-- la referencie (nada la referencia hoy).
CREATE TABLE IF NOT EXISTS pizza_sizes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio INTEGER NOT NULL,
  incluidos INTEGER NOT NULL,
  porciones INTEGER,
  activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio_extra INTEGER,
  categoria TEXT,
  vegetariano BOOLEAN,
  vegano BOOLEAN,
  premium BOOLEAN,
  dulce BOOLEAN,
  disponible BOOLEAN,
  "defaultIng" BOOLEAN
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  "orderNumber" TEXT,
  "customerName" TEXT,
  "customerPhone" TEXT,
  address TEXT,
  items JSON,
  total INTEGER,
  status TEXT,
  "createdAt" TIMESTAMPTZ,
  "estimatedTime" INTEGER,
  "paymentMethod" TEXT,
  "clientId" TEXT,
  "paymentStatus" TEXT DEFAULT 'pending',
  "paymentProviderRef" TEXT,
  -- Fundación multi-sede: 'nemocon' | 'zipaquira'.
  "locationId" TEXT DEFAULT 'nemocon'
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  discount INTEGER,
  status TEXT,
  reach INTEGER,
  conversions INTEGER,
  budget INTEGER
);

-- === GASTROPRO CRM TABLES ===
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  notas TEXT,
  "totalCompras" INTEGER DEFAULT 0,
  "totalGastado" INTEGER DEFAULT 0,
  "frecuenciaCompra" INTEGER DEFAULT 0,
  "ultimaCompra" TIMESTAMPTZ,
  creado TIMESTAMPTZ DEFAULT NOW(),
  vip BOOLEAN DEFAULT FALSE,
  puntos INTEGER DEFAULT 0,
  nivel TEXT DEFAULT 'bronce',
  tags JSON DEFAULT '[]'::json,
  estado TEXT DEFAULT 'activo',
  cumpleanos DATE,
  -- ── Ley 1581/2012 (Habeas Data, Colombia) ──────────────────────────
  "dataTreatmentAuthorized" BOOLEAN DEFAULT FALSE,
  "marketingAuthorized" BOOLEAN DEFAULT FALSE,
  "consentAt" TIMESTAMPTZ,
  "consentIp" VARCHAR(45),
  "consentUserAgent" TEXT,
  "consentVersion" VARCHAR(20)
);

-- Evita clientes duplicados por teléfono (orders.js resuelve el cliente
-- por telefono con LIMIT 1 sin ORDER BY -- un duplicado fragmenta puntos
-- de lealtad y puede pegar un pedido al cliente equivocado). Parcial
-- porque telefono es nullable.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_telefono ON clients(telefono) WHERE telefono IS NOT NULL;

-- ── Ley 1581/2012 (Habeas Data, Colombia) ────────────────────────
-- Log histórico de cada decisión de consentimiento, para auditoría SIC.
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
);
CREATE INDEX IF NOT EXISTS idx_consent_eventos_clientId ON consent_eventos("clientId");
CREATE INDEX IF NOT EXISTS idx_consent_eventos_created ON consent_eventos(created_at);

-- ── Derechos ARCO (Art. 14-15 Ley 1581) ───────────────────────────
-- Consulta / rectificación / supresión / reclamo, con plazo de 10 días
-- hábiles de respuesta.
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
);
CREATE INDEX IF NOT EXISTS idx_derechos_clientId ON derechos_solicitudes("clientId");
CREATE INDEX IF NOT EXISTS idx_derechos_estado ON derechos_solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_derechos_created ON derechos_solicitudes(created_at);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT,
  "stockActual" INTEGER DEFAULT 0,
  "stockMinimo" INTEGER DEFAULT 10,
  "stockMaximo" INTEGER DEFAULT 100,
  unidad TEXT DEFAULT 'unidad',
  "costoUnitario" INTEGER DEFAULT 0,
  proveedor TEXT,
  lote TEXT,
  "fechaVencimiento" TIMESTAMPTZ,
  ubicacion TEXT,
  -- Fundación multi-sede: misma política que orders.
  "locationId" TEXT DEFAULT 'nemocon',
  activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  "itemId" TEXT,
  tipo TEXT,
  cantidad INTEGER,
  "saldoAnterior" INTEGER,
  "saldoNuevo" INTEGER,
  motivo TEXT,
  referencia TEXT,
  creado TIMESTAMPTZ DEFAULT NOW(),
  usuario TEXT
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  "productoId" TEXT,
  porciones INTEGER DEFAULT 1,
  "costoTotal" INTEGER DEFAULT 0,
  instrucciones TEXT
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id TEXT PRIMARY KEY,
  "recipeId" TEXT REFERENCES recipes(id),
  "itemId" TEXT REFERENCES inventory_items(id),
  nombre TEXT,
  cantidad REAL DEFAULT 0,
  unidad TEXT DEFAULT 'unidad',
  costo INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  categoria TEXT,
  descripcion TEXT,
  monto INTEGER,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  metodo TEXT,
  proveedor TEXT,
  factura TEXT,
  notas TEXT,
  recurrente BOOLEAN DEFAULT FALSE,
  "locationId" TEXT DEFAULT 'nemocon'
);

CREATE TABLE IF NOT EXISTS loyalty_points (
  id TEXT PRIMARY KEY,
  "clientId" TEXT,
  puntos INTEGER,
  concepto TEXT,
  referencia TEXT,
  creado TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  descripcion TEXT,
  "puntosCosto" INTEGER,
  tipo TEXT,
  valor INTEGER,
  -- NOTE: not in the enumerated boolean-column conversion list; left as
  -- INTEGER (0/1) exactly like the original SQLite column, since no code
  -- path writes to it and the only read compares it with the literal 1.
  vigente INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS menu_variants (
  id TEXT PRIMARY KEY,
  "productoId" TEXT,
  nombre TEXT,
  "precioModificador" INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS menu_combos (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  descripcion TEXT,
  productos JSON,
  "precioTotal" INTEGER,
  ahorro INTEGER DEFAULT 0,
  imagen TEXT,
  activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS menu_promotions (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  descripcion TEXT,
  tipo TEXT,
  valor INTEGER,
  "productoId" TEXT,
  "categoriaId" TEXT,
  "montoMinimo" INTEGER,
  inicia TIMESTAMPTZ,
  termina TIMESTAMPTZ,
  activo BOOLEAN DEFAULT TRUE,
  -- NOTE: not in the enumerated boolean-column conversion list; left as
  -- INTEGER exactly like the original SQLite column (no code path reads or
  -- writes it).
  usado INTEGER DEFAULT 0,
  limite INTEGER DEFAULT 100
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  "orderId" TEXT REFERENCES orders(id),
  "clientPhone" TEXT,
  "clientName" TEXT,
  rating INTEGER NOT NULL,
  comment TEXT,
  status TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_orderId ON reviews("orderId");

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  phone TEXT,
  "clientId" TEXT REFERENCES clients(id),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Roster de staff (múltiples logins por rol, ej. varios cocineros por
-- turno en cada sede). server/auth.js consulta esta tabla directamente
-- (username/PIN, password+2FA para super admin).
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  role TEXT NOT NULL,
  "pinHash" TEXT NOT NULL,
  salt TEXT NOT NULL,
  "locationId" TEXT,
  activo BOOLEAN DEFAULT TRUE,
  creado TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  "locationId" TEXT NOT NULL,
  status TEXT DEFAULT 'closed',
  "openingCash" INTEGER DEFAULT 0,
  "closingCash" INTEGER,
  "expectedCash" INTEGER,
  difference INTEGER,
  "openedBy" TEXT REFERENCES employees(id),
  "closedBy" TEXT,
  "openedAt" TIMESTAMPTZ DEFAULT NOW(),
  "closedAt" TIMESTAMPTZ,
  notas TEXT
);
CREATE INDEX IF NOT EXISTS idx_shifts_locationId_status ON shifts("locationId", status);
CREATE INDEX IF NOT EXISTS idx_shifts_openedBy ON shifts("openedBy");

-- === DINING TABLES ===
-- Must be created before COMANDAS below -- comandas.tableId FKs to it.
CREATE TABLE IF NOT EXISTS dining_tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  area TEXT DEFAULT 'salon',
  "locationId" TEXT DEFAULT 'nemocon',
  status TEXT DEFAULT 'available',
  notes TEXT,
  qr_code TEXT,
  active BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tables_name_location ON dining_tables (name, "locationId");
CREATE INDEX IF NOT EXISTS idx_tables_location ON dining_tables("locationId");
CREATE INDEX IF NOT EXISTS idx_tables_status ON dining_tables(status);

-- === COMANDAS (mesa-based orders for dine-in) ===
CREATE TABLE IF NOT EXISTS comandas (
  id TEXT PRIMARY KEY,
  "tableId" TEXT REFERENCES dining_tables(id),
  "waiterName" TEXT,
  status TEXT DEFAULT 'open',
  "guestCount" INTEGER DEFAULT 1,
  notes TEXT,
  total INTEGER DEFAULT 0,
  "openedAt" TIMESTAMPTZ DEFAULT NOW(),
  "closedAt" TIMESTAMPTZ,
  "locationId" TEXT DEFAULT 'nemocon'
);

CREATE TABLE IF NOT EXISTS comanda_items (
  id TEXT PRIMARY KEY,
  "comandaId" TEXT REFERENCES comandas(id),
  "productId" TEXT,
  "productName" TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  "unitPrice" INTEGER DEFAULT 0,
  subtotal INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comandas_tableId ON comandas("tableId");
CREATE INDEX IF NOT EXISTS idx_comandas_status ON comandas(status);
CREATE INDEX IF NOT EXISTS idx_comanda_items_comandaId ON comanda_items("comandaId");

-- === PROCUREMENT / PURCHASE ORDERS ===
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  "orderNumber" TEXT,
  proveedor TEXT,
  "fechaSolicitud" TIMESTAMPTZ DEFAULT NOW(),
  "fechaEntrega" TIMESTAMPTZ,
  items JSON DEFAULT '[]'::json,
  total INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pendiente',
  notas TEXT,
  "createdBy" TEXT,
  "locationId" TEXT DEFAULT 'nemocon'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders("orderNumber");

-- === INVOICES (DIAN base structure) ===
-- Ver docs/DIAN_MODULE_STATUS.md para estado completo de la integración.
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  "orderId" TEXT REFERENCES orders(id),
  "invoiceNumber" TEXT,
  "tipoDocumento" TEXT DEFAULT 'factura',
  cufe TEXT,
  xml TEXT,
  pdf_url TEXT,
  status TEXT DEFAULT 'pending',
  "dianResponse" JSON,
  "emisorInfo" JSON DEFAULT '{}'::json,
  "receptorInfo" JSON DEFAULT '{}'::json,
  notes TEXT,
  "fechaVencimiento" TIMESTAMPTZ,
  "tipoOperacion" TEXT DEFAULT '10',
  moneda TEXT DEFAULT 'COP',
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "locationId" TEXT DEFAULT 'nemocon'
);

-- === CREDIT / DEBIT NOTES ===
CREATE TABLE IF NOT EXISTS credit_notes (
  id TEXT PRIMARY KEY,
  "invoiceId" TEXT REFERENCES invoices(id),
  "tipoNota" TEXT DEFAULT 'credito',
  motivo TEXT,
  monto INTEGER DEFAULT 0,
  items JSON DEFAULT '[]'::json,
  status TEXT DEFAULT 'pending',
  xml TEXT,
  cude TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "createdBy" TEXT
);

-- UNIQUE (no solo INDEX) para prevenir doble factura por orden bajo
-- requests concurrentes -- ver server/migrate.js migración #7.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_orderId_unique ON invoices("orderId");
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoiceId ON credit_notes("invoiceId");
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- === QR MENU config ===
CREATE TABLE IF NOT EXISTS qr_menu_config (
  id TEXT PRIMARY KEY,
  "locationId" TEXT DEFAULT 'nemocon',
  title TEXT DEFAULT 'Menú',
  "showPrices" BOOLEAN DEFAULT TRUE,
  "showImages" BOOLEAN DEFAULT TRUE,
  "showCombos" BOOLEAN DEFAULT TRUE,
  "showPromotions" BOOLEAN DEFAULT TRUE,
  categories JSON DEFAULT '[]'::json,
  active BOOLEAN DEFAULT TRUE,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- === CASH REGISTER ===
CREATE TABLE IF NOT EXISTS cash_register (
  id TEXT PRIMARY KEY,
  "locationId" TEXT DEFAULT 'nemocon',
  "openedAt" TIMESTAMPTZ DEFAULT NOW(),
  "closedAt" TIMESTAMPTZ,
  "openedBy" TEXT,
  "closedBy" TEXT,
  "initialAmount" INTEGER DEFAULT 0,
  "expectedAmount" INTEGER DEFAULT 0,
  "finalAmount" INTEGER,
  difference INTEGER,
  status TEXT DEFAULT 'open',
  notes TEXT
);

-- === DIGITURNO — Turnos digitales para pedidos en local ===
CREATE TABLE IF NOT EXISTS digiturno_tickets (
  id TEXT PRIMARY KEY,
  "ticketNumber" INTEGER NOT NULL,
  "orderType" TEXT DEFAULT 'dine-in',
  status TEXT DEFAULT 'waiting',
  "locationId" TEXT DEFAULT 'nemocon',
  "tableId" TEXT REFERENCES dining_tables(id),
  "tableName" TEXT,
  "customerName" TEXT,
  "guestCount" INTEGER DEFAULT 1,
  source TEXT DEFAULT 'local',
  items JSON DEFAULT '[]'::json,
  total INTEGER DEFAULT 0,
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "calledAt" TIMESTAMPTZ,
  "completedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_digiturno_status ON digiturno_tickets(status);
CREATE INDEX IF NOT EXISTS idx_digiturno_locationId_status ON digiturno_tickets("locationId", status);
CREATE INDEX IF NOT EXISTS idx_digiturno_createdAt ON digiturno_tickets("createdAt");
-- UNIQUE constraint para evitar race condition en números secuenciales.
CREATE UNIQUE INDEX IF NOT EXISTS idx_digiturno_number_location ON digiturno_tickets("locationId", "ticketNumber");

-- === TIPS ===
CREATE TABLE IF NOT EXISTS tips (
  id TEXT PRIMARY KEY,
  "orderId" TEXT REFERENCES orders(id),
  amount INTEGER NOT NULL,
  method TEXT DEFAULT 'cash',
  "waiterName" TEXT,
  "locationId" TEXT DEFAULT 'nemocon',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- === PROCESSED WEBHOOKS (idempotencia de webhooks de pago) ===
-- Registro de cada webhook ya procesado (provider + sourceId) para que un
-- reintento del proveedor de pagos no duplique la orden. Debe existir en un
-- bootstrap fresco: sin esta tabla, la idempotencia de pagos se pierde en un
-- deploy con volumen nuevo (gap AUDIT_2026-07-30). Espejo exacto de
-- server/db.js initDB() y de la migración #008 de server/migrate.js.
CREATE TABLE IF NOT EXISTS processed_webhooks (
  provider TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "processedAt" TIMESTAMPTZ DEFAULT NOW(),
  "orderId" TEXT,
  PRIMARY KEY (provider, "sourceId")
);

-- === MIGRATION TRACKING (see server/migrate.js runMigrations()) ===
CREATE TABLE IF NOT EXISTS "_schema_migrations" (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  hash TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders("createdAt");
CREATE INDEX IF NOT EXISTS idx_orders_clientId ON orders("clientId");
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_number ON orders("orderNumber");
CREATE INDEX IF NOT EXISTS idx_orders_locationId ON orders("locationId");
-- Índice compuesto (sede, fecha) para el dashboard/ventas por sede -- las
-- queries más frecuentes filtran por sede Y rango de fecha juntos.
CREATE INDEX IF NOT EXISTS idx_orders_locationId_createdAt ON orders("locationId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_clients_estado ON clients(estado);
CREATE INDEX IF NOT EXISTS idx_inventory_categoria ON inventory_items(categoria);
CREATE INDEX IF NOT EXISTS idx_inventory_nombre ON inventory_items(nombre);
CREATE INDEX IF NOT EXISTS idx_inventory_locationId ON inventory_items("locationId");
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipeId ON recipe_ingredients("recipeId");
CREATE INDEX IF NOT EXISTS idx_expenses_fecha ON expenses(fecha);
CREATE INDEX IF NOT EXISTS idx_expenses_locationId ON expenses("locationId");
CREATE INDEX IF NOT EXISTS idx_menu_promotions_activo ON menu_promotions(activo);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
