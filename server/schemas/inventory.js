import { z } from 'zod';
import { str, strOpt, strDefault, clampedNumber, clampedNumberOpt, boolOpt } from './helpers.js';

export const createInventoryItemSchema = z.object({
  nombre: str(100),
  categoria: strOpt(50),
  stockActual: clampedNumber(0, 9999999, 0),
  stockMinimo: clampedNumber(0, 9999999, 10),
  stockMaximo: clampedNumber(0, 9999999, 100),
  unidad: strDefault(20, 'unidad'),
  costoUnitario: clampedNumber(0, 999999999, 0),
  proveedor: strOpt(100),
  lote: strOpt(50),
  fechaVencimiento: strOpt(30),
  ubicacion: strOpt(100),
});

// stockActual deliberadamente excluido -- solo cambia vía /inventory/movement.
export const updateInventoryItemSchema = z.object({
  nombre: str(100).optional(),
  categoria: strOpt(50),
  stockMinimo: clampedNumberOpt(0, 9999999),
  stockMaximo: clampedNumberOpt(0, 9999999),
  unidad: str(20).optional(),
  costoUnitario: clampedNumberOpt(0, 999999999),
  proveedor: strOpt(100),
  lote: strOpt(50),
  fechaVencimiento: strOpt(30),
  ubicacion: strOpt(100),
  activo: boolOpt(),
});

export const inventoryMovementSchema = z.object({
  itemId: str(50, 'Falta itemId'),
  tipo: z.enum(['entrada', 'salida'], { error: 'Tipo de movimiento inválido' }),
  cantidad: z.coerce.number().min(0.01, 'La cantidad debe ser mayor a 0'),
  motivo: str(200),
  referencia: strOpt(100),
  usuario: strDefault(50, 'sistema'),
});
