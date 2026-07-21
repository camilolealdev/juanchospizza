// Invoices + Credit/Debit Notes — estructura completa para facturación electrónica DIAN
// Ver docs/DIAN_MODULE_STATUS.md para estado y pasos de integración con proveedor.
import express from 'express';
import logger from '../services/logger.js';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createInvoiceSchema, updateInvoiceSchema, createCreditNoteSchema } from '../schemas/invoices.js';
import { generateInvoiceXml, generateDianRequestPayload, DIAN_CONFIG } from '../services/dianXml.js';
import { notifyAuthorized } from '../websocket.js';

const router = express.Router();

// Helper: notificar WebSocket
// Restringido al rol ADMIN — antes se hacía con `broadcast()` y la señal
// llegaba también al socket `public` del digiturno, exponiendo la existencia
// de operaciones de facturación a clientes anónimos. Ahora además se
// filtra por sede: si la factura lleva `locationId`, sólo los ADMINs de
// esa sede (o ADMINs sin sede asignada, que son globales) reciben el evento.
function notifyInvoiceUpdate(invoiceId, action, locationId) {
  try {
    notifyAuthorized(['ADMIN'], { locationId }, 'invoice:update', { invoiceId, action });
  } catch (e) {
    logger.error({ err: e }, '[WS] Error notificando invoice');
  }
}

// ===== INVOICES =====

// GET /api/invoices
router.get('/api/invoices', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { status, locationId } = req.query;
    let query = 'SELECT * FROM invoices';
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (locationId) {
      params.push(locationId);
      conditions.push(`"locationId" = $${params.length}`);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY "createdAt" DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (_e) {
    res.status(500).json({ error: 'Error al listar facturas' });
  }
});

// GET /api/invoices/:id
router.get('/api/invoices/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(result.rows[0]);
  } catch (_e) {
    res.status(500).json({ error: 'Error al obtener factura' });
  }
});

// GET /api/invoices/:id/xml — ver/descargar XML de la factura
router.get('/api/invoices/:id/xml', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('SELECT id, xml, "invoiceNumber", status FROM invoices WHERE id = $1', [
      req.params.id,
    ]);
    if (!result.rows.length) return res.status(404).json({ error: 'Factura no encontrada' });
    const inv = result.rows[0];
    if (!inv.xml) return res.status(404).json({ error: 'XML no generado aún' });
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${inv.invoiceNumber || 'factura'}.xml"`);
    res.send(inv.xml);
  } catch (_e) {
    res.status(500).json({ error: 'Error al obtener XML' });
  }
});

