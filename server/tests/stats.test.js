// Tests de integración para server/routes/stats.js.
// Cubre: las 5 queries del dashboard, cálculo de totales/contadores,
// filtro opcional por sede (?locationId=) y el 500.
//
// Patrón igual a server/tests/tables.test.js: mocks con vi.hoisted,
// supertest + express.
//
// Ejecutar: npx vitest run server/tests/stats.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

const { mockQuery, mockAuth } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockAuth: { role: 'ADMIN', sub: 'emp_1', locationId: 'nemocon' },
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

import statsRoutes from '../routes/stats.js';

function createApp() {
  const app = express();
  app.use('/', statsRoutes);
  return app;
}

// Responde por índice: total, today, pending, preparing, ready
function mockStatsRows() {
  mockQuery
    .mockResolvedValueOnce({ rows: [{ count: 10, revenue: 100000 }] }) // total
    .mockResolvedValueOnce({ rows: [{ count: 3, revenue: 30000 }] }) // today
    .mockResolvedValueOnce({ rows: [{ count: 2 }] }) // pending
    .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // preparing
    .mockResolvedValueOnce({ rows: [{ count: 4 }] }); // ready
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
});

// ── GET /api/stats ─────────────────────────────────────────────
describe('GET /api/stats', () => {
  it('agrega totales y contadores desde las 5 queries', async () => {
    const app = createApp();
    mockStatsRows();

    const res = await supertest(app).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalOrders: 10,
      todayOrders: 3,
      pendingOrders: 2,
      preparingOrders: 1,
      readyOrders: 4,
      totalRevenue: 100000,
      todayRevenue: 30000,
    });
    expect(mockQuery).toHaveBeenCalledTimes(5);
  });

  it('sin datos devuelve ceros (no crashea con rows vacías)', async () => {
    const res = await supertest(createApp()).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body.totalOrders).toBe(0);
    expect(res.body.totalRevenue).toBe(0);
  });

  it('?locationId= filtra por sede (params $1/$2 en las queries)', async () => {
    const app = createApp();
    mockStatsRows();

    await supertest(app).get('/api/stats?locationId=zipaquira');

    // total query: AND "locationId" = $1 con ['zipaquira']
    expect(mockQuery.mock.calls[0][0]).toContain('AND "locationId" = $1');
    expect(mockQuery.mock.calls[0][1]).toEqual(['zipaquira']);
    // today query: fecha >= $1 AND "locationId" = $2
    expect(mockQuery.mock.calls[1][0]).toContain('AND "locationId" = $2');
    expect(mockQuery.mock.calls[1][1]).toEqual([expect.any(String), 'zipaquira']);
  });

  it('sin locationId no agrega filtro de sede', async () => {
    const app = createApp();
    mockStatsRows();

    await supertest(app).get('/api/stats');

    expect(mockQuery.mock.calls[0][0]).not.toContain('"locationId"');
    expect(mockQuery.mock.calls[0][1]).toEqual([]);
  });

  it('responde 500 si una query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/stats');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error fetching stats' });
  });
});
