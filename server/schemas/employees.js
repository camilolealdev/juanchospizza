import { z } from 'zod';
import { str, boolOpt, usernameOpt, passwordSecure, passwordRequired } from './helpers.js';

// Mismos 4 roles de staff que ya existen en server/auth.js (USERS). CLIENT
// deliberadamente excluido -- no es un rol de planta.
const ROLES = ['ADMIN', 'OPERATOR', 'REPARTIDOR', 'MARKETING'];
const LOCATIONS = ['nemocon', 'zipaquira'];

// username/password son OPCIONALES a propósito: el PIN sigue siendo
// suficiente para roles de terminal compartida (cocina, repartidor). Solo
// se piden cuando el creador quiere darle a este empleado un login con
// contraseña real. isSuperAdmin NO es un campo de este schema -- no se
// otorga vía formulario de alta, es un flag que solo se toca a nivel DB
// (ver migración #004 en server/migrate.js).
export const createEmployeeSchema = z.object({
  nombre: str(100),
  role: z.enum(ROLES, { error: 'Rol inválido' }),
  // 4 dígitos, igual al PIN del login existente (ver App.tsx LoginModal, maxLength=4).
  pin: z.string({ error: 'Falta el PIN' }).regex(/^\d{4}$/, 'El PIN debe ser de 4 dígitos'),
  locationId: z.enum(LOCATIONS, { error: 'Sede inválida' }).nullish(),
  username: usernameOpt(),
  password: passwordSecure(),
});

// El PIN nunca se toca vía esta ruta -- cambiar el PIN es un flujo aparte,
// fuera de alcance acá (ver nota en server/routes/employees.js). Igual
// para password: se cambia explícitamente, no de paso en un update general.
export const updateEmployeeSchema = z.object({
  nombre: str(100).optional(),
  role: z.enum(ROLES, { error: 'Rol inválido' }).optional(),
  locationId: z.enum(LOCATIONS, { error: 'Sede inválida' }).nullish(),
  activo: boolOpt(),
  username: usernameOpt(),
});

export const setPasswordSchema = z.object({
  password: passwordRequired(),
});
