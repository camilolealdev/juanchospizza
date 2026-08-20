// Tests de notificaciones push: server/push.js
// Cubre initPush() fail-open (nunca rompe el boot sin VAPID), isPushEnabled()
// y sendPushToPhone() (envío por teléfono, limpieza de suscripciones
// caducadas 404/410, y no-lanzar en errores de lookup).
// Ejecutar: npx vitest run server/tests/push.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks con vi.hoisted (estables entre resets de módulo) ─────
// Tanto web-push como el logger se definen acá: initPush lee process.env en
// tiempo de llamada y recargamos push.js con vi.resetModules() por escenario
// (pushEnabled es estado de módulo) -- si el mock de logger viviera en el
// factory de vi.mock, cada reset crearía una instancia nueva y los asserts
// contra ella fallarían.
const { mockSetVapidDetails, mockSendNotification, mockLogger } = vi.hoisted(() => ({
  mockSetVapidDetails: vi.fn(),
  mockSendNotification: vi.fn(),
  mockLogger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), fatal: vi.fn(), debug: vi.fn() },
}));

// push.js hace `import webPush from 'web-push'` (default import): el mock
// debe exponer la API bajo `default`, igual que el mock de pg en db.test.js.
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
}));

vi.mock('../services/logger.js', () => ({
  default: mockLogger,
}));

async function loadPush(env = {}) {
  delete process.env.VAPID_MAILTO;
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  Object.assign(process.env, env);
  vi.resetModules();
  const mod = await import('../push.js');
  return mod;
}

// Snapshot del env al inicio: loadPush modifica process.env por caso y se
// restaura después para no contaminar otros tests/archivos.
const originalEnv = { ...process.env };

afterEach(() => {
  Object.keys(process.env).forEach((k) => {
    if (!(k in originalEnv)) delete process.env[k];
  });
  Object.assign(process.env, originalEnv);
});

beforeEach(() => {
  mockSetVapidDetails.mockReset();
  mockSendNotification.mockReset();
  mockLogger.info.mockClear();
  mockLogger.error.mockClear();
  mockLogger.warn.mockClear();
});

