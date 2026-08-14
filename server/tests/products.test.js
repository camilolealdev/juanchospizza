// Tests de integración para server/routes/products.js.
// Cubre: GET (listado + filtro por categoría), GET by id, POST, bulk import
// (best-effort por fila, límite 1000), PUT dinámico y DELETE.
//
// Patrón igual a server/tests/tables.test.js: mocks con vi.hoisted, Zod real,
// supertest + express.
//
// Ejecutar: npx vitest run server/tests/products.test.js

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

import productsRoutes from '../routes/products.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', productsRoutes);
  return app;
}

function validProduct(overrides = {}) {
  return {
    categoryId: 'pizzas',
    nombre: 'Margherita',
    descripcion: 'Clásica',
    basePrice: 45000,
    type: 'pizza',
    tiempo: 20,
    vegetariano: true,
    isPremium: false,
    exclusiva: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ── GET /api/products ──────────────────────────────────────────
describe('GET /api/products', () => {
  it('lista productos sin filtro', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'prod_1', nombre: 'Margherita' }] });

    const res = await supertest(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toBe('SELECT * FROM products');
  });

  it('filtra por categoría cuando ?category viene y no es "all"', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).get('/api/products?category=pizzas');

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE "categoryId" = $1');
    expect(mockQuery.mock.calls[0][1]).toEqual(['pizzas']);
  });

  it('ignora el filtro cuando category=all', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await supertest(app).get('/api/products?category=all');

    expect(mockQuery.mock.calls[0][0]).not.toContain('WHERE');
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/products');

    expect(res.status).toBe(500);
  });
});

// ── GET /api/products/:id ──────────────────────────────────────
describe('GET /api/products/:id', () => {
  it('devuelve el producto por id', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'prod_1', nombre: 'Margherita' }] });

    const res = await supertest(app).get('/api/products/prod_1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('prod_1');
  });

  it('404 si el producto no existe', async () => {
    const app = createApp();

    const res = await supertest(app).get('/api/products/prod_zzz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
  });
});

// ── POST /api/products ─────────────────────────────────────────
describe('POST /api/products', () => {
  it('rechaza con 400 un body sin nombre (Zod real)', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/products').send({ basePrice: 100 });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('crea el producto y devuelve 201 con id generado', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).post('/api/products').send(validProduct());

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^prod_/);
    expect(res.body.nombre).toBe('Margherita');
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO products');
  });

  it('responde 500 si el INSERT falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).post('/api/products').send(validProduct());

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error creating product' });
  });
});

// ── POST /api/products/bulk ────────────────────────────────────
describe('POST /api/products/bulk', () => {
  it('rechaza con 400 si no viene un array de products', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/products/bulk').send({ products: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Se esperaba');
  });

  it('rechaza con 400 más de 1000 productos', async () => {
    const app = createApp();
    // Objetos mínimos: el chequeo de >1000 corre ANTES de la validación Zod,
    // y un body con 1001 productos completos excedería el límite de 100kb de
    // express.json() (413 antes de llegar a la ruta).
    const rows = Array.from({ length: 1001 }, () => ({ nombre: 'x' }));

    const res = await supertest(app).post('/api/products/bulk').send({ products: rows });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Máximo 1000');
  });

  it('inserta filas válidas y reporta errores de filas inválidas (best-effort)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValue({ rowCount: 1 });

    const res = await supertest(app)
      .post('/api/products/bulk')
      .send({ products: [validProduct({ nombre: 'OK' }), { basePrice: 500 }] });

    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(1);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].row).toBe(2);
  });

  it('devuelve 400 cuando TODAS las filas fallan', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/products/bulk')
      .send({ products: [{ basePrice: 1 }, {}] });

    expect(res.status).toBe(400);
    expect(res.body.inserted).toBe(0);
    expect(res.body.errors).toHaveLength(2);
  });
});

// ── PUT /api/products/:id ──────────────────────────────────────
describe('PUT /api/products/:id', () => {
  it('actualiza solo las columnas enviadas', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [{ id: 'prod_1', nombre: 'X' }] });

    const res = await supertest(app).put('/api/products/prod_1').send({ nombre: 'X' });

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE products SET nombre = $1');
    expect(mockQuery.mock.calls[0][1]).toEqual(['X', 'prod_1']);
  });

  it('404 si el producto no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).put('/api/products/prod_zzz').send({ nombre: 'X' });

    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/products/:id ───────────────────────────────────
describe('DELETE /api/products/:id', () => {
  it('elimina el producto', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).delete('/api/products/prod_1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('404 si el producto no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app).delete('/api/products/prod_zzz');

    expect(res.status).toBe(404);
  });
});
