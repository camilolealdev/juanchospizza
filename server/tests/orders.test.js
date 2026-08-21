// Tests de integración para server/routes/orders.js — el flujo que mueve dinero.
// Cubre:
//   1. GET /api/orders (listado con filtros status/paidOnly/locationId, LIMIT 2000)
//   2. GET /api/orders/track/:orderNumber (público, verificación por teléfono, SIN PII)
//   3. GET /api/orders/:id (detalle auth)
//   4. POST /api/orders (checkout público): validación Zod real, transacción con
//      BEGIN/COMMIT/ROLLBACK, recálculo de total desde el catálogo real
//      (anti-tampering: el total del cliente nunca se persiste), clientId resuelto
//      server-side por teléfono, idempotencia por orderNumber (23505 → 200)
//   5. PATCH /api/orders/:id/status: agregados de gasto del cliente en COMPLETED,
//      push en READY/COMPLETED, 404, validación
//   6. PUT /api/orders/:id: columnas dinámicas (no sobrescribe con NULL lo no enviado)
//
// Patrón igual a server/tests/payments.test.js: mocks con vi.hoisted, Zod real
// (no se mockea ../middleware/validate.js), supertest + express.
//
// Ejecutar: npx vitest run server/tests/orders.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

// ── Mocks con vi.hoisted para evitar ReferenceError ────────────
const { mockQuery, mockConnect, mockClientQuery } = vi.hoisted(() => {
  const mockClientQuery = vi.fn();
  return { mockQuery: vi.fn(), mockConnect: vi.fn(), mockClientQuery };
});

vi.mock('../db.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect,
  },
}));

const mockAuth = { role: 'ADMIN', locationId: null };

vi.mock('../auth.js', () => ({
  authMiddleware: (req, res, next) => {
    req.auth = mockAuth;
    next();
  },
  requireRole:
    (..._roles) =>
    (req, res, next) =>
      next(),
  requireSameLocation: () => (_req, _res, next) => next(),
}));

vi.mock('../push.js', () => ({
  sendPushToPhone: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/email.js', () => ({
  sendTemplatedEmail: vi.fn().mockResolvedValue(undefined),
  templates: { orderConfirmation: 'orderConfirmation', orderReady: 'orderReady' },
}));

vi.mock('../services/webhooks.js', () => ({
  deliverWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../websocket.js', () => ({
  notifyNewOrder: vi.fn(),
  notifyOrderUpdate: vi.fn(),
}));

// ── Importar rutas y mocks después de vi.mock ──────────────────
import ordersRoutes from '../routes/orders.js';
import { sendPushToPhone } from '../push.js';
import { sendTemplatedEmail } from '../services/email.js';
import { deliverWebhook } from '../services/webhooks.js';

// ── Fixtures del catálogo (lo que devuelve computeVerifiedTotal) ─
// categoryId:'pizzas' es necesario para que el test de la línea ~384 (size
// Familiar -> precio de pizza_sizes) siga siendo válido tras el fix del
// crítico #1: orderPricing.js ahora solo aplica precio-por-talla a
// productos que son sabores de pizza reales (hasRealSizes), no a cualquier
// producto cuyo `size` matchee por casualidad el nombre de una fila de
// pizza_sizes.
const CATALOG_PRODUCT = { id: 'pizza-margherita', basePrice: 45000, categoryId: 'pizzas' };
const SIZE_FAMILIAR = { id: 'fam', nombre: 'Familiar', precio: 88000 };

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', ordersRoutes);
  return app;
}

function mockOrder(overrides = {}) {
  return {
    id: 'ord_1',
    orderNumber: 'ORD-1',
    customerName: 'Pepe',
    customerPhone: '3001234567',
    address: 'Calle 1 #2-3',
    items: [],
    total: 100000,
    status: 'PENDING',
    createdAt: '2026-08-04T00:00:00.000Z',
    estimatedTime: 30,
    paymentMethod: 'cash',
    clientId: null,
    paymentStatus: 'paid',
    locationId: 'nemocon',
    ...overrides,
  };
}

