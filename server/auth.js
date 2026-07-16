import crypto from 'crypto';
import { pool } from './db.js';

// Generar secrets seguros si no existen. El fallback de dev se memoiza --
// antes generaba un secret random en CADA llamada, así que un token firmado
// en el login se verificaba contra un secret distinto en el siguiente
// request y siempre daba "token inválido" cuando no había .env completo.
const devSecretCache = {};
function getSecret(name, length = 32) {
  const exist = process.env[name];
  if (exist && exist.length >= length) {
    return exist;
  }
  if (process.env.NODE_ENV === 'development') {
    if (!devSecretCache[name]) {
      devSecretCache[name] = crypto.randomBytes(length).toString('hex');
    }
    return devSecretCache[name];
  }
  throw new Error(`Falta ${name} en producción`);
}

// Hash de PINes con salt único
// Exportadas (además de vía el default export de abajo) para que
// server/routes/employees.js pueda hashear el PIN de un empleado nuevo sin
// reimplementar el mismo hashing.
export function hashPin(pin, salt) {
  return crypto.pbkdf2Sync(pin, salt, 100000, 64, 'sha512').toString('hex');
}

// Generar salt
export function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// Generate JWT token
function generateToken(payload, expiresIn = '15m') {
  const secret = getSecret('JWT_SECRET');
  const header = { alg: 'HS256', typ: 'JWT' };

  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresIn === '15m' ? 900 : expiresIn === '7d' ? 604800 : 900);

  const data = {
    ...payload,
    iat: now,
    exp,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${base64Header}.${base64Payload}`).digest('base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

// Verify JWT token
function verifyToken(token) {
  try {
    const secret = getSecret('JWT_SECRET');
    const [header, payload, signature] = token.split('.');

    const expectedSignature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');

    const sigBuf = Buffer.from(signature || '', 'base64url');
    const expectedBuf = Buffer.from(expectedSignature, 'base64url');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());

    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// Login contra la tabla employees en DB (usuarios por defecto insertados
// por la migración #001, username/password/isSuperAdmin por la #004). Para
// agregar más usuarios, usar el CRUD de empleados del CRM.
//
// username es único (índice de la migración #004) -- lookup directo, no un
// scan-y-probar-cada-uno por rol. Esto importa por dos razones reales, no
// solo velocidad: un scan por rol no distingue dos empleados con el mismo
// PIN (login como el que matchee primero, atribución incorrecta en
// turnos/auditoría), y hashea con PBKDF2-100k contra cada fila del rol en
// cada intento -- con más de un puñado de empleados por rol eso se siente.

function verifyHash(secret, salt, storedHex) {
  if (!storedHex || !salt) return false;
  const inputHash = hashPin(secret, salt);
  const inputBuf = Buffer.from(inputHash, 'hex');
  const storedBuf = Buffer.from(storedHex, 'hex');
  return inputBuf.length === storedBuf.length && crypto.timingSafeEqual(inputBuf, storedBuf);
}

// credentials: { pin, password } -- password solo se evalúa si el empleado
// tiene uno configurado (passwordHash no nulo) o es super admin (lo exige).
export async function authenticate(username, credentials) {
  if (!username) return null;
  const { pin, password } = credentials || {};

  const result = await pool.query(
    'SELECT id, role, "pinHash", salt, "passwordHash", "passwordSalt", "isSuperAdmin", "locationId" FROM employees WHERE username = $1 AND activo = true',
    [String(username).trim().toLowerCase()]
  );
  const employee = result.rows[0];
  if (!employee) return null;

  if (employee.isSuperAdmin) {
    if (!employee.passwordHash) {
      // Bootstrap: la migración #004 deja passwordHash NULL a propósito
      // (nada de password "por defecto" hardcodeado). Sin este período de
      // gracia, la única cuenta super admin quedaría bloqueada para
      // siempre apenas se despliega esto -- nadie podría entrar ni para
      // asignarle un password vía PATCH /api/employees/:id/password. Solo
      // PIN alcanza hasta que se configure uno; a partir de ahí, esta
      // rama nunca se vuelve a tomar, exige los dos secretos.
      if (!pin || !verifyHash(pin, employee.salt, employee.pinHash)) return null;
    } else {
      // Dos secretos, no uno u otro.
      if (!password || !pin) return null;
      if (!verifyHash(password, employee.passwordSalt, employee.passwordHash)) return null;
      if (!verifyHash(pin, employee.salt, employee.pinHash)) return null;
    }
  } else if (employee.passwordHash) {
    // Empleado con password real configurado: la contraseña es el
    // credencial primario, ya no el PIN.
    if (!password || !verifyHash(password, employee.passwordSalt, employee.passwordHash)) return null;
  } else {
    // Sin password -- PIN de 4 dígitos alcanza (roles de terminal
    // compartida: cocina, repartidor).
    if (!pin || !verifyHash(pin, employee.salt, employee.pinHash)) return null;
  }

  const now = Math.floor(Date.now() / 1000);
  return generateToken(
    {
      sub: employee.id,
      role: employee.role,
      // null para ADMIN/roster sin sede asignada -- esos siguen sin
      // restricción de sede (ver requireSameLocation en las rutas que
      // necesitan scoping, ej. server/routes/shifts.js).
      locationId: employee.locationId || null,
      type: 'access',
      origIat: now,
    },
    '15m'
  );
}

// Un token robado podía refrescarse indefinidamente (cada refresh emitía
// un token de 7 días nuevo, sin límite de veces). MAX_SESSION_SECONDS
// limita el total desde el login original, sin importar cuántas veces se
// refresque -- fuerza un re-login real más allá de esa ventana.
const MAX_SESSION_SECONDS = 30 * 24 * 60 * 60; // 30 días

export function refreshToken(oldToken) {
  const payload = verifyToken(oldToken);
  if (!payload) return null;

  const origIat = payload.origIat || payload.iat;
  const now = Math.floor(Date.now() / 1000);
  if (now - origIat > MAX_SESSION_SECONDS) return null;

  return generateToken(
    {
      sub: payload.sub,
      role: payload.role,
      locationId: payload.locationId ?? null,
      type: 'access',
      origIat,
    },
    '7d'
  );
}

// Login endpoint
export async function login(username, credentials) {
  const token = await authenticate(username, credentials);
  if (!token) {
    return { error: 'Credenciales inválidas' };
  }

  const payload = verifyToken(token);
  return {
    token,
    expiresIn: payload.exp,
    role: payload.role,
    username: payload.sub,
  };
}

// Middleware para verificar token
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Cookie es la fuente primaria de verdad — HttpOnly + SameSite=Lax
  // evita que un XSS robe la sesión y SameSite=Lax sigue permitiendo la
  // navegación normal site-mismo (los POS no redirigen cross-origin).
  // Si por alguna razón todavía llega un Bearer (clientes viejos, tools
  // de debugging, scripts de migración), seguimos aceptándolo mientras
  // dura la transición.
  const cookieToken = readAuthCookie(req);
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = cookieToken || bearerToken;

  if (!token) {
    // Bypass de dev: requiere las DOS variables a propósito, no solo
    // NODE_ENV=development -- un deploy que por error deje NODE_ENV sin
    // setear a 'production' no debe abrir esto solo.
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_AUTH_BYPASS === 'true') {
      req.auth = { role: 'DEVELOPMENT' };
      return next();
    }
    return res.status(401).json({ error: 'Token requerido' });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  req.auth = payload;
  next();
}

// ── Helpers de cookie HttpOnly ─────────────────────────────────────
// Parseamos req.headers.cookie a mano para no añadir la dependencia
// cookie-parser (es trivial; un par de líneas con un Set-Cookie header
// correctamente formado basta). Si en el futuro se necesitan flags
// adicionales (Domain, Partitioned) podemos migrar a cookie-parser
// sin romper nada porque la firma `_idToken` es la misma.
const AUTH_COOKIE_NAME = 'auth_token';

// Exportada para que server/routes/auth.js refresh use el mismo parser y
// no duplique la lógica (un cambio futuro al formato se aplica en un
// solo lugar).
export function readAuthCookie(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === AUTH_COOKIE_NAME) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

// Centraliza el armado del header Set-Cookie para que login, refresh y
// logout usen exactamente los mismos flags. Secure solo en producción
// (en dev con http://localhost el navegador lo aceptaría igualmente
// pero marcamos Secure únicamente cuando corresponde para evitar warnings
// en el dev tools). SameSite=Lax es el balance correcto: permite
// navegación normal site-mismo pero bloquea CSRF cross-origin.
export function buildAuthCookie(token, maxAgeSeconds = 15 * 60) {
  const isProd = process.env.NODE_ENV === 'production';
  const flags = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isProd) flags.push('Secure');
  return flags.join('; ');
}

export function buildClearAuthCookie() {
  const isProd = process.env.NODE_ENV === 'production';
  const flags = [
    `${AUTH_COOKIE_NAME}=`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0',
  ];
  if (isProd) flags.push('Secure');
  return flags.join('; ');
}

export const AUTH_COOKIE = AUTH_COOKIE_NAME;

// Verificar rol
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Sin permisos suficientes' });
    }

    next();
  };
}

// Bloquea acciones sobre una sede distinta a la del token -- ADMIN y roster
// sin sede asignada (locationId null, ej. cuentas legadas) no se restringen.
// Uso: requireSameLocation((req) => req.body.locationId) como middleware
// después de requireRole, en rutas donde importa qué sede se está tocando
// (ej. abrir/cerrar caja de turno).
export function requireSameLocation(getLocationId) {
  return (req, res, next) => {
    if (req.auth?.role === 'ADMIN' || !req.auth?.locationId) return next();
    const targetLocationId = getLocationId(req);
    if (targetLocationId && targetLocationId !== req.auth.locationId) {
      return res.status(403).json({ error: 'No autorizado para operar en esta sede' });
    }
    next();
  };
}

export default {
  getSecret,
  hashPin,
  generateSalt,
  generateToken,
  verifyToken,
  login,
  authMiddleware,
  requireRole,
  requireSameLocation,
};
