// Tests de integración para el verbo DELETE de server/routes/inventory.js.
// Cubre:
//   1. DELETE /api/inventory/:id — baja lógica (activo=false), no borra la fila
//      (inventory_movements referencia itemId; el historial es auditoría)
//   2. Check de sede: un OPERATOR solo puede dar de baja ítems de SU sede (403
//      para ítems de la otra), mismo criterio que PUT/movement
//   3. 404 cuando el ítem no existe, 500 cuando la query falla
//
// Patrón igual a server/tests/orders.test.js: mocks con vi.hoisted, Zod real,
// supertest + express. authMiddleware se mockea inyectando req.auth para poder
// probar los checks de rol/sede.
//
// Ejecutar: npx vitest run server/tests/inventory.test.js

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
import inventoryRoutes from '../routes/inventory.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', inventoryRoutes);
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

// ── DELETE /api/inventory/:id ──────────────────────────────────
describe('DELETE /api/inventory/:id', () => {
  it('da de baja el ítem con activo=false (baja lógica, no borra la fila)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).delete('/api/inventory/inv_1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'inv_1', activo: false });
    expect(mockQuery.mock.calls[0][0]).toBe('UPDATE inventory_items SET activo = false WHERE id = $1');
    expect(mockQuery.mock.calls[0][1]).toEqual(['inv_1']);
  });

  it('404 si el ítem no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app).delete('/api/inventory/inv_zzz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Ítem no encontrado' });
  });

  it('403 si un OPERATOR intenta dar de baja un ítem de OTRA sede (no emite UPDATE)', async () => {
    const app = createApp();
    mockAuth.role = 'OPERATOR';
    mockAuth.locationId = 'zipaquira';
    mockQuery.mockResolvedValueOnce({ rows: [{ locationId: 'nemocon' }] });

    const res = await supertest(app).delete('/api/inventory/inv_1');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'No autorizado para operar en esta sede' });
    expect(mockQuery.mock.calls[0][0]).toContain('SELECT "locationId" FROM inventory_items');
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE inventory_items'))).toBe(false);
  });

  it('permite a un OPERATOR dar de baja un ítem de SU propia sede', async () => {
    const app = createApp();
    mockAuth.role = 'OPERATOR';
    mockAuth.locationId = 'nemocon';
    mockQuery.mockResolvedValueOnce({ rows: [{ locationId: 'nemocon' }] });
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).delete('/api/inventory/inv_1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'inv_1', activo: false });
    expect(mockQuery.mock.calls[1][0]).toContain('UPDATE inventory_items SET activo = false');
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).delete('/api/inventory/inv_1');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error deleting inventory item' });
  });
});

// ── GET /api/inventory/movements ───────────────────────────────
describe('GET /api/inventory/movements', () => {
  it('sin page/pageSize devuelve array con tope defensivo LIMIT 50 (back-compat)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'mov_1' }] });

    const res = await supertest(app).get('/api/inventory/movements');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const sql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(sql).toContain('SELECT m.* FROM inventory_movements m');
    expect(sql).toContain('ORDER BY m.creado DESC LIMIT 50');
    // Sin sede (ADMIN sin locationId) → sin JOIN y sin params.
    expect(mockQuery.mock.calls[0][1]).toEqual([]);
  });

  it('con page/pageSize devuelve shape paginado con COUNT(*)+LIMIT/OFFSET', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 7 }] }) // COUNT
      .mockResolvedValueOnce({ rows: [{ id: 'mov_2' }, { id: 'mov_1' }] }); // data

    const res = await supertest(app).get('/api/inventory/movements?page=2&pageSize=2');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [{ id: 'mov_2' }, { id: 'mov_1' }],
      total: 7,
      page: 2,
      pageSize: 2,
      totalPages: 4,
    });
    // COUNT sin LIMIT/OFFSET; SELECT con LIMIT 2 OFFSET 2.
    const countSql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(countSql).toContain('SELECT COUNT(*)::int AS total FROM inventory_movements m');
    expect(countSql).not.toContain('LIMIT');
    const selectSql = String(mockQuery.mock.calls[1][0]).replace(/\s+/g, ' ').trim();
    expect(selectSql).toContain('LIMIT $1 OFFSET $2');
    expect(mockQuery.mock.calls[1][1]).toEqual([2, 2]);
  });

  it('clampa pageSize a [1,500] y page inválido a 1', async () => {
    const app = createApp();
    mockQuery.mockResolvedValue({ rows: [{ total: 0 }] });

    const res = await supertest(app).get('/api/inventory/movements?page=0&pageSize=9999');

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(500);
  });

  it('pasa el locationId de la sede al JOIN y a los params de paginación', async () => {
    const app = createApp();
    mockAuth.role = 'OPERATOR';
    mockAuth.locationId = 'zipaquira';
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 3 }] }).mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).get('/api/inventory/movements?page=1&pageSize=10');

    expect(res.status).toBe(200);
    const joinSql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(joinSql).toContain('JOIN inventory_items i ON i.id = m."itemId" AND i."locationId" = $1');
    // COUNT recibe [zipaquira]; SELECT recibe [zipaquira, 10, 0].
    expect(mockQuery.mock.calls[0][1]).toEqual(['zipaquira']);
    expect(mockQuery.mock.calls[1][1]).toEqual(['zipaquira', 10, 0]);
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/inventory/movements');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error fetching movements' });
  });
});
