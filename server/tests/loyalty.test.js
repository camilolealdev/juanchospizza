// Tests de integración para server/routes/loyalty.js (recompensas + puntos:
// dinero y saldo de clientes -- ruta sensible). Cubre:
//   - CRUD de rewards con Zod real (puntosCosto/valor obligatorios)
//   - POST /api/loyalty/points: transacción real (BEGIN/COMMIT/ROLLBACK),
//     saldo insuficiente → 400 con ROLLBACK, update con guard puntos+$1>=0
//   - GET /api/loyalty/points/:clientId
// Patrón igual a server/tests/inventory.test.js (mocks vi.hoisted, supertest).
// Ejecutar: npx vitest run server/tests/loyalty.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

const { mockQuery, mockPool } = vi.hoisted(() => {
  const mockQuery = vi.fn();
  // pool.query (CRUD simple) y pool.connect (transacción de puntos) comparten
  // el mismo mock: las queries dentro de la transacción van a client.query
  // (fakeClient abajo), el resto a pool.query.
  return {
    mockQuery,
    mockPool: { connect: vi.fn(), query: mockQuery },
  };
});

vi.mock('../db.js', () => ({
  pool: mockPool,
}));

vi.mock('../auth.js', () => ({
  authMiddleware: (req, _res, next) => {
    req.auth = { role: 'ADMIN', sub: 'emp_1' };
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

import loyaltyRoutes from '../routes/loyalty.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', loyaltyRoutes);
  return app;
}

// Cliente transaccional falso: las queries dentro de la transacción van a
// client.query (mismo mock que pool.query para simplificar las secuencias).
function fakeClient() {
  return {
    query: vi.fn(),
    BEGIN: 'BEGIN',
    COMMIT: 'COMMIT',
    ROLLBACK: 'ROLLBACK',
    release: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockPool.connect.mockReset();
});

describe('GET /api/loyalty/rewards', () => {
  it('lista solo recompensas vigentes', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'rwd_1', nombre: 'Panzerotti gratis' }] });

    const res = await supertest(app).get('/api/loyalty/rewards');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'rwd_1', nombre: 'Panzerotti gratis' }]);
    const sql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(sql).toContain('SELECT * FROM loyalty_rewards WHERE vigente = 1');
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/loyalty/rewards');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error fetching rewards' });
  });
});

describe('POST /api/loyalty/rewards', () => {
  it('crea una recompensa con Zod real', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app)
      .post('/api/loyalty/rewards')
      .send({
        nombre: '2x1 panzerotti',
        descripcion: 'Vigencia 30 días',
        puntosCosto: 150,
        tipo: 'descuento',
        valor: 15000,
      });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('2x1 panzerotti');
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO loyalty_rewards');
    expect(mockQuery.mock.calls[0][1]).toHaveLength(7); // id + 6 campos
  });

  it('400 si falta puntosCosto (obligatorio)', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/loyalty/rewards').send({ nombre: 'X', valor: 1000 });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('400 si el valor es negativo', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/loyalty/rewards').send({ nombre: 'X', puntosCosto: 10, valor: -100 });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/loyalty/rewards/:id', () => {
  it('actualiza solo las columnas enviadas', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'rwd_1', puntosCosto: 200 }] });

    const res = await supertest(app).put('/api/loyalty/rewards/rwd_1').send({ puntosCosto: 200 });

    expect(res.status).toBe(200);
    expect(res.body.puntosCosto).toBe(200);
    const sql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(sql).toContain('UPDATE loyalty_rewards SET "puntosCosto" = $1 WHERE id = $2');
    expect(mockQuery.mock.calls[0][1]).toEqual([200, 'rwd_1']);
  });

  it('404 si la recompensa no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    const res = await supertest(app).put('/api/loyalty/rewards/rwd_zzz').send({ valor: 100 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Reward not found' });
  });
});

describe('DELETE /api/loyalty/rewards/:id', () => {
  it('borra la recompensa', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).delete('/api/loyalty/rewards/rwd_1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('404 si no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app).delete('/api/loyalty/rewards/rwd_zzz');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/loyalty/points (transacción)', () => {
  it('suma puntos y hace COMMIT', async () => {
    const app = createApp();
    const client = fakeClient();
    mockPool.connect.mockResolvedValueOnce(client);
    // BEGIN + INSERT loyalty_points + UPDATE clients, todos OK (rowCount 1)
    client.query.mockResolvedValue({ rowCount: 1 });

    const res = await supertest(app)
      .post('/api/loyalty/points')
      .send({ clientId: 'cli_1', puntos: 50, concepto: 'Compra #100' });

    expect(res.status).toBe(201);
    expect(client.query.mock.calls[0][0]).toBe('BEGIN');
    expect(client.query.mock.calls[1][0]).toContain('INSERT INTO loyalty_points');
    const updateSql = String(client.query.mock.calls[2][0]).replace(/\s+/g, ' ').trim();
    expect(updateSql).toContain('UPDATE clients SET puntos = puntos + $1');
    expect(updateSql).toContain('puntos + $1 >= 0'); // guard server-side anti-negativo
    expect(client.query.mock.calls[2][1]).toEqual([50, 'cli_1']);
    expect(client.query.mock.calls[3][0]).toBe('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('saldo insuficiente (canje) → 400 con ROLLBACK y sin COMMIT', async () => {
    const app = createApp();
    const client = fakeClient();
    mockPool.connect.mockResolvedValueOnce(client);
    // BEGIN ok, INSERT ok, UPDATE no afecta filas (saldo insuficiente)
    client.query
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app)
      .post('/api/loyalty/points')
      .send({ clientId: 'cli_1', puntos: -999, concepto: 'Canje' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Saldo insuficiente' });
    expect(client.query.mock.calls.some(([sql]) => sql === 'ROLLBACK')).toBe(true);
    expect(client.query.mock.calls.some(([sql]) => sql === 'COMMIT')).toBe(false);
    expect(client.release).toHaveBeenCalled();
  });

  it('400 si falta clientId o puntos no es numérico', async () => {
    const app = createApp();

    const res1 = await supertest(app).post('/api/loyalty/points').send({ puntos: 10, concepto: 'X' });
    expect(res1.status).toBe(400);

    const res2 = await supertest(app)
      .post('/api/loyalty/points')
      .send({ clientId: 'cli_1', puntos: 'abc', concepto: 'X' });
    expect(res2.status).toBe(400);

    expect(mockPool.connect).not.toHaveBeenCalled();
  });

  it('error de DB → 500 con ROLLBACK', async () => {
    const app = createApp();
    const client = fakeClient();
    mockPool.connect.mockResolvedValueOnce(client);
    client.query.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).post('/api/loyalty/points').send({ clientId: 'cli_1', puntos: 10, concepto: 'X' });

    expect(res.status).toBe(500);
    expect(client.query.mock.calls.some(([sql]) => sql === 'ROLLBACK')).toBe(true);
    expect(client.release).toHaveBeenCalled();
  });
});

describe('GET /api/loyalty/points/:clientId', () => {
  it('lista el historial de puntos del cliente', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'lpt_1', puntos: 50 }] });

    const res = await supertest(app).get('/api/loyalty/points/cli_1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'lpt_1', puntos: 50 }]);
    const sql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(sql).toContain('SELECT * FROM loyalty_points WHERE "clientId" = $1 ORDER BY creado DESC');
    expect(mockQuery.mock.calls[0][1]).toEqual(['cli_1']);
  });
});
