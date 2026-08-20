// Tests unitarios para rutas de digiturno
// Ejecutar: npx vitest run server/tests/digiturno.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

// ── Mocks con vi.hoisted para evitar ReferenceError ────────────
// vi.mock se hoistea al tope del archivo, así que las variables
// deben definirse dentro de vi.hoisted() para estar disponibles.
const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../auth.js', () => ({
  // role: 'ADMIN' hace que los chequeos de requireSameLocation en las rutas
  // (agregados junto con el fix de scoping por sede) sean no-op en estos
  // tests, que no ejercitan esa lógica -- mismo criterio que requireRole
  // mockeado como pass-through.
  authMiddleware: (req, res, next) => {
    req.auth = { sub: 'test-employee', role: 'ADMIN', locationId: null };
    next();
  },
  requireRole:
    (..._roles) =>
    (req, res, next) =>
      next(),
  requireSameLocation: (_getLocationId) => (req, res, next) => next(),
}));

vi.mock('../websocket.js', () => ({
  broadcast: vi.fn(),
  notifyDigiturnoNew: vi.fn(),
  notifyDigiturnoUpdate: vi.fn(),
}));

// ── Importar rutas después de mocks ─────────────────────────────
import digiturnoRoutes from '../routes/digiturno.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', digiturnoRoutes);
  return app;
}

