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
  // ⚠️ req.path es RELATIVO al mount point (app.use('/api', csrfProtection)).
  // Si la URL es /api/consent, req.path = /consent — el startsWith() falla.
  // Usamos req.originalUrl (path completo siempre) para matchear correctamente.
  const fullPath = req.baseUrl + req.path; // ej: /api + /consent = /api/consent

  // Excepción puntual: creación de pedido de invitado (checkout público del
  // menú, server/routes/orders.js POST /api/orders NO lleva authMiddleware
  // -- no hay sesión/cookie de auth que un atacante pueda "montar", así que
  // CSRF no aplica). A propósito NO se agrega '/api/orders' a PUBLIC_PATHS:
  // ese array matchea por PREFIJO (startsWith), y eximiría también
  // PUT /api/orders/:id y PATCH /api/orders/:id/status, que SÍ requieren
  // authMiddleware (cookie de sesión) y por lo tanto SÍ deben llevar CSRF.
  // Match exacto de path+método para no repetir ese bug de prefijo.
  if (req.method === 'POST' && fullPath === '/api/orders') {
    return next();
  }

  // Payment endpoints públicos que NO llevan authMiddleware (checkout sin
  // sesión de usuario), llamados desde paymentService.ts con fetch directo,
  // y los WEBHOOKS entrantes de pasarelas (servidores externos que no
  // tienen cookie CSRF ni header). Sin auth = sin sesión que proteger con
  // CSRF.
  //
  // ⚠️ FIX 2026-08-06: los webhooks estaban fuera de esta lista — un
  // POST /api/payments/bold/webhook sin cookie CSRF recibía 403 y el pago
  // nunca se confirmaba (Bold reintenta pero el pedido quedaba pending).
  // Los tests previos no lo detectaron porque el app de test montaba
  // express.raw() pero no csrfProtection.
  const PAYMENT_PATHS = ['/api/payments/bold/create-link', '/api/payments/bold/webhook'];
  if (req.method === 'POST' && PAYMENT_PATHS.some((p) => fullPath === p)) {
    return next();
  }

  if (PUBLIC_PATHS.some((p) => fullPath.startsWith(p) || req.originalUrl.startsWith(p))) {
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
    logger.warn({ ip: req.ip, method: req.method, path: req.path }, 'CSRF: token faltante (cookie o header)');
    return res.status(403).json({ error: 'CSRF token requerido' });
  }

  if (cookieToken !== headerToken) {
    logger.warn({ ip: req.ip, method: req.method, path: req.path }, 'CSRF: token mismatch');
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
