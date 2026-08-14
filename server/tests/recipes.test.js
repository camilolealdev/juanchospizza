// Tests de integración para server/routes/recipes.js.
// Cubre:
//   1. GET /api/recipes — join de recipe_ingredients agrupado por receta
//   2. POST /api/recipes — inserta receta + sus ingredientes (Zod real)
//   3. PUT /api/recipes/:id — update dinámico; reemplaza ingredientes cuando
//      vienen, conserva los existentes cuando no
//   4. DELETE /api/recipes/:id — borra primero los ingredientes (sin CASCADE)
//
// Patrón igual a server/tests/orders.test.js: mocks con vi.hoisted, Zod real,
// supertest + express.
//
// Ejecutar: npx vitest run server/tests/recipes.test.js

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

import recipesRoutes from '../routes/recipes.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', recipesRoutes);
  return app;
}

function validRecipe(overrides = {}) {
  return {
    nombre: 'Pizza Margherita',
    productoId: 'prod_1',
    porciones: 1,
    costoTotal: 12000,
    instrucciones: 'Hornear 10 min',
    ingredientes: [{ itemId: 'inv_1', nombre: 'Harina', cantidad: 2, unidad: 'kg', costo: 4000 }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ── GET /api/recipes ───────────────────────────────────────────
describe('GET /api/recipes', () => {
  it('agrupa los ingredientes por receta', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'rcp_1', nombre: 'Margherita' }] }).mockResolvedValueOnce({
      rows: [
        { id: 'rci_1', recipeId: 'rcp_1', nombre: 'Harina' },
        { id: 'rci_2', recipeId: 'rcp_1', nombre: 'Queso' },
      ],
    });

    const res = await supertest(app).get('/api/recipes');

    expect(res.status).toBe(200);
    expect(res.body[0].ingredientes).toHaveLength(2);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('receta sin ingredientes devuelve array vacío', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'rcp_1' }] }).mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).get('/api/recipes');

    expect(res.status).toBe(200);
    expect(res.body[0].ingredientes).toEqual([]);
  });

  it('responde 500 si una query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/recipes');

    expect(res.status).toBe(500);
  });
});

// ── POST /api/recipes ──────────────────────────────────────────
describe('POST /api/recipes', () => {
  it('rechaza con 400 sin nombre (Zod real)', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/recipes').send({ costoTotal: 100 });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('crea la receta e inserta sus ingredientes', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 }) // INSERT recipes
      .mockResolvedValueOnce({ rowCount: 1 }); // INSERT recipe_ingredients

    const res = await supertest(app).post('/api/recipes').send(validRecipe());

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^rcp_/);
    expect(res.body.ingredientes).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO recipes');
    expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO recipe_ingredients');
    expect(mockQuery.mock.calls[1][1]).toEqual([
      expect.stringMatching(/^rci_/),
      res.body.id,
      'inv_1',
      'Harina',
      2,
      'kg',
      4000,
    ]);
  });

  it('responde 500 si el INSERT falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).post('/api/recipes').send(validRecipe());

    expect(res.status).toBe(500);
  });
});

// ── PUT /api/recipes/:id ───────────────────────────────────────
describe('PUT /api/recipes/:id', () => {
  it('actualiza campos y REEMPLAZA los ingredientes cuando llega la lista', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE recipes
      .mockResolvedValueOnce({ rows: [{ id: 'rcp_1', nombre: 'Nueva' }] }) // SELECT recipe
      .mockResolvedValueOnce({ rowCount: 1 }) // DELETE recipe_ingredients
      .mockResolvedValueOnce({ rowCount: 1 }); // INSERT nuevo ingrediente

    const res = await supertest(app)
      .put('/api/recipes/rcp_1')
      .send({
        nombre: 'Nueva',
        ingredientes: [{ itemId: 'inv_2', nombre: 'Pepperoni', cantidad: 1, unidad: 'unidad', costo: 8000 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.ingredientes).toHaveLength(1);
    expect(mockQuery.mock.calls[2][0]).toContain('DELETE FROM recipe_ingredients WHERE "recipeId" = $1');
    expect(mockQuery.mock.calls[3][0]).toContain('INSERT INTO recipe_ingredients');
  });

  it('conserva los ingredientes existentes cuando la lista no viene', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE recipes
      .mockResolvedValueOnce({ rows: [{ id: 'rcp_1', nombre: 'Nueva' }] }) // SELECT recipe
      .mockResolvedValueOnce({ rows: [{ id: 'rci_1', recipeId: 'rcp_1' }] }); // SELECT existing ingredients

    const res = await supertest(app).put('/api/recipes/rcp_1').send({ nombre: 'Nueva' });

    expect(res.status).toBe(200);
    expect(res.body.ingredientes).toEqual([{ id: 'rci_1', recipeId: 'rcp_1' }]);
    // No hubo DELETE de ingredientes
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('DELETE FROM recipe_ingredients'))).toBe(false);
  });

  it('404 si la receta no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).put('/api/recipes/rcp_zzz').send({ nombre: 'X' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Recipe not found' });
  });
});

// ── DELETE /api/recipes/:id ────────────────────────────────────
describe('DELETE /api/recipes/:id', () => {
  it('borra primero los ingredientes y luego la receta', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 }) // DELETE recipe_ingredients
      .mockResolvedValueOnce({ rowCount: 1 }); // DELETE recipes

    const res = await supertest(app).delete('/api/recipes/rcp_1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockQuery.mock.calls[0][0]).toContain('DELETE FROM recipe_ingredients WHERE "recipeId" = $1');
    expect(mockQuery.mock.calls[1][0]).toContain('DELETE FROM recipes WHERE id = $1');
  });

  it('404 si la receta no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app).delete('/api/recipes/rcp_zzz');

    expect(res.status).toBe(404);
  });
});
