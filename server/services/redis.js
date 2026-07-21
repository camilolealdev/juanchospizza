// ── Conexión Redis ────────────────────────────────────────────────
// Singleton opinado: una sola conexión reutilizada por todos los
// servicios (rate-limit, caché, colas). Si REDIS_URL no está definida
// o la conexión falla, degrada gracefulmente a un Map en memoria para
// que el server funcione sin Redis (útil en dev local).
//
// Quien usa este módulo no debe preocuparse por la diferencia: la API
// pública (get, set, incr, expire, ttl) es la misma, tanto si hay Redis
// real como si no. La diferencia observable es que el Map en memoria
// no persiste entre reinicios ni replica entre instancias.

import Redis from 'ioredis';
import logger from './logger.js';

let client = null;
let redisAvailable = false;
let redisDisabled = false; // cache: no reintentar si no hay REDIS_URL

// Fallback en memoria cuando Redis no está disponible. Implementa solo
// los métodos que rateLimit.js necesita.
const memStore = new Map();
const memFallback = {
  get(key) {
    const val = memStore.get(key);
    if (!val) return null;
    if (Date.now() > val.exp) {
      memStore.delete(key);
      return null;
    }
    return val.value;
  },
  set(key, value, mode, ttlMs) {
    // ioredis.set('key', value, 'PX', ttlMs)
    memStore.set(key, { value, exp: Date.now() + ttlMs });
    return Promise.resolve('OK');
  },
  incr(key) {
    const val = memStore.get(key);
    const next = val ? val.value + 1 : 1;
    memStore.set(key, { value: next, exp: Infinity });
    return Promise.resolve(next);
  },
  expire(key, ttlMs) {
    const val = memStore.get(key);
    if (val) {
      val.exp = Date.now() + ttlMs;
      memStore.set(key, val);
    }
    return Promise.resolve(1);
  },
  ttl(key) {
    const val = memStore.get(key);
    if (!val) return Promise.resolve(-2);
    const remaining = val.exp - Date.now();
    return Promise.resolve(remaining > 0 ? Math.ceil(remaining / 1000) : -2);
  },
};

export function initRedis() {
  if (client) return client;
  if (redisDisabled) return null;

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('REDIS_URL no definida — usando rate-limit en memoria');
    redisAvailable = false;
    redisDisabled = true;
    return null;
  }

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn('Redis no disponible tras 3 reintentos — degradando a memoria');
          redisAvailable = false;
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    client.on('ready', () => {
      redisAvailable = true;
      logger.info('Redis conectado');
    });

    client.on('error', (err) => {
      if (redisAvailable) {
        logger.warn({ err }, 'Redis error: ' + err.message);
      }
    });

    client.on('close', () => {
      redisAvailable = false;
    });
    // ioredis no tiene evento connect_error — las fallas de conexión
    // llegan por 'error' + 'close'. redisDisabled se maneja vía
    // retryStrategy (retorna null → detiene reintentos) y el flag
    // redisAvailable = false.

    // Intento de conexión no bloqueante
    client.connect().catch(() => {
      redisAvailable = false;
    });

    return client;
  } catch (_e) {
    logger.warn('Redis init falló — usando rate-limit en memoria');
    redisAvailable = false;
    return null;
  }
}

export function getRedis() {
  if (!client) initRedis();
  return redisAvailable ? client : memFallback;
}

export function isRedisAvailable() {
  return redisAvailable;
}

export default { initRedis, getRedis, isRedisAvailable };
