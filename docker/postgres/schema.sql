-- Postgres translation of the Turso/libSQL schema in server/index.js initDB().
-- SQLite TEXT ids stay TEXT (app generates ids like ord_<ts>_<rand>, not serial).
-- SQLite INTEGER-as-boolean (0/1) becomes native BOOLEAN.
-- datetime('now') becomes NOW(); TEXT timestamps become TIMESTAMPTZ.

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  base_price INTEGER,
  type TEXT,
  image TEXT,
  tiempo INTEGER,
  popularidad INTEGER,
  vegetariano BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  exclusiva BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio_extra INTEGER,
  categoria TEXT,
  vegetariano BOOLEAN DEFAULT FALSE,
  vegano BOOLEAN DEFAULT FALSE,
  premium BOOLEAN DEFAULT FALSE,
  dulce BOOLEAN DEFAULT FALSE,
  disponible BOOLEAN DEFAULT TRUE,
  default_ing BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  notas TEXT,
  total_compras INTEGER DEFAULT 0,
  total_gastado INTEGER DEFAULT 0,
  frecuencia_compra INTEGER DEFAULT 0,
  ultima_compra TIMESTAMPTZ,
  creado TIMESTAMPTZ DEFAULT NOW(),
  vip BOOLEAN DEFAULT FALSE,
  puntos INTEGER DEFAULT 0,
  nivel TEXT DEFAULT 'bronce',
  tags JSONB DEFAULT '[]',
  estado TEXT DEFAULT 'activo',
  cumpleanos DATE
);
CREATE INDEX IF NOT EXISTS idx_clients_estado ON clients(estado);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL, -- NEW: was a fragile customerName string match, see gap analysis
  customer_name TEXT,
  address TEXT,
  items JSONB,
  total INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  estimated_time INTEGER,
  payment_method TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT,
  discount INTEGER,
  status TEXT,
  reach INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  budget INTEGER
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT,
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 10,
  stock_maximo INTEGER DEFAULT 100,
  unidad TEXT DEFAULT 'unidad',
  costo_unitario INTEGER DEFAULT 0,
  proveedor TEXT,
  lote TEXT,
  fecha_vencimiento DATE,
  ubicacion TEXT,
  activo BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_inventory_categoria ON inventory_items(categoria);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES inventory_items(id) ON DELETE CASCADE,
  tipo TEXT,
  cantidad INTEGER,
  saldo_anterior INTEGER,
  saldo_nuevo INTEGER,
  motivo TEXT,
  referencia TEXT,
  creado TIMESTAMPTZ DEFAULT NOW(),
  usuario TEXT
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(item_id);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  producto_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  porciones INTEGER DEFAULT 1,
  costo_total INTEGER DEFAULT 0,
  instrucciones TEXT
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id TEXT PRIMARY KEY,
  recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES inventory_items(id) ON DELETE SET NULL,
  nombre TEXT,
  cantidad NUMERIC DEFAULT 0,
  unidad TEXT DEFAULT 'unidad',
  costo INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

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
CREATE INDEX IF NOT EXISTS idx_expenses_fecha ON expenses(fecha);

CREATE TABLE IF NOT EXISTS loyalty_points (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  puntos INTEGER,
  concepto TEXT,
  referencia TEXT,
  creado TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_client ON loyalty_points(client_id);

CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  descripcion TEXT,
  puntos_costo INTEGER,
  tipo TEXT,
  valor INTEGER,
  vigente BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS menu_variants (
  id TEXT PRIMARY KEY,
  producto_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  nombre TEXT,
  precio_modificador INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS menu_combos (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  descripcion TEXT,
  productos JSONB,
  precio_total INTEGER,
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
  producto_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  categoria_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  monto_minimo INTEGER,
  inicia TIMESTAMPTZ,
  termina TIMESTAMPTZ,
  activo BOOLEAN DEFAULT TRUE,
  usado INTEGER DEFAULT 0,
  limite INTEGER DEFAULT 100
);
CREATE INDEX IF NOT EXISTS idx_menu_promotions_activo ON menu_promotions(activo);
