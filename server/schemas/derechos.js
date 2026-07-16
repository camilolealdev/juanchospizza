// Validación de payloads para derechos ARCO (Ley 1581 Art. 14-15).
//   consulta    — titular pide conocer sus datos.
//   rectificacion — titular corrige datos inexactos.
//   supresion   — titular pide eliminación de datos ya no necesarios.
//   reclamo     — inconformidad sobre uso no autorizado o tratamiento
//                 contrario al régimen (Art. 15, plazo 10 días hábiles).
//
// Cada request exige al menos un identificador (email o telefono) para
// verificar la identidad del titular, más una descripción libre que
// ayude al equipo a responder dentro del plazo legal.

import { z } from 'zod';

const identifierSchema = z.object({
  email: z.string().email().optional(),
  telefono: z.string().regex(/^[0-9+\-\s()]{6,20}$/).optional(),
}).refine((d) => d.email || d.telefono, {
  message: 'Proporcioná al menos un email o teléfono para identificar la solicitud',
});

const tipoSchema = z.enum(['consulta', 'rectificacion', 'supresion', 'reclamo']);

export const derechoBaseSchema = identifierSchema.extend({
  tipo: tipoSchema,
  descripcion: z.string().min(10).max(2000),
});
