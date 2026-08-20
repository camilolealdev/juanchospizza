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
  // OJO: expire recibe SEGUNDOS (misma firma que ioredis/Redis real -- ver
  // rateLimit.js: "redis.expire() espera segundos"). Antes se sumaban como
  // milisegundos: la ventana vencía en 60ms en vez de 60s.
  expire(key, ttlSeconds) {
    const val = memStore.get(key);
    if (val) {
      val.exp = Date.now() + ttlSeconds * 1000;
      memStore.set(key, val);
    }
    return Promise.resolve(1);
  },
  incr(key) {
    // Una llave vencida debe reiniciar el contador en 1 (como hace Redis
    // real). Antes se leía el Map crudo sin chequear exp: la entrada
    // vencida seguía acumulando y el rate-limiter en memoria terminaba
    // bloqueando TODO permanentemente (fail-open que se volvía
    // fail-closed) hasta reiniciar el server.
    const val = memStore.get(key);
    if (!val || Date.now() > val.exp) {
      memStore.set(key, { value: 1, exp: Infinity });
      return Promise.resolve(1);
    }
    const next = val.value + 1;
    // Preserva el TTL existente: en Redis real, INCR no toca el TTL que
    // fijó EXPIRE (rateLimit.js lo llama solo en el primer request).
    // Pisar exp con Infinity acá habría hecho que la ventana nunca
    // venciera después del primer request.
    memStore.set(key, { value: next, exp: val.exp });
    return Promise.resolve(next);
  },
  ttl(key) {
    const val = memStore.get(key);
    if (!val) return Promise.resolve(-2); // -2 = la llave no existe (como Redis)
    if (val.exp === Infinity) return Promise.resolve(-1); // -1 = sin TTL (como Redis)
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
