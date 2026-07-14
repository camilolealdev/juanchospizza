// Invoices + Credit/Debit Notes — estructura base para facturación electrónica DIAN
import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createInvoiceSchema, updateInvoiceSchema, createCreditNoteSchema } from '../schemas/invoices.js';

const router = express.Router();

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
  } catch (e) {
    res.status(500).json({ error: 'Error al listar facturas' });
  }
});

// GET /api/invoices/:id
router.get('/api/invoices/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener factura' });
  }
});

// POST /api/invoices — crear factura desde una orden
router.post('/api/invoices', authMiddleware, requireRole('ADMIN'), validate(createInvoiceSchema), async (req, res) => {
  try {
    const { orderId, tipoDocumento, locationId } = req.body;

    // Verificar que la orden existe
    const order = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    if (!order.rows.length) return res.status(404).json({ error: 'Orden no encontrada' });

    // Verificar que no tenga ya factura
    const existing = await pool.query('SELECT id FROM invoices WHERE "orderId" = $1', [orderId]);
    if (existing.rows.length) return res.status(409).json({ error: 'La orden ya tiene una factura asociada' });

    const id = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const invoiceNumber = `FE-${String(Date.now()).slice(-8)}`;

    await pool.query(
      `INSERT INTO invoices (id, "orderId", "invoiceNumber", "tipoDocumento", status, "locationId")
       VALUES ($1, $2, $3, $4, 'pending', $5)`,
      [id, orderId, invoiceNumber, tipoDocumento, locationId]
    );

    const created = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
    res.status(201).json(created.rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Error al crear factura' });
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
      const { invoiceNumber, cufe, xml, pdf_url, status, dianResponse } = req.body;
      const updates = [];
      const params = [];

      if (invoiceNumber !== undefined) {
        params.push(invoiceNumber);
        updates.push(`"invoiceNumber" = $${params.length}`);
      }
      if (cufe !== undefined) {
        params.push(cufe);
        updates.push(`cufe = $${params.length}`);
      }
      if (xml !== undefined) {
        params.push(xml);
        updates.push(`xml = $${params.length}`);
      }
      if (pdf_url !== undefined) {
        params.push(pdf_url);
        updates.push(`pdf_url = $${params.length}`);
      }
      if (status !== undefined) {
        params.push(status);
        updates.push(`status = $${params.length}`);
      }
      if (dianResponse !== undefined) {
        params.push(JSON.stringify(dianResponse));
        updates.push(`"dianResponse" = $${params.length}`);
      }

      if (!updates.length) return res.status(400).json({ error: 'Nada que actualizar' });

      params.push(req.params.id);
      await pool.query(`UPDATE invoices SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

      const updated = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
      res.json(updated.rows[0]);
    } catch (e) {
      res.status(500).json({ error: 'Error al actualizar factura' });
    }
  }
);

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
  } catch (e) {
    res.status(500).json({ error: 'Error al listar notas' });
  }
});

// GET /api/credit-notes/:id
router.get('/api/credit-notes/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM credit_notes WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Nota no encontrada' });
    res.json(result.rows[0]);
  } catch (e) {
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
    } catch (e) {
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
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar nota' });
  }
});

export default router;
