import express from 'express';
import { login, refreshToken } from '../auth.js';
import { buildAuthCookie, buildClearAuthCookie, readAuthCookie } from '../auth.js';
import { loginRateLimit } from '../middleware/rateLimit.js';
import logger from '../services/logger.js';

const router = express.Router();

// AUTH — rutas públicas, sin authMiddleware
router.post('/api/auth/login', loginRateLimit, async (req, res) => {
  try {
    const { username, pin, password } = req.body;

    // Qué credencial(es) hace falta lo decide auth.js (depende de si el
    // empleado tiene password configurado y si es super admin) -- acá solo
    // se valida que al menos venga username y algo de credencial.
    if (!username || (!pin && !password)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const result = await login(String(username), {
      pin: pin !== undefined ? String(pin) : undefined,
      password: password !== undefined ? String(password) : undefined,
    });

    if (result.error) {
      // Auditoría de seguridad #2 (revisión de arquitectura): antes ningún
      // login fallido ni exitoso quedaba registrado -- imposible detectar
      // brute-force dirigido a una cuenta o auditar accesos después del hecho.
      logger.warn({ username, ip: req.ip }, 'Login fallido');
      return res.status(401).json({ error: result.error });
    }

    logger.info({ username, role: result.role, ip: req.ip }, 'Login exitoso');

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
    logger.warn({ username: req.body?.username, ip: req.ip, err: e.message }, 'Login: error inesperado');
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