// POST /api/invoices — crear factura desde una orden
router.post('/api/invoices', authMiddleware, requireRole('ADMIN'), validate(createInvoiceSchema), async (req, res) => {
  try {
    const {
      orderId,
      tipoDocumento,
      locationId,
      notes,
      emisorInfo,
      receptorInfo,
      fechaVencimiento,
      tipoOperacion,
      moneda,
    } = req.body;

    // Verificar que la orden existe y obtener datos
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (!orderResult.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    const order = orderResult.rows[0];

    // Verificar que no tenga ya factura
    const existing = await pool.query('SELECT id FROM invoices WHERE "orderId" = $1', [orderId]);
    if (existing.rows.length) return res.status(409).json({ error: 'La orden ya tiene una factura asociada' });

    // Obtener datos del cliente si existe
    let client = null;
    if (order.clientId) {
      const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [order.clientId]);
      if (clientResult.rows.length) client = clientResult.rows[0];
    }

    const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const invoiceNumber = `${DIAN_CONFIG.facturacion.prefijo}-${String(Date.now()).slice(-8)}`;

    // Construir datos del emisor (usar valores proporcionados o defaults)
    const emisorData = emisorInfo || DIAN_CONFIG.emisor;

    // Construir datos del receptor desde la orden/cliente
    const receptorData = receptorInfo || {
      tipoIdentificacion: '31',
      numeroIdentificacion: client?.nit || order.customerPhone || '222222222222',
      digitoVerificacion: client?.digitoVerificacion || '0',
      razonSocial: client?.nombre || order.customerName || 'CONSUMIDOR FINAL',
      direccion: client?.direccion || order.address || 'Sin dirección',
      ciudad: client?.ciudad || 'Bogotá',
      codigoCiudad: client?.codigoCiudad || '11001',
      departamento: 'Bogotá',
      codigoDepartamento: '11',
      pais: 'Colombia',
      codigoPais: 'CO',
      email: client?.email || '',
      telefono: client?.telefono || order.customerPhone || '',
    };

    // Generar XML de la factura
    const xml = generateInvoiceXml(
      { ...order, invoiceNumber, id, createdAt: new Date().toISOString(), notes },
      order,
      client
    );

    const vencimiento = fechaVencimiento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await pool.query(
      `INSERT INTO invoices (id, "orderId", "invoiceNumber", "tipoDocumento", status, "locationId",
        xml, "emisorInfo", "receptorInfo", notes, "fechaVencimiento", "tipoOperacion", moneda)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        orderId,
        invoiceNumber,
        tipoDocumento,
        locationId,
        xml,
        JSON.stringify(emisorData),
        JSON.stringify(receptorData),
        notes || '',
        vencimiento,
        tipoOperacion || '10',
        moneda || 'COP',
      ]
    );

    const created = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]); // Notificar WebSocket
    setImmediate(() => notifyInvoiceUpdate(id, 'created', locationId));

    res.status(201).json(created.rows[0]);
  } catch (_e) {
    res.status(500).json({ error: 'Error al crear factura' });
  }
});

// POST /api/invoices/:id/send — simular envío a DIAN (prepara payload para proveedor)
// Este endpoint prepara todos los datos necesarios para enviar al proveedor DIAN.
// El XML ya fue generado al crear la factura. Aquí se construye el payload
// completo para el proveedor y se actualiza el estado a 'sent'.
// Los campos [MANUAL] deben completarse en DIAN_CONFIG o en la UI.
router.post('/api/invoices/:id/send', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const invoiceResult = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (!invoiceResult.rows.length) return res.status(404).json({ error: 'Factura no encontrada' });
    const invoice = invoiceResult.rows[0];

    if (invoice.status !== 'pending') {
      return res.status(409).json({ error: `La factura ya fue enviada (estado: ${invoice.status})` });
    }

    if (!invoice.xml) {
      return res.status(400).json({ error: 'La factura no tiene XML generado. Creala de nuevo.' });
    }

    // Obtener la orden asociada para construir el payload
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [invoice.orderId]);
    const order = orderResult.rows[0] || {};

    // Construir payload para el proveedor DIAN
    const dianPayload = generateDianRequestPayload(invoice, order);

    // Actualizar estado a 'sent'
    await pool.query(`UPDATE invoices SET status = 'sent', "dianResponse" = $1 WHERE id = $2`, [
      JSON.stringify({ ...dianPayload, enviadoEn: new Date().toISOString() }),
      invoice.id,
    ]);

    const updated = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoice.id]);

    // Notificar WebSocket
    setImmediate(() => notifyInvoiceUpdate(invoice.id, 'sent', invoice.locationId));

    res.json({
      message: 'Factura preparada para envío a DIAN',
      invoice: updated.rows[0],
      // El payload completo está en updated.rows[0].dianResponse
      // Instrucciones para el proveedor:
      instrucciones: {
        proveedor: DIAN_CONFIG.software.proveedorTecnologico,
        accion: 'Enviar XML firmado a la DIAN vía API del proveedor',
        camposManuales: ['Firma digital (certificado .pfx/.p12)', 'CUFE generado por DIAN', 'Respuesta del proveedor'],
        endpointSiguiente: `PUT /api/invoices/${invoice.id} con { cufe, dianResponse, status: "accepted" }`,
      },
    });
  } catch (_e) {
    res.status(500).json({ error: 'Error al enviar a DIAN' });
  }
});

// PUT /api/invoices/:id — actualizar factura (ej. después de enviar a DIAN)
router.put(
  '/api/invoices/:id',
  authMiddleware,
  requireRole('ADMIN'),
  validate(updateInvoiceSchema),
  async (req, res) => {
    try {
      const {
        invoiceNumber,
        cufe,
        xml,
        pdf_url,
        status,
        dianResponse,
        emisorInfo,
        receptorInfo,
        notes,
        fechaVencimiento,
        tipoOperacion,
        moneda,
      } = req.body;
      const updates = [];
      const params = [];

      const fields = [
        ['"invoiceNumber"', invoiceNumber],
        ['cufe', cufe],
        ['xml', xml],
        ['pdf_url', pdf_url],
        ['status', status],
        ['notes', notes],
        ['"fechaVencimiento"', fechaVencimiento],
        ['"tipoOperacion"', tipoOperacion],
        ['moneda', moneda],
      ];

      for (const [field, value] of fields) {
        if (value !== undefined) {
          params.push(value);
          updates.push(`${field} = $${params.length}`);
        }
      }

      if (dianResponse !== undefined) {
        params.push(JSON.stringify(dianResponse));
        updates.push(`"dianResponse" = $${params.length}`);
      }
      if (emisorInfo !== undefined) {
        params.push(JSON.stringify(emisorInfo));
        updates.push(`"emisorInfo" = $${params.length}`);
      }
      if (receptorInfo !== undefined) {
        params.push(JSON.stringify(receptorInfo));
        updates.push(`"receptorInfo" = $${params.length}`);
      }

      if (!updates.length) return res.status(400).json({ error: 'Nada que actualizar' });

      params.push(req.params.id);
      await pool.query(`UPDATE invoices SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

      const updated = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);

      // Notificar WebSocket SOLO si la fila existe. Antes usábamos
      // `updated.rows[0]?.locationId`, que cae a undefined cuando el WHERE
      // del UPDATE no impactó ninguna fila — y eso se filtraba como null en
      // notifyAuthorized, enviando un `invoice:updated` fantasma a admins
      // de TODAS las sedes (cross-sede leak). Saltamos el notify para que
      // el broadcast refleje la realidad de la DB.
      if (updated.rows[0]) {
        setImmediate(() => notifyInvoiceUpdate(req.params.id, 'updated', updated.rows[0].locationId));
      }

      res.json(updated.rows[0]);
    } catch (_e) {
      res.status(500).json({ error: 'Error al actualizar factura' });
    }
  }
);