function validOrderBody(overrides = {}) {
  return {
    orderNumber: 'ORD-9000',
    customerName: 'Pepe',
    customerPhone: '3001234567',
    address: 'Calle 1 #2-3',
    items: [{ productId: 'pizza-margherita', quantity: 2, price: 1 }],
    total: 1, // el cliente puede mandar lo que quiera; la ruta recalcula
    estimatedTime: 30,
    paymentMethod: 'cash',
    locationId: 'nemocon',
    ...overrides,
  };
}

beforeEach(() => {
  // Limpia calls de TODOS los mocks (push/email/webhook/ws acumulaban entre
  // tests porque solo se reseteban los de pool).
  vi.clearAllMocks();
  mockQuery.mockReset();
  // Default: SELECT vacío (rutas GET de notificación/lectura y ramas no
  // testeadas devuelven "no encontrado" sin crashear).
  mockQuery.mockResolvedValue({ rows: [] });

  mockConnect.mockReset();
  mockClientQuery.mockReset();
  // Dispatch por SQL para el cliente transaccional (BEGIN/products/sizes/
  // clients/INSERT/COMMIT/ROLLBACK). El orden no importa porque
  // computeVerifiedTotal dispara products y sizes con Promise.all.
  mockClientQuery.mockImplementation((sql) => {
    const s = String(sql);
    if (s.includes('FROM products')) return Promise.resolve({ rows: [CATALOG_PRODUCT] });
    if (s.includes('FROM pizza_sizes')) return Promise.resolve({ rows: [SIZE_FAMILIAR] });
    if (s.includes('FROM clients WHERE telefono')) return Promise.resolve({ rows: [{ id: 'cli_1' }] });
    return Promise.resolve({});
  });
  mockConnect.mockResolvedValue({ query: mockClientQuery, release: vi.fn() });

  vi.stubEnv('ORDER_WEBHOOK_URL', '');
  vi.stubEnv('WEBHOOK_URL', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ── GET /api/orders ────────────────────────────────────────────
describe('GET /api/orders', () => {
  it('lista órdenes sin filtros con tope de 2000', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [mockOrder(), mockOrder({ id: 'ord_2' })] });

    const res = await supertest(app).get('/api/orders');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY "createdAt" DESC LIMIT 2000');
  });

  it('aplica filtros status, locationId y paidOnly', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [mockOrder()] });

    const res = await supertest(app).get('/api/orders?status=CONFIRMED&paidOnly=true&locationId=nemocon');

    expect(res.status).toBe(200);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('status = $1');
    expect(sql).toContain('"locationId" = $2');
    expect(sql).toContain(`"paymentStatus" = 'paid' OR "paymentMethod" IN ('cash', 'card', 'whatsapp')`);
    expect(params).toEqual(['CONFIRMED', 'nemocon']);
  });

  it('ignora el filtro de status cuando llega "all"', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await supertest(app).get('/api/orders?status=all');

    expect(mockQuery.mock.calls[0][0]).not.toContain('status = $1');
  });

  it('paginación real: page/pageSize devuelve { data, total, page, pageSize, totalPages }', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 7 }] }) // COUNT(*)
      .mockResolvedValueOnce({ rows: [mockOrder(), mockOrder({ id: 'ord_2' })] }); // SELECT paginado

    const res = await supertest(app).get('/api/orders?page=2&pageSize=2');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [expect.objectContaining({ id: 'ord_1' }), expect.objectContaining({ id: 'ord_2' })],
      total: 7,
      page: 2,
      pageSize: 2,
      totalPages: 4,
    });
    expect(mockQuery.mock.calls[0][0]).toContain('COUNT(*)');
    const [sql, sqlParams] = mockQuery.mock.calls[1];
    expect(sql).toContain('LIMIT $1 OFFSET $2');
    expect(sql).toContain('ORDER BY "createdAt" DESC');
    expect(sqlParams).toEqual([2, 2]); // offset (2-1)*2 = 2
  });

  it('paginación real combina filtros status/locationId/paidOnly', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 3 }] }).mockResolvedValueOnce({ rows: [mockOrder()] });

    const res = await supertest(app).get(
      '/api/orders?status=CONFIRMED&paidOnly=true&locationId=nemocon&page=1&pageSize=10'
    );

    expect(res.status).toBe(200);
    expect(res.body.totalPages).toBe(1);
    const countSql = mockQuery.mock.calls[0][0];
    expect(countSql).toContain('COUNT(*)');
    expect(countSql).toContain('status = $1');
    expect(countSql).toContain('"locationId" = $2');
    expect(countSql).toContain(`"paymentStatus" = 'paid' OR "paymentMethod" IN ('cash', 'card', 'whatsapp')`);
    // COUNT usa los 3 filtros; el SELECT agrega LIMIT/OFFSET en $4/$5
    const [, sqlParams] = mockQuery.mock.calls[1];
    expect(sqlParams).toEqual(['CONFIRMED', 'nemocon', 10, 0]);
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/orders');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error fetching orders' });
  });
});

