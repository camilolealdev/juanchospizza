import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import { authMiddleware, requireRole, login, refreshToken } from './auth.js';

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Config de seguridad: nunca loggear credenciales
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || ''
});

// Middleware de seguridad
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting básico por IP
const rateLimit = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimit) {
    if (now > record.reset) {
      rateLimit.delete(ip);
    }
  }
}, 5 * 60 * 1000);
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, reset: now + windowMs });
    return next();
  }

  const record = rateLimit.get(ip);
  if (now > record.reset) {
    record.count = 1;
    record.reset = now + windowMs;
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({ error: 'Demasiadas solicitudes' });
  }

  record.count++;
  next();
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT
      )
    `);

    await pool.query(`
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
      )
    `);

    await pool.query(`
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
      )
    `);

    await pool.query(`
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
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT,
        discount INTEGER,
        status TEXT,
        reach INTEGER,
        conversions INTEGER,
        budget INTEGER
      )
    `);

    // === GASTROPRO CRM TABLES ===
    await pool.query(`
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
      )
    `);

    // La columna clientId nunca existió en el esquema original de orders;
    // se agrega aquí (después de clients, a la que referencia) vía ALTER
    // TABLE idempotente para que también aplique a bases ya existentes.
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "clientId" TEXT REFERENCES clients(id)');

    await pool.query(`
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
      )
    `);

    await pool.query(`
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
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        "productoId" TEXT,
        porciones INTEGER DEFAULT 1,
        "costoTotal" INTEGER DEFAULT 0,
        instrucciones TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id TEXT PRIMARY KEY,
        "recipeId" TEXT,
        "itemId" TEXT,
        nombre TEXT,
        cantidad REAL DEFAULT 0,
        unidad TEXT DEFAULT 'unidad',
        costo INTEGER DEFAULT 0
      )
    `);

    await pool.query(`
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
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_points (
        id TEXT PRIMARY KEY,
        "clientId" TEXT,
        puntos INTEGER,
        concepto TEXT,
        referencia TEXT,
        creado TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS loyalty_rewards (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        descripcion TEXT,
        "puntosCosto" INTEGER,
        tipo TEXT,
        valor INTEGER,
        vigente INTEGER DEFAULT 1
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_variants (
        id TEXT PRIMARY KEY,
        "productoId" TEXT,
        nombre TEXT,
        "precioModificador" INTEGER DEFAULT 0,
        activo BOOLEAN DEFAULT TRUE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_combos (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        descripcion TEXT,
        productos JSON,
        "precioTotal" INTEGER,
        ahorro INTEGER DEFAULT 0,
        imagen TEXT,
        activo BOOLEAN DEFAULT TRUE
      )
    `);

    await pool.query(`
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
        usado INTEGER DEFAULT 0,
        limite INTEGER DEFAULT 100
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        "orderId" TEXT REFERENCES orders(id),
        "clientPhone" TEXT,
        "clientName" TEXT,
        rating INTEGER NOT NULL,
        comment TEXT,
        status TEXT DEFAULT 'pending',
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        phone TEXT,
        "clientId" TEXT REFERENCES clients(id),
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders("createdAt")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_clientId ON orders("clientId")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_clients_estado ON clients(estado)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_inventory_categoria ON inventory_items(categoria)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipeId ON recipe_ingredients("recipeId")');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_expenses_fecha ON expenses(fecha)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_menu_promotions_activo ON menu_promotions(activo)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status)');

    console.log('✅ Database initialized with GastroPro CRM tables');
  } catch (error) {
    console.error('❌ DB init error:', error.message);
  }
}

// Health check — sin exponer detalles
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

// AUTH — rutas públicas, sin authMiddleware
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const result = login(String(username), String(pin));

    if (result.error) {
      return res.status(401).json({ error: result.error });
    }

    res.json({
      token: result.token,
      role: result.role,
      username: result.username,
      expiresIn: result.expiresIn
    });
  } catch (e) {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const newToken = refreshToken(token);

    if (!newToken) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    res.json({ token: newToken });
  } catch (e) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

// PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM products';
    const params = [];

    if (category && category !== 'all') {
      query += ' WHERE "categoryId" = $1';
      params.push(category);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error fetching product' });
  }
});

app.post('/api/products', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { categoryId, nombre, descripcion, basePrice, type, image, tiempo, popularidad, vegetariano, isPremium, exclusiva } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const sanitized = {
      categoryId: (categoryId !== undefined && categoryId !== null) ? String(categoryId).slice(0, 50) : null,
      nombre: String(nombre).slice(0, 100),
      descripcion: (descripcion !== undefined && descripcion !== null) ? String(descripcion).slice(0, 500) : null,
      basePrice: Math.max(0, Math.min(Number(basePrice || 0), 999999999)),
      type: (type !== undefined && type !== null) ? String(type).slice(0, 30) : null,
      image: (image !== undefined && image !== null) ? String(image).slice(0, 300) : null,
      tiempo: Math.max(0, Math.min(Number(tiempo || 0), 999)),
      popularidad: Math.max(0, Math.min(Number(popularidad || 0), 100)),
      vegetariano: !!vegetariano,
      isPremium: !!isPremium,
      exclusiva: !!exclusiva
    };

    const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO products (id, "categoryId", nombre, descripcion, "basePrice", type, image, tiempo, popularidad, vegetariano, "isPremium", exclusiva) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, sanitized.categoryId, sanitized.nombre, sanitized.descripcion, sanitized.basePrice, sanitized.type, sanitized.image, sanitized.tiempo, sanitized.popularidad, sanitized.vegetariano, sanitized.isPremium, sanitized.exclusiva]
    );

    res.status(201).json({ id, ...sanitized });
  } catch (e) {
    res.status(500).json({ error: 'Error creating product' });
  }
});

