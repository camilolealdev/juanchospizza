import { z } from 'zod';
import { str, strOpt, strDefault, clampedNumber, clampedNumberOpt, requiredPositiveNumber } from './helpers.js';

const MAX_ITEMS_JSON_LENGTH = 5000;
const itemsField = z
  .array(z.any())
  .refine((items) => JSON.stringify(items).length <= MAX_ITEMS_JSON_LENGTH, 'Items demasiado grandes');

// Mismas 2 sedes que server/schemas/employees.js -- Nemocón y Zipaquirá.
export const LOCATION_IDS = ['nemocon', 'zipaquira'];

export const createOrderSchema = z.object({
  orderNumber: str(50),
  customerName: str(100),
  customerPhone: strOpt(30),
  address: str(200),
  items: itemsField,
  total: requiredPositiveNumber(999999999, 'Faltan datos requeridos'),
  estimatedTime: clampedNumber(0, 180, 30),
  paymentMethod: strDefault(20, 'cash'),
  locationId: z.enum(LOCATION_IDS, { error: 'Sede inválida' }).optional().default('nemocon'),
});

export const updateOrderSchema = z.object({
  address: str(200).optional(),
  items: itemsField.optional(),
  // `total` NO se acepta del cliente en PUT (anti-tampering). El monto final
  // se recalcula server-side desde el catálogo real cuando cambian los
  // `items`, exactamente igual que en POST /api/orders -- nunca se persiste
  // un total enviado por el cliente. Hallazgo #13 de
  // docs/GAPS_DETALLADO_2026-08-05.md y P0 de docs/AUDITORIA_CRUD_GENERAL_2026-08-06.md.
  // Nota: zod descarta (strip) campos no declarados, así que un `total` en el
  // body simplemente se ignora -- no llega al handler.
  estimatedTime: clampedNumberOpt(0, 180),
  paymentMethod: str(20).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED', 'DELIVERING', 'COMPLETED', 'CANCELLED'], {
    error: 'Status inválido',
  }),
});
