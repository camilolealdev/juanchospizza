// Tests de integración para server/routes/menu.js — el endpoint público
// unificado que devuelve la carta completa en una sola respuesta.
// Cubre: las 5 queries en Promise.all, normalización de combos.productos,
// y el 500 cuando alguna query falla.
//
// Patrón igual a server/tests/tables.test.js: mocks con vi.hoisted,
// supertest + express.
//
// Ejecutar: npx vitest run server/tests/menu.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
}));

import menuRoutes from '../routes/menu.js';

function createApp() {
  const app = express();
  app.use('/', menuRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  // Dispatch por SQL: cada una de las 5 queries de Promise.all
  mockQuery.mockImplementation((sql) => {
    const s = String(sql);
    if (s.includes('FROM categories')) return Promise.resolve({ rows: [{ id: 'pizzas', name: 'Pizzas' }] });
    if (s.includes('FROM products')) return Promise.resolve({ rows: [{ id: 'prod_1', nombre: 'Margherita' }] });
    if (s.includes('FROM menu_variants')) return Promise.resolve({ rows: [{ id: 'mva_1' }] });
    if (s.includes('FROM menu_combos')) return Promise.resolve({ rows: [{ id: 'mco_1', productos: [] }] });
    if (s.includes('FROM menu_promotions')) return Promise.resolve({ rows: [{ id: 'mpr_1' }] });
    return Promise.resolve({ rows: [] });
  });
});

// ── GET /api/menu ──────────────────────────────────────────────
describe('GET /api/menu', () => {
  it('devuelve la carta unificada con las 5 secciones', async () => {
    const res = await supertest(createApp()).get('/api/menu');

    expect(res.status).toBe(200);
    expect(res.body.categories).toEqual([{ id: 'pizzas', name: 'Pizzas' }]);
    expect(res.body.products).toEqual([{ id: 'prod_1', nombre: 'Margherita' }]);
    expect(res.body.variants).toEqual([{ id: 'mva_1' }]);
    expect(res.body.combos).toEqual([{ id: 'mco_1', productos: [] }]);
    expect(res.body.promotions).toEqual([{ id: 'mpr_1' }]);
    expect(typeof res.body.updatedAt).toBe('string');
    expect(mockQuery).toHaveBeenCalledTimes(5);
  });

  it('solo incluye combos/promociones activos (filtro en SQL)', async () => {
    const spy = vi.mocked(mockQuery);
    await supertest(createApp()).get('/api/menu');

    const combosSql = spy.mock.calls.find(([sql]) => String(sql).includes('FROM menu_combos'));
    const promotionsSql = spy.mock.calls.find(([sql]) => String(sql).includes('FROM menu_promotions'));
    expect(String(combosSql[0])).toContain('WHERE activo IS DISTINCT FROM false');
    expect(String(promotionsSql[0])).toContain('WHERE activo IS DISTINCT FROM false');
  });

  it('responde 500 si una query falla', async () => {
    mockQuery.mockRejectedValue(new Error('boom'));

    const res = await supertest(createApp()).get('/api/menu');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error fetching menu' });
  });
});
