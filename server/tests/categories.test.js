// Tests de integración para server/routes/categories.js.
// Cubre el CRUD completo: GET (listado), POST (Zod real + 201), PUT
// (update dinámico sin NULL-overwrite + 404), DELETE (rowCount + 404),
// y 500 en cada fallo de query.
//
// Patrón igual a server/tests/tables.test.js: mocks con vi.hoisted, Zod
// real (no se mockea ../middleware/validate.js), supertest + express.
//
// Ejecutar: npx vitest run server/tests/categories.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

// ── Mocks con vi.hoisted para evitar ReferenceError ────────────
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

// ── Importar rutas después de vi.mock ──────────────────────────
import categoriesRoutes from '../routes/categories.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', categoriesRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ── GET /api/categories ────────────────────────────────────────
describe('GET /api/categories', () => {
  it('devuelve todas las categorías', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'cat_1', name: 'Pizzas' }] });

    const res = await supertest(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'cat_1', name: 'Pizzas' }]);
    expect(mockQuery.mock.calls[0][0]).toBe('SELECT * FROM categories ORDER BY id');
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/categories');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error fetching categories' });
  });
});

// ── POST /api/categories ───────────────────────────────────────
describe('POST /api/categories', () => {
  it('rechaza con 400 un body sin name (Zod real)', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/categories').send({ icon: 'pizza' });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('crea la categoría y devuelve 201 con id generado', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).post('/api/categories').send({ name: 'Bebidas', icon: 'drink', color: '#00f' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Bebidas');
    expect(res.body.id).toMatch(/^cat_/);
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO categories');
    expect(mockQuery.mock.calls[0][1]).toEqual([expect.any(String), 'Bebidas', 'drink', '#00f']);
  });

  it('responde 500 si el INSERT falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).post('/api/categories').send({ name: 'Pizzas' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error creating category' });
  });
});

// ── PUT /api/categories/:id ────────────────────────────────────
describe('PUT /api/categories/:id', () => {
  it('actualiza solo las columnas enviadas (sin NULL-overwrite)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [{ id: 'cat_1', name: 'Nuevo' }] });

    const res = await supertest(app).put('/api/categories/cat_1').send({ name: 'Nuevo' });

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toBe('UPDATE categories SET name = $1 WHERE id = $2');
    expect(mockQuery.mock.calls[0][1]).toEqual(['Nuevo', 'cat_1']);
    expect(mockQuery.mock.calls[1][0]).toBe('SELECT * FROM categories WHERE id = $1');
  });

  it('404 si la categoría no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).put('/api/categories/cat_zzz').send({ name: 'X' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Category not found' });
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).put('/api/categories/cat_1').send({ name: 'X' });

    expect(res.status).toBe(500);
  });
});

// ── DELETE /api/categories/:id ─────────────────────────────────
describe('DELETE /api/categories/:id', () => {
  it('elimina la categoría y devuelve success', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).delete('/api/categories/cat_1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockQuery.mock.calls[0][0]).toBe('DELETE FROM categories WHERE id = $1');
  });

  it('404 si la categoría no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app).delete('/api/categories/cat_zzz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Category not found' });
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).delete('/api/categories/cat_1');

    expect(res.status).toBe(500);
  });
});
