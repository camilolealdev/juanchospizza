import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createClient({ url: redisUrl });

redis.on('error', (err) => console.error('[Redis] Error:', err));
redis.on('connect', () => console.log('[Redis] Connected'));
redis.on('ready', () => console.log('[Redis] Ready'));

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
  return redis;
}

export async function closeRedis() {
  if (redis.isOpen) {
    await redis.quit();
  }
}
