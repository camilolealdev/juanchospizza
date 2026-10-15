import express from 'express';
import { login, loginWithGoogle, refreshToken } from '../auth.js';
import { buildAuthCookie, buildClearAuthCookie, readAuthCookie } from '../auth.js';
import { loginRateLimit } from '../middleware/rateLimit.js';
import logger from '../services/logger.js';

const router = express.Router();

// AUTH — rutas públicas, sin authMiddleware
router.post('/api/auth/login', loginRateLimit, async (req, res) => {
  try {
    const { identifier: rawIdentifier, username, email, pin, password } = req.body;

    // El login del CRM manda `identifier` (correo o username + contraseña,
    // sin PIN). Se aceptan también `email`/`username` por compatibilidad.
    // auth.js resuelve el identificador contra username O email.
    const identifier = rawIdentifier || email || username;

    // Qué credencial(es) hace falta lo decide auth.js (depende de si el
    // empleado tiene password configurado y si es super admin) -- acá solo
    // se valida que venga un identificador y al menos una credencial.
    if (!identifier || (!pin && !password)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const result = await login(String(identifier), {
      pin: pin !== undefined ? String(pin) : undefined,
      password: password !== undefined ? String(password) : undefined,
    });

    if (result.error) {
      // Auditoría de seguridad #2 (revisión de arquitectura): antes ningún
      // login fallido ni exitoso quedaba registrado -- imposible detectar
      // brute-force dirigido a una cuenta o auditar accesos después del hecho.
      logger.warn({ username: identifier, ip: req.ip }, 'Login fallido');
      return res.status(401).json({ error: result.error });
    }

    logger.info({ username: identifier, role: result.role, ip: req.ip }, 'Login exitoso');

    // La cookie HttpOnly es la ÚNICA fuente de verdad -- el token nunca
    // sale en el body de la respuesta. Devolverlo ahí anulaba la protección
    // contra XSS (cualquier JS, incluido uno inyectado, podía leerlo del
    // body y guardarlo en localStorage, que es exactamente lo que hacía el
    // frontend hasta ahora). role/username no son secretos, se devuelven
    // para que la UI los muestre.
    res.setHeader('Set-Cookie', buildAuthCookie(result.token, 15 * 60));
    res.json({
      role: result.role,
      username: result.username,
      expiresIn: result.expiresIn,
    });
  } catch (e) {
    logger.warn(
      { username: req.body?.identifier || req.body?.email || req.body?.username, ip: req.ip, err: e.message },
      'Login: error inesperado'
    );
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

// Login con Google: mismo contrato de respuesta/cookie que /login, solo
// cambia la credencial. Un id_token verificado alcanza para cualquier rol,
// incluido SUPER_ADMIN -- ya no hay PIN de segundo factor.
router.post('/api/auth/google', loginRateLimit, async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const result = await loginWithGoogle(String(credential));

    if (result.error) {
      logger.warn({ ip: req.ip }, 'Login con Google fallido');
      return res.status(401).json({ error: result.error });
    }

    logger.info({ username: result.username, role: result.role, ip: req.ip }, 'Login con Google exitoso');

    res.setHeader('Set-Cookie', buildAuthCookie(result.token, 15 * 60));
    res.json({
      role: result.role,
      username: result.username,
      expiresIn: result.expiresIn,
    });
  } catch (e) {
    logger.warn({ ip: req.ip, err: e.message }, 'Login con Google: error inesperado');
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

router.post('/api/auth/refresh', async (req, res) => {
  try {
    // La cookie es la única fuente de identidad -- el frontend ya no tiene
    // (ni puede tener) el token para mandarlo en el body. El middleware de
    // auth NO corre acá porque /api/auth/refresh debe estar disponible sin
    // autenticar la sesión actual (el propio token viejo, vía cookie, es la
    // prueba de identidad hasta que expira).
    const oldToken = readAuthCookie(req);

    if (!oldToken) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const newToken = await refreshToken(oldToken);

    if (!newToken) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Refresh emite un nuevo access de 15m. Rotar la cookie garantiza que
    // un atacante que solo tenga el viejo (filtrado por logs viejos, por
    // ejemplo) no sobreviva al refresh. El nuevo token nunca sale en el
    // body, mismo criterio que /login.
    res.setHeader('Set-Cookie', buildAuthCookie(newToken, 15 * 60));
    res.status(204).end();
  } catch (_e) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

// ── Logout ──────────────────────────────────────────────────────────
// Limpia la cookie. Devuelve 204 aunque nunca hubo sesión -- es
// idempotente porque cerrar sesión dos veces no debería romper nada.
//
router.post('/api/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', buildClearAuthCookie());
  res.status(204).end();
});

export default router;
