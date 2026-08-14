// Tests de integración para server/routes/campaigns.js.
// Cubre: GET (ADMIN/MARKETING), POST con Zod real (enum de tipo/estado),
// PUT dinámico y DELETE (204).
//
// Patrón igual a server/tests/tables.test.js: mocks con vi.hoisted, Zod real,
// supertest + express.
//
// Ejecutar: npx vitest run server/tests/campaigns.test.js

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

import campaignsRoutes from '../routes/campaigns.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', campaignsRoutes);
  return app;
}

function validCampaign(overrides = {}) {
  return {
    name: 'Cyber Monday',
    type: 'flash',
    discount: 20,
    status: 'active',
    budget: 500000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ── GET /api/campaigns ─────────────────────────────────────────
describe('GET /api/campaigns', () => {
  it('lista campañas', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'camp_1', name: 'Cyber Monday' }] });

    const res = await supertest(app).get('/api/campaigns');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toContain('SELECT * FROM campaigns ORDER BY id');
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/campaigns');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error fetching campaigns' });
  });
});

// ── POST /api/campaigns ────────────────────────────────────────
describe('POST /api/campaigns', () => {
  it('rechaza con 400 un tipo de campaña inválido (Zod real)', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/campaigns')
      .send(validCampaign({ type: 'BOGUS' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Tipo de campaña');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('crea la campaña con reach/conversions en 0', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).post('/api/campaigns').send(validCampaign());

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^camp_/);
    expect(res.body.reach).toBe(0);
    expect(res.body.conversions).toBe(0);
    expect(res.body.budget).toBe(500000);
    // INSERT con [id, name, type, discount, status, 0, 0, budget]
    expect(mockQuery.mock.calls[0][1]).toEqual([
      expect.any(String),
      'Cyber Monday',
      'flash',
      20,
      'active',
      0,
      0,
      500000,
    ]);
  });

  it('responde 500 si el INSERT falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).post('/api/campaigns').send(validCampaign());

    expect(res.status).toBe(500);
  });
});

// ── PUT /api/campaigns/:id ─────────────────────────────────────
describe('PUT /api/campaigns/:id', () => {
  it('actualiza solo las columnas enviadas', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [{ id: 'camp_1', name: 'X' }] });

    const res = await supertest(app).put('/api/campaigns/camp_1').send({ status: 'scheduled' });

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toBe('UPDATE campaigns SET status = $1 WHERE id = $2');
    expect(mockQuery.mock.calls[0][1]).toEqual(['scheduled', 'camp_1']);
  });

  it('404 si la campaña no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).put('/api/campaigns/camp_zzz').send({ status: 'active' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Campaign not found' });
  });
});

// ── DELETE /api/campaigns/:id ──────────────────────────────────
describe('DELETE /api/campaigns/:id', () => {
  it('elimina la campaña con 204', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).delete('/api/campaigns/camp_1');

    expect(res.status).toBe(204);
  });

  it('404 si la campaña no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app).delete('/api/campaigns/camp_zzz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Campaign not found' });
  });
});
