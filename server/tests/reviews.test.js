// Tests de integración para server/routes/reviews.js.
// Cubre las reglas de negocio de reseñas:
//   1. POST /api/reviews — público con rate limit; 404 pedido inexistente,
//      400 pedido no COMPLETED, 403 teléfono no coincide, 409 reseña
//      duplicada, 201 happy path
//   2. GET /api/reviews/approved — público, proyección sin PII
//   3. GET /api/reviews — listado auth con filtro por status
//   4. PATCH /api/reviews/:id/status — aprobar/rechazar
//   5. DELETE /api/reviews/:id
//
// Patrón igual a server/tests/orders.test.js: mocks con vi.hoisted, Zod real,
// supertest + express. reviewRateLimit se mockea como pass-through (su
// comportamiento es unit de ../middleware/rateLimit.js).
//
// Ejecutar: npx vitest run server/tests/reviews.test.js

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

vi.mock('../middleware/rateLimit.js', () => ({
  reviewRateLimit: (_req, _res, next) => next(),
}));

import reviewsRoutes from '../routes/reviews.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', reviewsRoutes);
  return app;
}

function validReview(overrides = {}) {
  return {
    orderId: 'ord_1',
    clientPhone: '3001234567',
    clientName: 'Pepe',
    rating: 5,
    comment: 'Excelente',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ── POST /api/reviews ──────────────────────────────────────────
describe('POST /api/reviews (público + rate limit)', () => {
  it('rechaza con 400 un rating fuera de 1-5 (Zod real)', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/reviews')
      .send(validReview({ rating: 7 }));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('calificación');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('404 si el pedido no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).post('/api/reviews').send(validReview());

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Pedido no encontrado' });
  });

  it('400 si el pedido no está COMPLETED', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'PENDING', customerPhone: '3001234567' }] });

    const res = await supertest(app).post('/api/reviews').send(validReview());

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('completado');
  });

  it('403 si el teléfono no coincide con el del pedido', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'COMPLETED', customerPhone: '9999999999' }] });

    const res = await supertest(app).post('/api/reviews').send(validReview());

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('no coincide');
  });

  it('409 si el pedido ya tiene reseña', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'COMPLETED', customerPhone: '3001234567' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'rev_1' }] });

    const res = await supertest(app).post('/api/reviews').send(validReview());

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('ya tiene una reseña');
  });

  it('crea la reseña en status pending', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ status: 'COMPLETED', customerPhone: '3001234567' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).post('/api/reviews').send(validReview());

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^rev_/);
    expect(res.body.status).toBe('pending');
    expect(mockQuery.mock.calls[2][0]).toContain("VALUES ($1,$2,$3,$4,$5,$6,'pending')");
  });
});

// ── GET /api/reviews/approved ──────────────────────────────────
describe('GET /api/reviews/approved', () => {
  it('devuelve solo reseñas aprobadas con proyección pública', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'rev_1', rating: 5 }] });

    const res = await supertest(app).get('/api/reviews/approved');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain("WHERE status = 'approved'");
    expect(sql).toContain('LIMIT 50');
    // Sin datos sensibles (orderId, clientPhone)
    expect(sql).not.toContain('clientPhone');
  });
});

// ── GET /api/reviews ───────────────────────────────────────────
describe('GET /api/reviews', () => {
  it('lista reseñas con filtro de status', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'rev_1', status: 'pending' }] });

    const res = await supertest(app).get('/api/reviews?status=pending');

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE status = $1');
    expect(mockQuery.mock.calls[0][1]).toEqual(['pending']);
  });

  it('lista todas cuando no hay status', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await supertest(app).get('/api/reviews');

    expect(mockQuery.mock.calls[0][0]).not.toContain('WHERE');
  });
});

// ── PATCH /api/reviews/:id/status ──────────────────────────────
describe('PATCH /api/reviews/:id/status', () => {
  it('actualiza el status con RETURNING', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'rev_1', status: 'approved' }] });

    const res = await supertest(app).patch('/api/reviews/rev_1/status').send({ status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE reviews SET status = $1 WHERE id = $2 RETURNING *');
  });

  it('rechaza con 400 un status inválido (Zod real)', async () => {
    const app = createApp();

    const res = await supertest(app).patch('/api/reviews/rev_1/status').send({ status: 'BOGUS' });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('404 si la reseña no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).patch('/api/reviews/rev_zzz/status').send({ status: 'approved' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Review not found' });
  });
});

// ── DELETE /api/reviews/:id ────────────────────────────────────
describe('DELETE /api/reviews/:id', () => {
  it('elimina la reseña con 204', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).delete('/api/reviews/rev_1');

    expect(res.status).toBe(204);
  });

  it('404 si la reseña no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app).delete('/api/reviews/rev_zzz');

    expect(res.status).toBe(404);
  });
});
