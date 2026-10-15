// Servicio directo de webhooks — sin BullMQ ni Redis.
// Envía webhooks a URLs externas con fetch(), retry exponencial básico.
// Usar desde rutas: import { deliverWebhook } from '../services/webhooks.js';

export async function deliverWebhook({ url, payload, headers = {}, retries = 3, timeout = 10000 }) {
  if (!url) throw new Error('Webhook URL required');

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

      return { delivered: true, status: response.status, attempt };
    } catch (err) {
      lastError = err;
      console.warn(`[Webhook] Attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw lastError;
}

export default { deliverWebhook };
