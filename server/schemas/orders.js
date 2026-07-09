import { z } from 'zod';
import { str, strOpt, strDefault, clampedNumber, clampedNumberOpt, requiredPositiveNumber } from './helpers.js';

const MAX_ITEMS_JSON_LENGTH = 5000;
const itemsField = z.array(z.any())
  .refine(items => JSON.stringify(items).length <= MAX_ITEMS_JSON_LENGTH, 'Items demasiado grandes');

export const createOrderSchema = z.object({
  orderNumber: str(50),
  customerName: str(100),
  customerPhone: strOpt(30),
  address: str(200),
  items: itemsField,
  total: requiredPositiveNumber(999999999, 'Faltan datos requeridos'),
  estimatedTime: clampedNumber(0, 180, 30),
  paymentMethod: strDefault(20, 'cash'),
});

export const updateOrderSchema = z.object({
  address: str(200).optional(),
  items: itemsField.optional(),
  total: clampedNumberOpt(0, 999999999),
  estimatedTime: clampedNumberOpt(0, 180),
  paymentMethod: str(20).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(
    ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED', 'DELIVERING', 'COMPLETED', 'CANCELLED'],
    { error: 'Status inválido' }
  ),
});
