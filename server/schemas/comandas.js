// Zod schemas for comandas (dine-in orders) and comanda_items.
// See server/db.js for the corresponding table definitions.
import { z } from 'zod';
import { str, strOpt, clampedNumber, requiredPositiveNumber } from './helpers.js';

export const createComandaSchema = z.object({
  tableId: str(36, 'ID de mesa requerido'),
  waiterName: strOpt(80),
  guestCount: clampedNumber(1, 99, 1),
  notes: strOpt(500),
  locationId: str(20).default('nemocon'),
});

export const updateComandaSchema = z.object({
  guestCount: clampedNumber(1, 99).optional(),
  notes: strOpt(500),
  total: z.coerce.number().int().min(0).optional(),
});

export const closeComandaSchema = z.object({
  total: requiredPositiveNumber(99999999, 'Total requerido para cerrar comanda'),
  notes: strOpt(500),
  paymentMethod: strOpt(30),
});

// Create item schema
export const createComandaItemSchema = z.object({
  comandaId: str(36, 'ID de comanda requerido'),
  productId: strOpt(80),
  productName: str(200, 'Nombre del producto requerido'),
  quantity: clampedNumber(1, 99, 1),
  unitPrice: clampedNumber(0, 99999999, 0),
  notes: strOpt(300),
});

// Update item schema (status, notes)
export const updateComandaItemSchema = z.object({
  quantity: clampedNumber(1, 99).optional(),
  notes: strOpt(300),
  status: z.enum(['pending', 'preparing', 'ready', 'served', 'cancelled']).optional(),
});

// Bulk add items
export const bulkAddItemsSchema = z.object({
  comandaId: str(36, 'ID de comanda requerido'),
  items: z
    .array(
      z.object({
        productId: strOpt(80),
        productName: str(200, 'Nombre del producto requerido'),
        quantity: clampedNumber(1, 99, 1),
        unitPrice: clampedNumber(0, 99999999, 0),
        notes: strOpt(300),
      })
    )
    .min(1, 'Debe incluir al menos un producto'),
});
