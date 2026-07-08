import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { authMiddleware, requireRole } from './auth.js';

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

    // === GASTROPRO CRM TABLES ===
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        telefono TEXT,
        email TEXT,
        direccion TEXT,
        notas TEXT,
        totalCompras INTEGER DEFAULT 0,
        totalGastado INTEGER DEFAULT 0,
        frecuenciaCompra INTEGER DEFAULT 0,
        ultimaCompra TEXT,
        creado TEXT DEFAULT (datetime('now')),
        vip INTEGER DEFAULT 0,
        puntos INTEGER DEFAULT 0,
        nivel TEXT DEFAULT 'bronce',
        tags TEXT DEFAULT '[]',
        estado TEXT DEFAULT 'activo',
        cumpleanos TEXT
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        categoria TEXT,
        stockActual INTEGER DEFAULT 0,
        stockMinimo INTEGER DEFAULT 10,
        stockMaximo INTEGER DEFAULT 100,
        unidad TEXT DEFAULT 'unidad',
        costoUnitario INTEGER DEFAULT 0,
        proveedor TEXT,
        lote TEXT,
        fechaVencimiento TEXT,
        ubicacion TEXT,
        activo INTEGER DEFAULT 1
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id TEXT PRIMARY KEY,
        itemId TEXT,
        tipo TEXT,
        cantidad INTEGER,
        saldoAnterior INTEGER,
        saldoNuevo INTEGER,
        motivo TEXT,
        referencia TEXT,
        creado TEXT DEFAULT (datetime('now')),
        usuario TEXT
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        productoId TEXT,
        porciones INTEGER DEFAULT 1,
        costoTotal INTEGER DEFAULT 0,
        instrucciones TEXT
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id TEXT PRIMARY KEY,
        recipeId TEXT,
        itemId TEXT,
        nombre TEXT,
        cantidad REAL DEFAULT 0,
        unidad TEXT DEFAULT 'unidad',
        costo INTEGER DEFAULT 0
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        categoria TEXT,
        descripcion TEXT,
        monto INTEGER,
        fecha TEXT DEFAULT (datetime('now')),
        metodo TEXT,
        proveedor TEXT,
        factura TEXT,
        notas TEXT,
        recurrente INTEGER DEFAULT 0
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS loyalty_points (
        id TEXT PRIMARY KEY,
        clientId TEXT,
        puntos INTEGER,
        concepto TEXT,
        referencia TEXT,
        creado TEXT DEFAULT (datetime('now'))
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS loyalty_rewards (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        descripcion TEXT,
        puntosCosto INTEGER,
        tipo TEXT,
        valor INTEGER,
        vigente INTEGER DEFAULT 1
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS menu_variants (
        id TEXT PRIMARY KEY,
        productoId TEXT,
        nombre TEXT,
        precioModificador INTEGER DEFAULT 0,
        activo INTEGER DEFAULT 1
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS menu_combos (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        descripcion TEXT,
        productos TEXT,
        precioTotal INTEGER,
        ahorro INTEGER DEFAULT 0,
        imagen TEXT,
        activo INTEGER DEFAULT 1
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS menu_promotions (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        descripcion TEXT,
        tipo TEXT,
        valor INTEGER,
        productoId TEXT,
        categoriaId TEXT,
        montoMinimo INTEGER,
        inicia TEXT,
        termina TEXT,
        activo INTEGER DEFAULT 1,
        usado INTEGER DEFAULT 0,
        limite INTEGER DEFAULT 100
      )
    `);

    await turso.execute('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    await turso.execute('CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders(createdAt)');
    await turso.execute('CREATE INDEX IF NOT EXISTS idx_clients_estado ON clients(estado)');
    await turso.execute('CREATE INDEX IF NOT EXISTS idx_inventory_categoria ON inventory_items(categoria)');
    await turso.execute('CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipeId ON recipe_ingredients(recipeId)');
    await turso.execute('CREATE INDEX IF NOT EXISTS idx_expenses_fecha ON expenses(fecha)');
    await turso.execute('CREATE INDEX IF NOT EXISTS idx_menu_promotions_activo ON menu_promotions(activo)');

    console.log('✅ Database initialized with GastroPro CRM tables');
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
app.get('/api/orders', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'REPARTIDOR'), async (req, res) => {
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

app.get('/api/orders/:id', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'REPARTIDOR'), async (req, res) => {
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
      sql: `INSERT INTO orders (id, orderNumber, customerName, address, items, total, status, createdAt, estimatedTime, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, sanitized.orderNumber, sanitized.customerName, sanitized.address, sanitized.items, sanitized.total, status, createdAt, sanitized.estimatedTime, sanitized.paymentMethod]
    });
    
    res.status(201).json({ id, orderNumber: sanitized.orderNumber, customerName: sanitized.customerName, address: sanitized.address, items: sanitized.items, total: sanitized.total, status, createdAt, estimatedTime: sanitized.estimatedTime, paymentMethod: sanitized.paymentMethod });
  } catch (e) {
    res.status(500).json({ error: 'Error creating order' });
  }
});

