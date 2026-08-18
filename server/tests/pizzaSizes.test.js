// Tests de integración para server/routes/pizzaSizes.js (tamaños de pizza:
// precios del menú y del armador "Crea tu pizza" -- ruta de dinero).
// Cubre GET público, POST/PUT/DELETE con rol ADMIN/MARKETING, Zod real y 500.
// Patrón igual a server/tests/inventory.test.js.
// Ejecutar: npx vitest run server/tests/pizzaSizes.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../auth.js', () => ({
  authMiddleware: (req, _res, next) => {
    req.auth = { role: 'ADMIN', sub: 'emp_1' };
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

import pizzaSizesRoutes from '../routes/pizzaSizes.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', pizzaSizesRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('GET /api/pizza-sizes', () => {
  it('lista tamaños ordenados por precio ASC', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'psz_1', nombre: 'Junior' }] });

    const res = await supertest(app).get('/api/pizza-sizes');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'psz_1', nombre: 'Junior' }]);
    const sql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(sql).toContain('SELECT * FROM pizza_sizes ORDER BY precio ASC');
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/pizza-sizes');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error fetching pizza sizes' });
  });
});

describe('POST /api/pizza-sizes', () => {
  it('crea un tamaño con Zod real (precio/clamp obligatorios)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app)
      .post('/api/pizza-sizes')
      .send({ nombre: 'Familiar', precio: 85000, incluidos: 4, porciones: 8, activo: true });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('Familiar');
    expect(res.body.precio).toBe(85000);
    // INSERT con 6 params: id + nombre/precio/incluidos/porciones/activo.
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO pizza_sizes');
    expect(mockQuery.mock.calls[0][1]).toHaveLength(6);
  });

  it('400 si falta precio (campo requerido del schema)', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/pizza-sizes').send({ nombre: 'Junior' });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('400 si el precio es negativo', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/pizza-sizes')
      .send({ nombre: 'Junior', precio: -500, incluidos: 1, activo: true });

    expect(res.status).toBe(400);
  });

  it('responde 500 si el INSERT falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app)
      .post('/api/pizza-sizes')
      .send({ nombre: 'Mediana', precio: 50000, incluidos: 2, activo: true });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error creating pizza size' });
  });
});

describe('PUT /api/pizza-sizes/:id', () => {
  it('actualiza solo las columnas enviadas (update parcial)', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'psz_1', nombre: 'Familiar', precio: 90000 }] });

    const res = await supertest(app).put('/api/pizza-sizes/psz_1').send({ precio: 90000 });

    expect(res.status).toBe(200);
    expect(res.body.precio).toBe(90000);
    const sql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(sql).toContain('UPDATE pizza_sizes SET precio = $1 WHERE id = $2');
    expect(mockQuery.mock.calls[0][1]).toEqual([90000, 'psz_1']);
  });

  it('404 si el tamaño no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    const res = await supertest(app).put('/api/pizza-sizes/psz_zzz').send({ precio: 100 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Pizza size not found' });
  });

  it('clampa valores fuera de rango en vez de rechazarlos (incluidos 999 → 20)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [{ id: 'psz_1', incluidos: 20 }] });

    const res = await supertest(app).put('/api/pizza-sizes/psz_1').send({ incluidos: 999 });

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual([20, 'psz_1']); // clampeado a 20
  });
});

describe('DELETE /api/pizza-sizes/:id', () => {
  it('borra el tamaño y devuelve success', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).delete('/api/pizza-sizes/psz_1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockQuery.mock.calls[0][0]).toBe('DELETE FROM pizza_sizes WHERE id = $1');
    expect(mockQuery.mock.calls[0][1]).toEqual(['psz_1']);
  });

  it('404 si el tamaño no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app).delete('/api/pizza-sizes/psz_zzz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Pizza size not found' });
  });
});
