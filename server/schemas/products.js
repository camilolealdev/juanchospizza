import { z } from 'zod';
import { str, strOpt, clampedNumber, clampedNumberOpt, bool, boolOpt } from './helpers.js';

export const createProductSchema = z.object({
  categoryId: strOpt(50),
  nombre: str(100),
  descripcion: strOpt(500),
  basePrice: clampedNumber(0, 999999999),
  type: strOpt(30),
  image: strOpt(300),
  tiempo: clampedNumber(0, 999),
  popularidad: clampedNumber(0, 100),
  vegetariano: bool(),
  isPremium: bool(),
  exclusiva: bool(),
});

export const updateProductSchema = z.object({
  categoryId: strOpt(50),
  nombre: str(100).optional(),
  descripcion: strOpt(500),
  basePrice: clampedNumberOpt(0, 999999999),
  type: strOpt(30),
  image: strOpt(300),
  tiempo: clampedNumberOpt(0, 999),
  popularidad: clampedNumberOpt(0, 100),
  vegetariano: boolOpt(),
  isPremium: boolOpt(),
  exclusiva: boolOpt(),
});
