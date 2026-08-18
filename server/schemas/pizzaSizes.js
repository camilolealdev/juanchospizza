import { z } from 'zod';
import { str, clampedNumber, clampedNumberOpt, requiredPositiveNumber, bool, boolOpt } from './helpers.js';

export const createPizzaSizeSchema = z.object({
  nombre: str(50),
  // El precio es obligatorio y > 0: clampedNumber dejaba que un POST sin
  // precio creara un tamaño a $0 (default silencioso) -- mismo criterio que
  // finance (requiredPositiveNumber). El frontend siempre envía el campo.
  precio: requiredPositiveNumber(999999999, 'Faltan datos requeridos'),
  incluidos: clampedNumber(0, 20),
  porciones: clampedNumberOpt(0, 100),
  activo: bool(true),
});

export const updatePizzaSizeSchema = z.object({
  nombre: str(50).optional(),
  precio: clampedNumberOpt(0, 999999999),
  incluidos: clampedNumberOpt(0, 20),
  porciones: clampedNumberOpt(0, 100),
  activo: boolOpt(),
});