app.put('/api/products/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { categoryId, nombre, descripcion, basePrice, type, image, tiempo, popularidad, vegetariano, isPremium, exclusiva } = req.body;

    const updates = [];
    const params = [];
    if (categoryId !== undefined) { params.push(categoryId !== null ? String(categoryId).slice(0, 50) : null); updates.push(`"categoryId" = $${params.length}`); }
    if (nombre !== undefined) { params.push(String(nombre).slice(0, 100)); updates.push(`nombre = $${params.length}`); }
    if (descripcion !== undefined) { params.push(descripcion !== null ? String(descripcion).slice(0, 500) : null); updates.push(`descripcion = $${params.length}`); }
    if (basePrice !== undefined) { params.push(Math.max(0, Math.min(Number(basePrice), 999999999))); updates.push(`"basePrice" = $${params.length}`); }
    if (type !== undefined) { params.push(type !== null ? String(type).slice(0, 30) : null); updates.push(`type = $${params.length}`); }
    if (image !== undefined) { params.push(image !== null ? String(image).slice(0, 300) : null); updates.push(`image = $${params.length}`); }
    if (tiempo !== undefined) { params.push(Math.max(0, Math.min(Number(tiempo), 999))); updates.push(`tiempo = $${params.length}`); }
    if (popularidad !== undefined) { params.push(Math.max(0, Math.min(Number(popularidad), 100))); updates.push(`popularidad = $${params.length}`); }
    if (vegetariano !== undefined) { params.push(!!vegetariano); updates.push(`vegetariano = $${params.length}`); }
    if (isPremium !== undefined) { params.push(!!isPremium); updates.push(`"isPremium" = $${params.length}`); }
    if (exclusiva !== undefined) { params.push(!!exclusiva); updates.push(`exclusiva = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating product' });
  }
});

app.delete('/api/products/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting product' });
  }
});

// CATEGORIES
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

app.post('/api/categories', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, icon, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const sanitized = {
      name: String(name).slice(0, 100),
      icon: (icon !== undefined && icon !== null) ? String(icon).slice(0, 50) : null,
      color: (color !== undefined && color !== null) ? String(color).slice(0, 50) : null
    };

    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO categories (id, name, icon, color) VALUES ($1,$2,$3,$4)`,
      [id, sanitized.name, sanitized.icon, sanitized.color]
    );

    res.status(201).json({ id, ...sanitized });
  } catch (e) {
    res.status(500).json({ error: 'Error creating category' });
  }
});

app.put('/api/categories/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, icon, color } = req.body;

    const updates = [];
    const params = [];
    if (name !== undefined) { params.push(String(name).slice(0, 100)); updates.push(`name = $${params.length}`); }
    if (icon !== undefined) { params.push(icon !== null ? String(icon).slice(0, 50) : null); updates.push(`icon = $${params.length}`); }
    if (color !== undefined) { params.push(color !== null ? String(color).slice(0, 50) : null); updates.push(`color = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Category not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating category' });
  }
});

app.delete('/api/categories/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting category' });
  }
});

// INGREDIENTS
app.get('/api/ingredients', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM ingredients';
    const params = [];

    if (category) {
      query += ' WHERE categoria = $1';
      params.push(category);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching ingredients' });
  }
});

app.post('/api/ingredients', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { nombre, descripcion, precio_extra, categoria, vegetariano, vegano, premium, dulce, disponible, defaultIng } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const sanitized = {
      nombre: String(nombre).slice(0, 100),
      descripcion: (descripcion !== undefined && descripcion !== null) ? String(descripcion).slice(0, 300) : null,
      precio_extra: Math.max(0, Math.min(Number(precio_extra || 0), 999999999)),
      categoria: (categoria !== undefined && categoria !== null) ? String(categoria).slice(0, 50) : null,
      vegetariano: !!vegetariano,
      vegano: !!vegano,
      premium: !!premium,
      dulce: !!dulce,
      disponible: disponible !== undefined ? !!disponible : true,
      defaultIng: !!defaultIng
    };

    const id = `ing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO ingredients (id, nombre, descripcion, precio_extra, categoria, vegetariano, vegano, premium, dulce, disponible, "defaultIng") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, sanitized.nombre, sanitized.descripcion, sanitized.precio_extra, sanitized.categoria, sanitized.vegetariano, sanitized.vegano, sanitized.premium, sanitized.dulce, sanitized.disponible, sanitized.defaultIng]
    );

    res.status(201).json({ id, ...sanitized });
  } catch (e) {
    res.status(500).json({ error: 'Error creating ingredient' });
  }
});

app.put('/api/ingredients/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { nombre, descripcion, precio_extra, categoria, vegetariano, vegano, premium, dulce, disponible, defaultIng } = req.body;

    const updates = [];
    const params = [];
    if (nombre !== undefined) { params.push(String(nombre).slice(0, 100)); updates.push(`nombre = $${params.length}`); }
    if (descripcion !== undefined) { params.push(descripcion !== null ? String(descripcion).slice(0, 300) : null); updates.push(`descripcion = $${params.length}`); }
    if (precio_extra !== undefined) { params.push(Math.max(0, Math.min(Number(precio_extra), 999999999))); updates.push(`precio_extra = $${params.length}`); }
    if (categoria !== undefined) { params.push(categoria !== null ? String(categoria).slice(0, 50) : null); updates.push(`categoria = $${params.length}`); }
    if (vegetariano !== undefined) { params.push(!!vegetariano); updates.push(`vegetariano = $${params.length}`); }
    if (vegano !== undefined) { params.push(!!vegano); updates.push(`vegano = $${params.length}`); }
    if (premium !== undefined) { params.push(!!premium); updates.push(`premium = $${params.length}`); }
    if (dulce !== undefined) { params.push(!!dulce); updates.push(`dulce = $${params.length}`); }
    if (disponible !== undefined) { params.push(!!disponible); updates.push(`disponible = $${params.length}`); }
    if (defaultIng !== undefined) { params.push(!!defaultIng); updates.push(`"defaultIng" = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE ingredients SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM ingredients WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Ingredient not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating ingredient' });
  }
});

app.delete('/api/ingredients/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ingredients WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting ingredient' });
  }
});

// ORDERS
app.get('/api/orders', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'REPARTIDOR'), async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM orders';
    const params = [];

    if (status && status !== 'all') {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY "createdAt" DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

app.get('/api/orders/:id', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'REPARTIDOR'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error fetching order' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { orderNumber, customerName, address, items, total, estimatedTime, paymentMethod, clientId } = req.body;

    // Validación de inputs
    if (!orderNumber || !customerName || !address || !items || !total) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // items es una columna JSON nativa: el pg driver serializa/parsea objetos
    // planos automáticamente, pero los arrays de nivel superior (como este)
    // los convierte a sintaxis de array de Postgres en vez de JSON si se
    // pasan tal cual, así que seguimos stringificando en la escritura; la
    // lectura ya no necesita JSON.parse porque la columna se auto-parsea.
    const itemsForDb = JSON.stringify(items);
    if (itemsForDb.length > 5000) {
      return res.status(400).json({ error: 'Items demasiado grandes' });
    }

    // Sanitización básica
    const sanitized = {
      orderNumber: String(orderNumber).slice(0, 50),
      customerName: String(customerName).slice(0, 100),
      address: String(address).slice(0, 200),
      total: Math.max(0, Math.min(Number(total), 999999999)),
      estimatedTime: Math.max(0, Math.min(Number(estimatedTime || 30), 180)),
      paymentMethod: String(paymentMethod || 'cash').slice(0, 20),
      // clientId es opcional: pedidos legacy o de invitado no lo traen
      clientId: (clientId !== undefined && clientId !== null && clientId !== '') ? String(clientId).slice(0, 100) : null
    };

    const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const status = 'PENDING';
    const createdAt = new Date().toISOString();

    await pool.query(
      `INSERT INTO orders (id, "orderNumber", "customerName", address, items, total, status, "createdAt", "estimatedTime", "paymentMethod", "clientId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, sanitized.orderNumber, sanitized.customerName, sanitized.address, itemsForDb, sanitized.total, status, createdAt, sanitized.estimatedTime, sanitized.paymentMethod, sanitized.clientId]
    );

    res.status(201).json({ id, orderNumber: sanitized.orderNumber, customerName: sanitized.customerName, address: sanitized.address, items, total: sanitized.total, status, createdAt, estimatedTime: sanitized.estimatedTime, paymentMethod: sanitized.paymentMethod, clientId: sanitized.clientId });
  } catch (e) {
    res.status(500).json({ error: 'Error creating order' });
  }
});

