// Tests de integración para server/routes/notifications.js — el router de
// estado/test de notificaciones (email, push, webhooks). Verifica que los
// endpoints montados en /api/notifications/* respondan correctamente y que
// las guardas de servicio (destinatario requerido, webhook URL configurada)
// devuelvan los códigos correctos sin tocar servicios reales.
//
// Patrón igual a server/tests/shifts.test.js: mocks con vi.hoisted,
// supertest + express, authMiddleware mockeado inyectando req.auth.
//
// Ejecutar: npx vitest run server/tests/notifications.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

// ── Mocks con vi.hoisted para evitar ReferenceError ────────────
const { mockQuery, mockAuth, mockSendEmail, mockDeliverWebhook, mockIsPushEnabled } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockAuth: { role: 'ADMIN', sub: 'emp_1', locationId: 'nemocon' },
  mockSendEmail: vi.fn(),
  mockDeliverWebhook: vi.fn(),
  mockIsPushEnabled: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../auth.js', () => ({
  authMiddleware: (req, _res, next) => {
    req.auth = mockAuth;
    next();
  },
  requireRole:
    (..._roles) =>
    (_req, _res, next) =>
      next(),
}));

vi.mock('../services/email.js', () => ({
  sendTemplatedEmail: mockSendEmail,
  templates: {},
}));

vi.mock('../services/webhooks.js', () => ({
  deliverWebhook: mockDeliverWebhook,
}));

vi.mock('../push.js', () => ({
  isPushEnabled: mockIsPushEnabled,
}));

// ── Importar rutas después de vi.mock ──────────────────────────
import notificationsRoutes from '../routes/notifications.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', notificationsRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockSendEmail.mockReset();
  mockDeliverWebhook.mockReset();
  mockIsPushEnabled.mockReset();
  mockIsPushEnabled.mockReturnValue(false);
  // Limpiar env para que los tests controlen explícitamente qué está configurado
  delete process.env.SMTP_USER;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_FROM;
  delete process.env.VAPID_MAILTO;
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.ORDER_WEBHOOK_URL;
  delete process.env.PAYMENT_WEBHOOK_URL;
  delete process.env.WEBHOOK_URL;
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── GET /api/notifications/status ──────────────────────────────
describe('GET /api/notifications/status', () => {
  it('reporta servicios desconfigurados cuando no hay env vars', async () => {
    const res = await supertest(createApp()).get('/api/notifications/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      email: { configured: false, host: 'smtp.gmail.com', from: 'noreply@guidopizza.com' },
      push: { configured: false, vapidPresent: false },
      webhook: { configured: false, orderUrl: null, paymentUrl: null },
    });
    expect(mockIsPushEnabled).toHaveBeenCalled();
  });

  it('reporta los servicios como configurados cuando las env vars existen', async () => {
    process.env.SMTP_USER = 'admin@guidopizza.com';
    process.env.SMTP_HOST = 'smtp.custom.com';
    process.env.SMTP_FROM = 'no-reply@guidopizza.com';
    process.env.VAPID_MAILTO = 'mailto:admin@guidopizza.com';
    process.env.VAPID_PUBLIC_KEY = 'pk_test';
    process.env.VAPID_PRIVATE_KEY = 'sk_test';
    process.env.ORDER_WEBHOOK_URL = 'https://hooks.example.com/orders';
    mockIsPushEnabled.mockReturnValue(true);

    const res = await supertest(createApp()).get('/api/notifications/status');

    expect(res.status).toBe(200);
    expect(res.body.email).toEqual({
      configured: true,
      host: 'smtp.custom.com',
      from: 'no-reply@guidopizza.com',
    });
    expect(res.body.push).toEqual({ configured: true, vapidPresent: true });
    expect(res.body.webhook).toEqual({
      configured: true,
      orderUrl: 'https://hooks.example.com/orders',
      paymentUrl: null,
    });
  });
});

// ── POST /api/notifications/test-email ─────────────────────────
describe('POST /api/notifications/test-email', () => {
  it('envía un email de prueba al destinatario explícito', async () => {
    mockSendEmail.mockResolvedValue({ messageId: 'msg_1' });

    const res = await supertest(createApp()).post('/api/notifications/test-email').send({ to: 'cliente@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, to: 'cliente@example.com' });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0][0].to).toBe('cliente@example.com');
    expect(mockSendEmail.mock.calls[0][0].subject).toContain('Prueba');
    // Sin destinatario explícito no debe consultar la DB
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('resuelve el destinatario desde el email del empleado autenticado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ email: 'admin@guidopizza.com' }] });
    mockSendEmail.mockResolvedValue({ messageId: 'msg_2' });

    const res = await supertest(createApp()).post('/api/notifications/test-email').send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, to: 'admin@guidopizza.com' });
    expect(mockQuery).toHaveBeenCalledWith('SELECT email FROM employees WHERE id = $1', ['emp_1']);
    expect(mockSendEmail.mock.calls[0][0].to).toBe('admin@guidopizza.com');
  });

  it('rechaza con 400 si no hay destinatario ni email en el perfil', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(createApp()).post('/api/notifications/test-email').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Destinatario requerido');
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('responde 500 si el envío de email falla', async () => {
    mockSendEmail.mockRejectedValue(new Error('SMTP down'));

    const res = await supertest(createApp()).post('/api/notifications/test-email').send({ to: 'x@example.com' });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('SMTP down');
  });
});

// ── POST /api/notifications/test-webhook ───────────────────────
describe('POST /api/notifications/test-webhook', () => {
  it('rechaza con 400 si no hay ORDER_WEBHOOK_URL configurada', async () => {
    const res = await supertest(createApp()).post('/api/notifications/test-webhook').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('No hay URL de webhook configurada');
    expect(mockDeliverWebhook).not.toHaveBeenCalled();
  });

  it('envía un webhook de prueba y devuelve el status de la entrega', async () => {
    process.env.ORDER_WEBHOOK_URL = 'https://hooks.example.com/orders';
    mockDeliverWebhook.mockResolvedValue({ status: 200 });

    const res = await supertest(createApp()).post('/api/notifications/test-webhook').send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, status: 200 });
    expect(mockDeliverWebhook).toHaveBeenCalledTimes(1);
    const call = mockDeliverWebhook.mock.calls[0][0];
    expect(call.url).toBe('https://hooks.example.com/orders');
    expect(call.payload.event).toBe('test');
    expect(call.retries).toBe(1);
  });

  it('responde 502 si la entrega del webhook falla', async () => {
    process.env.ORDER_WEBHOOK_URL = 'https://hooks.example.com/orders';
    mockDeliverWebhook.mockRejectedValue(new Error('timeout'));

    const res = await supertest(createApp()).post('/api/notifications/test-webhook').send({});

    expect(res.status).toBe(502);
    expect(res.body.error).toContain('timeout');
  });
});
