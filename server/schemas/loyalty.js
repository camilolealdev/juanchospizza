import { z } from 'zod';
import { str, strOpt, clampedNumberOpt, requiredPositiveNumber, clampedNumberDefaultOnUndef } from './helpers.js';

export const createRewardSchema = z.object({
  nombre: str(100),
  descripcion: strOpt(300),
  // puntosCosto y valor son obligatorios y > 0: clampedNumber dejaba crear
  // recompensas a 0 puntos / $0 (default silencioso) -- mismo criterio que
  // finance. El frontend siempre envía ambos campos.
  puntosCosto: requiredPositiveNumber(999999, 'Faltan datos requeridos'),
  tipo: strOpt(30),
  valor: requiredPositiveNumber(999999999, 'Faltan datos requeridos'),
  // Columna INTEGER 0/1 (no boolean) -- 0 es un valor real ("no vigente"),
  // por eso el default solo aplica cuando el campo ni siquiera vino.
  vigente: clampedNumberDefaultOnUndef(0, 1, 1),
});

export const updateRewardSchema = z.object({
  nombre: str(100).optional(),
  descripcion: strOpt(300),
  puntosCosto: clampedNumberOpt(0, 999999),
  tipo: strOpt(30),
  valor: clampedNumberOpt(0, 999999999),
  vigente: clampedNumberOpt(0, 1),
});

// El original no validaba nada acá -- clientId/puntos/concepto viajaban
// crudos directo al INSERT y al UPDATE clients SET puntos = puntos + $1.
// puntos puede ser negativo a propósito (redimir una recompensa resta).
export const addPointsSchema = z.object({
  clientId: str(100, 'Falta clientId'),
  puntos: z.coerce.number({ error: 'Faltan datos requeridos' }).int().finite(),
  concepto: str(200),
  referencia: strOpt(100),
});
