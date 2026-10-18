// Alta idempotente de empleados de staff (caja, cocina, repartidor, marketing)
// directamente en la tabla employees, con correo + contraseña. El formulario
// de login del CRM solo envía identificador + contraseña (nunca PIN), así que
// una cuenta sin contraseña siempre termina en 401.
//
// Uso (dentro del contenedor de la app, por defecto es simulación):
//   docker compose --env-file .env.production exec -T app \
//     node server/scripts/upsert-staff.js --file /tmp/staff.json [--apply] [--reset]
//
// staff.json: [{ "nombre": "Caja", "role": "OPERATOR", "email": "caja@x.com",
//                "username": "caja", "locationId": "nemocon" }]
//
// - Sin --apply solo muestra qué haría; no escribe nada.
// - Si el correo ya existe: actualiza nombre/rol/usuario/sede, reactiva y
//   desbloquea, pero NO toca la contraseña salvo que se pase --reset.
// - Las contraseñas se generan al azar y se imprimen una sola vez en la
//   terminal de quien ejecuta. No se aceptan por argumento ni por chat.
// - ADMIN y super admin quedan fuera a propósito.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { hashPin, generateSalt } from '../auth.js';

const ALLOWED_ROLES = ['OPERATOR', 'REPARTIDOR', 'MARKETING'];
const LOCATIONS = ['nemocon', 'zipaquira'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 16 caracteres, siempre con letras y dígitos (cumple la política de
// passwordBase en schemas/helpers.js: mínimo 10, una letra y un número).
export function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 14; i++) out += alphabet[crypto.randomInt(alphabet.length)];
  return `${out}${crypto.randomInt(2, 10)}a`;
}

export function validateEntry(raw) {
  const nombre = String(raw?.nombre ?? '').trim();
  const role = String(raw?.role ?? '').trim();
  const email = String(raw?.email ?? '')
    .trim()
    .toLowerCase();
  const username = raw?.username ? String(raw.username).trim().toLowerCase() : null;
  const locationId = raw?.locationId ? String(raw.locationId).trim() : null;
  if (!nombre) throw new Error('Falta nombre');
  if (!ALLOWED_ROLES.includes(role))
    throw new Error(`Rol inválido "${role}" (permitidos: ${ALLOWED_ROLES.join(', ')})`);
  if (!EMAIL_RE.test(email)) throw new Error(`Correo inválido "${email}"`);
  if (locationId && !LOCATIONS.includes(locationId)) throw new Error(`Sede inválida "${locationId}"`);
  return { nombre, role, email, username, locationId };
}

export async function upsertStaff(db, rawEntry, { apply = false, reset = false } = {}) {
  const entry = validateEntry(rawEntry);
  const found = await db.query(
    'SELECT id, "isSuperAdmin", "passwordHash" IS NOT NULL AS tiene_pwd FROM employees WHERE LOWER(email) = $1',
    [entry.email]
  );
  const existing = found.rows[0];
  if (existing?.isSuperAdmin) throw new Error(`${entry.email} es super admin; este script no lo modifica`);

  const action = existing ? (reset ? 'actualizar+reset' : 'actualizar') : 'crear';
  if (!apply) return { ...entry, action, applied: false, password: null };

  if (existing) {
    let password = null;
    if (reset || !existing.tiene_pwd) {
      password = generatePassword();
      const passwordSalt = generateSalt();
      await db.query(
        `UPDATE employees SET nombre=$1, role=$2, username=COALESCE($3, username), "locationId"=$4, activo=true,
           "failedLoginAttempts"=0, "lockedUntil"=NULL, "passwordHash"=$5, "passwordSalt"=$6 WHERE id=$7`,
        [
          entry.nombre,
          entry.role,
          entry.username,
          entry.locationId,
          hashPin(password, passwordSalt),
          passwordSalt,
          existing.id,
        ]
      );
    } else {
      await db.query(
        `UPDATE employees SET nombre=$1, role=$2, username=COALESCE($3, username), "locationId"=$4, activo=true,
           "failedLoginAttempts"=0, "lockedUntil"=NULL WHERE id=$5`,
        [entry.nombre, entry.role, entry.username, entry.locationId, existing.id]
      );
    }
    return { ...entry, action, applied: true, password };
  }

  const password = generatePassword();
  const passwordSalt = generateSalt();
  // El PIN es obligatorio en el modelo; se siembra uno aleatorio que nadie
  // conoce (el login web no lo usa).
  const pinSalt = generateSalt();
  const pin = String(crypto.randomInt(0, 10000)).padStart(4, '0');
  await db.query(
    `INSERT INTO employees (id, nombre, role, "pinHash", salt, "locationId", username, email, "passwordHash", "passwordSalt", activo, creado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,NOW())`,
    [
      `emp_${crypto.randomUUID()}`,
      entry.nombre,
      entry.role,
      hashPin(pin, pinSalt),
      pinSalt,
      entry.locationId,
      entry.username,
      entry.email,
      hashPin(password, passwordSalt),
      passwordSalt,
    ]
  );
  return { ...entry, action, applied: true, password };
}

async function main() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  if (fileIdx === -1 || !args[fileIdx + 1]) {
    console.error('Uso: node server/scripts/upsert-staff.js --file staff.json [--apply] [--reset]');
    process.exit(2);
  }
  const apply = args.includes('--apply');
  const reset = args.includes('--reset');
  const list = JSON.parse(fs.readFileSync(args[fileIdx + 1], 'utf8'));
  const { pool } = await import('../db.js');
  let failed = false;
  try {
    console.log(apply ? '== APLICANDO ==' : '== SIMULACIÓN (agrega --apply para escribir) ==');
    for (const item of list) {
      try {
        const r = await upsertStaff(pool, item, { apply, reset });
        const pwd = r.password ? `  contraseña: ${r.password}` : '';
        console.log(`${r.action.padEnd(17)} ${r.email}  rol=${r.role}  usuario=${r.username ?? '-'}${pwd}`);
      } catch (e) {
        failed = true;
        console.error(`ERROR ${item?.email ?? '?'}: ${e.message}`);
      }
    }
    if (apply) console.log('\nGuarda las contraseñas ahora: no se vuelven a mostrar.');
  } finally {
    await pool.end();
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
