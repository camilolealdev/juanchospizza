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

const identifierSchema = z
  .object({
    email: z.string().email().optional(),
    telefono: z
      .string()
      .regex(/^[0-9+\-\s()]{6,20}$/)
      .optional(),
  })
  .refine((d) => d.email || d.telefono, {
    message: 'Proporcioná al menos un email o teléfono para identificar la solicitud',
  });

const tipoSchema = z.enum(['consulta', 'rectificacion', 'supresion', 'reclamo']);

export const derechoBaseSchema = identifierSchema.extend({
  tipo: tipoSchema,
  descripcion: z.string().min(10).max(2000),
});

// PATCH /api/derechos/:id (admin) — responder una solicitud.
// estado: 'pendiente' | 'en_proceso' | 'respondida' | 'rechazada'.
// respuesta es obligatoria cuando se marca como respondida (dejar registro
// de qué se hizo con los datos del titular, evidencia ante la SIC).
export const derechoResponseSchema = z
  .object({
    estado: z.enum(['pendiente', 'en_proceso', 'respondida', 'rechazada']),
    respuesta: z.string().min(1).max(5000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.estado === 'respondida' && (!data.respuesta || !data.respuesta.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debés registrar una respuesta al marcar la solicitud como respondida',
      });
    }
  });
