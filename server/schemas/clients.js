import { z } from 'zod';
import { str, strOpt, boolOpt } from './helpers.js';

const ESTADOS = ['activo', 'inactivo', 'perdido'];

export const createClientSchema = z.object({
  nombre: str(100),
  telefono: strOpt(20),
  email: strOpt(100),
  direccion: strOpt(200),
  notas: strOpt(500),
  cumpleanos: strOpt(30),
});

// PATCH — solo los campos que esa ruta siempre tocó (vip/notas/tags/estado).
export const patchClientSchema = z.object({
  vip: boolOpt(),
  notas: strOpt(500),
  tags: z.array(z.string()).optional(),
  estado: z.enum(ESTADOS, { error: 'Estado inválido' }).optional(),
});

// PUT — edición de perfil completo (nombre/telefono/email/direccion/notas/cumpleanos).
export const updateClientSchema = z.object({
  nombre: str(100).optional(),
  telefono: strOpt(20),
  email: strOpt(100),
  direccion: strOpt(200),
  notas: strOpt(500),
  cumpleanos: strOpt(30),
});
