import { z } from 'zod';
import { str, strOpt } from './helpers.js';

// Solo la forma del input -- las reglas que dependen de la DB (el pedido
// existe, está COMPLETED, el teléfono coincide, no hay reseña duplicada)
// se quedan en el router, no se pueden expresar en un schema sincrónico.
export const createReviewSchema = z.object({
  orderId: str(100, 'Faltan datos requeridos'),
  clientPhone: str(30, 'Faltan datos requeridos'),
  clientName: strOpt(100),
  // Math.round(Number(rating)) en el original -- redondea en vez de
  // rechazar un decimal, se preserva ese comportamiento.
  rating: z.coerce.number({ error: 'Faltan datos requeridos' })
    .transform(v => Math.round(v))
    .refine(v => Number.isFinite(v) && v >= 1 && v <= 5, 'La calificación debe ser entre 1 y 5'),
  comment: strOpt(500),
});

export const reviewStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected'], { error: 'Estado inválido' }),
});