// Tier cosmético según el total histórico gastado por el cliente (en la
// misma unidad monetaria que orders.total). Son umbrales de referencia,
// no un cálculo financiero: se documentan aquí para que sean fáciles de
// ajustar si el negocio cambia de criterio.
//   totalGastado < 100.000        -> 'bronce'
//   100.000 <= totalGastado < 300.000  -> 'plata'
//   300.000 <= totalGastado < 600.000  -> 'oro'
//   totalGastado >= 600.000       -> 'platino'
function computeNivel(totalGastado) {
  if (totalGastado >= 600000) return 'platino';
  if (totalGastado >= 300000) return 'oro';
  if (totalGastado >= 100000) return 'plata';
  return 'bronce';
}

// Actualiza los agregados de gasto de un cliente cuando se completa un
// pedido asociado a él. Si el cliente no existe (id huérfano, borrado,
// etc.) no hace nada: el llamador decide si eso debe ser silencioso.
async function updateClientSpendAggregate(clientId, orderTotal) {
  const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [clientId]);
  if (!clientResult.rows.length) return;

  const client = clientResult.rows[0];
  const newTotalCompras = (client.totalCompras || 0) + 1;
  const newTotalGastado = (client.totalGastado || 0) + (Number(orderTotal) || 0);

  // Frecuencia de compra: compras por cada 30 días desde el alta del
  // cliente. Es una métrica cosmética para la UI (no financiera), así
  // que se mantiene deliberadamente simple.
  const creadoDate = client.creado ? new Date(client.creado) : new Date();
  const daysSinceCreated = Math.max(1, Math.floor((Date.now() - creadoDate.getTime()) / 86400000));
  const frecuenciaCompra = Math.max(1, Math.round((newTotalCompras / daysSinceCreated) * 30));

  const nivel = computeNivel(newTotalGastado);

  await pool.query(
    `UPDATE clients SET "totalCompras" = $1, "totalGastado" = $2, "ultimaCompra" = NOW(), "frecuenciaCompra" = $3, nivel = $4 WHERE id = $5`,
    [newTotalCompras, newTotalGastado, frecuenciaCompra, nivel, clientId]
  );
}

app.patch('/api/orders/:id/status', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'REPARTIDOR'), async (req, res) => {
  try {
    const { status } = req.body;

    // Validar status permitido
    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED', 'DELIVERING', 'COMPLETED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);

    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    if (status === 'COMPLETED' && order.clientId) {
      try {
        await updateClientSpendAggregate(order.clientId, order.total);
      } catch (aggError) {
        // No se debe fallar la actualización del pedido por un problema
        // al agregar las métricas del cliente.
        console.error('Error updating client spend aggregate:', aggError.message);
      }
    }

    res.json(order);
  } catch (e) {
    res.status(500).json({ error: 'Error updating order' });
  }
});

app.put('/api/orders/:id', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { address, items, total, estimatedTime, paymentMethod } = req.body;

    const updates = [];
    const params = [];
    if (address !== undefined) { params.push(String(address).slice(0, 200)); updates.push(`address = $${params.length}`); }
    if (items !== undefined) {
      const itemsForDb = JSON.stringify(items);
      if (itemsForDb.length > 5000) {
        return res.status(400).json({ error: 'Items demasiado grandes' });
      }
      params.push(itemsForDb); updates.push(`items = $${params.length}`);
    }
    if (total !== undefined) { params.push(Math.max(0, Math.min(Number(total), 999999999))); updates.push(`total = $${params.length}`); }
    if (estimatedTime !== undefined) { params.push(Math.max(0, Math.min(Number(estimatedTime), 180))); updates.push(`"estimatedTime" = $${params.length}`); }
    if (paymentMethod !== undefined) { params.push(String(paymentMethod).slice(0, 20)); updates.push(`"paymentMethod" = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating order' });
  }
});

// PAYMENTS — Bold (Colombia)
app.post('/api/payments/bold/create-link', async (req, res) => {
  try {
    if (!process.env.BOLD_API_KEY) {
      return res.status(503).json({ error: 'Bold no configurado' });
    }

    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Falta orderId' });
    }

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
      return res.status(400).json({ error: `No se puede pagar un pedido ${order.status.toLowerCase()}` });
    }

    const boldResponse = await fetch('https://integrations.api.bold.co/online/link/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `x-api-key ${process.env.BOLD_API_KEY}`
      },
      body: JSON.stringify({
        amount_type: 'CLOSE',
        amount: { currency: 'COP', total_amount: order.total },
        reference: order.orderNumber,
        description: `Pedido Juancho's Pizza #${order.orderNumber}`.slice(0, 100),
        payment_methods: ['CREDIT_CARD', 'PSE', 'NEQUI', 'BOTON_BANCOLOMBIA']
      })
    });

    const data = await boldResponse.json();

    if (!boldResponse.ok || (data.errors && data.errors.length > 0)) {
      return res.status(502).json({ error: data.errors?.[0]?.message || 'Error creando el link de pago Bold' });
    }

    res.status(201).json({ url: data.payload.url, paymentLink: data.payload.payment_link });
  } catch (e) {
    res.status(500).json({ error: 'Error de conexión con Bold' });
  }
});

