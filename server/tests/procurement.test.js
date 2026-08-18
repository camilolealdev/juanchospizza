// Tests de integración para server/routes/procurement.js (órdenes de compra:
// dinero + inventario -- incluye la recepción que actualiza stock en tx).
// Cubre:
//   - GET con filtro status y sede efectiva (no-ADMIN ve solo su sede)
//   - POST: createdBy desde el token (nunca del body), total recalculado
//   - PUT: update parcial + recalculo de total cuando cambian items
//   - PATCH /receive: transacción real que actualiza stock y registra
//     movimiento; items sin itemId se omiten; 409 si ya recibida
//   - DELETE con RETURNING
// Patrón igual a server/tests/inventory.test.js.
// Ejecutar: npx vitest run server/tests/procurement.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import express from 'express';

const { mockQuery, mockPool, mockAuth } = vi.hoisted(() => {
  const mockQuery = vi.fn();
  return {
    mockQuery,
    mockPool: { connect: vi.fn(), query: mockQuery },
    mockAuth: { role: 'ADMIN', sub: 'emp_1', locationId: 'nemocon' },
  };
});

vi.mock('../db.js', () => ({
  pool: mockPool,
}));

vi.mock('../auth.js', () => ({
  authMiddleware: (req, _res, next) => {
    req.auth = mockAuth;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
  requireSameLocation: () => (_req, _res, next) => next(),
}));

import procurementRoutes from '../routes/procurement.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', procurementRoutes);
  return app;
}

const PO_ROW = {
  id: 'po_1',
  orderNumber: 'PO-123456',
  proveedor: 'Proveedor A',
  items: [{ itemId: 'inv_1', nombre: 'Harina', cantidad: 10, precioUnitario: 2000 }],
  total: 20000,
  status: 'pendiente',
  createdBy: 'emp_1',
  locationId: 'nemocon',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockPool.connect.mockReset();
  mockAuth.role = 'ADMIN';
  mockAuth.sub = 'emp_1';
  mockAuth.locationId = 'nemocon';
});

describe('GET /api/procurement', () => {
  it('lista órdenes con filtros y sede efectiva', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [PO_ROW] });

    const res = await supertest(app).get('/api/procurement?status=pendiente&locationId=nemocon');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([PO_ROW]);
    const sql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(sql).toContain('WHERE status = $1 AND "locationId" = $2');
    expect(mockQuery.mock.calls[0][1]).toEqual(['pendiente', 'nemocon']);
  });

  it('OPERATOR sin locationId en query → filtra por su sede del token', async () => {
    const app = createApp();
    mockAuth.role = 'OPERATOR';
    mockAuth.locationId = 'zipaquira';
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).get('/api/procurement');

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[0][1]).toEqual(['zipaquira']);
    expect(String(mockQuery.mock.calls[0][0])).toContain('"locationId" = $1');
  });
});

