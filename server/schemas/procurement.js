// Zod schemas for purchase orders / procurement.
// See server/db.js for corresponding table definitions.
import { z } from 'zod';
import { str, strOpt, clampedNumber } from './helpers.js';

const purchaseItemSchema = z.object({
  itemId: strOpt(80),
  nombre: str(200, 'Nombre del producto requerido'),
  cantidad: clampedNumber(1, 999999, 1),
  unidad: str(20).default('unidad'),
  precioUnitario: clampedNumber(0, 99999999, 0),
});

export const createPurchaseOrderSchema = z.object({
  proveedor: str(200, 'Proveedor requerido'),
  items: z.array(purchaseItemSchema).min(1, 'Debe incluir al menos un producto'),
  fechaEntrega: z.string().optional(),
  notas: strOpt(500),
  locationId: str(20).default('nemocon'),
  createdBy: strOpt(80),
});

export const updatePurchaseOrderSchema = z.object({
  proveedor: strOpt(200),
  items: z.array(purchaseItemSchema).optional(),
  fechaEntrega: z.string().optional(),
  status: z.enum(['pendiente', 'aprobada', 'enviada', 'recibida', 'cancelada']).optional(),
  notas: strOpt(500),
});

export const createQrMenuConfigSchema = z.object({
  locationId: str(20).default('nemocon'),
  title: str(80).default('Menú'),
  showPrices: z.coerce.boolean().optional().default(true),
  showImages: z.coerce.boolean().optional().default(true),
  showCombos: z.coerce.boolean().optional().default(true),
  showPromotions: z.coerce.boolean().optional().default(true),
  categories: z.array(z.string()).default([]),
});
