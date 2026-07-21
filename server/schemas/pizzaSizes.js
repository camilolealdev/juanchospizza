import { z } from 'zod';
import { str, clampedNumber, clampedNumberOpt, bool, boolOpt } from './helpers.js';

export const createPizzaSizeSchema = z.object({
  nombre: str(50),
  precio: clampedNumber(0, 999999999),
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
