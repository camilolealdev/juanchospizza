import { Queue } from 'bullmq';
import { redis } from '../redis.js';

const webhookQueue = new Queue('webhooks', { connection: redis });

export async function enqueueWebhook(url, payload, options = {}) {
  const { headers = {}, retries = 3, delay = 0 } = options;

  await webhookQueue.add(
    'deliver',
    { url, payload, headers },
    {
      attempts: retries,
      backoff: { type: 'exponential', delay: 5000 },
      delay,
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400, count: 5000 },
    }
  );
}

export async function deliverWebhook(job) {
  const { url, payload, headers } = job.data;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
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

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    return { success: true, status: response.status };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

export default webhookQueue;
