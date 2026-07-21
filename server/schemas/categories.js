import { z } from 'zod';
import { str, strOpt } from './helpers.js';

export const createCategorySchema = z.object({
  name: str(100),
  icon: strOpt(50),
  color: strOpt(50),
});

export const updateCategorySchema = z.object({
  name: str(100).optional(),
  icon: strOpt(50),
  color: strOpt(50),
});