app.patch('/api/orders/:id/status', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'REPARTIDOR'), async (req, res) => {
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

app.put('/api/orders/:id', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { address, items, total, estimatedTime, paymentMethod } = req.body;

    const updates = [];
    const params = [];
    if (address !== undefined) { updates.push('address = ?'); params.push(String(address).slice(0, 200)); }
    if (items !== undefined) { updates.push('items = ?'); params.push(JSON.stringify(items).slice(0, 5000)); }
    if (total !== undefined) { updates.push('total = ?'); params.push(Math.max(0, Math.min(Number(total), 999999999))); }
    if (estimatedTime !== undefined) { updates.push('estimatedTime = ?'); params.push(Math.max(0, Math.min(Number(estimatedTime), 180))); }
    if (paymentMethod !== undefined) { updates.push('paymentMethod = ?'); params.push(String(paymentMethod).slice(0, 20)); }

    if (updates.length) {
      params.push(req.params.id);
      await turso.execute({ sql: `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, args: params });
    }

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

    const orderResult = await turso.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [orderId] });
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

    const orderResult = await turso.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [orderId] });
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

    const orderResult = await turso.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [orderId] });
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

    const orderResult = await turso.execute({ sql: 'SELECT * FROM orders WHERE id = ?', args: [orderId] });
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
    const result = await turso.execute('SELECT * FROM campaigns ORDER BY id');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching campaigns' });
  }
});

app.post('/api/campaigns', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { name, type, discount, status, budget } = req.body;
    const id = `camp_${Date.now()}`;
    
    await turso.execute({
      sql: `INSERT INTO campaigns (id, name, type, discount, status, reach, conversions, budget) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, String(name).slice(0, 100), String(type).slice(0, 20), Math.max(0, Math.min(Number(discount || 0), 100)), String(status || 'draft').slice(0, 20), 0, 0, Math.max(0, Math.min(Number(budget || 0), 999999999))]
    });
    
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
    if (name !== undefined) { updates.push('name = ?'); params.push(String(name).slice(0, 100)); }
    if (type !== undefined) { updates.push('type = ?'); params.push(String(type).slice(0, 20)); }
    if (discount !== undefined) { updates.push('discount = ?'); params.push(Math.max(0, Math.min(Number(discount), 100))); }
    if (status !== undefined) { updates.push('status = ?'); params.push(String(status).slice(0, 20)); }
    if (budget !== undefined) { updates.push('budget = ?'); params.push(Math.max(0, Math.min(Number(budget), 999999999))); }

    if (updates.length) {
      params.push(req.params.id);
      await turso.execute({ sql: `UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`, args: params });
    }

    const result = await turso.execute({
      sql: 'SELECT * FROM campaigns WHERE id = ?',
      args: [req.params.id]
    });

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

// ===================== GASTROPRO CRM API ROUTES =====================

// --- CLIENTS ---
app.get('/api/clients', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { estado, search } = req.query;
    let query = 'SELECT * FROM clients';
    const params = [];
    const conditions = [];
    if (estado && estado !== 'todos') { conditions.push('estado = ?'); params.push(estado); }
    if (search) { conditions.push("(nombre LIKE ? OR telefono LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY totalGastado DESC';
    const result = await turso.execute({ sql: query, args: params });
    res.json(result.rows.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]'), vip: !!r.vip })));
  } catch (e) { res.status(500).json({ error: 'Error fetching clients' }); }
});

app.get('/api/clients/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await turso.execute({ sql: 'SELECT * FROM clients WHERE id = ?', args: [req.params.id] });
    if (result.rows.length) {
      const client = { ...result.rows[0], tags: JSON.parse(result.rows[0].tags || '[]'), vip: !!result.rows[0].vip };
      res.json(client);
    } else res.status(404).json({ error: 'Client not found' });
  } catch (e) { res.status(500).json({ error: 'Error fetching client' }); }
});

