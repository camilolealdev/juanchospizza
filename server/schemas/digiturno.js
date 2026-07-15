// Zod schemas for digiturno (digital ticket/turn system).
import { z } from 'zod';
import { str, strOpt, num, numOpt, boolOpt } from './helpers.js';

const LOCATION_IDS = ['nemocon', 'zipaquira'];
const ORDER_TYPES = ['dine-in', 'pickup'];
const SOURCES = ['mesa', 'local', 'pickup'];
const STATUSES = ['waiting', 'preparing', 'ready', 'served', 'cancelled'];

export const createDigiturnoSchema = z.object({
  orderType: z.enum(ORDER_TYPES).default('dine-in'),
  locationId: z.enum(LOCATION_IDS).default('nemocon'),
  tableId: strOpt(36),
  tableName: strOpt(100),
  customerName: strOpt(100),
  guestCount: numOpt().default(1),
  source: z.enum(SOURCES).default('local'),
  items: z.array(z.any()).default([]),
  total: numOpt().default(0),
  notes: strOpt(500),
});

export const updateDigiturnoStatusSchema = z.object({
  status: z.enum(STATUSES),
});

export const updateDigiturnoSchema = z.object({
  orderType: z.enum(ORDER_TYPES).optional(),
  customerName: strOpt(100),
  guestCount: numOpt(),
  notes: strOpt(500),
  items: z.array(z.any()).optional(),
  total: numOpt(),
});