// PAYMENTS — MercadoPago
app.post('/api/payments/mercadopago/create-payment', async (req, res) => {
  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(503).json({ error: 'MercadoPago no configurado' });
    }

    const { orderId, customerEmail } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Falta orderId' });
    }

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        transaction_amount: order.total,
        description: `Pedido Juancho's Pizza #${order.orderNumber}`.slice(0, 100),
        payment_method_id: 'pix',
        payer: { email: String(customerEmail || '').slice(0, 100) },
        external_reference: order.id
      })
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      return res.status(502).json({ error: data.message || 'Error creando pago MercadoPago' });
    }

    res.status(201).json({
      transactionId: data.id,
      qrCode: data.point_of_interaction?.transaction_data?.qr_code
    });
  } catch (e) {
    res.status(500).json({ error: 'Error de conexión con MercadoPago' });
  }
});

// PAYMENTS — Wompi
app.post('/api/payments/wompi/create-transaction', async (req, res) => {
  try {
    if (!process.env.WOMPI_MERCHANT_ID) {
      return res.status(503).json({ error: 'Wompi no configurado' });
    }

    const { orderId, customerEmail } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Falta orderId' });
    }

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const wompiResponse = await fetch('https://sandbox.wompi.co/v1/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_in_cents: Math.round(order.total * 100),
        currency: 'COP',
        customer_email: String(customerEmail || '').slice(0, 100),
        payment_method: { type: 'CARD' },
        reference: order.orderNumber,
        redirect_url: `${req.get('origin') || 'http://localhost:3000'}/payment/return`
      })
    });

    const data = await wompiResponse.json();

    if (data.status === 'approved') {
      return res.status(201).json({ transactionId: data.id, approved: true });
    }

    res.status(201).json({ paymentUrl: data.redirect_url, approved: false });
  } catch (e) {
    res.status(500).json({ error: 'Error de conexión con Wompi' });
  }
});

// PAYMENTS — PayPal
app.post('/api/payments/paypal/create-order', async (req, res) => {
  try {
    if (!process.env.PAYPAL_CLIENT_ID) {
      return res.status(503).json({ error: 'PayPal no configurado' });
    }

    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Falta orderId' });
    }

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const origin = req.get('origin') || 'http://localhost:3000';
    res.status(201).json({
      paymentUrl: `https://www.paypal.com/checkoutnow?token=${order.id}&return=${encodeURIComponent(`${origin}/payment/success`)}&cancel=${encodeURIComponent(`${origin}/payment/cancel`)}`
    });
  } catch (e) {
    res.status(500).json({ error: 'Error de conexión con PayPal' });
  }
});

// CAMPAIGNS
app.get('/api/campaigns', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM campaigns ORDER BY id');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching campaigns' });
  }
});

app.post('/api/campaigns', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { name, type, discount, status, budget } = req.body;
    const id = `camp_${Date.now()}`;

    await pool.query(
      `INSERT INTO campaigns (id, name, type, discount, status, reach, conversions, budget) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, String(name).slice(0, 100), String(type).slice(0, 20), Math.max(0, Math.min(Number(discount || 0), 100)), String(status || 'draft').slice(0, 20), 0, 0, Math.max(0, Math.min(Number(budget || 0), 999999999))]
    );

    res.status(201).json({ id, name, type, discount, status: status || 'draft', reach: 0, conversions: 0, budget });
  } catch (e) {
    res.status(500).json({ error: 'Error creating campaign' });
  }
});

app.put('/api/campaigns/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { name, type, discount, status, budget } = req.body;

    const updates = [];
    const params = [];
    if (name !== undefined) { params.push(String(name).slice(0, 100)); updates.push(`name = $${params.length}`); }
    if (type !== undefined) { params.push(String(type).slice(0, 20)); updates.push(`type = $${params.length}`); }
    if (discount !== undefined) { params.push(Math.max(0, Math.min(Number(discount), 100))); updates.push(`discount = $${params.length}`); }
    if (status !== undefined) { params.push(String(status).slice(0, 20)); updates.push(`status = $${params.length}`); }
    if (budget !== undefined) { params.push(Math.max(0, Math.min(Number(budget), 999999999))); updates.push(`budget = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Campaign not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating campaign' });
  }
});

// STATS
app.get('/api/stats', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const totalResult = await pool.query('SELECT COUNT(*)::int as count, COALESCE(SUM(total), 0)::int as revenue FROM orders');
    const todayResult = await pool.query(
      `SELECT COUNT(*)::int as count, COALESCE(SUM(total), 0)::int as revenue FROM orders WHERE "createdAt" >= $1::date AND "createdAt" < $1::date + INTERVAL '1 day'`,
      [today]
    );
    const pendingResult = await pool.query("SELECT COUNT(*)::int as count FROM orders WHERE status = 'PENDING'");
    const preparingResult = await pool.query("SELECT COUNT(*)::int as count FROM orders WHERE status = 'PREPARING'");
    const readyResult = await pool.query("SELECT COUNT(*)::int as count FROM orders WHERE status = 'READY'");

    res.json({
      totalOrders: totalResult.rows[0]?.count || 0,
      todayOrders: todayResult.rows[0]?.count || 0,
      pendingOrders: pendingResult.rows[0]?.count || 0,
      preparingOrders: preparingResult.rows[0]?.count || 0,
      readyOrders: readyResult.rows[0]?.count || 0,
      totalRevenue: totalResult.rows[0]?.revenue || 0,
      todayRevenue: todayResult.rows[0]?.revenue || 0
    });
  } catch (e) {
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

// ===================== GASTROPRO CRM API ROUTES =====================

// --- CLIENTS ---
app.get('/api/clients', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { estado, search } = req.query;
    let query = 'SELECT * FROM clients';
    const params = [];
    const conditions = [];
    if (estado && estado !== 'todos') { params.push(estado); conditions.push(`estado = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      const p1 = params.length;
      params.push(`%${search}%`);
      const p2 = params.length;
      conditions.push(`(nombre ILIKE $${p1} OR telefono ILIKE $${p2})`);
    }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY "totalGastado" DESC';
    const result = await pool.query(query, params);
    // tags es JSON nativo: el driver ya lo devuelve parseado (array u null)
    res.json(result.rows.map(r => ({ ...r, tags: r.tags || [], vip: !!r.vip })));
  } catch (e) { res.status(500).json({ error: 'Error fetching clients' }); }
});

app.get('/api/clients/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (result.rows.length) {
      const client = { ...result.rows[0], tags: result.rows[0].tags || [], vip: !!result.rows[0].vip };
      res.json(client);
    } else res.status(404).json({ error: 'Client not found' });
  } catch (e) { res.status(500).json({ error: 'Error fetching client' }); }
});

app.post('/api/clients', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { nombre, telefono, email, direccion, notas, cumpleanos } = req.body;
    const id = `cli_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    await pool.query(
      `INSERT INTO clients (id, nombre, telefono, email, direccion, notas, cumpleanos, creado) VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())`,
      [id, nombre?.slice(0,100), telefono?.slice(0,20), email?.slice(0,100), direccion?.slice(0,200), notas?.slice(0,500), cumpleanos]
    );
    res.status(201).json({ id, nombre, telefono, email, direccion, notas, cumpleanos });
  } catch (e) { res.status(500).json({ error: 'Error creating client' }); }
});

app.patch('/api/clients/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { vip, notas, tags, estado } = req.body;
    const updates = []; const params = [];
    if (vip !== undefined) { params.push(!!vip); updates.push(`vip = $${params.length}`); }
    if (notas !== undefined) { params.push(notas); updates.push(`notas = $${params.length}`); }
    if (tags !== undefined) { params.push(JSON.stringify(tags)); updates.push(`tags = $${params.length}`); }
    if (estado !== undefined) { params.push(estado); updates.push(`estado = $${params.length}`); }
    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE clients SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Error updating client' }); }
});

