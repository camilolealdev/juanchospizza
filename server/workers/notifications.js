import { Worker } from 'bullmq';
import { redis } from '../redis.js';
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_MAILTO || 'mailto:admin@guidopizza.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export const notificationsWorker = new Worker(
  'notifications',
  async (job) => {
    const { userId, subscription, title, body, data, icon, badge, tag, requireInteraction } = job.data;

    if (!subscription) {
      throw new Error('No push subscription provided');
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/icons/icon-192.png',
      badge: badge || '/icons/badge-72.png',
      tag: tag || 'notification',
      data: data || {},
      requireInteraction: requireInteraction || false,
      actions: data?.actions || [],
    });

    try {
      await webpush.sendNotification(subscription, payload);
      return { sent: true, userId };
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(`[Push] Subscription expired for user ${userId}, removing`);
        await redis.srem('push:subscriptions', JSON.stringify(subscription));
      }
      throw err;
    }
  },
  { connection: redis, concurrency: 20 }
);

notificationsWorker.on('completed', (job) => console.log(`[Push] Job ${job.id} sent to user ${job.data.userId}`));
notificationsWorker.on('failed', (job, err) => console.error(`[Push] Job ${job?.id} failed:`, err.message));

console.log('[Worker] Notifications worker started');
