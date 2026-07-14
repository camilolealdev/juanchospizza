// Print service — genera HTML imprimible para recibos, comandas y tickets de cocina.
// Los endpoints devuelven HTML que se puede abrir en una nueva ventana para imprimir
// (window.print()) o enviar a una impresora térmica configurada como impresora PDF.
import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const router = express.Router();

// Helper: genera HTML de recibo
function receiptHTML(data) {
  const { title, orderNumber, customerName, customerPhone, address, items, total, paymentMethod, date, mesa } = data;
  const itemsHtml = (items || [])
    .map(
      (i) => `
    <tr>
      <td style="padding:4px 8px;text-align:left;">${i.quantity}x ${i.productName || i.name || ''}</td>
      <td style="padding:4px 8px;text-align:right;">$${(i.subtotal || i.price || 0).toLocaleString('es-CO')}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
  h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
  h2 { text-align: center; font-size: 14px; margin: 5px 0; }
  .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
  .info { font-size: 11px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  th { border-bottom: 1px solid #000; padding: 4px 8px; text-align: left; }
  td { padding: 4px 8px; }
  .total { font-size: 16px; font-weight: bold; text-align: right; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px; }
  .footer { text-align: center; margin-top: 20px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
  @media print { @page { margin: 0; } body { margin: 5mm; } }
</style></head><body>
  <div class="header">
    <h1>🍕 Juancho's Pizza</h1>
    <h2>${title}</h2>
    ${mesa ? `<p>Mesa: <strong>${mesa}</strong></p>` : ''}
  </div>
  <div class="info">
    <p><strong>No. Pedido:</strong> ${orderNumber || ''}</p>
    <p><strong>Fecha:</strong> ${date || new Date().toLocaleString('es-CO')}</p>
    ${customerName ? `<p><strong>Cliente:</strong> ${customerName}</p>` : ''}
    ${customerPhone ? `<p><strong>Tel:</strong> ${customerPhone}</p>` : ''}
    ${address ? `<p><strong>Dirección:</strong> ${address}</p>` : ''}
    <p><strong>Pago:</strong> ${paymentMethod || ''}</p>
  </div>
  <table><thead><tr><th>Producto</th><th style="text-align:right;">Valor</th></tr></thead><tbody>${itemsHtml}</tbody></table>
  <div class="total">Total: $${(total || 0).toLocaleString('es-CO')}</div>
  <div class="footer">
    <p>¡Gracias por tu compra!</p>
    <p>Nemocón / Zipaquirá</p>
  </div>
  <script>window.print();</script>
</body></html>`;
}

// Helper: genera HTML de ticket de cocina
function kitchenTicketHTML(data) {
  const { comanda, items, mesa } = data;
  const itemsHtml = (items || [])
    .filter((i) => i.status !== 'cancelled')
    .map(
      (i) => `
    <tr>
      <td style="padding:6px 8px;font-size:14px;font-weight:bold;">${i.quantity}x</td>
      <td style="padding:6px 8px;font-size:14px;">${i.productName}</td>
    </tr>
    ${i.notes ? `<tr><td></td><td style="padding:0 8px 6px;font-size:11px;color:#666;">Nota: ${i.notes}</td></tr>` : ''}`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket Cocina #${comanda.id?.slice(-6) || ''}</title>
<style>
  body { font-family: 'Courier New', monospace; font-size: 14px; width: 80mm; margin: 0 auto; padding: 10px; }
  h1 { text-align: center; font-size: 22px; margin-bottom: 5px; text-transform: uppercase; }
  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
  .mesa { font-size: 24px; font-weight: bold; text-align: center; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; }
  tr { border-bottom: 1px dashed #ccc; }
  .footer { text-align: center; margin-top: 15px; font-size: 10px; }
  .hora { text-align: center; font-size: 12px; margin-bottom: 5px; }
  @media print { @page { margin: 0; } body { margin: 3mm; } }
</style></head><body>
  <div class="header">
    <h1>🍕 Cocina</h1>
    <div class="hora">${new Date().toLocaleString('es-CO')}</div>
  </div>
  <div class="mesa">MESA ${mesa?.name || ''} (${mesa?.area || ''})</div>
  <p style="text-align:center;font-size:11px;">Mesero: ${comanda.waiterName || 'N/A'} | Comensales: ${comanda.guestCount || 1}</p>
  <table><tbody>${itemsHtml}</tbody></table>
  <div class="footer">
    <p>--- ${items.filter((i) => i.status !== 'cancelled').length} productos ---</p>
  </div>
  <script>window.print();</script>
</body></html>`;
}

// GET /api/print/receipt/:orderId — recibo de pedido (delivery)
router.get('/api/print/receipt/:orderId', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.orderId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Pedido no encontrado' });

    const order = result.rows[0];
    const html = receiptHTML({
      title: 'RECIBO DE PEDIDO',
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      address: order.address,
      items: order.items || [],
      total: order.total,
      paymentMethod: order.paymentMethod,
      date: order.createdAt,
    });

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (e) {
    res.status(500).json({ error: 'Error al generar recibo' });
  }
});

// GET /api/print/kitchen-ticket/:comandaId — ticket de cocina para comanda
router.get(
  '/api/print/kitchen-ticket/:comandaId',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  async (req, res) => {
    try {
      const comandaResult = await pool.query('SELECT * FROM comandas WHERE id = $1', [req.params.comandaId]);
      if (!comandaResult.rows.length) return res.status(404).json({ error: 'Comanda no encontrada' });

      const itemsResult = await pool.query(
        'SELECT * FROM comanda_items WHERE "comandaId" = $1 AND status != $2 ORDER BY "createdAt"',
        [req.params.comandaId, 'cancelled']
      );

      let mesa = null;
      if (comandaResult.rows[0].tableId) {
        const mesaResult = await pool.query('SELECT name, area FROM dining_tables WHERE id = $1', [
          comandaResult.rows[0].tableId,
        ]);
        mesa = mesaResult.rows[0] || null;
      }

      const html = kitchenTicketHTML({ comanda: comandaResult.rows[0], items: itemsResult.rows, mesa });
      res.set('Content-Type', 'text/html');
      res.send(html);
    } catch (e) {
      res.status(500).json({ error: 'Error al generar ticket de cocina' });
    }
  }
);

// GET /api/print/comanda-receipt/:comandaId — recibo de cuenta para comanda cerrada
router.get(
  '/api/print/comanda-receipt/:comandaId',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  async (req, res) => {
    try {
      const comandaResult = await pool.query('SELECT * FROM comandas WHERE id = $1', [req.params.comandaId]);
      if (!comandaResult.rows.length) return res.status(404).json({ error: 'Comanda no encontrada' });

      const itemsResult = await pool.query(
        'SELECT * FROM comanda_items WHERE "comandaId" = $1 AND status != $2 ORDER BY "createdAt"',
        [req.params.comandaId, 'cancelled']
      );

      let mesaName = null;
      if (comandaResult.rows[0].tableId) {
        const mesaResult = await pool.query('SELECT name FROM dining_tables WHERE id = $1', [
          comandaResult.rows[0].tableId,
        ]);
        mesaName = mesaResult.rows[0]?.name || null;
      }

      const com = comandaResult.rows[0];
      const html = receiptHTML({
        title: 'CUENTA DE MESA',
        orderNumber: com.id?.slice(-8),
        customerName: `Mesa ${mesaName || ''}`,
        items: itemsResult.rows,
        total: com.total,
        paymentMethod: 'Mesa',
        date: com.closedAt || com.openedAt,
        mesa: mesaName,
      });

      res.set('Content-Type', 'text/html');
      res.send(html);
    } catch (e) {
      res.status(500).json({ error: 'Error al generar recibo de comanda' });
    }
  }
);

// GET /api/print/invoice/:invoiceId — recibo de factura electrónica (cuando aplique)
router.get('/api/print/invoice/:invoiceId', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.invoiceId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Factura no encontrada' });

    const inv = result.rows[0];

    // Si tiene PDF guardado, redirigir
    if (inv.pdf_url) return res.redirect(inv.pdf_url);

    // Si tiene XML, mostrar datos básicos
    const orderResult = inv.orderId ? await pool.query('SELECT * FROM orders WHERE id = $1', [inv.orderId]) : null;
    const order = orderResult?.rows[0] || null;

    const html = receiptHTML({
      title: `FACTURA ${inv.invoiceNumber || ''}`,
      orderNumber: inv.invoiceNumber || inv.id?.slice(-8),
      items: order?.items || [],
      total: order?.total || 0,
      paymentMethod: order?.paymentMethod || 'N/A',
      date: inv.createdAt,
    });

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (e) {
    res.status(500).json({ error: 'Error al generar factura' });
  }
});

export default router;
