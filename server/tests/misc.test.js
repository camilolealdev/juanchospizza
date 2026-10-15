// Tests de integración para server/routes/misc.js — el endpoint de seed de la
// carta (POST /api/seed). Idempotente vía ON CONFLICT DO UPDATE.
// Cubre: seed exitoso con contadores, y 500 si alguna query falla.
//
// Patrón igual a server/tests/tables.test.js: mocks con vi.hoisted,
// supertest + express.
//
// Ejecutar: npx vitest run server/tests/misc.test.js

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

import miscRoutes from '../routes/misc.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', miscRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rowCount: 1 });
});

// ── POST /api/seed ─────────────────────────────────────────────
describe('POST /api/seed', () => {
  it('siembra categorías/productos/tamaños/ingredientes con upsert', async () => {
    const res = await supertest(createApp()).post('/api/seed');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Seed completed');
    expect(res.body.categories).toBeGreaterThan(0);
    expect(res.body.products).toBeGreaterThan(0);
    expect(res.body.pizzaSizes).toBeGreaterThan(0);
    expect(res.body.ingredients).toBeGreaterThan(0);

    // Todas las queries usan ON CONFLICT DO UPDATE (idempotencia)
    const sqls = mockQuery.mock.calls.map(([sql]) => String(sql));
    expect(sqls.some((s) => s.includes('INSERT INTO categories') && s.includes('ON CONFLICT'))).toBe(true);
    expect(sqls.some((s) => s.includes('INSERT INTO products') && s.includes('ON CONFLICT'))).toBe(true);
    expect(sqls.some((s) => s.includes('INSERT INTO ingredients') && s.includes('ON CONFLICT'))).toBe(true);
  });

  it('el seed de ingredientes NO revierte disponible=false (no toca el UPDATE)', async () => {
    await supertest(createApp()).post('/api/seed');

    // El UPDATE SET de ingredients omite `disponible` a propósito (ver
    // comentario en la ruta): el seed no debe revivir ingredientes agotados.
    const sqls = mockQuery.mock.calls.map(([sql]) => String(sql));
    const ingSql = sqls.find((s) => s.includes('INSERT INTO ingredients'));
    expect(ingSql).toBeDefined();
    const setClause = ingSql.split('ON CONFLICT')[1] || '';
    expect(setClause).not.toContain('disponible');
    // Pero el INSERT sí lo incluye (columna $10)
    expect(ingSql).toContain('disponible');
  });

  it('responde 500 si una query falla', async () => {
    mockQuery.mockRejectedValue(new Error('boom'));

    const res = await supertest(createApp()).post('/api/seed');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error seeding data' });
  });
});
