import express from 'express';
import { login, refreshToken } from '../auth.js';
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

    res.json({
      token: result.token,
      role: result.role,
      username: result.username,
      expiresIn: result.expiresIn,
    });
  } catch (e) {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

router.post('/api/auth/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const newToken = refreshToken(token);

    if (!newToken) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    res.json({ token: newToken });
  } catch (e) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

export default router;
