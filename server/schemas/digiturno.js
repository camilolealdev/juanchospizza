// Zod schemas for digiturno (digital ticket/turn system).
import { z } from 'zod';
import { strOpt, clampedNumberOpt } from './helpers.js';

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
  guestCount: clampedNumberOpt(1, 50).default(1),
  source: z.enum(SOURCES).default('local'),
  items: z.array(z.any()).default([]),
  total: clampedNumberOpt(0, 99999999).default(0),
  notes: strOpt(500),
});

export const updateDigiturnoStatusSchema = z.object({
  status: z.enum(STATUSES),
});

export const updateDigiturnoSchema = z.object({
  orderType: z.enum(ORDER_TYPES).optional(),
  customerName: strOpt(100),
  guestCount: clampedNumberOpt(1, 50),
  notes: strOpt(500),
  items: z.array(z.any()).optional(),
  total: clampedNumberOpt(0, 99999999),
});