// POST /api/invoices/:id/resend — reenviar a DIAN (regenerar XML y payload)
router.post('/api/invoices/:id/resend', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const invoiceResult = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (!invoiceResult.rows.length) return res.status(404).json({ error: 'Factura no encontrada' });
    const inv = invoiceResult.rows[0];

    // Obtener orden para regenerar XML
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [inv.orderId]);
    const order = orderResult.rows[0] || {};

    // Regenerar XML con estado actual
    const xml = generateInvoiceXml({ ...inv, createdAt: new Date().toISOString() }, order, null);

    const dianPayload = generateDianRequestPayload(inv, order);

    await pool.query(`UPDATE invoices SET status = 'sent', xml = $1, "dianResponse" = $2 WHERE id = $3`, [
      xml,
      JSON.stringify({ ...dianPayload, reenviadoEn: new Date().toISOString() }),
      inv.id,
    ]);

    const updated = await pool.query('SELECT * FROM invoices WHERE id = $1', [inv.id]);
    setImmediate(() => notifyInvoiceUpdate(inv.id, 'resent', inv.locationId));

    res.json(updated.rows[0]);
  } catch (_e) {
    res.status(500).json({ error: 'Error al reenviar factura' });
  }
});

// ===== CREDIT / DEBIT NOTES =====

// GET /api/credit-notes
router.get('/api/credit-notes', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { invoiceId } = req.query;
    let query = 'SELECT * FROM credit_notes';
    const params = [];
    if (invoiceId) {
      params.push(invoiceId);
      query += ` WHERE "invoiceId" = $1`;
    }
    query += ' ORDER BY "createdAt" DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (_e) {
    res.status(500).json({ error: 'Error al listar notas' });
  }
});

// GET /api/credit-notes/:id
router.get('/api/credit-notes/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM credit_notes WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Nota no encontrada' });
    res.json(result.rows[0]);
  } catch (_e) {
    res.status(500).json({ error: 'Error al obtener nota' });
  }
});

// POST /api/credit-notes
router.post(
  '/api/credit-notes',
  authMiddleware,
  requireRole('ADMIN'),
  validate(createCreditNoteSchema),
  async (req, res) => {
    try {
      const { invoiceId, tipoNota, motivo, monto, items, createdBy } = req.body;

      // Verificar factura
      const invoice = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
      if (!invoice.rows.length) return res.status(404).json({ error: 'Factura no encontrada' });

      const id = `cn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await pool.query(
        `INSERT INTO credit_notes (id, "invoiceId", "tipoNota", motivo, monto, items, status, "createdBy")
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
        [id, invoiceId, tipoNota, motivo, monto, JSON.stringify(items), createdBy || null]
      );

      const created = await pool.query('SELECT * FROM credit_notes WHERE id = $1', [id]);
      res.status(201).json(created.rows[0]);
    } catch (_e) {
      res.status(500).json({ error: 'Error al crear nota' });
    }
  }
);

// DELETE /api/credit-notes/:id
router.delete('/api/credit-notes/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM credit_notes WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Nota no encontrada' });
    res.json({ deleted: true });
  } catch (_e) {
    res.status(500).json({ error: 'Error al eliminar nota' });
  }
});

export default router;
