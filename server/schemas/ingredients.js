import { z } from 'zod';
import { str, strOpt, clampedNumber, clampedNumberOpt, bool, boolOpt } from './helpers.js';

export const createIngredientSchema = z.object({
  nombre: str(100),
  descripcion: strOpt(300),
  precio_extra: clampedNumber(0, 999999999),
  categoria: strOpt(50),
  vegetariano: bool(),
  vegano: bool(),
  premium: bool(),
  dulce: bool(),
  disponible: bool(true), // default true, distinto de los demás -- coincide con el original
  defaultIng: bool(),
});

export const updateIngredientSchema = z.object({
  nombre: str(100).optional(),
  descripcion: strOpt(300),
  precio_extra: clampedNumberOpt(0, 999999999),
  categoria: strOpt(50),
  vegetariano: boolOpt(),
  vegano: boolOpt(),
  premium: boolOpt(),
  dulce: boolOpt(),
  disponible: boolOpt(),
  defaultIng: boolOpt(),
});
