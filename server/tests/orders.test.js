// Tests de integración para POST /api/orders -- confirma que el total real
// cobrado (persistido en orders.total y devuelto en la respuesta) se
// recalcula server-side desde el catálogo real y nunca se toma verbatim del
// cliente. Ver docs/AUDIT_2026-07-30.md item #2 y server/services/orderPricing.js.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

// ── Mocks con vi.hoisted para evitar ReferenceError (se hoistean al tope) ──
const { mockClientQuery, mockConnect, mockPoolQuery } = vi.hoisted(() => {
  const mockClientQuery = vi.fn();
  return {
    mockClientQuery,
    mockConnect: vi.fn(async () => ({ query: mockClientQuery, release: vi.fn() })),
    mockPoolQuery: vi.fn(),
  };
});

vi.mock('../db.js', () => ({
  pool: { query: mockPoolQuery, connect: mockConnect },
}));

vi.mock('../auth.js', () => ({
  authMiddleware: (req, res, next) => next(),
  requireRole:
    (..._roles) =>
    (req, res, next) =>
      next(),
}));

vi.mock('../websocket.js', () => ({
  notifyNewOrder: vi.fn(),
  notifyOrderUpdate: vi.fn(),
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

// ── Importar rutas después de los mocks ─────────────────────────────
import ordersRoutes from '../routes/orders.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', ordersRoutes);
  return app;
}

// Responde según la query que dispara computeVerifiedTotal (products,
// pizza_sizes) y el resto del flujo del INSERT (BEGIN/COMMIT/clients/INSERT).
function wireClientQuery({ products = [], sizes = [] } = {}) {
  mockClientQuery.mockImplementation(async (sql) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
    if (typeof sql === 'string' && sql.includes('FROM products')) return { rows: products };
    if (typeof sql === 'string' && sql.includes('FROM pizza_sizes')) return { rows: sizes };
    if (typeof sql === 'string' && sql.includes('FROM clients')) return { rows: [] };
    if (typeof sql === 'string' && sql.includes('INSERT INTO orders')) return { rows: [] };
    throw new Error(`Unexpected client query in test: ${sql}`);
  });
}

const baseOrder = {
  orderNumber: 'GUIDO-1',
  customerName: 'Juan Pérez',
  address: 'Calle 1 # 2-3',
  estimatedTime: 30,
  paymentMethod: 'bold',
};

describe('POST /api/orders -- server-side price recomputation', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockImplementation(async () => ({ query: mockClientQuery, release: vi.fn() }));
    app = createApp();
  });

  it('ignores a tampered client total and persists the catalog-derived total instead', async () => {
    wireClientQuery({ products: [{ id: 'p1', basePrice: 30000 }] });

    const res = await supertest(app)
      .post('/api/orders')
      .send({
        ...baseOrder,
        items: [{ id: 'x', productId: 'p1', name: 'Pizza', quantity: 2, price: 1 }],
        total: 1, // intento de pagar $1 por 2 productos de $30.000
      });

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(60000);

    const insertCall = mockClientQuery.mock.calls.find(([sql]) => sql.includes('INSERT INTO orders'));
    expect(insertCall[1]).toContain(60000); // el total persistido es el recalculado, no el $1 del cliente
    expect(insertCall[1]).not.toContain(1);
  });

  it('rejects the order with 400 when an item references a nonexistent product id', async () => {
    wireClientQuery({ products: [] }); // catálogo vacío -- p1 no existe

    const res = await supertest(app)
      .post('/api/orders')
      .send({
        ...baseOrder,
        items: [{ id: 'x', productId: 'p1', name: 'Fantasma', quantity: 1, price: 30000 }],
        total: 30000,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inválido/i);

    // No debe haber intentado el INSERT si la validación de precio falló
    expect(mockClientQuery.mock.calls.some(([sql]) => sql.includes('INSERT INTO orders'))).toBe(false);
  });

  it('uses the pizza size absolute price (not the product basePrice) when items[].size matches a known size', async () => {
    wireClientQuery({
      products: [{ id: 'p1', basePrice: 20000 }],
      sizes: [{ id: 'familiar', nombre: 'Familiar', precio: 55000 }],
    });

    const res = await supertest(app)
      .post('/api/orders')
      .send({
        ...baseOrder,
        items: [{ id: 'x', productId: 'p1', name: 'Pizza', size: 'Familiar', quantity: 1, price: 1 }],
        total: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(55000);
  });
});
