// Tests de ruta para PATCH /api/derechos/:id — máquina de estados ARCO
// (Ley 1581). Verifica que el handler valida las transiciones de estado con
// 409, siguiendo el patrón de mocks de server/tests/digiturno.test.js.
// Ejecutar: npx vitest run server/tests/consent.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

// ── Mocks con vi.hoisted para evitar ReferenceError ────────────
const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../auth.js', () => ({
  authMiddleware: (req, res, next) => {
    req.auth = { sub: 'test-admin', role: 'ADMIN', locationId: null };
    next();
  },
  requireRole:
    (..._roles) =>
    (req, res, next) =>
      next(),
}));

vi.mock('../middleware/rateLimit.js', () => ({
  consentRateLimit: (req, res, next) => next(),
  derechoRateLimit: (req, res, next) => next(),
}));

// validate() se mockea como pass-through: la validación del schema ya está
// cubierta por server/schemas/derechos.test.js; acá solo interesa la
// máquina de estados del handler.
vi.mock('../middleware/validate.js', () => ({
  validate: () => (req, res, next) => next(),
}));

// ── Importar rutas después de mocks ─────────────────────────────
import consentRoutes from '../routes/consent.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(consentRoutes);
  return app;
}

beforeEach(() => {
  mockQuery.mockReset();
});

describe('PATCH /api/derechos/:id — máquina de estados', () => {
  it('devuelve 409 si se intenta regresar respondida → pendiente (terminal)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'der_1', estado: 'respondida' }] });

    const res = await supertest(createApp()).patch('/api/derechos/der_1').send({ estado: 'pendiente' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Transición de estado inválida');
    // El UPDATE no debe haberse ejecutado: solo hubo el SELECT de verificación
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('devuelve 409 si se intenta cambiar rechazada → en_proceso (terminal)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'der_2', estado: 'rechazada' }] });

    const res = await supertest(createApp()).patch('/api/derechos/der_2').send({ estado: 'en_proceso' });

    expect(res.status).toBe(409);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('devuelve 404 si la solicitud no existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(createApp()).patch('/api/derechos/der_404').send({ estado: 'en_proceso' });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('no encontrada');
  });

  it('permite deshacer en_proceso → pendiente y actualiza el registro', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'der_3', estado: 'en_proceso' }] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'der_3', estado: 'pendiente' }] });

    const res = await supertest(createApp()).patch('/api/derechos/der_3').send({ estado: 'pendiente' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('pendiente');
    // SELECT verificación + UPDATE + SELECT devuelto
    expect(mockQuery).toHaveBeenCalledTimes(3);
  });

  it('permite avanzar pendiente → respondida registrando respondedBy', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'der_4', estado: 'pendiente' }] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{ id: 'der_4', estado: 'respondida', respondedBy: 'test-admin' }],
      });

    const res = await supertest(createApp())
      .patch('/api/derechos/der_4')
      .send({ estado: 'respondida', respuesta: 'Se entregó copia de los datos al titular.' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('respondida');
    expect(res.body.respondedBy).toBe('test-admin');
  });

  it('permite conservar el mismo estado (editar respuesta sin cambiar estado)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'der_5', estado: 'en_proceso' }] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'der_5', estado: 'en_proceso' }] });

    const res = await supertest(createApp())
      .patch('/api/derechos/der_5')
      .send({ estado: 'en_proceso', respuesta: 'Actualizando detalle interno' });

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('en_proceso');
  });
});
