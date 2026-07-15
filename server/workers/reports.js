import { createWorker } from '../queues/index.js';
import { generateReport } from '../services/reports.js';

createWorker(
  'reports',
  async (job) => {
    const { type, params, format } = job.data;

    const report = await generateReport(type, params, format);

    return { reportId: report.id, url: report.url };
  },
  { concurrency: 2 }
);

console.log('[Worker] Reports worker started');
