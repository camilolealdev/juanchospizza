import { z } from 'zod';
import { str, strOpt, strDefault, clampedNumberOpt, requiredPositiveNumber, bool, boolOpt } from './helpers.js';

export const createExpenseSchema = z.object({
  categoria: str(50),
  descripcion: strOpt(200),
  monto: requiredPositiveNumber(999999999, 'Faltan datos requeridos'),
  fecha: strOpt(30),
  metodo: strOpt(50),
  proveedor: strOpt(100),
  factura: strOpt(100),
  notas: strOpt(500),
  recurrente: bool(),
  locationId: strDefault(10, 'nemocon'),
});

export const updateExpenseSchema = z.object({
  categoria: str(50).optional(),
  descripcion: strOpt(200),
  monto: clampedNumberOpt(0, 999999999),
  fecha: strOpt(30),
  metodo: strOpt(50),
  proveedor: strOpt(100),
  factura: strOpt(100),
  notas: strOpt(500),
  recurrente: boolOpt(),
  locationId: str(10).optional(),
});
