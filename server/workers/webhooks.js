import { Worker } from 'bullmq';
import { redis } from '../redis.js';

export const webhooksWorker = new Worker(
  'webhooks',
  async (job) => {
    const { url, payload, headers = {}, retries = 3, timeout = 10000 } = job.data;

    if (!url) {
      throw new Error('Webhook URL required');
    }

    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Guido-Pizza-Webhook/1.0',
            ...headers,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json().catch(() => ({}));
        return { delivered: true, status: response.status, attempt, result };
      } catch (err) {
        lastError = err;
        console.warn(`[Webhook] Attempt ${attempt}/${retries} failed:`, err.message);
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    throw lastError;
  },
  { connection: redis, concurrency: 10 }
);

webhooksWorker.on('completed', (job) => console.log(`[Webhook] Job ${job.id} delivered`));
webhooksWorker.on('failed', (job, err) => console.error(`[Webhook] Job ${job?.id} failed:`, err.message));

console.log('[Worker] Webhooks worker started');
