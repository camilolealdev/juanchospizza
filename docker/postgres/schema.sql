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
--     ord_<ts>_<rand>), and there are no FOREIGN KEY constraints because the
--     original SQLite schema never had any.

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
  exclusiva BOOLEAN
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
  address TEXT,
  items JSON,
  total INTEGER,
  status TEXT,
  "createdAt" TIMESTAMPTZ,
  "estimatedTime" INTEGER,
  "paymentMethod" TEXT
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
  cumpleanos DATE
);

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
  "recipeId" TEXT,
  "itemId" TEXT,
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
  recurrente BOOLEAN DEFAULT FALSE
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

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders("createdAt");
CREATE INDEX IF NOT EXISTS idx_clients_estado ON clients(estado);
CREATE INDEX IF NOT EXISTS idx_inventory_categoria ON inventory_items(categoria);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipeId ON recipe_ingredients("recipeId");
CREATE INDEX IF NOT EXISTS idx_expenses_fecha ON expenses(fecha);
CREATE INDEX IF NOT EXISTS idx_menu_promotions_activo ON menu_promotions(activo);