app.post('/api/clients', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { nombre, telefono, email, direccion, notas, cumpleanos } = req.body;
    const id = `cli_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    await turso.execute({
      sql: `INSERT INTO clients (id, nombre, telefono, email, direccion, notas, cumpleanos, creado) VALUES (?,?,?,?,?,?,?, datetime('now'))`,
      args: [id, nombre?.slice(0,100), telefono?.slice(0,20), email?.slice(0,100), direccion?.slice(0,200), notas?.slice(0,500), cumpleanos]
    });
    res.status(201).json({ id, nombre, telefono, email, direccion, notas, cumpleanos });
  } catch (e) { res.status(500).json({ error: 'Error creating client' }); }
});

app.patch('/api/clients/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { vip, notas, tags, estado } = req.body;
    const updates = []; const params = [];
    if (vip !== undefined) { updates.push('vip = ?'); params.push(vip ? 1 : 0); }
    if (notas !== undefined) { updates.push('notas = ?'); params.push(notas); }
    if (tags !== undefined) { updates.push('tags = ?'); params.push(JSON.stringify(tags)); }
    if (estado !== undefined) { updates.push('estado = ?'); params.push(estado); }
    if (updates.length) {
      params.push(req.params.id);
      await turso.execute({ sql: `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`, args: params });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Error updating client' }); }
});

// --- INVENTORY ---
app.get('/api/inventory', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const result = await turso.execute('SELECT * FROM inventory_items ORDER BY nombre');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching inventory' }); }
});

app.post('/api/inventory', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { nombre, categoria, stockActual, stockMinimo, stockMaximo, unidad, costoUnitario, proveedor, lote, fechaVencimiento, ubicacion } = req.body;
    const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    await turso.execute({
      sql: `INSERT INTO inventory_items (id, nombre, categoria, stockActual, stockMinimo, stockMaximo, unidad, costoUnitario, proveedor, lote, fechaVencimiento, ubicacion) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [id, nombre, categoria, stockActual||0, stockMinimo||10, stockMaximo||100, unidad||'unidad', costoUnitario||0, proveedor, lote, fechaVencimiento, ubicacion]
    });
    res.status(201).json({ id, nombre });
  } catch (e) { res.status(500).json({ error: 'Error creating inventory item' }); }
});

app.post('/api/inventory/movement', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { itemId, tipo, cantidad, motivo, referencia, usuario } = req.body;
    const item = await turso.execute({ sql: 'SELECT * FROM inventory_items WHERE id = ?', args: [itemId] });
    if (!item.rows.length) return res.status(404).json({ error: 'Item not found' });
    const saldoAnterior = item.rows[0].stockActual;
    const saldoNuevo = tipo === 'entrada' ? saldoAnterior + cantidad : saldoAnterior - cantidad;
    const movId = `mov_${Date.now()}`;
    await turso.execute({
      sql: `INSERT INTO inventory_movements (id, itemId, tipo, cantidad, saldoAnterior, saldoNuevo, motivo, referencia, usuario) VALUES (?,?,?,?,?,?,?,?,?)`,
      args: [movId, itemId, tipo, cantidad, saldoAnterior, saldoNuevo, motivo, referencia, usuario||'sistema']
    });
    await turso.execute({ sql: 'UPDATE inventory_items SET stockActual = ? WHERE id = ?', args: [saldoNuevo, itemId] });
    res.status(201).json({ id: movId, saldoNuevo });
  } catch (e) { res.status(500).json({ error: 'Error registering movement' }); }
});

