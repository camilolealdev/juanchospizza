// Tests de integración para server/routes/clients.js — el CRM de clientes.
// Cubre:
//   1. GET /api/clients — filtros estado/search, normalización tags/vip
//   2. GET /api/clients/:id — detalle + normalización
//   3. POST /api/clients — bienvenida por email (no bloqueante), 409 por
//      teléfono duplicado (23505)
//   4. PATCH /api/clients/:id — solo vip/notas/tags/estado
//   5. PUT /api/clients/:id — perfil completo (update dinámico), 409
//   6. DELETE /api/clients/:id — 204, 409 por FK a pedidos (23503)
//   7. GET /api/clients/:id/orders — historial (LIMIT 20)
//
// Patrón igual a server/tests/orders.test.js: mocks con vi.hoisted, Zod real,
// supertest + express.
//
// Ejecutar: npx vitest run server/tests/clients.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

const { mockQuery, mockAuth, mockSendEmail } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockAuth: { role: 'ADMIN', sub: 'emp_1', locationId: 'nemocon' },
  mockSendEmail: vi.fn(),
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

vi.mock('../services/email.js', () => ({
  sendTemplatedEmail: mockSendEmail,
  templates: { welcome: 'welcome' },
}));

vi.mock('../services/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import clientsRoutes from '../routes/clients.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', clientsRoutes);
  return app;
}

function mockClient(overrides = {}) {
  return {
    id: 'cli_1',
    nombre: 'Pepe',
    telefono: '3001234567',
    email: 'pepe@test.com',
    direccion: 'Calle 1',
    notas: null,
    totalCompras: 0,
    totalGastado: 0,
    vip: false,
    tags: [],
    estado: 'activo',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSendEmail.mockReset();
  mockSendEmail.mockResolvedValue({});
});

// ── GET /api/clients ───────────────────────────────────────────
describe('GET /api/clients', () => {
  it('lista clientes con tags/vip normalizados', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({
      rows: [mockClient({ tags: ['vip'], vip: true }), mockClient({ id: 'cli_2', tags: null, vip: 0 })],
    });

    const res = await supertest(app).get('/api/clients');

    expect(res.status).toBe(200);
    expect(res.body[0].tags).toEqual(['vip']);
    expect(res.body[0].vip).toBe(true);
    // tags null → [], vip 0 → false
    expect(res.body[1].tags).toEqual([]);
    expect(res.body[1].vip).toBe(false);
  });

  it('aplica filtros estado + search con ILIKE', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await supertest(app).get('/api/clients?estado=activo&search=pepe');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('estado = $1');
    expect(sql).toContain('(nombre ILIKE $2 OR telefono ILIKE $3)');
    expect(sql).toContain('ORDER BY "totalGastado" DESC');
    expect(params).toEqual(['activo', '%pepe%', '%pepe%']);
  });

  it('ignora estado=todos', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await supertest(app).get('/api/clients?estado=todos');

    expect(mockQuery.mock.calls[0][0]).not.toContain('estado = $1');
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/clients');

    expect(res.status).toBe(500);
  });
});

// ── GET /api/clients/:id ───────────────────────────────────────
describe('GET /api/clients/:id', () => {
  it('devuelve el cliente con normalización', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [mockClient({ tags: ['a'], vip: 1 })] });

    const res = await supertest(app).get('/api/clients/cli_1');

    expect(res.status).toBe(200);
    expect(res.body.tags).toEqual(['a']);
    expect(res.body.vip).toBe(true);
  });

  it('404 si el cliente no existe', async () => {
    const app = createApp();

    const res = await supertest(app).get('/api/clients/cli_zzz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Client not found' });
  });
});

