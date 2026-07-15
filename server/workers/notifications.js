import { createWorker } from '../queues/index.js';
import { sendPushNotification } from '../services/push.js';

createWorker(
  'notifications',
  async (job) => {
    const { userId, title, body, data, type } = job.data;

    await sendPushNotification(userId, { title, body, data, type });

    return { sent: true };
  },
  { concurrency: 20 }
);

console.log('[Worker] Notifications worker started');
