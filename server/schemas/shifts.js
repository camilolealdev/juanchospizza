import { z } from 'zod';
import { strOpt } from './helpers.js';
import { LOCATION_IDS } from './orders.js';

export const openShiftSchema = z.object({
  locationId: z.enum(LOCATION_IDS, { error: 'Sede inválida' }),
  openingCash: z.coerce
    .number({ error: 'Falta el monto de apertura' })
    .min(0, 'El monto de apertura no puede ser negativo'),
});

export const closeShiftSchema = z.object({
  closingCash: z.coerce
    .number({ error: 'Falta el monto de cierre' })
    .min(0, 'El monto de cierre no puede ser negativo'),
  notas: strOpt(500),
});

// Actualización de metadatos del turno — deliberadamente SOLO notas: los
// montos (openingCash/closingCash/expectedCash/difference) los manejan
// únicamente abrir/cerrar porque la reconciliación de caja deriva de ellos.
export const updateShiftSchema = z.object({
  notas: strOpt(500),
});