// ── Helpers ─────────────────────────────────────────────────────
function mockTicket(overrides = {}) {
  return {
    id: 'dig_test_001',
    ticketNumber: 1,
    orderType: 'dine-in',
    status: 'waiting',
    locationId: 'nemocon',
    tableId: null,
    tableName: null,
    customerName: 'Test',
    guestCount: 2,
    source: 'local',
    items: [],
    total: 0,
    notes: null,
    createdAt: new Date().toISOString(),
    calledAt: null,
    completedAt: null,
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────
describe('Digiturno Routes', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/digiturno', () => {
    it('debe listar tickets sin filtros', async () => {
      const tickets = [mockTicket(), mockTicket({ id: 'dig_2', ticketNumber: 2, customerName: 'Ana' })];
      mockQuery.mockResolvedValueOnce({ rows: tickets });

      const res = await supertest(app).get('/api/digiturno');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(tickets);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM digiturno_tickets'),
        expect.any(Array)
      );
    });

    it('debe filtrar por status y locationId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockTicket({ status: 'waiting' })] });

      const res = await supertest(app).get('/api/digiturno').query({ status: 'waiting', locationId: 'nemocon' });

      expect(res.status).toBe(200);
      expect(mockQuery.mock.calls[0][1]).toContain('waiting');
      expect(mockQuery.mock.calls[0][1]).toContain('nemocon');
    });

    it('debe retornar 500 si la DB falla', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB Error'));

      const res = await supertest(app).get('/api/digiturno');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error al listar tickets');
    });
  });

  describe('GET /api/digiturno/stats', () => {
    it('debe retornar estadísticas diarias', async () => {
      const statsRow = (count) => ({ rows: [{ count: String(count) }] });
      const avgRow = (avg) => ({ rows: [{ avg_min: avg }] });

      mockQuery
        .mockResolvedValueOnce(statsRow(42)) // ticketsToday
        .mockResolvedValueOnce(statsRow(38)) // servedToday
        .mockResolvedValueOnce(statsRow(2)) // cancelledToday
        .mockResolvedValueOnce(avgRow(12.5)) // averageWaitMinutes
        .mockResolvedValueOnce(statsRow(5)); // currentQueueCount

      const res = await supertest(app).get('/api/digiturno/stats');

      expect(res.status).toBe(200);
      expect(res.body.ticketsToday).toBe(42);
      expect(res.body.servedToday).toBe(38);
      expect(res.body.cancelledToday).toBe(2);
      expect(res.body.averageWaitMinutes).toBe(12.5);
      expect(res.body.currentQueueCount).toBe(5);
      expect(res.body.bySource).toBeUndefined();
      expect(res.body.busiestHour).toBeUndefined();
    });

    it('debe filtrar por locationId', async () => {
      const statsRow = (count) => ({ rows: [{ count: String(count) }] });
      const avgRow = (avg) => ({ rows: [{ avg_min: avg }] });

      mockQuery
        .mockResolvedValueOnce(statsRow(10))
        .mockResolvedValueOnce(statsRow(8))
        .mockResolvedValueOnce(statsRow(1))
        .mockResolvedValueOnce(avgRow(8.0))
        .mockResolvedValueOnce(statsRow(3));

      const res = await supertest(app).get('/api/digiturno/stats').query({ locationId: 'zipaquira' });

      expect(res.status).toBe(200);
      expect(res.body.ticketsToday).toBe(10);
      // Verificar que el locationId se pasó a las queries
      expect(mockQuery.mock.calls[0][1]).toContain('zipaquira');
    });

    it('debe retornar 500 si la DB falla', async () => {
      mockQuery.mockRejectedValue(new Error('DB Error'));

      const res = await supertest(app).get('/api/digiturno/stats');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error al obtener estadísticas');
    });
  });

  describe('GET /api/digiturno/queue', () => {
    it('debe listar solo tickets activos', async () => {
      const tickets = [
        mockTicket({ status: 'waiting' }),
        mockTicket({ id: 'dig_2', ticketNumber: 2, status: 'preparing' }),
      ];
      mockQuery.mockResolvedValueOnce({ rows: tickets });

      const res = await supertest(app).get('/api/digiturno/queue');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(tickets);
    });

    it('debe filtrar por locationId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockTicket()] });

      const res = await supertest(app).get('/api/digiturno/queue').query({ locationId: 'zipaquira' });

      expect(res.status).toBe(200);
      expect(mockQuery.mock.calls[0][1]).toContain('zipaquira');
    });
  });

  describe('GET /api/digiturno/queue/live (SSE)', () => {
    it('debe iniciar con Content-Type text/event-stream', async () => {
      mockQuery.mockResolvedValue({ rows: [mockTicket()] });

      // SSE nunca termina el stream, así que usamos AbortController en vez de supertest.
      // El servidor Express arranca en puerto 0 (aleatorio) y esperamos a que esté listo.
      const server = app.listen(0);
      await new Promise((resolve) => server.on('listening', resolve));

      const { port } = server.address();

      const controller = new AbortController();
      // Esperar 2000ms antes de abortar — da tiempo a que el fetch reciba headers
      const abortTimer = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`http://localhost:${port}/api/digiturno/queue/live`, {
        signal: controller.signal,
      }).catch((e) => {
        clearTimeout(abortTimer);
        // AbortError es esperado — la respuesta ya se recibió
        if (e.name === 'AbortError') return null;
        throw e;
      });

      expect(response).not.toBeNull();
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toMatch(/text\/event-stream/);
      expect(response.headers.get('cache-control')).toMatch(/no-cache/);

      server.close();
    });
  });

  describe('POST /api/digiturno', () => {
    it('debe crear un ticket exitosamente', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ next: 1 }] }); // getNextTicketNumber
      mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // INSERT
      mockQuery.mockResolvedValueOnce({ rows: [mockTicket()] }); // SELECT post-insert

      const res = await supertest(app).post('/api/digiturno').send({ locationId: 'nemocon', source: 'local' });

      expect(res.status).toBe(201);
      expect(res.body.ticketNumber).toBe(1);
    });

    it('debe hacer retry si hay unique_violation (23505) y luego crear con el siguiente número', async () => {
      // Intento 1: getNext=1, INSERT falla 23505
      mockQuery.mockResolvedValueOnce({ rows: [{ next: 1 }] });
      mockQuery.mockRejectedValueOnce({ code: '23505' });
      // Intento 2: getNext=2, INSERT ok
      mockQuery.mockResolvedValueOnce({ rows: [{ next: 2 }] });
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [mockTicket({ ticketNumber: 2 })] });

      const res = await supertest(app).post('/api/digiturno').send({ locationId: 'nemocon', source: 'local' });

      expect(res.status).toBe(201);
      expect(res.body.ticketNumber).toBe(2);
      // Debió haber 5 llamadas: 2 getNext + 2 insert attempts + 1 select final
      expect(mockQuery).toHaveBeenCalledTimes(5);
    });

    it('debe retornar 409 si se agotan los retries por unique_violation', async () => {
      // 5 intentos, cada uno: getNext + INSERT (23505) = 10 llamadas
      for (let i = 0; i < 5; i++) {
        mockQuery.mockResolvedValueOnce({ rows: [{ next: i + 1 }] }); // getNextTicketNumber
        mockQuery.mockRejectedValueOnce({ code: '23505' }); // INSERT
      }

      const res = await supertest(app).post('/api/digiturno').send({ locationId: 'nemocon', source: 'local' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('concurrencia');
    });

    it('debe retornar 500 si hay otro error en DB', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ next: 1 }] });
      mockQuery.mockRejectedValueOnce(new Error('DB error'));

      const res = await supertest(app).post('/api/digiturno').send({ locationId: 'nemocon', source: 'local' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error al crear ticket');
    });
  });

  describe('PATCH /api/digiturno/:id/status', () => {
    it('debe actualizar a preparing con calledAt', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockTicket()] }); // SELECT existente (chequeo de sede)
      mockQuery.mockResolvedValueOnce({ rowCount: 1 }); // UPDATE
      mockQuery.mockResolvedValueOnce({ rows: [mockTicket({ status: 'preparing' })] }); // SELECT

      const res = await supertest(app).patch('/api/digiturno/test-id/status').send({ status: 'preparing' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('preparing');
    });

    it('debe actualizar a ready/served con completedAt', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [mockTicket()] }); // SELECT existente
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      mockQuery.mockResolvedValueOnce({ rows: [mockTicket({ status: 'ready' })] });

      const res = await supertest(app).patch('/api/digiturno/test-id/status').send({ status: 'ready' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
    });

    it('debe retornar 404 si el ticket no existe', async () => {
      // El lookup de existencia (para el chequeo de sede) ahora ocurre
      // ANTES del UPDATE, así que el 404 corta el flujo ahí mismo.
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await supertest(app).patch('/api/digiturno/nonexistent/status').send({ status: 'served' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Ticket no encontrado');
    });
  });

  describe('DELETE /api/digiturno/:id', () => {
    it('debe eliminar un ticket', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ locationId: 'nemocon' }] }); // SELECT existente (chequeo de sede)
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'dig_test_001' }] }); // DELETE

      const res = await supertest(app).delete('/api/digiturno/dig_test_001');

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it('debe retornar 404 si no existe', async () => {
      // Mismo criterio: el lookup previo ya corta el flujo antes del DELETE.
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await supertest(app).delete('/api/digiturno/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Ticket no encontrado');
    });
  });
});