// ── GET /api/orders/track/:orderNumber ─────────────────────────
describe('GET /api/orders/track/:orderNumber', () => {
  it('requiere el teléfono (verificación mínima)', async () => {
    const app = createApp();

    const res = await supertest(app).get('/api/orders/track/ORD-1');

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('devuelve el pedido sin PII sensible (nada de address/total/items)', async () => {
    const app = createApp();
    // Solo las columnas que proyecta el SQL de la ruta (la proyección es la
    // que protege la PII: el handler devuelve rows[0] tal cual).
    const tracked = {
      id: 'ord_1',
      orderNumber: 'ORD-1',
      status: 'PENDING',
      createdAt: '2026-08-04T00:00:00.000Z',
      estimatedTime: 30,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
    };
    mockQuery.mockResolvedValueOnce({ rows: [tracked] });

    const res = await supertest(app).get('/api/orders/track/ORD-1?phone=3001234567');

    expect(res.status).toBe(200);
    const sql = mockQuery.mock.calls[0][0];
    // La protección de PII es la proyección SQL: si una regresión agrega
    // address/total/items al SELECT, esto debe fallar (la ruta devuelve
    // rows[0] verbatim).
    expect(sql).toContain('SELECT id, "orderNumber", status');
    expect(sql).not.toContain('address');
    expect(sql).not.toContain('total');
    expect(sql).not.toContain('items');
    expect(mockQuery.mock.calls[0][1]).toEqual(['ORD-1', '3001234567']);
    expect(res.body.id).toBe('ord_1');
    expect(res.body.address).toBeUndefined();
    expect(res.body.total).toBeUndefined();
  });

  it('404 si no hay coincidencia teléfono + orderNumber', async () => {
    const app = createApp();

    const res = await supertest(app).get('/api/orders/track/ORD-1?phone=999');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Pedido no encontrado' });
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/orders/track/ORD-1?phone=3001234567');

    expect(res.status).toBe(500);
  });
});

// ── GET /api/orders/:id ────────────────────────────────────────
describe('GET /api/orders/:id', () => {
  it('devuelve la orden por id', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [mockOrder()] });

    const res = await supertest(app).get('/api/orders/ord_1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('ord_1');
  });

  it('404 si la orden no existe', async () => {
    const app = createApp();

    const res = await supertest(app).get('/api/orders/ord_zzz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Order not found' });
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/orders/ord_1');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error fetching order' });
  });
});

