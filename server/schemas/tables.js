import { z } from 'zod';
import { str, strOpt, clampedNumber, boolOpt } from './helpers.js';

/** @type {const} */
export const TABLE_AREAS = /** @type {const} */ (['salon', 'terraza', 'privado', 'barra']);
/** @type {const} */
export const TABLE_STATUS = /** @type {const} */ (['available', 'occupied', 'reserved', 'cleaning', 'maintenance']);

export const createTableSchema = z.object({
  name: str(50),
  capacity: clampedNumber(1, 20, 4),
  area: z.enum(TABLE_AREAS, { error: 'Área inválida' }).default('salon'),
  locationId: z.enum(['nemocon', 'zipaquira'], { error: 'Sede inválida' }).default('nemocon'),
  notes: strOpt(200),
});

export const updateTableSchema = z.object({
  name: str(50).optional(),
  capacity: clampedNumber(1, 20).optional(),
  area: z.enum(TABLE_AREAS).optional(),
  locationId: z.enum(['nemocon', 'zipaquira']).optional(),
  status: z.enum(TABLE_STATUS).optional(),
  notes: strOpt(200),
  active: boolOpt(),
});

export const batchUpdateStatusSchema = z.object({
  ids: z.array(z.string()).min(1, 'Selecciona al menos una mesa'),
  status: z.enum(TABLE_STATUS, { error: 'Estado inválido' }),
});
