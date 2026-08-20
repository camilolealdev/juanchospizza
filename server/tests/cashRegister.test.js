// Tests de integración para server/routes/cashRegister.js (caja + propinas:
// dinero -- la ruta de reconciliación esperado vs real del informe).
// Cubre:
//   - GET /api/cash-register con filtros locationId/status
//   - POST /api/cash-register/open: 409 si ya hay caja abierta en la sede,
//     openedBy desde el token (nunca del body)
//   - POST /api/cash-register/:id/close: recalcula expectedAmount con ventas
//     reales paidOnly de la sede, difference = final - expected, 404 si no
//     hay caja abierta
//   - POST /api/tips: sede efectiva desde el token para no-ADMIN
// Patrón igual a server/tests/inventory.test.js.
// Ejecutar: npx vitest run server/tests/cashRegister.test.js
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
  requireRole: () => (_req, _res, next) => next(),
  requireSameLocation: () => (_req, _res, next) => next(),
}));

import cashRegisterRoutes from '../routes/cashRegister.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', cashRegisterRoutes);
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

describe('GET /api/cash-register', () => {
  it('lista registros sin filtros ordenados por openedAt DESC', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'cr_1', status: 'open' }] });

    const res = await supertest(app).get('/api/cash-register');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'cr_1', status: 'open' }]);
    const sql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(sql).toContain('SELECT * FROM cash_register ORDER BY "openedAt" DESC');
    expect(mockQuery.mock.calls[0][1]).toEqual([]);
  });

  it('filtra por locationId y status con params posicionales', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).get('/api/cash-register?locationId=nemocon&status=open');

    expect(res.status).toBe(200);
    const sql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(sql).toContain('WHERE "locationId" = $1 AND status = $2');
    expect(mockQuery.mock.calls[0][1]).toEqual(['nemocon', 'open']);
  });
});

describe('POST /api/cash-register/open', () => {
  it('abre caja: openedBy desde el token, expectedAmount = initialAmount', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // sin caja abierta
      .mockResolvedValueOnce({ rowCount: 1 }); // INSERT

    const res = await supertest(app)
      .post('/api/cash-register/open')
      .send({ locationId: 'nemocon', initialAmount: 50000, notes: 'Apertura' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ locationId: 'nemocon', openedBy: 'emp_1', initialAmount: 50000, status: 'open' });
    const insertSql = String(mockQuery.mock.calls[1][0]).replace(/\s+/g, ' ').trim();
    expect(insertSql).toContain('INSERT INTO cash_register');
    expect(mockQuery.mock.calls[1][1]).toEqual(
      ['cr_', 'nemocon', 'emp_1', 50000, 50000, 'Apertura'].map((v, i) => (i === 0 ? expect.stringMatching(/^cr_/) : v))
    );
  });

  it('409 si ya hay una caja abierta en la sede', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'cr_abierta' }] });

    const res = await supertest(app)
      .post('/api/cash-register/open')
      .send({ locationId: 'nemocon', initialAmount: 10000 });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Ya hay una caja abierta');
    expect(mockQuery.mock.calls.length).toBe(1); // sin INSERT
  });

  it('400 si locationId no es sede válida', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/cash-register/open')
      .send({ locationId: 'bogota', initialAmount: 10000 });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/cash-register/:id/close', () => {
  it('recalcula expectedAmount con ventas paidOnly de la sede y calcula difference', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'cr_1',
            locationId: 'nemocon',
            openedBy: 'emp_1',
            openedAt: '2026-08-17T10:00:00Z',
            initialAmount: 50000,
          },
        ],
      }) // caja abierta
      .mockResolvedValueOnce({ rows: [{ total: 120000 }] }) // ventas reales
      .mockResolvedValueOnce({ rowCount: 1 }); // UPDATE

    const res = await supertest(app).post('/api/cash-register/cr_1/close').send({ finalAmount: 180000 });

    expect(res.status).toBe(200);
    expect(res.body.expectedAmount).toBe(170000); // 50000 + 120000
    expect(res.body.difference).toBe(10000); // 180000 - 170000
    expect(res.body.status).toBe('closed');

    // La query de ventas filtra por sede + desde apertura + paidOnly/cash/card
    const salesSql = String(mockQuery.mock.calls[1][0]).replace(/\s+/g, ' ').trim();
    expect(salesSql).toContain('SELECT COALESCE(SUM(total), 0)::int as total FROM orders');
    expect(salesSql).toContain("\"paymentStatus\" = 'paid' OR \"paymentMethod\" IN ('cash', 'card')");
    expect(mockQuery.mock.calls[1][1]).toEqual(['nemocon', '2026-08-17T10:00:00Z']);
  });

  it('404 si la caja no existe o ya está cerrada', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).post('/api/cash-register/cr_zzz/close').send({ finalAmount: 100 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Caja no encontrada o ya está cerrada' });
  });

  it('400 si finalAmount es negativo', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/cash-register/cr_1/close').send({ finalAmount: -5 });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/tips (sede efectiva desde token para no-ADMIN)', () => {
  it('ADMIN sin locationId en body → default nemocon', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).post('/api/tips').send({ orderId: 'ORD-1', amount: 5000 });

    expect(res.status).toBe(201);
    expect(res.body.locationId).toBe('nemocon');
    const params = mockQuery.mock.calls[0][1];
    expect(params[5]).toBe('nemocon');
  });

  it('OPERATOR → la sede sale del token, no del body ni de un default', async () => {
    const app = createApp();
    mockAuth.role = 'OPERATOR';
    mockAuth.locationId = 'zipaquira';
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).post('/api/tips').send({ orderId: 'ORD-2', amount: 8000, locationId: 'nemocon' }); // body mintiendo

    expect(res.status).toBe(201);
    expect(res.body.locationId).toBe('zipaquira'); // token gana
    expect(mockQuery.mock.calls[0][1][5]).toBe('zipaquira');
  });

  it('400 si amount no es mayor a 0', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/tips').send({ orderId: 'ORD-1', amount: 0 });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/tips/summary', () => {
  it('agrega total y count con filtros', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ total: 13000, count: 2 }] });

    const res = await supertest(app).get('/api/tips/summary?locationId=nemocon');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ total: 13000, count: 2 });
    const sql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(sql).toContain('SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM tips');
    expect(mockQuery.mock.calls[0][1]).toEqual(['nemocon']);
  });
});
