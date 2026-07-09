import { z } from 'zod';
import { str, clampedNumber, clampedNumberOpt } from './helpers.js';

// El original nunca validaba `name`/`type` -- un POST sin ellos insertaba
// literalmente el string "undefined" (String(undefined)). Los tipos acá
// espejan exactamente lo que ya declara src/types/index.ts (Campaign).
const CAMPAIGN_TYPES = ['flash', 'segment', 'rappipromo'];
const CAMPAIGN_STATUSES = ['active', 'scheduled', 'draft'];

export const createCampaignSchema = z.object({
  name: str(100),
  type: z.enum(CAMPAIGN_TYPES, { error: 'Tipo de campaña inválido' }),
  discount: clampedNumber(0, 100),
  status: z.enum(CAMPAIGN_STATUSES).optional().default('draft'),
  budget: clampedNumber(0, 999999999),
});

export const updateCampaignSchema = z.object({
  name: str(100).optional(),
  type: z.enum(CAMPAIGN_TYPES).optional(),
  discount: clampedNumberOpt(0, 100),
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  budget: clampedNumberOpt(0, 999999999),
});
