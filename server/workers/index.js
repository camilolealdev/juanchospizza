import './workers/email.js';
import './workers/pdf.js';
import './workers/reports.js';
import './workers/notifications.js';
import './workers/webhooks.js';

console.log('[Workers] All workers started');

process.on('SIGTERM', async () => {
  console.log('[Workers] Shutting down...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Workers] Shutting down...');
  process.exit(0);
});
