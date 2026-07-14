import express from 'express';
import { login, refreshToken } from '../auth.js';
import { loginRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// AUTH — rutas públicas, sin authMiddleware
router.post('/api/auth/login', loginRateLimit, async (req, res) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const result = await login(String(username), String(pin));

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
