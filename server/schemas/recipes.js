import { z } from 'zod';
import { str, strOpt, strDefault, clampedNumber, clampedNumberOpt } from './helpers.js';

const recipeIngredientInput = z.object({
  itemId: strOpt(50),
  nombre: strOpt(100),
  cantidad: clampedNumber(0, 999999, 0),
  unidad: strDefault(20, 'unidad'),
  costo: clampedNumber(0, 999999999, 0),
});

export const createRecipeSchema = z.object({
  nombre: str(100),
  productoId: strOpt(50),
  porciones: clampedNumber(1, 9999, 1),
  costoTotal: clampedNumber(0, 999999999, 0),
  instrucciones: strOpt(2000),
  ingredientes: z.array(recipeIngredientInput).max(100, 'Máximo 100 ingredientes').optional().default([]),
});

export const updateRecipeSchema = z.object({
  nombre: str(100).optional(),
  productoId: strOpt(50),
  porciones: clampedNumberOpt(1, 9999),
  costoTotal: clampedNumberOpt(0, 999999999),
  instrucciones: strOpt(2000),
  // Distingue "no venían ingredientes" (undefined -> no tocar la lista
  // existente) de "vino una lista nueva, aunque vacía" (reemplaza todo) --
  // el router original ya usa Array.isArray(ingredientes) para esa misma
  // distinción, así que se preserva tal cual.
  ingredientes: z.array(recipeIngredientInput).max(100, 'Máximo 100 ingredientes').optional(),
});
