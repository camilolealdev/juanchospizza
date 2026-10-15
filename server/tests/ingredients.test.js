// Tests de integración para server/routes/ingredients.js.
// Cubre: GET (listado + filtro por categoría), POST (Zod real), PUT dinámico
// y DELETE, con 404/500 en cada camino.
//
// Patrón igual a server/tests/tables.test.js: mocks con vi.hoisted, Zod real,
// supertest + express.
//
// Ejecutar: npx vitest run server/tests/ingredients.test.js

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

import ingredientsRoutes from '../routes/ingredients.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', ingredientsRoutes);
  return app;
}

function validIngredient(overrides = {}) {
  return {
    nombre: 'Queso mozzarella',
    descripcion: 'Fresco',
    precio_extra: 3000,
    categoria: 'lacteos',
    vegetariano: true,
    vegano: false,
    premium: false,
    dulce: false,
    defaultIng: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ── GET /api/ingredients ───────────────────────────────────────
describe('GET /api/ingredients', () => {
  it('lista ingredientes sin filtro', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'ing_1', nombre: 'Queso' }] });

    const res = await supertest(app).get('/api/ingredients');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('filtra por categoría cuando ?category viene', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await supertest(app).get('/api/ingredients?category=lacteos');

    expect(mockQuery.mock.calls[0][0]).toContain('WHERE categoria = $1');
    expect(mockQuery.mock.calls[0][1]).toEqual(['lacteos']);
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/ingredients');

    expect(res.status).toBe(500);
  });
});

// ── POST /api/ingredients ──────────────────────────────────────
describe('POST /api/ingredients', () => {
  it('rechaza con 400 un body sin nombre (Zod real)', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/ingredients').send({ precio_extra: 100 });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('crea el ingrediente y devuelve 201 con id generado', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).post('/api/ingredients').send(validIngredient());

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^ing_/);
    expect(res.body.nombre).toBe('Queso mozzarella');
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO ingredients');
  });

  it('responde 500 si el INSERT falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).post('/api/ingredients').send(validIngredient());

    expect(res.status).toBe(500);
  });
});

// ── PUT /api/ingredients/:id ───────────────────────────────────
describe('PUT /api/ingredients/:id', () => {
  it('actualiza solo las columnas enviadas', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [{ id: 'ing_1', nombre: 'X' }] });

    const res = await supertest(app).put('/api/ingredients/ing_1').send({ nombre: 'X' });

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE ingredients SET nombre = $1');
    expect(mockQuery.mock.calls[0][1]).toEqual(['X', 'ing_1']);
  });

  it('404 si el ingrediente no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).put('/api/ingredients/ing_zzz').send({ nombre: 'X' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Ingredient not found' });
  });
});

// ── DELETE /api/ingredients/:id ────────────────────────────────
describe('DELETE /api/ingredients/:id', () => {
  it('elimina el ingrediente', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).delete('/api/ingredients/ing_1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('404 si el ingrediente no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app).delete('/api/ingredients/ing_zzz');

    expect(res.status).toBe(404);
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).delete('/api/ingredients/ing_1');

    expect(res.status).toBe(500);
  });
});