// Full profile edit (name/phone/email/address/notes/birthday). Separate from
// the PATCH route above, which only ever covered vip/notas/tags/estado.
app.put('/api/clients/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { nombre, telefono, email, direccion, notas, cumpleanos } = req.body;
    const updates = []; const params = [];
    if (nombre !== undefined) { params.push(String(nombre).slice(0, 100)); updates.push(`nombre = $${params.length}`); }
    if (telefono !== undefined) { params.push(telefono !== null ? String(telefono).slice(0, 20) : null); updates.push(`telefono = $${params.length}`); }
    if (email !== undefined) { params.push(email !== null ? String(email).slice(0, 100) : null); updates.push(`email = $${params.length}`); }
    if (direccion !== undefined) { params.push(direccion !== null ? String(direccion).slice(0, 200) : null); updates.push(`direccion = $${params.length}`); }
    if (notas !== undefined) { params.push(notas !== null ? String(notas).slice(0, 500) : null); updates.push(`notas = $${params.length}`); }
    if (cumpleanos !== undefined) { params.push(cumpleanos || null); updates.push(`cumpleanos = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE clients SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Client not found' });
    res.json({ ...result.rows[0], tags: result.rows[0].tags || [], vip: !!result.rows[0].vip });
  } catch (e) { res.status(500).json({ error: 'Error updating client profile' }); }
});

// --- INVENTORY ---
app.get('/api/inventory', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_items ORDER BY nombre');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching inventory' }); }
});

app.post('/api/inventory', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { nombre, categoria, stockActual, stockMinimo, stockMaximo, unidad, costoUnitario, proveedor, lote, fechaVencimiento, ubicacion } = req.body;
    const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    await pool.query(
      `INSERT INTO inventory_items (id, nombre, categoria, "stockActual", "stockMinimo", "stockMaximo", unidad, "costoUnitario", proveedor, lote, "fechaVencimiento", ubicacion) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, nombre, categoria, stockActual||0, stockMinimo||10, stockMaximo||100, unidad||'unidad', costoUnitario||0, proveedor, lote, fechaVencimiento, ubicacion]
    );
    res.status(201).json({ id, nombre });
  } catch (e) { res.status(500).json({ error: 'Error creating inventory item' }); }
});

app.post('/api/inventory/movement', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { itemId, tipo, cantidad, motivo, referencia, usuario } = req.body;
    const item = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [itemId]);
    if (!item.rows.length) return res.status(404).json({ error: 'Item not found' });
    const saldoAnterior = item.rows[0].stockActual;
    const saldoNuevo = tipo === 'entrada' ? saldoAnterior + cantidad : saldoAnterior - cantidad;
    const movId = `mov_${Date.now()}`;
    await pool.query(
      `INSERT INTO inventory_movements (id, "itemId", tipo, cantidad, "saldoAnterior", "saldoNuevo", motivo, referencia, usuario) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [movId, itemId, tipo, cantidad, saldoAnterior, saldoNuevo, motivo, referencia, usuario||'sistema']
    );
    await pool.query('UPDATE inventory_items SET "stockActual" = $1 WHERE id = $2', [saldoNuevo, itemId]);
    res.status(201).json({ id: movId, saldoNuevo });
  } catch (e) { res.status(500).json({ error: 'Error registering movement' }); }
});

app.get('/api/inventory/movements', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_movements ORDER BY creado DESC LIMIT 50');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching movements' }); }
});

// --- RECIPES ---
app.get('/api/recipes', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const recipes = await pool.query('SELECT * FROM recipes');
    const allIngredients = await pool.query('SELECT * FROM recipe_ingredients');
    const byRecipeId = new Map();
    for (const ingredient of allIngredients.rows) {
      if (!byRecipeId.has(ingredient.recipeId)) byRecipeId.set(ingredient.recipeId, []);
      byRecipeId.get(ingredient.recipeId).push(ingredient);
    }
    const result = recipes.rows.map(recipe => ({ ...recipe, ingredientes: byRecipeId.get(recipe.id) || [] }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: 'Error fetching recipes' }); }
});

app.post('/api/recipes', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { nombre, productoId, porciones, costoTotal, instrucciones, ingredientes } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const sanitized = {
      nombre: String(nombre).slice(0, 100),
      productoId: (productoId !== undefined && productoId !== null) ? String(productoId).slice(0, 50) : null,
      porciones: Math.max(1, Math.min(Number(porciones || 1), 9999)),
      costoTotal: Math.max(0, Math.min(Number(costoTotal || 0), 999999999)),
      instrucciones: (instrucciones !== undefined && instrucciones !== null) ? String(instrucciones).slice(0, 2000) : null
    };

    const id = `rcp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO recipes (id, nombre, "productoId", porciones, "costoTotal", instrucciones) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, sanitized.nombre, sanitized.productoId, sanitized.porciones, sanitized.costoTotal, sanitized.instrucciones]
    );

    const ingredientesList = Array.isArray(ingredientes) ? ingredientes.slice(0, 100) : [];
    const savedIngredients = [];
    for (const ing of ingredientesList) {
      const ingId = `rci_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const ingSanitized = {
        itemId: (ing?.itemId !== undefined && ing?.itemId !== null) ? String(ing.itemId).slice(0, 50) : null,
        nombre: (ing?.nombre !== undefined && ing?.nombre !== null) ? String(ing.nombre).slice(0, 100) : null,
        cantidad: Math.max(0, Math.min(Number(ing?.cantidad || 0), 999999)),
        unidad: (ing?.unidad !== undefined && ing?.unidad !== null) ? String(ing.unidad).slice(0, 20) : 'unidad',
        costo: Math.max(0, Math.min(Number(ing?.costo || 0), 999999999))
      };
      await pool.query(
        `INSERT INTO recipe_ingredients (id, "recipeId", "itemId", nombre, cantidad, unidad, costo) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [ingId, id, ingSanitized.itemId, ingSanitized.nombre, ingSanitized.cantidad, ingSanitized.unidad, ingSanitized.costo]
      );
      savedIngredients.push({ id: ingId, recipeId: id, ...ingSanitized });
    }

    res.status(201).json({ id, ...sanitized, ingredientes: savedIngredients });
  } catch (e) {
    res.status(500).json({ error: 'Error creating recipe' });
  }
});

