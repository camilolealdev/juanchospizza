import { createWorker } from '../queues/index.js';
import { deliverWebhook } from '../services/webhooks.js';

export const webhooksWorker = createWorker(
  'webhooks',
  async (job) => {
    const { url, payload, headers, retries } = job.data;

    const result = await deliverWebhook(url, payload, headers, retries || 3);

    return { delivered: result.success, status: result.status };
  },
  { concurrency: 10 }
);

console.log('[Worker:webhooks] Started');
