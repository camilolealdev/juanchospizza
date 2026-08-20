import { z } from 'zod';

// Longitudes generosas, iguales a los límites que ya existían como
// String(x).slice(0, N) en el código manual -- la diferencia es que ahora
// se RECHAZA con 400 en vez de truncar en silencio. Truncar sin avisar
// escondía el problema (ej. una descripción cortada a la mitad sin que
// nadie se enterara); rechazar con mensaje es el comportamiento correcto
// para algo que se llama "validación".
export const str = (max, message) => {
  const msg = message || 'Faltan datos requeridos';
  // El error param cubre "falta el campo / no es string"; min() cubre
  // "vino pero está vacío" -- Zod v4 no comparte un solo mensaje para
  // ambos casos, así que hay que pasarlo dos veces pa que quede igual
  // que el "if (!campo) return 400 'Faltan datos requeridos'" original.
  return z.string({ error: msg }).trim().min(1, msg).max(max);
};
export const strOpt = (max) => z.string().trim().max(max).nullish();

// Espeja String(x || def) -- string opcional que cae a un default cuando
// el valor es falsy (undefined, null, '' -- no solo "no vino").
export const strDefault = (max, def) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || def);

// Espeja `x !== undefined ? clamp(Number(x)) : def` -- a diferencia de
// clampedNumber, acá SOLO undefined dispara el default; un 0 explícito se
// respeta (necesario para columnas tipo "vigente" 0/1 donde 0 es un valor
// real y válido, no "usá el default").
export const clampedNumberDefaultOnUndef = (min, max, def) =>
  z.coerce
    .number()
    .optional()
    .transform((v) => Math.max(min, Math.min(v === undefined ? def : v, max)));

// Campo numérico REQUERIDO y > 0 (espeja `if (!total) return 400`, donde
// total es un número -- 0/undefined/NaN son inválidos, negativos técnicamente
// pasaban el check original pero se recortaban a 0 después; acá se rechazan
// directo, que es el comportamiento correcto para "monto de un pedido").
export const requiredPositiveNumber = (max, message) =>
  z.coerce
    .number({ error: message })
    .min(0.01, message)
    .transform((v) => Math.min(v, max));

// Espeja Math.max(min, Math.min(Number(x || def), max)) -- ojo que el
// original usa `x || def`, no `x ?? def`: un 0 explícito también dispara
// el default (ej. estimatedTime=0 se convierte en 30, no se queda en 0).
// Variante para CREATE (siempre produce un valor).
export const clampedNumber = (min, max, def = 0) =>
  z.coerce
    .number()
    .optional()
    .transform((v) => Math.max(min, Math.min(v || def, max)));

// Variante para UPDATE parcial: si el campo no viene, se queda undefined
// (el loop de SET dinámico lo salta) en vez de inyectar un default que
// pisaría silenciosamente un valor existente.
export const clampedNumberOpt = (min, max) =>
  z.coerce
    .number()
    .optional()
    .transform((v) => (v === undefined ? undefined : Math.max(min, Math.min(v, max))));

// Espeja !!x exactamente (mismas reglas de truthiness de JS, incluido que
// z.coerce.boolean('false') === true, igual que !!'false').
export const bool = (def = false) => z.coerce.boolean().optional().default(def);
export const boolOpt = () => z.coerce.boolean().optional();

// Login identifier for the employees roster -- lowercase to avoid
// "Admin2" vs "admin2" creating two effectively-identical unique rows
// (the DB unique index is case-sensitive, this normalizes before it gets there).
export const usernameOpt = () =>
  z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Usuario debe tener al menos 3 caracteres')
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Usuario solo puede tener letras, números y guión bajo')
    .nullish();

// Real password (as opposed to the 4-digit operational PIN) -- min length +
// at least one letter and one digit. Not a full complexity policy (no
// special-char requirement); the length + PBKDF2-100k cost function already
// does most of the real work against offline brute force.
const passwordBase = () =>
  z
    .string()
    .min(10, 'Contraseña debe tener al menos 10 caracteres')
    .max(200)
    .regex(/[a-zA-Z]/, 'Contraseña debe incluir al menos una letra')
    .regex(/[0-9]/, 'Contraseña debe incluir al menos un número');
export const passwordSecure = () => passwordBase().nullish();
export const passwordRequired = () => passwordBase();