app.put('/api/recipes/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { nombre, productoId, porciones, costoTotal, instrucciones, ingredientes } = req.body;

    const updates = [];
    const params = [];
    if (nombre !== undefined) { params.push(String(nombre).slice(0, 100)); updates.push(`nombre = $${params.length}`); }
    if (productoId !== undefined) { params.push(productoId !== null ? String(productoId).slice(0, 50) : null); updates.push(`"productoId" = $${params.length}`); }
    if (porciones !== undefined) { params.push(Math.max(1, Math.min(Number(porciones), 9999))); updates.push(`porciones = $${params.length}`); }
    if (costoTotal !== undefined) { params.push(Math.max(0, Math.min(Number(costoTotal), 999999999))); updates.push(`"costoTotal" = $${params.length}`); }
    if (instrucciones !== undefined) { params.push(instrucciones !== null ? String(instrucciones).slice(0, 2000) : null); updates.push(`instrucciones = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE recipes SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM recipes WHERE id = $1', [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    let savedIngredients;
    if (Array.isArray(ingredientes)) {
      await pool.query('DELETE FROM recipe_ingredients WHERE "recipeId" = $1', [req.params.id]);
      savedIngredients = [];
      for (const ing of ingredientes.slice(0, 100)) {
        const ingId = `rci_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const ingSanitized = {
          itemId: (ing?.itemId !== undefined && ing?.itemId !== null) ? String(ing.itemId).slice(0, 50) : null,
          nombre: (ing?.nombre !== undefined && ing?.nombre !== null) ? String(ing.nombre).slice(0, 100) : null,
          cantidad: Math.max(0, Math.min(Number(ing?.cantidad || 0), 999999)),
          unidad: (ing?.unidad !== undefined && ing?.unidad !== null) ? String(ing.unidad).slice(0, 20) : 'unidad',
          costo: Math.max(0, Math.min(Number(ing?.costo || 0), 999999999))
        };
        await pool.query(
          `INSERT INTO recipe_ingredients (id, "recipeId", "itemId", nombre, cantidad, unidad, costo) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [ingId, req.params.id, ingSanitized.itemId, ingSanitized.nombre, ingSanitized.cantidad, ingSanitized.unidad, ingSanitized.costo]
        );
        savedIngredients.push({ id: ingId, recipeId: req.params.id, ...ingSanitized });
      }
    } else {
      const existingIngredients = await pool.query('SELECT * FROM recipe_ingredients WHERE "recipeId" = $1', [req.params.id]);
      savedIngredients = existingIngredients.rows;
    }

    res.json({ ...result.rows[0], ingredientes: savedIngredients });
  } catch (e) {
    res.status(500).json({ error: 'Error updating recipe' });
  }
});

app.delete('/api/recipes/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    // recipe_ingredients no tiene constraint ON DELETE CASCADE hacia
    // recipes en el esquema actual, así que se borran manualmente primero.
    await pool.query('DELETE FROM recipe_ingredients WHERE "recipeId" = $1', [req.params.id]);

    const result = await pool.query('DELETE FROM recipes WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting recipe' });
  }
});

// --- EXPENSES ---
app.get('/api/expenses', authMiddleware, requireRole('ADMIN'), async (req, res) => {
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

app.post('/api/expenses', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { categoria, descripcion, monto, fecha, metodo, proveedor, factura, notas, recurrente } = req.body;
    const id = `exp_${Date.now()}`;
    await pool.query(
      `INSERT INTO expenses (id, categoria, descripcion, monto, fecha, metodo, proveedor, factura, notas, recurrente) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, categoria, descripcion?.slice(0,200), monto, fecha||new Date().toISOString(), metodo, proveedor, factura, notas, !!recurrente]
    );
    res.status(201).json({ id });
  } catch (e) { res.status(500).json({ error: 'Error creating expense' }); }
});

// --- LOYALTY ---
app.get('/api/loyalty/rewards', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM loyalty_rewards WHERE vigente = 1');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching rewards' }); }
});

app.post('/api/loyalty/rewards', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { nombre, descripcion, puntosCosto, tipo, valor, vigente } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const sanitized = {
      nombre: String(nombre).slice(0, 100),
      descripcion: (descripcion !== undefined && descripcion !== null) ? String(descripcion).slice(0, 300) : null,
      puntosCosto: Math.max(0, Math.min(Number(puntosCosto || 0), 999999)),
      tipo: (tipo !== undefined && tipo !== null) ? String(tipo).slice(0, 30) : null,
      valor: Math.max(0, Math.min(Number(valor || 0), 999999999)),
      vigente: vigente !== undefined ? Math.max(0, Math.min(Number(vigente), 1)) : 1
    };

    const id = `rwd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO loyalty_rewards (id, nombre, descripcion, "puntosCosto", tipo, valor, vigente) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, sanitized.nombre, sanitized.descripcion, sanitized.puntosCosto, sanitized.tipo, sanitized.valor, sanitized.vigente]
    );

    res.status(201).json({ id, ...sanitized });
  } catch (e) {
    res.status(500).json({ error: 'Error creating reward' });
  }
});

app.put('/api/loyalty/rewards/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { nombre, descripcion, puntosCosto, tipo, valor, vigente } = req.body;

    const updates = [];
    const params = [];
    if (nombre !== undefined) { params.push(String(nombre).slice(0, 100)); updates.push(`nombre = $${params.length}`); }
    if (descripcion !== undefined) { params.push(descripcion !== null ? String(descripcion).slice(0, 300) : null); updates.push(`descripcion = $${params.length}`); }
    if (puntosCosto !== undefined) { params.push(Math.max(0, Math.min(Number(puntosCosto), 999999))); updates.push(`"puntosCosto" = $${params.length}`); }
    if (tipo !== undefined) { params.push(tipo !== null ? String(tipo).slice(0, 30) : null); updates.push(`tipo = $${params.length}`); }
    if (valor !== undefined) { params.push(Math.max(0, Math.min(Number(valor), 999999999))); updates.push(`valor = $${params.length}`); }
    if (vigente !== undefined) { params.push(Math.max(0, Math.min(Number(vigente), 1))); updates.push(`vigente = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE loyalty_rewards SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM loyalty_rewards WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Reward not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating reward' });
  }
});