describe('initPush() — fail-open', () => {
  it('sin VAPID config: deshabilita push, avisa y NO crashea', async () => {
    const { initPush, isPushEnabled } = await loadPush();

    initPush();

    expect(isPushEnabled()).toBe(false);
    expect(mockSetVapidDetails).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('con VAPID válida: configura web-push y habilita', async () => {
    const { initPush, isPushEnabled } = await loadPush({
      VAPID_MAILTO: 'mailto:admin@pizzeria.com',
      VAPID_PUBLIC_KEY: 'pub-key',
      VAPID_PRIVATE_KEY: 'priv-key',
    });

    initPush();

    expect(mockSetVapidDetails).toHaveBeenCalledWith('mailto:admin@pizzeria.com', 'pub-key', 'priv-key');
    expect(isPushEnabled()).toBe(true);
  });

  it('con VAPID inválida (setVapidDetails lanza): deshabilita sin crashear', async () => {
    mockSetVapidDetails.mockImplementation(() => {
      throw new Error('invalid vapid');
    });
    const { initPush, isPushEnabled } = await loadPush({
      VAPID_MAILTO: 'mailto:x@y.com',
      VAPID_PUBLIC_KEY: 'x',
      VAPID_PRIVATE_KEY: 'x',
    });

    initPush();

    expect(isPushEnabled()).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalled();
  });
});

describe('sendPushToPhone()', () => {
  it('si push está deshabilitado, no consulta la DB y no lanza', async () => {
    const { sendPushToPhone } = await loadPush(); // sin initPush -> disabled
    const pool = { query: vi.fn() };

    await expect(sendPushToPhone(pool, '3001234567', { title: 'x' })).resolves.toBe(0);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('sin teléfono, retorna 0 sin consultar la DB', async () => {
    const { initPush, sendPushToPhone } = await loadPush({
      VAPID_MAILTO: 'mailto:a@b.com',
      VAPID_PUBLIC_KEY: 'k',
      VAPID_PRIVATE_KEY: 'k',
    });
    initPush();
    const pool = { query: vi.fn() };

    await expect(sendPushToPhone(pool, '', { title: 'x' })).resolves.toBe(0);

    expect(pool.query).not.toHaveBeenCalled();
  });

  it('envía la notificación a todas las suscripciones del teléfono', async () => {
    const { initPush, sendPushToPhone } = await loadPush({
      VAPID_MAILTO: 'mailto:a@b.com',
      VAPID_PUBLIC_KEY: 'k',
      VAPID_PRIVATE_KEY: 'k',
    });
    initPush();
    mockSendNotification.mockResolvedValue({});
    const pool = {
      query: vi.fn().mockResolvedValue({
        rows: [
          { id: 'sub1', endpoint: 'https://push.example/1', auth: 'auth1', p256dh: 'key1' },
          { id: 'sub2', endpoint: 'https://push.example/2', auth: 'auth2', p256dh: 'key2' },
        ],
      }),
    };

    await sendPushToPhone(pool, '3001234567', { title: 'Pedido listo', orderId: 'ORD-1' });

    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM push_subscriptions WHERE phone = $1', ['3001234567']);
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
    expect(mockSendNotification).toHaveBeenNthCalledWith(
      1,
      { endpoint: 'https://push.example/1', keys: { auth: 'auth1', p256dh: 'key1' } },
      JSON.stringify({ title: 'Pedido listo', orderId: 'ORD-1' })
    );
  });

  it('limpia suscripciones caducadas (404/410) y sigue con las demás', async () => {
    const { initPush, sendPushToPhone } = await loadPush({
      VAPID_MAILTO: 'mailto:a@b.com',
      VAPID_PUBLIC_KEY: 'k',
      VAPID_PRIVATE_KEY: 'k',
    });
    initPush();
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            { id: 'sub-vieja', endpoint: 'e1', auth: 'a', p256dh: 'p' },
            { id: 'sub-activa', endpoint: 'e2', auth: 'a', p256dh: 'p' },
          ],
        })
        .mockResolvedValueOnce({ rowCount: 1 }), // DELETE
    };
    mockSendNotification.mockRejectedValueOnce({ statusCode: 410 }).mockResolvedValueOnce({});

    await expect(sendPushToPhone(pool, '3001234567', {})).resolves.toBe(1);

    expect(pool.query).toHaveBeenCalledWith('DELETE FROM push_subscriptions WHERE id = $1', ['sub-vieja']);
    expect(mockSendNotification).toHaveBeenCalledTimes(2);
  });

  it('errores de envío que no son 404/410 se loguean y no cortan el loop', async () => {
    const { initPush, sendPushToPhone } = await loadPush({
      VAPID_MAILTO: 'mailto:a@b.com',
      VAPID_PUBLIC_KEY: 'k',
      VAPID_PRIVATE_KEY: 'k',
    });
    initPush();
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [{ id: 'sub1', endpoint: 'e1', auth: 'a', p256dh: 'p' }] }),
    };
    mockSendNotification.mockRejectedValue(new Error('network down'));

    await expect(sendPushToPhone(pool, '3001234567', {})).resolves.toBe(0);
    expect(mockLogger.error).toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledTimes(1); // sin DELETE
  });

  it('si el lookup de suscripciones falla, loguea y NO lanza', async () => {
    const { initPush, sendPushToPhone } = await loadPush({
      VAPID_MAILTO: 'mailto:a@b.com',
      VAPID_PUBLIC_KEY: 'k',
      VAPID_PRIVATE_KEY: 'k',
    });
    initPush();
    const pool = { query: vi.fn().mockRejectedValue(new Error('db down')) };

    await expect(sendPushToPhone(pool, '3001234567', {})).resolves.toBe(0);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
