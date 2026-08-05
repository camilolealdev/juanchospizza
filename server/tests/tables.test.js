// Tests de integración para server/routes/tables.js.
// Cubre:
//   1. GET /api/tables + /api/tables/floor-plan — scoping por sede (High #5
//      de AUDIT_2026-07-30): un OPERATOR que OMITE locationId ve SOLO su sede
//      (effectiveLocationId forzado server-side), un ADMIN ve todas
//   2. DELETE /api/tables/:id — baja lógica (active=false), no borra la fila
//      (comandas y el floor-plan referencian las mesas)
//   3. Notificación WebSocket (notifyTableUpdate) para que el plano se
//      actualice en vivo
//   4. 404 cuando la mesa no existe, 500 cuando la query falla
//
// Patrón igual a server/tests/orders.test.js: mocks con vi.hoisted, Zod real,
// supertest + express. El rol (ADMIN-only de POST/PUT/DELETE) lo valida
// requireRole, que acá se mockea como pass-through — el permiso en sí es
// responsabilidad de auth.js. requireSameLocation también se mockea (el 403
// por mismatch explícito es su unit) — el scoping por sede OCIDO se prueba
// con effectiveLocationId, que es el fix de este archivo.
//
// Ejecutar: npx vitest run server/tests/tables.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

// ── Mocks con vi.hoisted para evitar ReferenceError ────────────
const { mockQuery, mockNotifyTableUpdate, mockAuth } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockNotifyTableUpdate: vi.fn(),
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

vi.mock('../websocket.js', () => ({
  notifyTableUpdate: mockNotifyTableUpdate,
}));

// ── Importar rutas después de vi.mock ──────────────────────────
import tablesRoutes from '../routes/tables.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', tablesRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockAuth.role = 'ADMIN';
  mockAuth.sub = 'emp_1';
  mockAuth.locationId = 'nemocon';
});

// ── GET /api/tables (scoping por sede — High #5) ───────────────
describe('GET /api/tables (scoping por sede)', () => {
  it('ADMIN sin locationId ve todas las sedes (sin filtro de sede)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'tbl_1', locationId: 'nemocon' }] });

    const res = await supertest(app).get('/api/tables');

    expect(res.status).toBe(200);
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).not.toContain('"locationId" =');
  });

  it('OPERATOR sin locationId en el query ve SOLO su sede (filtro forzado server-side)', async () => {
    const app = createApp();
    mockAuth.role = 'OPERATOR';
    mockAuth.locationId = 'zipaquira';
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'tbl_1', locationId: 'zipaquira' }] });

    const res = await supertest(app).get('/api/tables');

    expect(res.status).toBe(200);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('"locationId" = $1');
    expect(params).toEqual(['zipaquira']);
  });

  it('OPERATOR conserva filtros extra (area/status) junto con el de sede', async () => {
    const app = createApp();
    mockAuth.role = 'OPERATOR';
    mockAuth.locationId = 'nemocon';
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).get('/api/tables?area=salon&status=occupied');

    expect(res.status).toBe(200);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('"locationId" = $1');
    expect(sql).toContain('area = $2');
    expect(sql).toContain('status = $3');
    expect(params).toEqual(['nemocon', 'salon', 'occupied']);
  });
});

// ── GET /api/tables/floor-plan (scoping por sede) ───────────────
describe('GET /api/tables/floor-plan (scoping por sede)', () => {
  it('OPERATOR sin locationId ve solo su sede y el response refleja esa sede', async () => {
    const app = createApp();
    mockAuth.role = 'OPERATOR';
    mockAuth.locationId = 'zipaquira';
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).get('/api/tables/floor-plan');

    expect(res.status).toBe(200);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('AND "locationId" = $1');
    expect(params).toEqual(['zipaquira']);
    // El response ya no dice 'all' para un OPERATOR: refleja su sede real
    expect(res.body.locationId).toBe('zipaquira');
  });

  it('ADMIN sin locationId ve el plano completo (response locationId = all)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).get('/api/tables/floor-plan');

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).not.toContain('AND "locationId" =');
    expect(res.body.locationId).toBe('all');
  });
});

// ── DELETE /api/tables/:id ─────────────────────────────────────
describe('DELETE /api/tables/:id', () => {
  it('da de baja la mesa con active=false (baja lógica) y notifica por WebSocket', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'tbl_1', name: 'M1', status: 'occupied' }] });

    const res = await supertest(app).delete('/api/tables/tbl_1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'tbl_1', active: false });
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE dining_tables SET active = false');
    expect(mockQuery.mock.calls[0][1]).toEqual(['tbl_1']);
    await vi.waitFor(() => expect(mockNotifyTableUpdate).toHaveBeenCalledWith('tbl_1', 'occupied'));
  });

  it('404 si la mesa no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).delete('/api/tables/tbl_zzz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Mesa no encontrada' });
    expect(mockNotifyTableUpdate).not.toHaveBeenCalled();
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).delete('/api/tables/tbl_1');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error deleting table' });
    expect(mockNotifyTableUpdate).not.toHaveBeenCalled();
  });
});