app.delete('/api/loyalty/rewards/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM loyalty_rewards WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting reward' });
  }
});

app.post('/api/loyalty/points', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { clientId, puntos, concepto, referencia } = req.body;
    const id = `lpt_${Date.now()}`;
    await pool.query(
      `INSERT INTO loyalty_points (id, "clientId", puntos, concepto, referencia) VALUES ($1,$2,$3,$4,$5)`,
      [id, clientId, puntos, concepto, referencia]
    );
    await pool.query(`UPDATE clients SET puntos = puntos + $1 WHERE id = $2`, [puntos, clientId]);
    res.status(201).json({ id });
  } catch (e) { res.status(500).json({ error: 'Error adding points' }); }
});

app.get('/api/loyalty/points/:clientId', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM loyalty_points WHERE "clientId" = $1 ORDER BY creado DESC',
      [req.params.clientId]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching loyalty points' }); }
});

// --- MENU VARIANTS ---
app.get('/api/menu/variants', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menu_variants ORDER BY "productoId"');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching variants' }); }
});

app.post('/api/menu/variants', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { productoId, nombre, precioModificador, activo } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const sanitized = {
      productoId: (productoId !== undefined && productoId !== null) ? String(productoId).slice(0, 50) : null,
      nombre: String(nombre).slice(0, 100),
      precioModificador: Math.max(-999999999, Math.min(Number(precioModificador || 0), 999999999)),
      activo: activo !== undefined ? !!activo : true
    };

    const id = `mva_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO menu_variants (id, "productoId", nombre, "precioModificador", activo) VALUES ($1,$2,$3,$4,$5)`,
      [id, sanitized.productoId, sanitized.nombre, sanitized.precioModificador, sanitized.activo]
    );

    res.status(201).json({ id, ...sanitized });
  } catch (e) {
    res.status(500).json({ error: 'Error creating variant' });
  }
});

app.put('/api/menu/variants/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { productoId, nombre, precioModificador, activo } = req.body;

    const updates = [];
    const params = [];
    if (productoId !== undefined) { params.push(productoId !== null ? String(productoId).slice(0, 50) : null); updates.push(`"productoId" = $${params.length}`); }
    if (nombre !== undefined) { params.push(String(nombre).slice(0, 100)); updates.push(`nombre = $${params.length}`); }
    if (precioModificador !== undefined) { params.push(Math.max(-999999999, Math.min(Number(precioModificador), 999999999))); updates.push(`"precioModificador" = $${params.length}`); }
    if (activo !== undefined) { params.push(!!activo); updates.push(`activo = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE menu_variants SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM menu_variants WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Variant not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating variant' });
  }
});

app.delete('/api/menu/variants/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM menu_variants WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting variant' });
  }
});

app.get('/api/menu/combos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menu_combos ORDER BY id');
    // productos es JSON nativo: el driver ya lo devuelve parseado (array u null)
    res.json(result.rows.map(r => ({ ...r, productos: r.productos || [] })));
  } catch (e) { res.status(500).json({ error: 'Error fetching combos' }); }
});

app.post('/api/menu/combos', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { nombre, descripcion, productos, precioTotal, ahorro, imagen, activo } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const productosForDb = JSON.stringify(Array.isArray(productos) ? productos : []);
    if (productosForDb.length > 5000) {
      return res.status(400).json({ error: 'Productos demasiado grandes' });
    }

    const sanitized = {
      nombre: String(nombre).slice(0, 100),
      descripcion: (descripcion !== undefined && descripcion !== null) ? String(descripcion).slice(0, 300) : null,
      precioTotal: Math.max(0, Math.min(Number(precioTotal || 0), 999999999)),
      ahorro: Math.max(0, Math.min(Number(ahorro || 0), 999999999)),
      imagen: (imagen !== undefined && imagen !== null) ? String(imagen).slice(0, 300) : null,
      activo: activo !== undefined ? !!activo : true
    };

    const id = `mco_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO menu_combos (id, nombre, descripcion, productos, "precioTotal", ahorro, imagen, activo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, sanitized.nombre, sanitized.descripcion, productosForDb, sanitized.precioTotal, sanitized.ahorro, sanitized.imagen, sanitized.activo]
    );

    res.status(201).json({ id, ...sanitized, productos: Array.isArray(productos) ? productos : [] });
  } catch (e) {
    res.status(500).json({ error: 'Error creating combo' });
  }
});