// ── POST /api/orders ───────────────────────────────────────────
describe('POST /api/orders (checkout público)', () => {
  it('rechaza con 400 un body sin los campos requeridos (Zod real)', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/orders').send({ orderNumber: 'ORD-1' });

    expect(res.status).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('rechaza con 400 un total negativo', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/orders')
      .send(validOrderBody({ total: -1 }));

    expect(res.status).toBe(400);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('crea la orden en efectivo: recálcula el total del catálogo y marca paid', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/orders').send(validOrderBody());

    expect(res.status).toBe(201);
    // El cliente mandó total: 1 pero el catálogo dice 45000 x 2 = 90000
    expect(res.body.total).toBe(90000);
    expect(res.body.paymentStatus).toBe('paid');
    expect(res.body.clientId).toBe('cli_1');

    // Verificar los params del INSERT: [id, orderNumber, customerName,
    // customerPhone, address, items, total, status, createdAt, estimatedTime,
    // paymentMethod, clientId, paymentStatus, locationId]
    const insertCall = mockClientQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO orders'));
    expect(insertCall).toBeDefined();
    const p = insertCall[1];
    expect(p[2]).toBe('Pepe');
    expect(p[6]).toBe(90000); // total verificado, no el del cliente (anti-tampering)
    expect(p[7]).toBe('PENDING');
    expect(p[10]).toBe('cash');
    expect(p[11]).toBe('cli_1'); // clientId resuelto server-side por teléfono
    expect(p[12]).toBe('paid'); // efectivo se cobra contra-entrega → pagado
    expect(p[13]).toBe('nemocon');

    // Transacción completa
    expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
    expect(mockClientQuery.mock.calls.some(([sql]) => String(sql).includes('ROLLBACK'))).toBe(false);
  });

  it('marca paymentStatus pending para métodos online (espera webhook del proveedor)', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/orders')
      .send(validOrderBody({ paymentMethod: 'bold' }));

    expect(res.status).toBe(201);
    expect(res.body.paymentStatus).toBe('pending');
    const insertCall = mockClientQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO orders'));
    expect(insertCall[1][12]).toBe('pending');
  });

  it('envía email de confirmación (orderConfirmation) cuando el cliente tiene email', async () => {
    const app = createApp();
    // El lookup de notifyOrderConfirmation encuentra un cliente con email
    mockQuery.mockResolvedValueOnce({ rows: [{ email: 'pepe@test.com', nombre: 'Pepe' }] });

    const res = await supertest(app).post('/api/orders').send(validOrderBody());

    expect(res.status).toBe(201);
    await vi.waitFor(() => expect(sendTemplatedEmail).toHaveBeenCalled());
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'pepe@test.com',
        template: 'orderConfirmation',
        subject: 'Pedido #ORD-9000 confirmado 🍕',
      })
    );
  });

  it('no persiste el total manipulado del cliente (tampering: total 1 → catálogo 90000)', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/orders')
      .send(validOrderBody({ total: 1 }));

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(90000);
    const insertCall = mockClientQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO orders'));
    expect(insertCall[1][6]).toBe(90000);
  });

  it('usa el precio absoluto del tamaño de pizza cuando el ítem trae size', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/orders')
      .send(validOrderBody({ items: [{ productId: 'pizza-margherita', size: 'Familiar', quantity: 1, price: 1 }] }));

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(88000); // pizza_sizes.precio Familiar
  });

  it('no resuelve clientId cuando el checkout no trae teléfono', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/orders')
      .send(validOrderBody({ customerPhone: undefined }));

    expect(res.status).toBe(201);
    expect(res.body.clientId).toBeNull();
    const insertCall = mockClientQuery.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO orders'));
    expect(insertCall[1][11]).toBeNull();
  });

  it('400 + ROLLBACK cuando el producto no existe en el catálogo', async () => {
    const app = createApp();
    // Producto desconocido → products devuelve vacío → OrderPricingError
    mockClientQuery.mockImplementation((sql) => {
      const s = String(sql);
      if (s.includes('FROM products')) return Promise.resolve({ rows: [] });
      if (s.includes('FROM pizza_sizes')) return Promise.resolve({ rows: [SIZE_FAMILIAR] });
      return Promise.resolve({});
    });

    const res = await supertest(app)
      .post('/api/orders')
      .send(validOrderBody({ items: [{ productId: 'producto-inexistente', quantity: 1, price: 9999 }] }));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Producto inválido');
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClientQuery.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO orders'))).toBe(false);
  });

  it('400 + ROLLBACK cuando la cantidad excede el máximo (501)', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/orders')
      .send(validOrderBody({ items: [{ productId: 'pizza-margherita', quantity: 501, price: 1 }] }));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Cantidad inválida');
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
  });

  it('idempotencia: devuelve 200 con la orden ya creada ante conflicto 23505', async () => {
    const app = createApp();
    const existing = mockOrder({ orderNumber: 'ORD-9000' });
    mockConnect.mockRejectedValueOnce({ code: '23505' });
    mockQuery.mockResolvedValueOnce({ rows: [existing] });

    const res = await supertest(app).post('/api/orders').send(validOrderBody());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('ord_1');
    // El SELECT de idempotencia usa el orderNumber del body validado
    expect(mockQuery.mock.calls[0][1]).toEqual(['ORD-9000']);
  });

  it('dispara el webhook order.created cuando ORDER_WEBHOOK_URL está configurado', async () => {
    vi.stubEnv('ORDER_WEBHOOK_URL', 'https://hook.test/orders');
    const app = createApp();

    const res = await supertest(app).post('/api/orders').send(validOrderBody());

    expect(res.status).toBe(201);
    expect(deliverWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://hook.test/orders',
        retries: 2,
        payload: expect.objectContaining({ event: 'order.created' }),
      })
    );
  });
});

