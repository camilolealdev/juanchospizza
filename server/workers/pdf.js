import { createWorker } from '../queues/index.js';
import { generatePDF } from '../services/pdf.js';

createWorker(
  'pdf',
  async (job) => {
    const { template, data, options } = job.data;

    const pdfBuffer = await generatePDF(template, data, options);

    return { pdf: pdfBuffer.toString('base64'), size: pdfBuffer.length };
  },
  { concurrency: 3 }
);

console.log('[Worker] PDF worker started');
