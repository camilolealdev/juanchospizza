// Tests de integración para server/routes/finance.js.
// Completa la triada de rutas críticas (products, clients, finance).
// Cubre: GET /api/expenses (con/sin rango de fechas), POST (Zod real: monto
// requerido > 0), PUT dinámico (solo columnas enviadas + 404), DELETE (204/404)
// y GET /api/finance/summary (agregaciones + rango).
//
// Patrón igual a server/tests/campaigns.test.js: mocks con vi.hoisted, Zod
// real, supertest + express.
//
// Ejecutar: npx vitest run server/tests/finance.test.js

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

import financeRoutes from '../routes/finance.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', financeRoutes);
  return app;
}

function validExpense(overrides = {}) {
  return {
    categoria: 'Insumos',
    descripcion: 'Harina y queso',
    monto: 150000,
    metodo: 'efectivo',
    proveedor: 'Distribuidora XYZ',
    factura: 'FAC-001',
    notas: 'Compra semanal',
    recurrente: true,
    locationId: 'nemocon',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ── GET /api/expenses ──────────────────────────────────────────
describe('GET /api/expenses', () => {
  it('lista gastos con LIMIT 100 y ORDER BY fecha DESC', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'exp_1', monto: 50000 }] });

    const res = await supertest(app).get('/api/expenses');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const sql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(sql).toContain('SELECT * FROM expenses');
    expect(sql).toContain('ORDER BY fecha DESC LIMIT 100');
    // Sin rango de fechas → sin WHERE y sin params.
    expect(mockQuery.mock.calls[0][1]).toEqual([]);
  });

  it('filtra por rango de fechas cuando llegan desde/hasta', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).get('/api/expenses?desde=2026-08-01&hasta=2026-08-31');

    expect(res.status).toBe(200);
    const sql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(sql).toContain('WHERE fecha >= $1 AND fecha <= $2');
    expect(mockQuery.mock.calls[0][1]).toEqual(['2026-08-01', '2026-08-31']);
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/expenses');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error fetching expenses' });
  });
});

// ── POST /api/expenses ─────────────────────────────────────────
describe('POST /api/expenses', () => {
  it('rechaza con 400 un monto ausente (Zod real: requiredPositiveNumber)', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/expenses')
      .send(validExpense({ monto: undefined }));

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rechaza con 400 una categoría vacía', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/expenses')
      .send(validExpense({ categoria: '' }));

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('crea el gasto con locationId por defecto nemocon', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).post('/api/expenses').send(validExpense());

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^exp_/);
    const params = mockQuery.mock.calls[0][1];
    // [id, categoria, descripcion, monto, fecha, metodo, proveedor, factura, notas, recurrente, locationId]
    expect(params[1]).toBe('Insumos');
    expect(params[3]).toBe(150000);
    expect(params[9]).toBe(true);
    expect(params[10]).toBe('nemocon');
  });

  it('responde 500 si el INSERT falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).post('/api/expenses').send(validExpense());

    expect(res.status).toBe(500);
  });
});

// ── PUT /api/expenses/:id ──────────────────────────────────────
describe('PUT /api/expenses/:id', () => {
  it('actualiza solo las columnas enviadas (update dinámico)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).put('/api/expenses/exp_1').send({ monto: 200000 });

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toBe('UPDATE expenses SET monto = $1 WHERE id = $2');
    expect(mockQuery.mock.calls[0][1]).toEqual([200000, 'exp_1']);
  });

  it('400 si el body no trae nada para actualizar', async () => {
    const app = createApp();

    const res = await supertest(app).put('/api/expenses/exp_1').send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Nada para actualizar' });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('404 si el gasto no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app).put('/api/expenses/exp_zzz').send({ monto: 100 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Gasto no encontrado' });
  });
});

// ── DELETE /api/expenses/:id ───────────────────────────────────
describe('DELETE /api/expenses/:id', () => {
  it('elimina el gasto con 204', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).delete('/api/expenses/exp_1');

    expect(res.status).toBe(204);
    expect(mockQuery.mock.calls[0][0]).toBe('DELETE FROM expenses WHERE id = $1');
    expect(mockQuery.mock.calls[0][1]).toEqual(['exp_1']);
  });

  it('404 si el gasto no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app).delete('/api/expenses/exp_zzz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Gasto no encontrado' });
  });
});

// ── GET /api/finance/summary ───────────────────────────────────
describe('GET /api/finance/summary', () => {
  it('agrega ingresos, egresos, utilidad, órdenes, clientes y categorías', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 500000 }] }) // ingresos
      .mockResolvedValueOnce({ rows: [{ total: 150000 }] }) // egresos
      .mockResolvedValueOnce({ rows: [{ count: 42 }] }) // órdenes
      .mockResolvedValueOnce({ rows: [{ count: 7 }] }) // clientes
      .mockResolvedValueOnce({ rows: [{ categoria: 'Insumos', total: 150000 }] }); // gastos por categoría

    const res = await supertest(app).get('/api/finance/summary');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ingresos: 500000,
      egresos: 150000,
      utilidad: 350000,
      totalOrdenes: 42,
      totalClientes: 7,
      gastosPorCategoria: [{ categoria: 'Insumos', total: 150000 }],
    });
    // 5 queries, todas sin params (sin rango).
    expect(mockQuery).toHaveBeenCalledTimes(5);
    mockQuery.mock.calls.forEach(([, params]) => expect(params).toEqual([]));
  });

  it('pasa el rango de fechas a todas las agregaciones', async () => {
    const app = createApp();
    mockQuery.mockResolvedValue({ rows: [{ total: 0 }, { count: 0 }] });

    const res = await supertest(app).get('/api/finance/summary?desde=2026-08-01&hasta=2026-08-31');

    expect(res.status).toBe(200);
    // Cada una de las 5 queries recibe [desde, hasta].
    mockQuery.mock.calls.forEach(([, params]) => expect(params).toEqual(['2026-08-01', '2026-08-31']));
  });

  it('responde 500 si alguna query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/finance/summary');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error fetching finance summary' });
  });
});
