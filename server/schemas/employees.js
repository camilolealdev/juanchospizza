import { z } from 'zod';
import { str, boolOpt } from './helpers.js';

// Mismos 4 roles de staff que ya existen en server/auth.js (USERS). CLIENT
// deliberadamente excluido -- no es un rol de planta.
const ROLES = ['ADMIN', 'OPERATOR', 'REPARTIDOR', 'MARKETING'];
const LOCATIONS = ['nemocon', 'zipaquira'];

export const createEmployeeSchema = z.object({
  nombre: str(100),
  role: z.enum(ROLES, { error: 'Rol inválido' }),
  // 4 dígitos, igual al PIN del login existente (ver App.tsx LoginModal, maxLength=4).
  pin: z.string({ error: 'Falta el PIN' }).regex(/^\d{4}$/, 'El PIN debe ser de 4 dígitos'),
  locationId: z.enum(LOCATIONS, { error: 'Sede inválida' }).nullish(),
});

// El PIN nunca se toca vía esta ruta -- cambiar el PIN es un flujo aparte,
// fuera de alcance acá (ver nota en server/routes/employees.js).
export const updateEmployeeSchema = z.object({
  nombre: str(100).optional(),
  role: z.enum(ROLES, { error: 'Rol inválido' }).optional(),
  locationId: z.enum(LOCATIONS, { error: 'Sede inválida' }).nullish(),
  activo: boolOpt(),
});
