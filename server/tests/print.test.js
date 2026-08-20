// Test de seguridad para GET /api/print/* -- confirma que campos de origen
// cliente (customerName, address, notas, nombre de mesero/producto) se
// escapan al interpolarse en el HTML de recibos/tickets, previniendo XSS
// almacenado que podría ejecutarse en la sesión del ADMIN/OPERATOR que
// imprime el pedido. Ver docs/AUDIT_2026-07-30.md item #6.
import { describe, it, expect, vi } from 'vitest';
import supertest from 'supertest';
import express from 'express';

vi.mock('../db.js', () => ({
  pool: { query: vi.fn() },
}));

vi.mock('../auth.js', () => ({
  authMiddleware: (req, res, next) => next(),
  requireRole:
    (..._roles) =>
    (req, res, next) =>
      next(),
}));

vi.mock('../services/pdf.js', () => ({
  generateInvoicePDF: vi.fn(),
  generateOrderPDF: vi.fn(),
}));

import { pool } from '../db.js';
import printRoutes from '../routes/print.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/', printRoutes);
  return app;
}

const XSS = '<script>alert(1)</script>';

describe('GET /api/print/receipt/:orderId — escapes user-supplied fields', () => {
  it('escapes customerName, address and productName in the rendered HTML', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'order-1',
          orderNumber: 'ORD-1',
          customerName: XSS,
          customerPhone: '3001234567',
          address: XSS,
          items: [{ quantity: 1, productName: XSS, subtotal: 1000 }],
          total: 1000,
          paymentMethod: 'efectivo',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const app = createApp();
    const res = await supertest(app).get('/api/print/receipt/order-1');

    expect(res.status).toBe(200);
    expect(res.text).not.toContain(XSS);
    expect(res.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

describe('GET /api/print/kitchen-ticket/:comandaId — escapes waiterName and notes', () => {
  it('escapes comanda.waiterName, item notes and table name/area', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'comanda-1', tableId: 'table-1', waiterName: XSS, guestCount: 2 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'item-1', quantity: 1, productName: XSS, notes: XSS, status: 'pending' }] })
      .mockResolvedValueOnce({ rows: [{ name: XSS, area: XSS }] });

    const app = createApp();
    const res = await supertest(app).get('/api/print/kitchen-ticket/comanda-1');

    expect(res.status).toBe(200);
    expect(res.text).not.toContain(XSS);
    expect(res.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
