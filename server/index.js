import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Config de seguridad: nunca loggear credenciales
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || ''
});

// Middleware de seguridad
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000,http://localhost:3001',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting básico por IP
const rateLimit = new Map();
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
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT
      )
    `);
    
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        categoryId TEXT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        basePrice INTEGER,
        type TEXT,
        image TEXT,
        tiempo INTEGER,
        popularidad INTEGER,
        vegetariano INTEGER,
        isPremium INTEGER,
        exclusiva INTEGER
      )
    `);
    
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        precio_extra INTEGER,
        categoria TEXT,
        vegetariano INTEGER,
        vegano INTEGER,
        premium INTEGER,
        dulce INTEGER,
        disponible INTEGER,
        default_ing INTEGER
      )
    `);
    
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        orderNumber TEXT,
        customerName TEXT,
        address TEXT,
        items TEXT,
        total INTEGER,
        status TEXT,
        createdAt TEXT,
        estimatedTime INTEGER,
        paymentMethod TEXT
      )
    `);
    
    await turso.execute(`
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
    
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ DB init error:', error.message);
  }
}

// Health check — sin exponer detalles
app.get('/api/health', async (req, res) => {
  try {
    await turso.execute('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

// PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM products';
    const params = [];
    
    if (category && category !== 'all') {
      query += ' WHERE categoryId = ?';
      params.push(category);
    }
    
    const result = await turso.execute({ sql: query, args: params });
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await turso.execute({
      sql: 'SELECT * FROM products WHERE id = ?',
      args: [req.params.id]
    });
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error fetching product' });
  }
});

// CATEGORIES
app.get('/api/categories', async (req, res) => {
  try {
    const result = await turso.execute('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching categories' });
  }
});

// INGREDIENTS
app.get('/api/ingredients', async (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM ingredients';
    const params = [];
    
    if (category) {
      query += ' WHERE categoria = ?';
      params.push(category);
    }
    
    const result = await turso.execute({ sql: query, args: params });
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching ingredients' });
  }
});

// ORDERS
app.get('/api/orders', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM orders';
    const params = [];
    
    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const result = await turso.execute({ sql: query, args: params });
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const result = await turso.execute({
      sql: 'SELECT * FROM orders WHERE id = ?',
      args: [req.params.id]
    });
    
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
    const { orderNumber, customerName, address, items, total, estimatedTime, paymentMethod } = req.body;
    
    // Validación de inputs
    if (!orderNumber || !customerName || !address || !items || !total) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    // Sanitización básica
    const sanitized = {
      orderNumber: String(orderNumber).slice(0, 50),
      customerName: String(customerName).slice(0, 100),
      address: String(address).slice(0, 200),
      items: JSON.stringify(items).slice(0, 5000),
      total: Math.max(0, Math.min(Number(total), 999999999)),
      estimatedTime: Math.max(0, Math.min(Number(estimatedTime || 30), 180)),
      paymentMethod: String(paymentMethod || 'cash').slice(0, 20)
    };
    
    const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const status = 'PENDING';
    const createdAt = new Date().toISOString();
    
    await turso.execute({
      sql: `INSERT INTO orders (id, orderNumber, customerName, address, items, total, status, createdAt, estimatedTime, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, sanitized.orderNumber, sanitized.customerName, sanitized.address, sanitized.items, sanitized.total, status, createdAt, sanitized.estimatedTime, sanitized.paymentMethod]
    });
    
    res.status(201).json({ id, orderNumber: sanitized.orderNumber, customerName: sanitized.customerName, address: sanitized.address, items: sanitized.items, total: sanitized.total, status, createdAt, estimatedTime: sanitized.estimatedTime, paymentMethod: sanitized.paymentMethod });
  } catch (e) {
    res.status(500).json({ error: 'Error creating order' });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validar status permitido
    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED', 'DELIVERING', 'COMPLETED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    await turso.execute({
      sql: 'UPDATE orders SET status = ? WHERE id = ?',
      args: [status, req.params.id]
    });
    
    const result = await turso.execute({
      sql: 'SELECT * FROM orders WHERE id = ?',
      args: [req.params.id]
    });
    
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating order' });
  }
});

// CAMPAIGNS
app.get('/api/campaigns', async (req, res) => {
  try {
    const result = await turso.execute('SELECT * FROM campaigns ORDER BY id');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching campaigns' });
  }
});

app.post('/api/campaigns', async (req, res) => {
  try {
    const { name, type, discount, status, budget } = req.body;
    const id = `camp_${Date.now()}`;
    
    await turso.execute({
      sql: `INSERT INTO campaigns (id, name, type, discount, status, reach, conversions, budget) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, String(name).slice(0, 100), String(type).slice(0, 20), Math.max(0, Math.min(Number(discount || 0), 100)), String(status || 'draft').slice(0, 20), 0, 0, Math.max(0, Math.min(Number(budget || 0), 999999999))]
    });
    
    res.status(201).json({ id, name, type, discount, status: status || 'draft', reach: 0, conversions: 0, budget });
  } catch (e) {
    res.status(500).json({ error: 'Error creating campaign' });
  }
});

// STATS
app.get('/api/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const totalResult = await turso.execute('SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM orders');
    const todayResult = await turso.execute({
      sql: "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue FROM orders WHERE createdAt LIKE ?",
      args: [`${today}%`]
    });
    const pendingResult = await turso.execute({ sql: "SELECT COUNT(*) as count FROM orders WHERE status = 'PENDING'" });
    const preparingResult = await turso.execute({ sql: "SELECT COUNT(*) as count FROM orders WHERE status = 'PREPARING'" });
    const readyResult = await turso.execute({ sql: "SELECT COUNT(*) as count FROM orders WHERE status = 'READY'" });
    
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

// Seed data endpoint
app.post('/api/seed', async (req, res) => {
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
      await turso.execute({
        sql: `INSERT OR IGNORE INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?)`,
        args: [cat.id, cat.name, cat.icon, cat.color]
      });
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
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('❌ Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en .env');
  process.exit(1);
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🍕 Guido Pizza API Server running on port ${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  });
});

export default app;