app.put('/api/menu/combos/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { nombre, descripcion, productos, precioTotal, ahorro, imagen, activo } = req.body;

    const updates = [];
    const params = [];
    if (nombre !== undefined) { params.push(String(nombre).slice(0, 100)); updates.push(`nombre = $${params.length}`); }
    if (descripcion !== undefined) { params.push(descripcion !== null ? String(descripcion).slice(0, 300) : null); updates.push(`descripcion = $${params.length}`); }
    if (productos !== undefined) {
      const productosForDb = JSON.stringify(Array.isArray(productos) ? productos : []);
      if (productosForDb.length > 5000) {
        return res.status(400).json({ error: 'Productos demasiado grandes' });
      }
      params.push(productosForDb); updates.push(`productos = $${params.length}`);
    }
    if (precioTotal !== undefined) { params.push(Math.max(0, Math.min(Number(precioTotal), 999999999))); updates.push(`"precioTotal" = $${params.length}`); }
    if (ahorro !== undefined) { params.push(Math.max(0, Math.min(Number(ahorro), 999999999))); updates.push(`ahorro = $${params.length}`); }
    if (imagen !== undefined) { params.push(imagen !== null ? String(imagen).slice(0, 300) : null); updates.push(`imagen = $${params.length}`); }
    if (activo !== undefined) { params.push(!!activo); updates.push(`activo = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE menu_combos SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM menu_combos WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json({ ...result.rows[0], productos: result.rows[0].productos || [] });
    } else {
      res.status(404).json({ error: 'Combo not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating combo' });
  }
});

app.delete('/api/menu/combos/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM menu_combos WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Combo not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting combo' });
  }
});

app.get('/api/menu/promotions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menu_promotions ORDER BY activo DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching promotions' }); }
});

app.post('/api/menu/promotions', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { nombre, descripcion, tipo, valor, productoId, categoriaId, montoMinimo, inicia, termina, activo, limite } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const sanitized = {
      nombre: String(nombre).slice(0, 100),
      descripcion: (descripcion !== undefined && descripcion !== null) ? String(descripcion).slice(0, 300) : null,
      tipo: (tipo !== undefined && tipo !== null) ? String(tipo).slice(0, 30) : null,
      valor: Math.max(0, Math.min(Number(valor || 0), 999999999)),
      productoId: (productoId !== undefined && productoId !== null) ? String(productoId).slice(0, 50) : null,
      categoriaId: (categoriaId !== undefined && categoriaId !== null) ? String(categoriaId).slice(0, 50) : null,
      montoMinimo: Math.max(0, Math.min(Number(montoMinimo || 0), 999999999)),
      inicia: inicia || null,
      termina: termina || null,
      activo: activo !== undefined ? !!activo : true,
      limite: Math.max(0, Math.min(Number(limite || 100), 999999))
    };

    const id = `mpr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO menu_promotions (id, nombre, descripcion, tipo, valor, "productoId", "categoriaId", "montoMinimo", inicia, termina, activo, usado, limite) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [id, sanitized.nombre, sanitized.descripcion, sanitized.tipo, sanitized.valor, sanitized.productoId, sanitized.categoriaId, sanitized.montoMinimo, sanitized.inicia, sanitized.termina, sanitized.activo, 0, sanitized.limite]
    );

    res.status(201).json({ id, ...sanitized, usado: 0 });
  } catch (e) {
    res.status(500).json({ error: 'Error creating promotion' });
  }
});

app.put('/api/menu/promotions/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { nombre, descripcion, tipo, valor, productoId, categoriaId, montoMinimo, inicia, termina, activo, usado, limite } = req.body;

    const updates = [];
    const params = [];
    if (nombre !== undefined) { params.push(String(nombre).slice(0, 100)); updates.push(`nombre = $${params.length}`); }
    if (descripcion !== undefined) { params.push(descripcion !== null ? String(descripcion).slice(0, 300) : null); updates.push(`descripcion = $${params.length}`); }
    if (tipo !== undefined) { params.push(tipo !== null ? String(tipo).slice(0, 30) : null); updates.push(`tipo = $${params.length}`); }
    if (valor !== undefined) { params.push(Math.max(0, Math.min(Number(valor), 999999999))); updates.push(`valor = $${params.length}`); }
    if (productoId !== undefined) { params.push(productoId !== null ? String(productoId).slice(0, 50) : null); updates.push(`"productoId" = $${params.length}`); }
    if (categoriaId !== undefined) { params.push(categoriaId !== null ? String(categoriaId).slice(0, 50) : null); updates.push(`"categoriaId" = $${params.length}`); }
    if (montoMinimo !== undefined) { params.push(Math.max(0, Math.min(Number(montoMinimo), 999999999))); updates.push(`"montoMinimo" = $${params.length}`); }
    if (inicia !== undefined) { params.push(inicia || null); updates.push(`inicia = $${params.length}`); }
    if (termina !== undefined) { params.push(termina || null); updates.push(`termina = $${params.length}`); }
    if (activo !== undefined) { params.push(!!activo); updates.push(`activo = $${params.length}`); }
    if (usado !== undefined) { params.push(Math.max(0, Math.min(Number(usado), 999999))); updates.push(`usado = $${params.length}`); }
    if (limite !== undefined) { params.push(Math.max(0, Math.min(Number(limite), 999999))); updates.push(`limite = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE menu_promotions SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM menu_promotions WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Promotion not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating promotion' });
  }
});

app.delete('/api/menu/promotions/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM menu_promotions WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting promotion' });
  }
});

// --- FINANCE REPORTS ---
app.get('/api/finance/summary', authMiddleware, requireRole('ADMIN'), async (req, res) => {
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

// --- CLIENT HISTORY ---
app.get('/api/clients/:id/orders', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    // Filtra por la FK real "clientId" en vez del nombre de cliente en
    // texto libre. Pedidos legacy o de invitado sin clientId simplemente
    // no aparecerán aquí, lo cual es el comportamiento correcto.
    const result = await pool.query(
      `SELECT * FROM orders WHERE "clientId" = $1 ORDER BY "createdAt" DESC LIMIT 20`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching client orders' }); }
});

// Seed data endpoint
app.post('/api/seed', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const categories = [
      { id: '1', name: 'PROMOS FLASH', icon: 'bolt', color: 'text-yellow-500' },
      { id: '2', name: 'PIZZAS TRADICIONALES', icon: 'pizza-slice', color: 'text-orange-500' },
      { id: '3', name: 'PIZZAS PREMIUM', icon: 'crown', color: 'text-purple-500' },
      { id: '4', name: 'PIZZAS DULCES', icon: 'cookie', color: 'text-pink-400' },
      { id: '5', name: 'ENTRADAS', icon: 'bread-slice', color: 'text-amber-500' },
      { id: '6', name: 'COMBOS', icon: 'box-open', color: 'text-green-500' },
      { id: '7', name: 'BEBIDAS', icon: 'wine-glass', color: 'text-cyan-500' },
      { id: '8', name: 'POSTRES', icon: 'ice-cream', color: 'text-pink-500' },
      { id: '9', name: 'SALSAS PARA MOJAR', icon: 'droplet', color: 'text-red-500' },
    ];

    for (const cat of categories) {
      await pool.query(
        `INSERT INTO categories (id, name, icon, color) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [cat.id, cat.name, cat.icon, cat.color]
      );
    }

    res.json({ message: 'Seed completed' });
  } catch (e) {
    res.status(500).json({ error: 'Error seeding data' });
  }
});

// Serve static files from dist in production
app.use(express.static(path.join(__dirname, '../dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    } else if (filePath.endsWith('.svg')) {
      res.set('Content-Type', 'image/svg+xml');
    }
  }
}));

// Fallback to frontend for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
});

// Validar config al iniciar
if (!process.env.DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL en .env');
  process.exit(1);
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🍕 Guido Pizza API Server running on port ${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  });
});

export default app;
