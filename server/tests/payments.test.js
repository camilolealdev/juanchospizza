// Tests de seguridad para los webhooks de pago (Bold y Wompi).
// Cubre:
//   1. Fail-closed: sin secret configurado → 503, sin tocar DB
//   2. Verificación de firma: firma/checksum inválida → 200 (ignorada), sin tocar DB
//   3. Firma válida → paymentStatus transiciona a paid/failed
//   4. Idempotencia: el mismo evento no se procesa dos veces
//   5. Respuesta 200 ante payloads incompletos (orden inexistente, sin referencia)
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

const BOLD_SECRET = 'bold-test-secret-1234567890';
const WOMPI_SECRET = 'wompi-test-secret-1234567890';

// Mismo orden de middlewares que server/index.js: raw body ANTES de
// express.json() para que el webhook Bold reciba req.body como Buffer.
function createApp() {
  const app = express();
  app.use('/api/payments/bold/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
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

// HMAC-SHA256 hex del body RAW (exactamente lo que Bold envía en
// x-bold-signature).
function boldSignature(rawBody, secret) {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
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

// ── WOMPI ───────────────────────────────────────────────────────
describe('POST /api/payments/wompi/webhook', () => {
  // Genera un evento Wompi con checksum válido (mismo algoritmo que
  // verifyWompiChecksum en server/routes/payments.js).
  function wompiEvent({ status = 'APPROVED', id = 'evt_wompi_1', transactionId = 'tx_1' } = {}) {
    const event = {
      id,
      timestamp: '1720000000',
      data: {
        transaction: { id: transactionId, status, reference: 'ORD-123' },
      },
      signature: {
        properties: ['transaction.id', 'transaction.status'],
        checksum: '',
      },
    };
    const concatenated = event.signature.properties
      .map((prop) => prop.split('.').reduce((obj, key) => obj?.[key], event.data))
      .join('');
    event.signature.checksum = crypto
      .createHash('sha256')
      .update(`${concatenated}${event.timestamp}${WOMPI_SECRET}`)
      .digest('hex');
    return event;
  }

  it('responde 503 si WOMPI_EVENTS_SECRET no está configurado (fail-closed)', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/payments/wompi/webhook').send(wompiEvent());

    expect(res.status).toBe(503);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('ignora (200) un checksum inválido sin tocar la DB', async () => {
    vi.stubEnv('WOMPI_EVENTS_SECRET', WOMPI_SECRET);
    const app = createApp();
    const event = wompiEvent();
    // Hash de 64 chars (misma longitud que el esperado) pero distinto valor:
    // así timingSafeEqual compara longitudes iguales y falla por contenido,
    // que es la ruta real de mismatch en producción (un string de otra
    // longitud dispararía ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH y probaría
    // solo la rama del catch, no la comparación).
    event.signature.checksum = 'f'.repeat(64);

    const res = await supertest(app).post('/api/payments/wompi/webhook').send(event);

    expect(res.status).toBe(200);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('marca paid cuando transaction.status es APPROVED con checksum válido', async () => {
    vi.stubEnv('WOMPI_EVENTS_SECRET', WOMPI_SECRET);
    const app = createApp();

    mockQuery
      .mockResolvedValueOnce({ rows: [{ provider: 'wompi', sourceId: 'wompi_evt_wompi_1' }] })
      .mockResolvedValueOnce({ rows: [mockOrder()] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).post('/api/payments/wompi/webhook').send(wompiEvent());

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(mockQuery.mock.calls[2][0]).toContain('UPDATE orders');
    expect(mockQuery.mock.calls[2][1][0]).toBe('paid');
  });

  it('marca failed cuando transaction.status es DECLINED', async () => {
    vi.stubEnv('WOMPI_EVENTS_SECRET', WOMPI_SECRET);
    const app = createApp();

    mockQuery
      .mockResolvedValueOnce({ rows: [{ provider: 'wompi', sourceId: 'wompi_evt_wompi_1' }] })
      .mockResolvedValueOnce({ rows: [mockOrder()] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app)
      .post('/api/payments/wompi/webhook')
      .send(wompiEvent({ status: 'DECLINED' }));

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[2][1][0]).toBe('failed');
  });

  it('no reprocesa un evento ya procesado (idempotencia por event.id)', async () => {
    vi.stubEnv('WOMPI_EVENTS_SECRET', WOMPI_SECRET);
    const app = createApp();

    // INSERT con ON CONFLICT DO NOTHING que no inserta → ya visto
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).post('/api/payments/wompi/webhook').send(wompiEvent());

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('processed_webhooks');
  });

  it('responde 200 sin crash si el payload no trae transaction', async () => {
    vi.stubEnv('WOMPI_EVENTS_SECRET', WOMPI_SECRET);
    const app = createApp();

    const res = await supertest(app).post('/api/payments/wompi/webhook').send({ event: 'no-transaction' });

    expect(res.status).toBe(200);
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