// ── PATCH /api/orders/:id/status ───────────────────────────────
describe('PATCH /api/orders/:id/status', () => {
  it('rechaza con 400 un status fuera del enum', async () => {
    const app = createApp();

    const res = await supertest(app).patch('/api/orders/ord_1/status').send({ status: 'BOGUS' });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('actualiza el status y devuelve la orden', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [mockOrder()] });

    const res = await supertest(app).patch('/api/orders/ord_1/status').send({ status: 'CONFIRMED' });

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE orders SET status = $1 WHERE id = $2');
    expect(mockQuery.mock.calls[0][1]).toEqual(['CONFIRMED', 'ord_1']);
    // CONFIRMED no mapea a push ni email de notificación
    expect(sendPushToPhone).not.toHaveBeenCalled();
  });

  it('404 si la orden no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).patch('/api/orders/ord_zzz/status').send({ status: 'READY' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Order not found' });
  });

  it('COMPLETED con clientId actualiza los agregados de gasto del cliente', async () => {
    const app = createApp();
    const order = mockOrder({ clientId: 'cli_1', total: 45000 });
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE orders
      .mockResolvedValueOnce({ rows: [order] }) // SELECT order
      .mockResolvedValueOnce({
        // SELECT * FROM clients (updateClientSpendAggregate)
        rows: [{ id: 'cli_1', totalCompras: 2, totalGastado: 50000, creado: '2026-01-01T00:00:00.000Z' }],
      })
      .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE clients
      .mockResolvedValueOnce({ rows: [{ email: null }] }); // notifyOrderStatusChange SELECT email

    const res = await supertest(app).patch('/api/orders/ord_1/status').send({ status: 'COMPLETED' });

    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(mockQuery).toHaveBeenCalledTimes(5));

    const updateClients = mockQuery.mock.calls.find(([sql]) => String(sql).includes('UPDATE clients SET'));
    expect(updateClients).toBeDefined();
    const p = updateClients[1];
    // params: [totalCompras, totalGastado, frecuenciaCompra, nivel, clientId]
    expect(p[0]).toBe(3); // totalCompras = 2 + 1
    expect(p[1]).toBe(95000); // totalGastado = 50000 + 45000
    expect(p[3]).toBe('bronce'); // computeNivel(95000) < 100000
    // COMPLETED mapea a push
    expect(sendPushToPhone).toHaveBeenCalledTimes(1);
  });

  it('COMPLETED sin clientId no toca agregados del cliente', async () => {
    const app = createApp();
    const order = mockOrder({ clientId: null });
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [order] });

    const res = await supertest(app).patch('/api/orders/ord_1/status').send({ status: 'COMPLETED' });

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE clients SET'))).toBe(false);
    // COMPLETED igual dispara push al teléfono del pedido
    expect(sendPushToPhone).toHaveBeenCalledTimes(1);
  });

  it('READY envía push al teléfono y email de orden lista cuando hay email', async () => {
    const app = createApp();
    const order = mockOrder({ clientId: 'cli_1' });
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [order] })
      .mockResolvedValueOnce({ rows: [{ email: 'cliente@test.com' }] }); // notify SELECT email

    const res = await supertest(app).patch('/api/orders/ord_1/status').send({ status: 'READY' });

    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(mockQuery).toHaveBeenCalledTimes(3));

    expect(sendPushToPhone).toHaveBeenCalledWith(
      expect.anything(),
      '3001234567',
      expect.objectContaining({ title: 'Pedido ORD-1', body: 'Tu pedido está listo' })
    );
    // READY + email → template orderReady
    expect(sendTemplatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'cliente@test.com', template: 'orderReady' })
    );
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).patch('/api/orders/ord_1/status').send({ status: 'READY' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error updating order' });
  });
});

