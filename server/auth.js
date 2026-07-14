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

// Usuarios autorizados (en producción, estos datos deben estar en DB)
// Los pines deben ser hasheados con salt único por usuario
// Salts son random de 16 bytes, sin relación con el PIN -- antes el salt
// literalmente contenía el PIN en texto plano (ej. "admin_salt_1234"), lo
// que volvía el hashing decorativo. Rotados 2026-07-09; PINs default sin
// cambiar (mismos que en README) pero ya no derivables del código fuente.
const USERS = [
  {
    username: 'admin',
    role: 'ADMIN',
    pinHash:
      '8e5d8021909b49b5348d09be091a43d155648eb3476380a7e6dccaf6c2d2568eaeda23e1facb55e78332aab21df2dbe3547c04daab240f2ab55f9dbd29e082c4',
    salt: '1f60d58e3fdaed5a2c891abdb6c97802',
  },
  {
    username: 'cocina',
    role: 'OPERATOR',
    pinHash:
      '367522e4972ee9963efe1f9f1e05b7f75962857cbeedcebad68413f02268e01649b62c6159222961c5a6b3bdfdabbb9be1da489548a1c5a209eb5b8904ecd2d4',
    salt: 'c02d2416277251b5b166299d4460370d',
  },
  {
    username: 'repartidor',
    role: 'REPARTIDOR',
    pinHash:
      'dde694168749243d81e9eb22fd6e674d2546b1f7eda5c7bc764339b56fb464ee79d058c752e31af475bad714d1c23d05cbf02f1245260646953b36a651236b31',
    salt: '449fb9c5f1d91593894092d51ef46eea',
  },
  {
    username: 'marketing',
    role: 'MARKETING',
    pinHash:
      'fc520073c3d1a43726422e9b10a0926d9027d9bed599664202ae48ebd04e358b762988ec6285f8ca5f8f7b35eeede4d4ba0a8722c15b9ff7268731be4327fce0',
    salt: '755e3acdf526949c9a9dc434daeb50cf',
  },
];

// Función para gerar hashes de PIN (para usar en setup)
export function hashUserPin(username, pin) {
  const user = USERS.find((u) => u.username === username);
  if (!user) return null;

  const salt = user.salt;
  return hashPin(pin, salt);
}

function verifyHash(pin, salt, storedHex) {
  const inputHash = hashPin(pin, salt);
  const inputBuf = Buffer.from(inputHash, 'hex');
  const storedBuf = Buffer.from(storedHex, 'hex');
  return inputBuf.length === storedBuf.length && crypto.timingSafeEqual(inputBuf, storedBuf);
}

// El frontend siempre manda uno de estos 4 usernames fijos (mapeados 1:1
// desde el rol elegido en LoginModal, ver ROLE_TO_USERNAME en src/App.tsx).
// No hay campo de usuario en la UI -- así que para dar de alta más de una
// persona por rol (varios cocineros, varios repartidores) sin tocar código,
// el username fijo solo decide QUÉ ROL escanear en `employees` cuando
// ninguno de los 4 logins fijos hace match.
const USERNAME_TO_ROLE = { admin: 'ADMIN', cocina: 'OPERATOR', repartidor: 'REPARTIDOR', marketing: 'MARKETING' };

async function authenticateEmployee(username, pin) {
  const role = USERNAME_TO_ROLE[username];
  if (!role) return null;
  const result = await pool.query('SELECT id, role, "pinHash", salt FROM employees WHERE role = $1 AND activo = true', [
    role,
  ]);
  const employee = result.rows.find((e) => verifyHash(pin, e.salt, e.pinHash));
  if (!employee) return null;

  const now = Math.floor(Date.now() / 1000);
  return generateToken(
    {
      sub: employee.id,
      role: employee.role,
      type: 'access',
      origIat: now,
    },
    '15m'
  );
}

// Authenticate con PIN -- primero los 4 logins fijos (rápido, sin DB), luego
// el roster de employees para ese rol (ver authenticateEmployee arriba).
export async function authenticate(username, pin) {
  const user = USERS.find((u) => u.username === username);
  if (user && verifyHash(pin, user.salt, user.pinHash)) {
    const now = Math.floor(Date.now() / 1000);
    return generateToken(
      {
        sub: username,
        role: user.role,
        type: 'access',
        origIat: now, // marca el inicio de la sesión -- ver refreshToken()
      },
      '15m'
    );
  }

  return authenticateEmployee(username, pin);
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
      type: 'access',
      origIat,
    },
    '7d'
  );
}

// Login endpoint
export async function login(username, pin) {
  const token = await authenticate(username, pin);
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

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Bypass de dev: requiere las DOS variables a propósito, no solo
    // NODE_ENV=development -- un deploy que por error deje NODE_ENV sin
    // setear a 'production' no debe abrir esto solo.
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_AUTH_BYPASS === 'true') {
      req.auth = { role: 'DEVELOPMENT' };
      return next();
    }
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  req.auth = payload;
  next();
}

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

export default {
  getSecret,
  hashPin,
  generateSalt,
  generateToken,
  verifyToken,
  login,
  authMiddleware,
  requireRole,
};
