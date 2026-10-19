// Generador de contraseñas para el CRM (Empleados). Usa crypto.getRandomValues
// (no Math.random) y garantiza la política del servidor: mínimo 10 caracteres,
// al menos una letra y un número (server/schemas/helpers.js). Sin caracteres
// ambiguos (0/O, 1/l/I) porque el staff las teclea a mano en terminales.
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const ALL = LETTERS + DIGITS;

const pick = (alphabet: string): string => {
  // Rechazo de sesgo: descarta valores que romperían la uniformidad del módulo.
  const limit = 256 - (256 % alphabet.length);
  const buf = new Uint8Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return alphabet[buf[0] % alphabet.length];
};

export function generatePassword(length = 16): string {
  const chars = [pick(LETTERS), pick(DIGITS)];
  while (chars.length < Math.max(length, 10)) chars.push(pick(ALL));
  // Fisher-Yates con el mismo origen de aleatoriedad.
  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const k = buf[0] % (i + 1);
    [chars[i], chars[k]] = [chars[k], chars[i]];
  }
  return chars.join('');
}

export const PASSWORD_MAX_AGE_DAYS = 90;

// Días desde el último cambio; null si no hay fecha (contraseña anterior al
// registro de fechas, o sin contraseña).
export function passwordAgeDays(changedAt: string | null | undefined, now = Date.now()): number | null {
  if (!changedAt) return null;
  const t = new Date(changedAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}
