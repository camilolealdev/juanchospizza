import { createWorker } from '../queues/index.js';
import { sendEmail } from '../services/email.js';

createWorker(
  'email',
  async (job) => {
    const { to, subject, html, text, template, data } = job.data;

    if (template) {
      // Render template with data
      const html = await renderTemplate(template, data);
      await sendEmail({ to, subject, html });
    } else {
      await sendEmail({ to, subject, html, text });
    }

    return { sent: true };
  },
  { concurrency: 10 }
);

async function renderTemplate(template, data) {
  // Simple template rendering - replace with your template engine
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

console.log('[Worker] Email worker started');
