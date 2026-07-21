// ── Rate limiting con Redis (fallback a memoria) ───────────────────
// Cada rate limiter crea una llave Redis única por IP/identificador.
// Los limiters actuales:
//
//   general    →  rl:general:{ip}           — 100 req / 1 min
//   login      →  rl:login:{ip}             — 10 intentos / 15 min
//   review     →  rl:review:{ip}            — 5 reseñas / 30 min
//   consent    →  rl:consent:{ip}           — 20 req / 15 min (Ley 1581)
//   derecho    →  rl:derecho:{email|phone}  — 5 solicitudes / 24 h (ARCO)
//
// En producción con múltiples réplicas, Redis sincroniza los contadores
// entre instancias. Sin Redis (dev), cae a un Map en memoria con la misma
// interfaz — funciona igual pero sin compartir entre procesos.

import { getRedis } from '../services/redis.js';

// ── Factory: crea un middleware rate-limiter ───────────────────────
// minimiza la repetición entre los distintos limiters.
function createLimiter({ keyPrefix, windowMs, maxAttempts, keyFromReq }) {
  return async function limiter(req, res, next) {
    const identifier = keyFromReq ? keyFromReq(req) : (req.ip || req.socket?.remoteAddress || 'unknown');
    const redisKey = `rl:${keyPrefix}:${identifier}`;
    const redis = getRedis();

    try {
      const current = await redis.incr(redisKey);

      if (current === 1) {
        // Primera vez en esta ventana — expira automáticamente
        await redis.expire(redisKey, windowMs);
        return next();
      }

      if (current > maxAttempts) {
        const ttl = await redis.ttl(redisKey);
        const retryAfter = Math.max(1, ttl);

        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: 'Demasiadas solicitudes',
          retryAfter: retryAfter,
        });
      }

      return next();
    } catch (_e) {
      // Si Redis falla, permitir la solicitud (fail-open) en vez de
      // bloquear a usuarios legítimos. La desventaja (spam sin límite
      // durante una caída de Redis) es menor que bloquear todo el sitio.
      return next();
    }
  };
}

// ── General: 100 req / 1 min por IP ───────────────────────────────
const WINDOW_GENERAL_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const MAX_GENERAL = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
export const generalRateLimit = createLimiter({
  keyPrefix: 'general',
  windowMs: WINDOW_GENERAL_MS,
  maxAttempts: MAX_GENERAL,
});

// ── Login: 10 intentos / 15 min por IP ────────────────────────────
export const loginRateLimit = createLimiter({
  keyPrefix: 'login',
  windowMs: 15 * 60 * 1000,
  maxAttempts: 10,
});

// ── Reviews: 5 reseñas / 30 min por IP ────────────────────────────
export const reviewRateLimit = createLimiter({
  keyPrefix: 'review',
  windowMs: 30 * 60 * 1000,
  maxAttempts: 5,
});

// ── Consentimiento (Ley 1581): 20 solicitudes / 15 min por IP ─────
// El banner de consentimiento se dispara una vez por visitante; 20
// intentos / 15 min cubre a un usuario real que recarga la página
// muchas veces sin dejar espacio a un ataque de inundación.
export const consentRateLimit = createLimiter({
  keyPrefix: 'consent',
  windowMs: 15 * 60 * 1000,
  maxAttempts: 20,
});

// ── Derechos ARCO: 5 solicitudes / 24 h por email/teléfono ────────
// La identificación es por email o teléfono (no por IP) porque un
// titular legítimo puede estar enviando desde distintas redes (casa,
// trabajo, datos móviles) y no queremos que se tope con el límite de
// IP. Si no hay email ni teléfono, cae a IP como fallback.
export const derechoRateLimit = createLimiter({
  keyPrefix: 'derecho',
  windowMs: 24 * 60 * 60 * 1000,
  maxAttempts: 5,
  keyFromReq(req) {
    const body = req.body || {};
    return body.email || body.telefono || req.ip || req.socket?.remoteAddress || 'unknown';
  },
});
