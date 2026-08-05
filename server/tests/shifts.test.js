// Tests de integración para los verbos PUT y DELETE de server/routes/shifts.js.
// Cubre:
//   1. PUT /api/shifts/:id — actualiza SOLO notas (metadatos); los montos los
//      manejan únicamente abrir/cerrar para no invalidar la reconciliación
//   2. DELETE /api/shifts/:id — SOLO ADMIN descarta un turno ABIERTO; un turno
//      cerrado es un registro financiero y se rechaza con 409
//   3. Check de sede como defensa en profundidad (mismo criterio que close: se
//      lee de la fila, no del request) + 404 + 500
//
// Patrón igual a server/tests/orders.test.js: mocks con vi.hoisted, Zod real,
// supertest + express. authMiddleware se mockea inyectando req.auth para poder
// probar los checks de rol/sede.
//
// Ejecutar: npx vitest run server/tests/shifts.test.js

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
  requireSameLocation: () => (_req, _res, next) => next(),
}));

// ── Importar rutas después de vi.mock ──────────────────────────
import shiftsRoutes from '../routes/shifts.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', shiftsRoutes);
  return app;
}

function mockShift(overrides = {}) {
  return {
    id: 'shift_1',
    locationId: 'nemocon',
    status: 'open',
    openingCash: 50000,
    closingCash: null,
    expectedCash: null,
    difference: null,
    openedBy: 'emp_1',
    closedBy: null,
    openedAt: '2026-08-05T00:00:00.000Z',
    closedAt: null,
    notas: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockAuth.role = 'ADMIN';
  mockAuth.sub = 'emp_1';
  mockAuth.locationId = 'nemocon';
});

// ── PUT /api/shifts/:id ────────────────────────────────────────
describe('PUT /api/shifts/:id', () => {
  it('actualiza notas y devuelve el turno (sin tocar montos)', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rows: [mockShift()] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [mockShift({ notas: 'Arqueo corregido' })] });

    const res = await supertest(app).put('/api/shifts/shift_1').send({ notas: 'Arqueo corregido' });

    expect(res.status).toBe(200);
    expect(res.body.notas).toBe('Arqueo corregido');
    expect(mockQuery.mock.calls[1][0]).toBe('UPDATE shifts SET notas = $1 WHERE id = $2');
    expect(mockQuery.mock.calls[1][1]).toEqual(['Arqueo corregido', 'shift_1']);
    // Nunca se construye un UPDATE que incluya montos
    expect(mockQuery.mock.calls.some(([sql]) => /openingCash|closingCash/.test(String(sql)))).toBe(false);
  });

  it('permite limpiar notas enviando null', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rows: [mockShift({ notas: 'vieja nota' })] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [mockShift({ notas: null })] });

    const res = await supertest(app).put('/api/shifts/shift_1').send({ notas: null });

    expect(res.status).toBe(200);
    expect(res.body.notas).toBeNull();
    expect(mockQuery.mock.calls[1][1]).toEqual([null, 'shift_1']);
  });

  it('rechaza con 400 notas que exceden 500 chars (Zod real, no toca la DB)', async () => {
    const app = createApp();

    const res = await supertest(app)
      .put('/api/shifts/shift_1')
      .send({ notas: 'x'.repeat(501) });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('404 si el turno no existe', async () => {
    const app = createApp();

    const res = await supertest(app).put('/api/shifts/shift_zzz').send({ notas: 'nueva' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Turno no encontrado' });
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE shifts'))).toBe(false);
  });

  it('403 si un OPERATOR edita un turno de OTRA sede', async () => {
    const app = createApp();
    mockAuth.role = 'OPERATOR';
    mockAuth.locationId = 'zipaquira';
    mockQuery.mockResolvedValueOnce({ rows: [mockShift({ locationId: 'nemocon' })] });

    const res = await supertest(app).put('/api/shifts/shift_1').send({ notas: 'x' });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'No autorizado para operar en esta sede' });
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE shifts'))).toBe(false);
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).put('/api/shifts/shift_1').send({ notas: 'x' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error updating shift' });
  });
});

// ── DELETE /api/shifts/:id ─────────────────────────────────────
describe('DELETE /api/shifts/:id', () => {
  it('descarta un turno abierto (sin registro financiero todavía)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [mockShift()] }).mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).delete('/api/shifts/shift_1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'shift_1', deleted: true });
    expect(mockQuery.mock.calls[1][0]).toBe('DELETE FROM shifts WHERE id = $1');
    expect(mockQuery.mock.calls[1][1]).toEqual(['shift_1']);
  });

  it('409 si el turno ya está cerrado (registro financiero protegido)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({
      rows: [mockShift({ status: 'closed', closingCash: 120000, expectedCash: 120000, difference: 0 })],
    });

    const res = await supertest(app).delete('/api/shifts/shift_1');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'No se puede eliminar un turno cerrado (registro financiero)' });
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('DELETE FROM shifts'))).toBe(false);
  });

  it('404 si el turno no existe', async () => {
    const app = createApp();

    const res = await supertest(app).delete('/api/shifts/shift_zzz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Turno no encontrado' });
  });

  it('403 si un OPERATOR (no-ADMIN) intenta descartar un turno (defensa en profundidad)', async () => {
    const app = createApp();
    mockAuth.role = 'OPERATOR';
    mockAuth.locationId = 'zipaquira';
    mockQuery.mockResolvedValueOnce({ rows: [mockShift({ locationId: 'nemocon' })] });

    const res = await supertest(app).delete('/api/shifts/shift_1');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'No autorizado para operar en esta sede' });
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('DELETE FROM shifts'))).toBe(false);
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).delete('/api/shifts/shift_1');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error deleting shift' });
  });
});
