// Zod schemas for invoices and credit/debit notes.
// See server/db.js for corresponding table definitions.
// Ver docs/DIAN_MODULE_STATUS.md para detalles de integración DIAN.
import { z } from 'zod';
import { str, strOpt, requiredPositiveNumber } from './helpers.js';

// Schema para los datos del emisor (se almacena como JSON en emisorInfo)
export const emisorInfoSchema = z.object({
  nit: str(20).default('900000000'),
  digitoVerificacion: str(1).default('0'),
  razonSocial: str(200).default('JUANCHO PIZZA SAS'),
  nombreComercial: str(200).default("Juancho's Pizza"),
  direccion: str(200).default('Cra 7 #12-34'),
  ciudad: str(100).default('Nemocón'),
  codigoCiudad: str(10).default('25489'),
  departamento: str(100).default('Cundinamarca'),
  codigoDepartamento: str(10).default('25'),
  pais: str(100).default('Colombia'),
  codigoPais: str(10).default('CO'),
  telefono: str(30).default('3117074843'),
  email: str(200).default('contacto@juanchospizza.com'),
  regimenFiscal: str(20).default('R-99-PJ'),
  responsabilidadFiscal: str(20).default('O-15'),
  tipoContribuyente: str(2).default('1'),
  matriculaMercantil: strOpt(50),
  codigoEstablecimiento: str(10).default('00001'),
});

// Schema para datos del receptor (cliente)
export const receptorInfoSchema = z.object({
  tipoIdentificacion: str(10).default('31'),
  numeroIdentificacion: str(30).default('222222222222'),
  digitoVerificacion: str(1).default('0'),
  razonSocial: str(200).default('CONSUMIDOR FINAL'),
  direccion: str(200).default('Sin dirección'),
  ciudad: str(100).default('Bogotá'),
  codigoCiudad: str(10).default('11001'),
  departamento: str(100).default('Bogotá'),
  codigoDepartamento: str(10).default('11'),
  pais: str(100).default('Colombia'),
  codigoPais: str(10).default('CO'),
  email: strOpt(200),
  telefono: strOpt(30),
});

export const createInvoiceSchema = z.object({
  orderId: str(36, 'ID de orden requerido'),
  tipoDocumento: z.enum(['factura', 'pos', 'pos_electronica', 'documento_soporte']).default('factura'),
  locationId: str(20).default('nemocon'),
  notes: strOpt(500),
  emisorInfo: emisorInfoSchema.optional(),
  receptorInfo: receptorInfoSchema.optional(),
  fechaVencimiento: strOpt(30),
  tipoOperacion: z.enum(['10', '20', '30', '40']).default('10'),
  moneda: str(3).default('COP'),
});

export const updateInvoiceSchema = z.object({
  invoiceNumber: strOpt(50),
  cufe: strOpt(500),
  xml: strOpt(100000),
  pdf_url: strOpt(500),
  status: z.enum(['pending', 'sent', 'accepted', 'rejected']).optional(),
  dianResponse: z.any().optional(),
  emisorInfo: emisorInfoSchema.optional(),
  receptorInfo: receptorInfoSchema.optional(),
  notes: strOpt(500),
  fechaVencimiento: strOpt(30),
  tipoOperacion: z.enum(['10', '20', '30', '40']).optional(),
  moneda: str(3).optional(),
});

export const createCreditNoteSchema = z.object({
  invoiceId: str(36, 'ID de factura requerido'),
  tipoNota: z.enum(['credito', 'debito']).default('credito'),
  motivo: str(500, 'Motivo requerido'),
  monto: requiredPositiveNumber(99999999, 'Monto requerido'),
  items: z.array(z.any()).default([]),
  createdBy: strOpt(80),
});