// ── PUT /api/orders/:id ────────────────────────────────────────
describe('PUT /api/orders/:id', () => {
  it('rechaza con 400 un address que excede los 200 chars (Zod real)', async () => {
    const app = createApp();

    const res = await supertest(app)
      .put('/api/orders/ord_1')
      .send({ address: 'x'.repeat(201) });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('ignora el total enviado por el cliente (anti-tampering: no escribe total)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [mockOrder()] });

    // updateOrderSchema ya no declara `total` (zod strip) — el handler no
    // puede persistirlo. El pedido original con total 100000 queda intacto.
    const res = await supertest(app).put('/api/orders/ord_1').send({ total: 1 });

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE orders SET total'))).toBe(false);
    expect(res.body.total).toBe(100000);
  });

  it('recalcula el total desde el catálogo cuando cambian los items (anti-tampering)', async () => {
    const app = createApp();
    // mockClientQuery ya responde el catálogo (products/pizza_sizes) en
    // beforeEach; el SELECT final de la ruta devuelve la orden actualizada.
    mockQuery.mockResolvedValueOnce({ rows: [mockOrder({ total: 90000 })] });

    const res = await supertest(app)
      .put('/api/orders/ord_1')
      .send({ items: [{ productId: 'pizza-margherita', quantity: 2, price: 1 }], total: 1 });

    expect(res.status).toBe(200);
    // Transacción con BEGIN…COMMIT y UPDATE con items + total recalculado
    expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
    const updateCall = mockClientQuery.mock.calls.find(([sql]) => String(sql).includes('UPDATE orders SET'));
    expect(updateCall).toBeDefined();
    const sql = String(updateCall[0]);
    expect(sql).toContain('items = $1');
    expect(sql).toContain('total = $2');
    // El total recalculado es 45000 x 2 = 90000, NO el 1 del cliente
    expect(updateCall[1]).toEqual([
      JSON.stringify([{ productId: 'pizza-margherita', quantity: 2, price: 1 }]),
      90000,
      'ord_1',
    ]);
    expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
  });

  it('400 + ROLLBACK cuando un item editado no existe en el catálogo', async () => {
    const app = createApp();
    mockClientQuery.mockImplementation((sql) => {
      const s = String(sql);
      if (s.includes('FROM products')) return Promise.resolve({ rows: [] });
      if (s.includes('FROM pizza_sizes')) return Promise.resolve({ rows: [SIZE_FAMILIAR] });
      return Promise.resolve({});
    });

    const res = await supertest(app)
      .put('/api/orders/ord_1')
      .send({ items: [{ productId: 'producto-inexistente', quantity: 1, price: 9999 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Producto inválido');
    expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClientQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE orders SET'))).toBe(false);
  });

  it('actualiza solo las columnas enviadas (no sobrescribe con NULL)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [mockOrder()] });

    const res = await supertest(app).put('/api/orders/ord_1').send({ address: 'Calle nueva 9' });

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toBe('UPDATE orders SET address = $1 WHERE id = $2');
    expect(mockQuery.mock.calls[0][1]).toEqual(['Calle nueva 9', 'ord_1']);
    // Solo 1 UPDATE + 1 SELECT: nada de address/items/total extra
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('con body vacío no emite UPDATE (solo devuelve la orden actual)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [mockOrder()] });

    const res = await supertest(app).put('/api/orders/ord_1').send({});

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE orders'))).toBe(false);
  });

  it('404 si la orden no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).put('/api/orders/ord_zzz').send({ address: 'X' });

    expect(res.status).toBe(404);
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).put('/api/orders/ord_1').send({ address: 'X' });

    expect(res.status).toBe(500);
  });
});