describe('POST /api/procurement', () => {
  it('crea orden: createdBy desde el token, total recalculado del items', async () => {
    const app = createApp();
    mockQuery
      .mockResolvedValueOnce({ rowCount: 1 }) // INSERT
      .mockResolvedValueOnce({ rows: [PO_ROW] }); // SELECT del creado

    const res = await supertest(app)
      .post('/api/procurement')
      .send({
        proveedor: 'Proveedor A',
        items: [{ nombre: 'Harina', cantidad: 10, precioUnitario: 2000 }],
        createdBy: 'otro_empleado', // debe ignorarse
        locationId: 'nemocon',
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(PO_ROW);
    const insertParams = mockQuery.mock.calls[0][1];
    expect(insertParams[7]).toBe('emp_1'); // createdBy = token
    expect(insertParams[4]).toBe(20000); // total = 10 * 2000
    expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO purchase_orders');
  });

  it('400 si no hay items (array vacío)', async () => {
    const app = createApp();

    const res = await supertest(app).post('/api/procurement').send({ proveedor: 'X', items: [] });

    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('400 si falta proveedor', async () => {
    const app = createApp();

    const res = await supertest(app)
      .post('/api/procurement')
      .send({ items: [{ nombre: 'Harina', cantidad: 1, precioUnitario: 100 }] });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/procurement/:id', () => {
  it('recalcula total cuando cambian items', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rowCount: 1 }).mockResolvedValueOnce({ rows: [{ ...PO_ROW, total: 30000 }] });

    const res = await supertest(app)
      .put('/api/procurement/po_1')
      .send({ items: [{ nombre: 'Harina', cantidad: 15, precioUnitario: 2000 }] });

    expect(res.status).toBe(200);
    const sql = String(mockQuery.mock.calls[0][0]).replace(/\s+/g, ' ').trim();
    expect(sql).toContain('items = $1');
    expect(sql).toContain('total = $2');
    expect(mockQuery.mock.calls[0][1][1]).toBe(30000); // total recalculado
  });

  it('400 si no manda nada para actualizar', async () => {
    const app = createApp();

    const res = await supertest(app).put('/api/procurement/po_1').send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Nada que actualizar' });
  });
});

describe('PATCH /api/procurement/:id/receive (transacción + inventario)', () => {
  it('recibe la orden: actualiza stock y registra movimiento por item', async () => {
    const app = createApp();
    const client = { query: vi.fn(), release: vi.fn() };
    mockPool.connect.mockResolvedValueOnce(client);
    mockQuery.mockResolvedValueOnce({ rows: [{ ...PO_ROW, orderNumber: 'PO-123456' }] }); // SELECT de la orden
    // client.query: BEGIN, SELECT item, UPDATE stock, INSERT movimiento, UPDATE status
    client.query
      .mockResolvedValueOnce({ rowCount: 1 }) // 0: BEGIN
      .mockResolvedValueOnce({ rows: [{ stockActual: 5 }] }) // 1: SELECT inventory
      .mockResolvedValueOnce({ rowCount: 1 }) // 2: UPDATE stock → 15
      .mockResolvedValueOnce({ rowCount: 1 }) // 3: INSERT movimiento
      .mockResolvedValueOnce({ rowCount: 1 }) // 4: UPDATE status → recibida
      .mockResolvedValueOnce({ rowCount: 1 }); // 5: COMMIT

    const res = await supertest(app).patch('/api/procurement/po_1/receive');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true, itemsUpdated: 1, orderNumber: 'PO-123456', omitidos: [] });
    // UPDATE stock con 5 + 10 = 15
    const updateSql = String(client.query.mock.calls[2][0]).replace(/\s+/g, ' ').trim();
    expect(updateSql).toContain('UPDATE inventory_items SET "stockActual" = $1');
    expect(client.query.mock.calls[2][1]).toEqual([15, 'inv_1']);
    // Movimiento de entrada con saldo anterior 5 → nuevo 15
    const movSql = String(client.query.mock.calls[3][0]).replace(/\s+/g, ' ').trim();
    expect(movSql).toContain('tipo, cantidad, "saldoAnterior", "saldoNuevo"');
    expect(client.query.mock.calls[3][1][4]).toBe(15);
    // COMMIT al final (call 5: BEGIN/SELECT/UPDATE/INSERT/UPDATE-status/COMMIT)
    expect(client.query.mock.calls[5][0]).toBe('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('items sin itemId se omiten (no rompen la recepción)', async () => {
    const app = createApp();
    const client = { query: vi.fn(), release: vi.fn() };
    mockPool.connect.mockResolvedValueOnce(client);
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...PO_ROW, items: [{ nombre: 'Genérico', cantidad: 5, precioUnitario: 1000 }] }], // sin itemId
    });
    client.query
      .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
      .mockResolvedValueOnce({ rowCount: 1 }); // UPDATE status

    const res = await supertest(app).patch('/api/procurement/po_1/receive');

    expect(res.status).toBe(200);
    expect(res.body.itemsUpdated).toBe(0);
    expect(res.body.omitidos).toHaveLength(1);
    expect(res.body.omitidos[0].motivo).toContain('sin itemId');
  });

  it('404 si la orden no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).patch('/api/procurement/po_zzz/receive');

    expect(res.status).toBe(404);
  });

  it('409 si la orden ya fue recibida (race del UPDATE con guard)', async () => {
    const app = createApp();
    const client = { query: vi.fn(), release: vi.fn() };
    mockPool.connect.mockResolvedValueOnce(client);
    // Items sin itemId → el loop los omite y solo queda BEGIN + UPDATE status
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...PO_ROW, items: [{ nombre: 'Genérico', cantidad: 1, precioUnitario: 100 }] }],
    });
    client.query
      .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
      .mockResolvedValueOnce({ rowCount: 0 }); // UPDATE status no afecta filas → ya recibida

    const res = await supertest(app).patch('/api/procurement/po_1/receive');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Esta orden ya fue recibida' });
    expect(client.query.mock.calls.some(([sql]) => sql === 'ROLLBACK')).toBe(true);
  });
});

describe('DELETE /api/procurement/:id', () => {
  it('borra con RETURNING y devuelve deleted', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'po_1' }] });

    const res = await supertest(app).delete('/api/procurement/po_1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
    expect(mockQuery.mock.calls[0][0]).toContain('DELETE FROM purchase_orders WHERE id = $1 RETURNING id');
  });

  it('404 si no existe', async () => {
    const app = createApp();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await supertest(app).delete('/api/procurement/po_zzz');

    expect(res.status).toBe(404);
  });
});