// ── POST /api/clients ──────────────────────────────────────────
describe('POST /api/clients', () => {
  it('rechaza con 400 sin nombre (Zod real)', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/clients').send({ telefono: '300' });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('crea el cliente y envía bienvenida por email (no bloqueante)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).post('/api/clients').send({
      nombre: 'Pepe',
      telefono: '3001234567',
      email: 'pepe@test.com',
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^cli_/);
    // La respuesta no espera el email (fire-and-forget)
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO clients');
    await vi.waitFor(() => expect(mockSendEmail).toHaveBeenCalled());
    expect(mockSendEmail.mock.calls[0][0]).toEqual(
      expect.objectContaining({ to: 'pepe@test.com', template: 'welcome' })
    );
  });

  it('no envía email cuando no hay email', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).post('/api/clients').send({ nombre: 'Pepe', telefono: '300' });

    expect(res.status).toBe(201);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('409 si el teléfono ya existe (23505)', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce({ code: '23505' });

    const res = await supertest(app).post('/api/clients').send({ nombre: 'Pepe', telefono: '300' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Ya existe un cliente');
  });

  it('responde 500 si el INSERT falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).post('/api/clients').send({ nombre: 'Pepe' });

    expect(res.status).toBe(500);
  });
});

// ── PATCH /api/clients/:id ─────────────────────────────────────
describe('PATCH /api/clients/:id', () => {
  it('actualiza vip/notas/tags/estado y serializa tags a JSON', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app)
      .patch('/api/clients/cli_1')
      .send({ vip: true, tags: ['frecuente'], estado: 'activo' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('vip = $1');
    expect(sql).toContain('tags = $2');
    expect(sql).toContain('estado = $3');
    expect(params[1]).toBe(JSON.stringify(['frecuente']));
  });

  it('rechaza con 400 un estado inválido', async () => {
    const app = createApp();

    const res = await supertest(app).patch('/api/clients/cli_1').send({ estado: 'BOGUS' });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).patch('/api/clients/cli_1').send({ vip: true });

    expect(res.status).toBe(500);
  });
});

// ── PUT /api/clients/:id ───────────────────────────────────────
describe('PUT /api/clients/:id', () => {
  it('actualiza el perfil completo con update dinámico', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [mockClient({ nombre: 'Nuevo Nombre' })] });

    const res = await supertest(app)
      .put('/api/clients/cli_1')
      .send({ nombre: 'Nuevo Nombre', email: 'nuevo@test.com' });

    expect(res.status).toBe(200);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('nombre = $1');
    expect(sql).toContain('email = $2');
    expect(params).toEqual(['Nuevo Nombre', 'nuevo@test.com', 'cli_1']);
  });

  it('404 si el cliente no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).put('/api/clients/cli_zzz').send({ nombre: 'X' });

    expect(res.status).toBe(404);
  });

  it('409 si el teléfono nuevo ya existe (23505)', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce({ code: '23505' });

    const res = await supertest(app).put('/api/clients/cli_1').send({ telefono: '3009999999' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Ya existe un cliente');
  });
});

// ── DELETE /api/clients/:id ────────────────────────────────────
describe('DELETE /api/clients/:id', () => {
  it('elimina el cliente con 204', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).delete('/api/clients/cli_1');

    expect(res.status).toBe(204);
  });

  it('404 si el cliente no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app).delete('/api/clients/cli_zzz');

    expect(res.status).toBe(404);
  });

  it('409 si el cliente tiene pedidos (FK 23503)', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce({ code: '23503' });

    const res = await supertest(app).delete('/api/clients/cli_1');

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('No se puede eliminar');
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).delete('/api/clients/cli_1');

    expect(res.status).toBe(500);
  });
});

// ── GET /api/clients/:id/orders ────────────────────────────────
describe('GET /api/clients/:id/orders', () => {
  it('devuelve el historial de pedidos filtrado por clientId (LIMIT 20)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'ord_1', total: 100 }] });

    const res = await supertest(app).get('/api/clients/cli_1/orders');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE "clientId" = $1');
    expect(mockQuery.mock.calls[0][0]).toContain('LIMIT 20');
    expect(mockQuery.mock.calls[0][1]).toEqual(['cli_1']);
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/clients/cli_1/orders');

    expect(res.status).toBe(500);
  });
});
