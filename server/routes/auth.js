import express from 'express';
import { login, refreshToken } from '../auth.js';
import { buildAuthCookie, buildClearAuthCookie, readAuthCookie } from '../auth.js';
import { loginRateLimit } from '../middleware/rateLimit.js';

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
      return res.status(401).json({ error: result.error });
    }

    // Setear cookie HttpOnly es la fuente de verdad ahora. El frontend ya
    // no necesita leer el token -- lo enviamos en el body igual por
    // compatibilidad durante la transición (clientes viejos en localStorage
    // pueden seguir mandándolo como Bearer).
    res.setHeader('Set-Cookie', buildAuthCookie(result.token, 15 * 60));
    res.json({
      token: result.token,
      role: result.role,
      username: result.username,
      expiresIn: result.expiresIn,
      auth_via_cookie: true,
    });
  } catch (e) {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

router.post('/api/auth/refresh', async (req, res) => {
  try {
    // Refresh acepta token del body (clientes viejos con localStorage) o
    // directamente de la cookie (camino normal post-migración). El
    // middleware de auth NO corre acá porque /api/auth/refresh debe
    // estar disponible sin autenticar la sesión actual (el propio token
    // viejo es la prueba de identidad hasta que expira).
    const cookieToken = readAuthCookie(req);
    const bodyToken = req.body && req.body.token;
    const oldToken = cookieToken || bodyToken;

    if (!oldToken) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const newToken = refreshToken(oldToken);

    if (!newToken) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Refresh emite un nuevo access de 15m. Rotar la cookie garantiza que
    // un atacante que solo tenga el viejo (filtrado por logs viejos, por
    // ejemplo) no sobreviva al refresh.
    res.setHeader('Set-Cookie', buildAuthCookie(newToken, 15 * 60));
    res.json({ token: newToken, auth_via_cookie: true });
  } catch (e) {
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
