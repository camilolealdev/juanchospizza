import { z } from 'zod';
import { str, strOpt, clampedNumber, clampedNumberOpt, bool, boolOpt } from './helpers.js';

// --- Variants ---
export const createVariantSchema = z.object({
  productoId: strOpt(50),
  nombre: str(100),
  precioModificador: clampedNumber(-999999999, 999999999),
  activo: bool(true),
});

export const updateVariantSchema = z.object({
  productoId: strOpt(50),
  nombre: str(100).optional(),
  precioModificador: clampedNumberOpt(-999999999, 999999999),
  activo: boolOpt(),
});

// --- Combos ---
const MAX_PRODUCTOS_JSON_LENGTH = 5000;
const productosField = z.array(z.any())
  .refine(p => JSON.stringify(p).length <= MAX_PRODUCTOS_JSON_LENGTH, 'Productos demasiado grandes');

export const createComboSchema = z.object({
  nombre: str(100),
  descripcion: strOpt(300),
  productos: productosField.optional().default([]),
  precioTotal: clampedNumber(0, 999999999),
  ahorro: clampedNumber(0, 999999999),
  imagen: strOpt(300),
  activo: bool(true),
});

export const updateComboSchema = z.object({
  nombre: str(100).optional(),
  descripcion: strOpt(300),
  productos: productosField.optional(),
  precioTotal: clampedNumberOpt(0, 999999999),
  ahorro: clampedNumberOpt(0, 999999999),
  imagen: strOpt(300),
  activo: boolOpt(),
});

// --- Promotions ---
export const createPromotionSchema = z.object({
  nombre: str(100),
  descripcion: strOpt(300),
  tipo: strOpt(30),
  valor: clampedNumber(0, 999999999),
  productoId: strOpt(50),
  categoriaId: strOpt(50),
  montoMinimo: clampedNumber(0, 999999999),
  inicia: strOpt(30),
  termina: strOpt(30),
  activo: bool(true),
  limite: clampedNumber(0, 999999, 100),
});

export const updatePromotionSchema = z.object({
  nombre: str(100).optional(),
  descripcion: strOpt(300),
  tipo: strOpt(30),
  valor: clampedNumberOpt(0, 999999999),
  productoId: strOpt(50),
  categoriaId: strOpt(50),
  montoMinimo: clampedNumberOpt(0, 999999999),
  inicia: strOpt(30),
  termina: strOpt(30),
  activo: boolOpt(),
  usado: clampedNumberOpt(0, 999999),
  limite: clampedNumberOpt(0, 999999),
});
