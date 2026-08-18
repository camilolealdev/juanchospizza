// Tests del fallback en memoria de Redis (server/services/redis.js).
// Sin REDIS_URL el server degrada a un Map en memoria con la misma interfaz
// (get/set/incr/expire/ttl). Este fallback es lo que usa el rate-limiter en
// dev -- y en prod si Redis cae. Los bugs acá tienen consecuencias reales:
//   - incr() sin chequear exp → contadores que nunca expiran → el limiter
//     bloquea TODO permanentemente (fail-open que se volvía fail-closed).
//   - expire() sumando SEGUNDOS como milisegundos → ventanas que vencen
//     en 60ms en vez de 60s (rateLimit.js pasa segundos, como Redis real).
// Ejecutar: npx vitest run server/tests/redis.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';

// La selección del backend (mem vs ioredis) es estado de módulo
// (redisDisabled cachea "no reintentar sin REDIS_URL") -- por eso cada test
// recarga el módulo con vi.resetModules() y REDIS_URL ausente.
async function loadMemFallback() {
  delete process.env.REDIS_URL;
  vi.resetModules();
  const mod = await import('../services/redis.js');
  const redis = mod.getRedis();
  return redis;
}

afterEach(() => {
  delete process.env.REDIS_URL;
});

describe('fallback en memoria (sin REDIS_URL)', () => {
  it('incr arranca en 1 y acumula sin TTL', async () => {
    const redis = await loadMemFallback();

    expect(await redis.incr('t1')).toBe(1);
    expect(await redis.incr('t1')).toBe(2);
    expect(await redis.incr('t1')).toBe(3);
    expect(await redis.ttl('t1')).toBe(-1); // -1 = existe sin TTL (semántica Redis)
  });

  it('expire recibe SEGUNDOS (como ioredis): la ventana vence y el contador reinicia', async () => {
    const redis = await loadMemFallback();
    const key = 't2';

    expect(await redis.incr(key)).toBe(1);
    expect(await redis.expire(key, 1)).toBe(1); // 1 segundo

    // Dentro de la ventana: el contador sigue acumulando y el TTL se preserva
    expect(await redis.incr(key)).toBe(2);
    expect(await redis.ttl(key)).toBeGreaterThan(0);

    await new Promise((r) => setTimeout(r, 1100)); // ventana vencida

    // get() limpia y devuelve null; el siguiente incr reinicia en 1
    expect(await redis.get(key)).toBeNull();
    expect(await redis.incr(key)).toBe(1);
  });

  it('una llave vencida reinicia el contador aunque expire nunca se llamara de nuevo', async () => {
    const redis = await loadMemFallback();
    const key = 't3';

    await redis.incr(key);
    await redis.expire(key, 1);

    await new Promise((r) => setTimeout(r, 1100));

    expect(await redis.incr(key)).toBe(1); // antes esto devolvía N+1 para siempre
  });

  it('set con PX y get respetan la expiración', async () => {
    const redis = await loadMemFallback();

    await redis.set('t4', 'hola', 'PX', 100); // 100 ms
    expect(await redis.get('t4')).toBe('hola');

    await new Promise((r) => setTimeout(r, 150));
    expect(await redis.get('t4')).toBeNull();
  });
});
