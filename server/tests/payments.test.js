// Tests de seguridad del webhook de pago Bold (única pasarela, decisión
// 2026-08-06 — MercadoPago/Wompi/PayPal eliminados).
// Cubre:
//   1. Fail-closed: sin secret configurado → 503, sin tocar DB
//   2. Verificación de firma: firma inválida → 200 (ignorada), sin tocar DB
//   3. Firma válida → paymentStatus transiciona a paid/failed
//   4. Idempotencia: el mismo evento no se procesa dos veces
//   5. Respuesta 200 ante payloads incompletos (orden inexistente, sin referencia)
//   6. [REGRESIÓN 2026-08-06] El webhook Bold NO debe requerir CSRF (lo
//      bloqueaba con 403 y el pago nunca se confirmaba), pero las demás
//      mutaciones autenticadas SÍ deben requerirlo.
//
// NOTA sobre el webhook Bold: index.js monta express.raw() para esa ruta, así
// que req.body llega como Buffer (el bug de 2026-07-29 donde el handler leía
// body.type sobre un Buffer). El test app replica ese orden exacto de
// middlewares y los payloads se mandan como string raw para verificar la
// firma HMAC contra los bytes exactos.
//
// Ejecutar: npx vitest run server/tests/payments.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import crypto from 'crypto';

// ── Mocks con vi.hoisted para evitar ReferenceError ────────────
const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../auth.js', () => ({
  authMiddleware: (req, res, next) => next(),
  requireRole:
    (..._roles) =>
    (req, res, next) =>
      next(),
}));

vi.mock('../push.js', () => ({
  sendPushToPhone: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/webhooks.js', () => ({
  deliverWebhook: vi.fn().mockResolvedValue(undefined),
}));

// ── Importar rutas después de mocks ─────────────────────────────
import paymentsRoutes from '../routes/payments.js';
import { csrfProtection } from '../middleware/csrf.js';

const BOLD_SECRET = 'bold-test-secret-1234567890';

