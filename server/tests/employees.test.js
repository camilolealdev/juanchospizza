// Tests de integración para server/routes/employees.js — el roster de staff.
// Cubre:
//   1. GET /api/employees — columnas públicas (nunca pinHash/salt/password)
//   2. POST /api/employees — PIN hasheado, username opcional, 409 duplicado
//   3. PUT /api/employees/:id — update dinámico, 400 nada que actualizar, 409
//   4. PATCH /api/employees/:id/password — 403 si target es super admin y el
//      actor no es él mismo (seguridad auditoría #1)
//   5. DELETE /api/employees/:id — soft-delete (activo=false), 404/409
//
// Patrón igual a server/tests/orders.test.js: mocks con vi.hoisted, Zod real,
// supertest + express. Nota: hashPin/generateSalt se mockean como stubs
// deterministas porque la lógica de hash es responsabilidad de auth.js.
//
// Ejecutar: npx vitest run server/tests/employees.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

const { mockQuery, mockAuth, mockHashPin, mockGenerateSalt, mockLoggerWarn } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockAuth: { role: 'ADMIN', sub: 'emp_1', locationId: 'nemocon' },
  mockHashPin: vi.fn((pin, salt) => `hash:${pin}:${salt}`),
  mockGenerateSalt: vi.fn(() => 'test-salt'),
  mockLoggerWarn: vi.fn(),
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
  hashPin: mockHashPin,
  generateSalt: mockGenerateSalt,
}));

vi.mock('../services/logger.js', () => ({
  default: { info: vi.fn(), warn: mockLoggerWarn, error: vi.fn() },
}));

import employeesRoutes from '../routes/employees.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', employeesRoutes);
  return app;
}

function mockEmployee(overrides = {}) {
  return {
    id: 'emp_1',
    nombre: 'Ana',
    role: 'OPERATOR',
    username: null,
    isSuperAdmin: false,
    locationId: 'nemocon',
    activo: true,
    creado: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockLoggerWarn.mockReset();
  mockAuth.role = 'ADMIN';
  mockAuth.sub = 'emp_1';
});

// ── GET /api/employees ─────────────────────────────────────────
describe('GET /api/employees', () => {
  it('devuelve solo columnas públicas (sin hashes)', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [mockEmployee()] });

    const res = await supertest(app).get('/api/employees');

    expect(res.status).toBe(200);
    expect(res.body[0]).toEqual(mockEmployee());
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('SELECT id, nombre, role, username, "isSuperAdmin", "locationId", activo, creado');
    expect(sql).not.toContain('pinHash');
    expect(sql).not.toContain('passwordHash');
  });

  it('responde 500 si la query falla', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce(new Error('boom'));

    const res = await supertest(app).get('/api/employees');

    expect(res.status).toBe(500);
  });
});

// ── POST /api/employees ────────────────────────────────────────
describe('POST /api/employees', () => {
  it('rechaza con 400 un PIN que no sea de 4 dígitos (Zod real)', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/employees').send({ nombre: 'Ana', role: 'OPERATOR', pin: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('4 dígitos');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('crea el empleado hasheando el PIN y devuelve 201', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).post('/api/employees').send({
      nombre: 'Ana',
      role: 'OPERATOR',
      pin: '1234',
      locationId: 'nemocon',
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^emp_/);
    // INSERT con pinHash/salt generados server-side
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO employees');
    expect(params[3]).toBe('hash:1234:test-salt'); // pinHash
    expect(params[4]).toBe('test-salt'); // salt
    // username/password null
    expect(params[6]).toBeNull();
    expect(params[7]).toBeNull();
  });

  it('409 si el username ya existe (23505)', async () => {
    const app = createApp();
    mockQuery.mockRejectedValueOnce({ code: '23505' });

    const res = await supertest(app).post('/api/employees').send({
      nombre: 'Ana',
      role: 'OPERATOR',
      pin: '1234',
      username: 'ana',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('ya está en uso');
  });
});

// ── PUT /api/employees/:id ─────────────────────────────────────
describe('PUT /api/employees/:id', () => {
  it('actualiza solo las columnas enviadas y re-lee el registro', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [mockEmployee({ role: 'ADMIN' })] });

    const res = await supertest(app).put('/api/employees/emp_1').send({ role: 'ADMIN' });

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE employees SET role = $1 WHERE id = $2');
    expect(mockQuery.mock.calls[0][1]).toEqual(['ADMIN', 'emp_1']);
    expect(mockQuery.mock.calls[1][0]).toContain('SELECT id, nombre, role');
    expect(res.body.role).toBe('ADMIN');
  });

  it('400 cuando el body no trae nada que actualizar', async () => {
    const app = createApp();

    const res = await supertest(app).put('/api/employees/emp_1').send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Nada para actualizar' });
  });

  it('404 si el empleado no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 });

    const res = await supertest(app).put('/api/employees/emp_zzz').send({ role: 'ADMIN' });

    expect(res.status).toBe(404);
  });
});

// ── PATCH /api/employees/:id/password ──────────────────────────
describe('PATCH /api/employees/:id/password', () => {
  it('bloquea con 403 el reset de password de un super admin por otra cuenta', async () => {
    const app = createApp();
    mockAuth.sub = 'emp_2'; // actor distinto
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'emp_1', isSuperAdmin: true }] });

    const res = await supertest(app).patch('/api/employees/emp_1/password').send({ password: 'Nueva12345!' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Solo el super admin');
    expect(mockLoggerWarn).toHaveBeenCalled();
    // No ejecuta el UPDATE
    expect(mockQuery.mock.calls.some(([sql]) => String(sql).includes('UPDATE employees SET "passwordHash"'))).toBe(
      false
    );
  });

  it('permite el reset cuando el super admin cambia SU propia password', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'emp_1', isSuperAdmin: true }] }) // target check
      .mockResolvedValueOnce({ rowCount: 1 }); // UPDATE

    const res = await supertest(app).patch('/api/employees/emp_1/password').send({ password: 'Nueva12345!' });

    expect(res.status).toBe(204);
    expect(mockQuery.mock.calls[1][0]).toContain('UPDATE employees SET "passwordHash" = $1');
  });

  it('404 si el empleado no existe', async () => {
    const app = createApp();
    // La ruta checa target.rowCount === 0, no rows.length
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await supertest(app).patch('/api/employees/emp_zzz/password').send({ password: 'Nueva12345!' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Empleado no encontrado' });
  });
});

// ── DELETE /api/employees/:id ──────────────────────────────────
describe('DELETE /api/employees/:id', () => {
  it('soft-delete: marca activo=false y devuelve 204', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    const res = await supertest(app).delete('/api/employees/emp_1');

    expect(res.status).toBe(204);
    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE employees SET activo = false WHERE id = $1 AND activo = true');
  });

  it('404 si el empleado no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).delete('/api/employees/emp_zzz');

    expect(res.status).toBe(404);
  });

  it('409 si el empleado ya estaba inactivo', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rows: [{ id: 'emp_1', activo: false }] });

    const res = await supertest(app).delete('/api/employees/emp_1');

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('ya está inactivo');
  });
});
