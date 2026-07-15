import { Queue, Worker, QueueEvents } from 'bullmq';
import { redis } from '../redis.js';

const connection = redis;

export const queues = {
  email: new Queue('email', { connection }),
  pdf: new Queue('pdf', { connection }),
  reports: new Queue('reports', { connection }),
  notifications: new Queue('notifications', { connection }),
  webhooks: new Queue('webhooks', { connection }),
};

export const queueEvents = {
  email: new QueueEvents('email', { connection }),
  pdf: new QueueEvents('pdf', { connection }),
  reports: new QueueEvents('reports', { connection }),
  notifications: new QueueEvents('notifications', { connection }),
  webhooks: new QueueEvents('webhooks', { connection }),
};

export async function closeQueues() {
  await Promise.all(Object.values(queues).map((q) => q.close()));
  await Promise.all(Object.values(queueEvents).map((qe) => qe.close()));
}

export function createWorker(queueName, processor, options = {}) {
  return new Worker(queueName, processor, {
    connection,
    concurrency: options.concurrency || 5,
    limiter: options.limiter,
    ...options,
  });
}
