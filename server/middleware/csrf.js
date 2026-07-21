// ── CSRF Protection Middleware ─────────────────────────────────────
// Double-Submit Cookie pattern: genera un token CSRF en cookie y
// espera que toda mutación (POST/PUT/PATCH/DELETE) lo incluya en
// header x-csrf-token. No requiere sesión server-side ni base de datos.
//
// El frontend lee el token de la cookie y lo copia al header en cada
// mutación. Un atacante desde otro origen no puede leer la cookie
// (SameSite=Strict) ni forjar el header.
//
// Los endpoints públicos que no pueden enviar CSRF (consent banner,
// derechos ARCO) se excluyen mediante PUBLIC_PATHS.

import crypto from 'crypto';
import logger from '../services/logger.js';

const TOKEN_LENGTH = 32; // bytes -> 64 hex chars
const COOKIE_NAME = 'csrf-token';
const HEADER_NAME = 'x-csrf-token';

// Rutas públicas que NO requieren CSRF token (consentimiento,
// derechos ARCO, digiturno público)
const PUBLIC_PATHS = [
  '/api/consent',
  '/api/derecho/consulta',
  '/api/derecho/supresion',
  '/api/derecho/reclamo',
  '/api/derecho/rectificacion',
  '/api/digiturno',
  '/api/digiturno/queue',
  '/api/digiturno/queue/live',
  '/api/digiturno/stats',
  '/api/auth/login',
  '/api/auth/refresh',
];

// Métodos que requieren CSRF
const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export function csrfProtection(req, res, next) {
  // Excluir rutas públicas
  if (PUBLIC_PATHS.some(p => req.path.startsWith(p))) {
    return next();
  }

  // GET, HEAD, OPTIONS: solo setear cookie si no existe
  if (!MUTATION_METHODS.includes(req.method)) {
    if (!req.cookies?.[COOKIE_NAME]) {
      const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
      res.cookie(COOKIE_NAME, token, {
        httpOnly: false, // JS debe poder leerlo
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 4 * 60 * 60 * 1000, // 4 horas
      });
    }
    return next();
  }

  // Mutación: validar que el header coincida con la cookie
  const cookieToken = req.cookies?.[COOKIE_NAME];
  const headerToken = req.headers[HEADER_NAME];

  if (!cookieToken || !headerToken) {
    logger.warn({ ip: req.ip, method: req.method, path: req.path },
      'CSRF: token faltante (cookie o header)');
    return res.status(403).json({ error: 'CSRF token requerido' });
  }

  if (cookieToken !== headerToken) {
    logger.warn({ ip: req.ip, method: req.method, path: req.path },
      'CSRF: token mismatch');
    return res.status(403).json({ error: 'CSRF token inválido' });
  }

  next();
}

// ── GET /api/csrf-token ────────────────────────────────────────────
// Endpoint para que el frontend obtenga el token CSRF si no puede
// leer cookies (por ejemplo, en fetch con credentials: 'include').
export function csrfTokenHandler(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    res.json({ token });
  } else {
    const newToken = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
    res.cookie(COOKIE_NAME, newToken, {
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 4 * 60 * 60 * 1000,
    });
    res.json({ token: newToken });
  }
}

export default { csrfProtection, csrfTokenHandler };