app.get('/api/inventory/movements', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const result = await turso.execute('SELECT * FROM inventory_movements ORDER BY creado DESC LIMIT 50');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching movements' }); }
});

// --- RECIPES ---
app.get('/api/recipes', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const recipes = await turso.execute('SELECT * FROM recipes');
    const allIngredients = await turso.execute('SELECT * FROM recipe_ingredients');
    const byRecipeId = new Map();
    for (const ingredient of allIngredients.rows) {
      if (!byRecipeId.has(ingredient.recipeId)) byRecipeId.set(ingredient.recipeId, []);
      byRecipeId.get(ingredient.recipeId).push(ingredient);
    }
    const result = recipes.rows.map(recipe => ({ ...recipe, ingredientes: byRecipeId.get(recipe.id) || [] }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: 'Error fetching recipes' }); }
});

// --- EXPENSES ---
app.get('/api/expenses', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let query = 'SELECT * FROM expenses';
    const params = [];
    if (desde && hasta) { query += ' WHERE fecha >= ? AND fecha <= ?'; params.push(desde, hasta); }
    query += ' ORDER BY fecha DESC LIMIT 100';
    const result = await turso.execute({ sql: query, args: params });
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching expenses' }); }
});

app.post('/api/expenses', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { categoria, descripcion, monto, fecha, metodo, proveedor, factura, notas, recurrente } = req.body;
    const id = `exp_${Date.now()}`;
    await turso.execute({
      sql: `INSERT INTO expenses (id, categoria, descripcion, monto, fecha, metodo, proveedor, factura, notas, recurrente) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args: [id, categoria, descripcion?.slice(0,200), monto, fecha||new Date().toISOString(), metodo, proveedor, factura, notas, recurrente?1:0]
    });
    res.status(201).json({ id });
  } catch (e) { res.status(500).json({ error: 'Error creating expense' }); }
});

// --- LOYALTY ---
app.get('/api/loyalty/rewards', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await turso.execute('SELECT * FROM loyalty_rewards WHERE vigente = 1');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching rewards' }); }
});

app.post('/api/loyalty/points', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { clientId, puntos, concepto, referencia } = req.body;
    const id = `lpt_${Date.now()}`;
    await turso.execute({
      sql: `INSERT INTO loyalty_points (id, clientId, puntos, concepto, referencia) VALUES (?,?,?,?,?)`,
      args: [id, clientId, puntos, concepto, referencia]
    });
    await turso.execute({ sql: `UPDATE clients SET puntos = puntos + ? WHERE id = ?`, args: [puntos, clientId] });
    res.status(201).json({ id });
  } catch (e) { res.status(500).json({ error: 'Error adding points' }); }
});

// --- MENU VARIANTS ---
app.get('/api/menu/variants', async (req, res) => {
  try {
    const result = await turso.execute('SELECT * FROM menu_variants WHERE activo = 1');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching variants' }); }
});

app.get('/api/menu/combos', async (req, res) => {
  try {
    const result = await turso.execute('SELECT * FROM menu_combos WHERE activo = 1');
    res.json(result.rows.map(r => ({ ...r, productos: JSON.parse(r.productos || '[]') })));
  } catch (e) { res.status(500).json({ error: 'Error fetching combos' }); }
});

app.get('/api/menu/promotions', async (req, res) => {
  try {
    const result = await turso.execute('SELECT * FROM menu_promotions ORDER BY activo DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching promotions' }); }
});

// --- FINANCE REPORTS ---
app.get('/api/finance/summary', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const ingresos = await turso.execute("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE status != 'CANCELLED'");
    const egresos = await turso.execute("SELECT COALESCE(SUM(monto),0) as total FROM expenses");
    const ordenes = await turso.execute('SELECT COUNT(*) as count FROM orders');
    const clientes = await turso.execute('SELECT COUNT(*) as count FROM clients');
    const gastosCat = await turso.execute('SELECT categoria, COALESCE(SUM(monto),0) as total FROM expenses GROUP BY categoria');
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
    const result = await turso.execute({
      sql: "SELECT * FROM orders WHERE customerName = (SELECT nombre FROM clients WHERE id = ?) ORDER BY createdAt DESC LIMIT 20",
      args: [req.params.id]
    });
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