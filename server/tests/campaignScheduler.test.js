// Tests para server/services/campaignScheduler.js.
// Cubre: la selección de campañas vencidas (SQL correcto), el despacho a
// clientes (reach/conversions según canales), el UPDATE con métricas, el
// manejo de error de DB, y el wrapper con setInterval (tick inmediato +
// handle limpiable).
//
// Ejecutar: npx vitest run server/tests/campaignScheduler.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockQuery, mockSendEmail, mockSendPushToPhone } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockSendEmail: vi.fn(),
  mockSendPushToPhone: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../services/email.js', () => ({
  sendTemplatedEmail: mockSendEmail,
  templates: { campaign: '<h1>{{campaignName}}</h1>' },
}));

vi.mock('../push.js', () => ({
  sendPushToPhone: mockSendPushToPhone,
}));

import { activateDueCampaigns, dispatchCampaign, startCampaignScheduler } from '../services/campaignScheduler.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockSendEmail.mockReset();
  mockSendPushToPhone.mockReset();
  mockSendPushToPhone.mockResolvedValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
  // Cualquier interval abierto por un test debe morir acá, no colgar el proceso.
  vi.useRealTimers();
});

// ── activateDueCampaigns ───────────────────────────────────────
describe('activateDueCampaigns', () => {
  it('selecciona campañas scheduled vencidas con el WHERE correcto', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'camp_1', name: 'Flash', type: 'flash', discount: 20 }] })
      .mockResolvedValueOnce({ rows: [] }) // clientes activos
      .mockResolvedValueOnce({ rowCount: 1 }); // UPDATE

    const activated = await activateDueCampaigns({ query: mockQuery });

    expect(activated).toBe(1);
    const selectSql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(selectSql).toContain("FROM campaigns WHERE status = 'scheduled'");
    expect(selectSql).toContain('"scheduleAt" IS NOT NULL');
    expect(selectSql).toContain('"scheduleAt" <= NOW()');
  });

  it('activa y despacha la campaña, actualizando reach/conversions', async () => {
    const clients = [
      { id: 'c1', nombre: 'Ana', email: 'ana@x.com', telefono: '3001' },
      { id: 'c2', nombre: 'Luis', email: null, telefono: '3002' },
    ];
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'camp_1', name: 'Flash', type: 'flash', discount: 20 }] })
      .mockResolvedValueOnce({ rows: clients });
    mockSendEmail.mockResolvedValue({ messageId: 'm1' }); // Ana recibe email
    mockSendPushToPhone.mockResolvedValueOnce(0).mockResolvedValueOnce(1); // Luis recibe push

    const activated = await activateDueCampaigns({ query: mockQuery });

    expect(activated).toBe(1);
    // UPDATE con status active + métricas reales.
    const updateCall = mockQuery.mock.calls.at(-1);
    expect(updateCall[0]).toContain('UPDATE campaigns SET status = $1, reach = $2, conversions = $3');
    expect(updateCall[1]).toEqual(['active', 2, 2, 'camp_1']);
  });

  it('sin clientes activos activa con reach=0 conversions=0', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'camp_1', name: 'Flash', type: 'flash', discount: 20 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const activated = await activateDueCampaigns({ query: mockQuery });

    expect(activated).toBe(1);
    expect(mockQuery.mock.calls.at(-1)[1]).toEqual(['active', 0, 0, 'camp_1']);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockSendPushToPhone).not.toHaveBeenCalled();
  });

  it('no toca nada si no hay campañas vencidas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const activated = await activateDueCampaigns({ query: mockQuery });

    expect(activated).toBe(0);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('devuelve null y no lanza si la DB falla (el tick siguiente reintenta)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db caída'));

    const activated = await activateDueCampaigns({ query: mockQuery });

    expect(activated).toBeNull();
  });
});

// ── dispatchCampaign ───────────────────────────────────────────
describe('dispatchCampaign', () => {
  it('cuenta conversions solo para clientes que recibieron al menos un mensaje', async () => {
    const clients = [
      { id: 'c1', nombre: 'Ana', email: 'ana@x.com', telefono: null }, // email OK
      { id: 'c2', nombre: 'Luis', email: 'luis@x.com', telefono: null }, // email falla (skipped)
      { id: 'c3', nombre: 'Pepe', email: null, telefono: null }, // sin canal → ni reach
    ];
    mockQuery.mockResolvedValueOnce({ rows: clients });
    mockSendEmail.mockResolvedValueOnce({ messageId: 'm1' }).mockResolvedValueOnce({ skipped: true });

    const result = await dispatchCampaign({ query: mockQuery }, { id: 'c', name: 'N', discount: 10 });

    expect(result).toEqual({ reach: 2, conversions: 1 });
    expect(mockSendPushToPhone).toHaveBeenCalledTimes(3); // se intenta con cada teléfono (aunque sea null)
  });

  it('email skipped (sin SMTP) + push 0 = reach pero sin conversions', async () => {
    const clients = [{ id: 'c1', nombre: 'Ana', email: 'ana@x.com', telefono: '3001' }];
    mockQuery.mockResolvedValueOnce({ rows: clients });
    mockSendEmail.mockResolvedValueOnce({ skipped: true }); // SMTP no configurado
    mockSendPushToPhone.mockResolvedValueOnce(0); // sin suscripción

    const result = await dispatchCampaign({ query: mockQuery }, { id: 'c', name: 'N', discount: 10 });

    expect(result).toEqual({ reach: 1, conversions: 0 });
  });

  it('nunca lanza aunque el envío falle', async () => {
    const clients = [{ id: 'c1', nombre: 'Ana', email: 'ana@x.com', telefono: null }];
    mockQuery.mockResolvedValueOnce({ rows: clients });
    mockSendEmail.mockRejectedValueOnce(new Error('smtp caído'));

    const result = await dispatchCampaign({ query: mockQuery }, { id: 'c', name: 'N', discount: 10 });

    expect(result).toEqual({ reach: 1, conversions: 0 });
  });
});

// ── startCampaignScheduler ─────────────────────────────────────
describe('startCampaignScheduler', () => {
  it('corre un tick inmediato al arrancar y devuelve un handle para clearInterval', () => {
    vi.useFakeTimers();
    mockQuery.mockResolvedValue({ rows: [] });

    const handle = startCampaignScheduler({ query: mockQuery }, { intervalMs: 1000 });

    // Tick inmediato al boot: si el server estuvo caído a la hora programada,
    // la campaña se activa sin esperar el primer intervalo.
    expect(mockQuery).toHaveBeenCalledTimes(1);

    // Y sigue corriendo cada intervalo...
    vi.advanceTimersByTime(1000);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(3000);
    expect(mockQuery).toHaveBeenCalledTimes(5);

    // ...hasta que graceful shutdown lo limpia.
    clearInterval(handle);
    vi.advanceTimersByTime(5000);
    expect(mockQuery).toHaveBeenCalledTimes(5);
  });
});