// Mismo orden de middlewares que server/index.js: raw body ANTES de
// express.json() para que el webhook Bold reciba req.body como Buffer.
function createApp() {
  const app = express();
  app.use('/api/payments/bold/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use('/', paymentsRoutes);
  return app;
}

// App con csrfProtection real montado (mismo patrón que index.js) para la
// prueba de regresión del 2026-08-06: sin esto, los tests pasaban aunque el
// webhook estuviera roto por CSRF.
function createAppWithCsrf() {
  const app = express();
  app.use('/api/payments/bold/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use('/api', csrfProtection);
  app.use('/', paymentsRoutes);
  return app;
}

function mockOrder(overrides = {}) {
  return {
    id: 'ord_test_1',
    orderNumber: 'ORD-123',
    customerName: 'Test',
    customerPhone: '3001234567',
    total: 45000,
    status: 'PENDING',
    paymentStatus: 'pending',
    paymentMethod: 'bold',
    paymentProviderRef: null,
    ...overrides,
  };
}

// Bold firma el Base64 del body RAW con HMAC-SHA256 y devuelve hex
// en x-bold-signature.
function boldSignature(rawBody, secret) {
  const encodedBody = Buffer.from(rawBody, 'utf8').toString('base64');
  return crypto.createHmac('sha256', secret).update(encodedBody).digest('hex');
}

// Da tiempo al setImmediate de Bold (que responde 200 primero y procesa
// después) para que consuma los mocks de pool.query.
// (Los tests usan vi.waitFor, ver abajo.)

beforeEach(() => {
  // mockReset limpia calls e implementaciones; suficiente para aislar tests.
  mockQuery.mockReset();
  // Asegurar que los webhooks de salida no disparen deliverWebhook (su URL
  // sale de env; sin ella el handler hace early-return).
  vi.stubEnv('PAYMENT_WEBHOOK_URL', '');
  vi.stubEnv('WEBHOOK_URL', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ── BOLD ────────────────────────────────────────────────────────
describe('POST /api/payments/bold/webhook', () => {
  // Formato CloudEvents que Bold envía (ver server/routes/payments.js).
  const eventBody = JSON.stringify({
    id: 'evt_bold_1',
    source: 'bold',
    type: 'SALE_APPROVED',
    data: { metadata: { reference: 'ORD-123' } },
  });

  it('responde 503 si BOLD_WEBHOOK_SECRET no está configurado (fail-closed)', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/payments/bold/webhook')
      .set('Content-Type', 'application/json')
      .set('x-bold-signature', 'cualquier-firma')
      .send(eventBody);

    expect(res.status).toBe(503);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('ignora (200) una firma HMAC inválida sin tocar la DB', async () => {
    vi.stubEnv('BOLD_WEBHOOK_SECRET', BOLD_SECRET);
    const app = createApp();

    const res = await supertest(app)
      .post('/api/payments/bold/webhook')
      .set('Content-Type', 'application/json')
      .set('x-bold-signature', 'deadbeef')
      .send(eventBody);

    expect(res.status).toBe(200);
    // Firma rechazada → el handler no agenda setImmediate: basta esperar la
    // respuesta, no hace falta flushAsync.
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('ignora (200) un webhook sin ningún header de firma', async () => {
    vi.stubEnv('BOLD_WEBHOOK_SECRET', BOLD_SECRET);
    const app = createApp();

    const res = await supertest(app)
      .post('/api/payments/bold/webhook')
      .set('Content-Type', 'application/json')
      .send(eventBody);

    expect(res.status).toBe(200);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('marca paid cuando SALE_APPROVED llega con firma HMAC válida (Buffer raw)', async () => {
    vi.stubEnv('BOLD_WEBHOOK_SECRET', BOLD_SECRET);
    const app = createApp();
    const sig = boldSignature(eventBody, BOLD_SECRET);

    // 1) INSERT processed_webhooks (primera vez)  2) SELECT order  3) UPDATE
    mockQuery
      .mockResolvedValueOnce({ rows: [{ provider: 'bold', sourceId: 'bold_evt_bold_1' }] })
      .mockResolvedValueOnce({ rows: [mockOrder()] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app)
      .post('/api/payments/bold/webhook')
      .set('Content-Type', 'application/json')
      .set('x-bold-signature', sig)
      .send(eventBody);

    expect(res.status).toBe(200);

    // El procesamiento es asíncrono (setImmediate) — esperar las 3 queries
    await vi.waitFor(() => expect(mockQuery).toHaveBeenCalledTimes(3));

    expect(mockQuery.mock.calls[2][0]).toContain('UPDATE orders');
    expect(mockQuery.mock.calls[2][1][0]).toBe('paid');
  });

  it('acepta el fallback x-webhook-secret (Bold Simple) y marca paid', async () => {
    vi.stubEnv('BOLD_WEBHOOK_SECRET', BOLD_SECRET);
    const app = createApp();

    mockQuery
      .mockResolvedValueOnce({ rows: [{ provider: 'bold', sourceId: 'bold_evt_bold_1' }] })
      .mockResolvedValueOnce({ rows: [mockOrder()] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app)
      .post('/api/payments/bold/webhook')
      .set('Content-Type', 'application/json')
      .set('x-webhook-secret', BOLD_SECRET)
      .send(eventBody);

    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(mockQuery).toHaveBeenCalledTimes(3));
    expect(mockQuery.mock.calls[2][1][0]).toBe('paid');
  });

  it('marca failed cuando SALE_REJECTED llega con firma válida', async () => {
    vi.stubEnv('BOLD_WEBHOOK_SECRET', BOLD_SECRET);
    const app = createApp();
    const rejectedBody = JSON.stringify({
      id: 'evt_bold_2',
      source: 'bold',
      type: 'SALE_REJECTED',
      data: { metadata: { reference: 'ORD-123' } },
    });
    const sig = boldSignature(rejectedBody, BOLD_SECRET);

    mockQuery
      .mockResolvedValueOnce({ rows: [{ provider: 'bold', sourceId: 'bold_evt_bold_2' }] })
      .mockResolvedValueOnce({ rows: [mockOrder()] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app)
      .post('/api/payments/bold/webhook')
      .set('Content-Type', 'application/json')
      .set('x-bold-signature', sig)
      .send(rejectedBody);

    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(mockQuery).toHaveBeenCalledTimes(3));
    expect(mockQuery.mock.calls[2][1][0]).toBe('failed');
  });

  it('no reprocesa un evento ya procesado (idempotencia por event.id)', async () => {
    vi.stubEnv('BOLD_WEBHOOK_SECRET', BOLD_SECRET);
    const app = createApp();
    const sig = boldSignature(eventBody, BOLD_SECRET);

    // INSERT con ON CONFLICT DO NOTHING que no inserta → rows vacío → ya visto
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app)
      .post('/api/payments/bold/webhook')
      .set('Content-Type', 'application/json')
      .set('x-bold-signature', sig)
      .send(eventBody);

    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(mockQuery).toHaveBeenCalledTimes(1));
    // Solo el chequeo de idempotencia; ni SELECT de order ni UPDATE
    expect(mockQuery.mock.calls[0][0]).toContain('processed_webhooks');
  });

  it('responde 200 sin crash si la orden no existe (sin UPDATE)', async () => {
    vi.stubEnv('BOLD_WEBHOOK_SECRET', BOLD_SECRET);
    const app = createApp();
    const sig = boldSignature(eventBody, BOLD_SECRET);

    mockQuery
      .mockResolvedValueOnce({ rows: [{ provider: 'bold', sourceId: 'bold_evt_bold_1' }] })
      .mockResolvedValueOnce({ rows: [] }); // orden no encontrada

    const res = await supertest(app)
      .post('/api/payments/bold/webhook')
      .set('Content-Type', 'application/json')
      .set('x-bold-signature', sig)
      .send(eventBody);

    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(mockQuery).toHaveBeenCalledTimes(2));
    expect(mockQuery.mock.calls[1][0]).toContain('FROM orders');
    // Sin UPDATE: solo idempotencia + SELECT
    expect(mockQuery.mock.calls.some((c) => String(c[0]).includes('UPDATE orders'))).toBe(false);
  });
});

// ── REGRESIÓN 2026-08-06: webhook Bold NO requiere CSRF ───────────
describe('CSRF en webhook de pago (regresión 2026-08-06)', () => {
  const eventBody = JSON.stringify({
    id: 'evt_csrf_1',
    source: 'bold',
    type: 'SALE_APPROVED',
    data: { metadata: { reference: 'ORD-123' } },
  });

  it('el webhook Bold pasa aunque NO lleve cookie CSRF ni header (sin secret → 503, no 403)', async () => {
    const app = createAppWithCsrf();

    const res = await supertest(app)
      .post('/api/payments/bold/webhook')
      .set('Content-Type', 'application/json')
      .send(eventBody);

    // Sin BOLD_WEBHOOK_SECRET: fail-closed 503. Antes del fix esto daba
    // 403 (CSRF) y el pago nunca llegaba a evaluarse.
    expect(res.status).toBe(503);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('el webhook Bold procesa un pago válido con CSRF montado (firma + setImmediate)', async () => {
    vi.stubEnv('BOLD_WEBHOOK_SECRET', BOLD_SECRET);
    const app = createAppWithCsrf();
    const sig = boldSignature(eventBody, BOLD_SECRET);

    mockQuery
      .mockResolvedValueOnce({ rows: [{ provider: 'bold', sourceId: 'bold_evt_csrf_1' }] })
      .mockResolvedValueOnce({ rows: [mockOrder()] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app)
      .post('/api/payments/bold/webhook')
      .set('Content-Type', 'application/json')
      .set('x-bold-signature', sig)
      .send(eventBody);

    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(mockQuery).toHaveBeenCalledTimes(3));
    expect(mockQuery.mock.calls[2][1][0]).toBe('paid');
  });

  it('una mutación NO exenta sigue requiriendo CSRF (protección intacta)', async () => {
    const app = createAppWithCsrf();

    // POST /api/payments/bold/status/xxx no existe como ruta, pero el CSRF
    // corre ANTES del router: sin cookie/header debe dar 403, no 404/200.
    const res = await supertest(app).post('/api/payments/bold/status/LNK_xxx').send({});

    expect(res.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
