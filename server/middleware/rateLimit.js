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

// Loopback IPs para /api/health. Lo leemos del TCP source real
// (req.socket.remoteAddress), NO de req.ip — server/index.js define
// app.set('trust proxy', 1), bajo lo cual Express honra el header
// X-Forwarded-For del primer hop y req.ip puede ser spoofed por un
// container hostil en app-network aunque el socket real no sea
// loopback. /api/health no expone data sensible, pero el spec exige
// "loopback only", así que la regla anti-spoofing es estricta.
const LOOPBACK_RE = /^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1|0:0:0:0:0:0:0:1)$/;

// ── Factory: crea un middleware rate-limiter ───────────────────────
// minimiza la repetición entre los distintos limiters.
function createLimiter({ keyPrefix, windowMs, maxAttempts, keyFromReq }) {
  return async function limiter(req, res, next) {
    // ── Skip loopback health probe ────────────────────────────────
    // Docker HEALTHCHECK corre wget --spider contra /api/health cada
    // 30s desde el propio container. Sin este bypass el contador
    // redis rl:general:{ip} se desborda (>100/60s ≈ 2 healthchecks/60s),
    // wget recibe 429 → Docker marca el container unhealthy → orquestador
    // entra en restart-loop (FailingStreak 34 observado).
    //
    // server/index.js ya monta /api/health ANTES del limiter; este skip
    // es defense in depth por si alguien reordena app.use() en el futuro.
    //
    // CRÍTICO: chequeamos req.socket.remoteAddress (TCP source real), NO
    // req.ip. Bajo app.set('trust proxy', 1) en server/index.js, req.ip
    // honra X-Forwarded-For del primer hop y un container hostil en
    // app-network podría spoofear loopback con un curl cualquiera. /api/health
    // no expone data sensible, pero el spec exige "loopback only".
    //
    // Para el identificador de redisKey seguimos usando req.ip (resolved
    // trust-proxy-aware IP -- es el slot correcto para rate-limit por IP
    // visible al upstream). Las dos variables se llaman distinto a
    // propósito para que un futuro lector no las confunda.
    const remoteIp = req.socket?.remoteAddress || '';
    if (req.path === '/api/health' && LOOPBACK_RE.test(remoteIp)) {
      return next();
    }

    const identifier = keyFromReq ? keyFromReq(req) : req.ip || remoteIp || 'unknown';
    const redisKey = `rl:${keyPrefix}:${identifier}`;
    const redis = getRedis();

    try {
      const current = await redis.incr(redisKey);

      if (current === 1) {
        // Primera vez en esta ventana — expira automáticamente
        // ⚠️ windowMs está en milisegundos, redis.expire() espera segundos
        await redis.expire(redisKey, Math.ceil(windowMs / 1000));
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

// ── Servicios autenticados (n8n/cron vía x-service-key): 1000 req / 1 min ──
// Todo el tráfico de un bot/servicio sale de la MISMA IP (el servidor que
// lo corre), así que el límite general por IP lo golpearía con volumen
// normal de uso, no por estar realmente sobrecargando nada. Se identifica
// por nombre de servicio (req.auth.serviceName, seteado por
// serviceKeyMiddleware) en vez de por IP -- requiere que
// serviceKeyMiddleware corra ANTES que este limiter (ver server/index.js).
export const serviceRateLimit = createLimiter({
  keyPrefix: 'service',
  windowMs: WINDOW_GENERAL_MS,
  maxAttempts: 1000,
  keyFromReq: (req) => req.auth?.serviceName || req.ip || 'unknown-service',
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
