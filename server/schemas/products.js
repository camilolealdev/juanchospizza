import { z } from 'zod';
import { str, strOpt, clampedNumber, clampedNumberOpt, bool, boolOpt } from './helpers.js';
import { LOCATION_IDS } from './orders.js';

// Override opcional de basePrice por sede (ej. { nemocon: 9500 }) -- las
// sedes que no aparecen siguen usando basePrice sin cambios.
const priceBySedeOpt = () => z.record(z.enum(LOCATION_IDS), z.number().min(0).max(999999999)).optional();

export const createProductSchema = z.object({
  categoryId: strOpt(50),
  nombre: str(100),
  descripcion: strOpt(500),
  basePrice: clampedNumber(0, 999999999),
  priceBySede: priceBySedeOpt(),
  type: strOpt(30),
  image: strOpt(300),
  tiempo: clampedNumber(0, 999),
  popularidad: clampedNumber(0, 100),
  vegetariano: bool(),
  isPremium: bool(),
  exclusiva: bool(),
  subcategory: strOpt(50),
});

export const updateProductSchema = z.object({
  categoryId: strOpt(50),
  nombre: str(100).optional(),
  descripcion: strOpt(500),
  basePrice: clampedNumberOpt(0, 999999999),
  priceBySede: priceBySedeOpt(),
  type: strOpt(30),
  image: strOpt(300),
  tiempo: clampedNumberOpt(0, 999),
  popularidad: clampedNumberOpt(0, 100),
  vegetariano: boolOpt(),
  isPremium: boolOpt(),
  exclusiva: boolOpt(),
  subcategory: strOpt(50),
});
