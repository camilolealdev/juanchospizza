// Zod schemas for invoices and credit/debit notes.
// See server/db.js for corresponding table definitions.
import { z } from 'zod';
import { str, strOpt, requiredPositiveNumber } from './helpers.js';

export const createInvoiceSchema = z.object({
  orderId: str(36, 'ID de orden requerido'),
  tipoDocumento: z.enum(['factura', 'pos', 'pos_electronica', 'documento_soporte']).default('factura'),
  locationId: str(20).default('nemocon'),
});

export const updateInvoiceSchema = z.object({
  invoiceNumber: strOpt(50),
  cufe: strOpt(200),
  xml: strOpt(50000),
  pdf_url: strOpt(500),
  status: z.enum(['pending', 'sent', 'accepted', 'rejected']).optional(),
  dianResponse: z.any().optional(),
});

export const createCreditNoteSchema = z.object({
  invoiceId: str(36, 'ID de factura requerido'),
  tipoNota: z.enum(['credito', 'debito']).default('credito'),
  motivo: str(500, 'Motivo requerido'),
  monto: requiredPositiveNumber(99999999, 'Monto requerido'),
  items: z.array(z.any()).default([]),
  createdBy: strOpt(80),
});
