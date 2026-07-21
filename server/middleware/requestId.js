// ── Request ID Middleware ────────────────────────────────────────────
// Asigna un ID único a cada request para trazabilidad en logs.
// Si el cliente envía x-request-id, lo reusa (para correlación con
// proxies, n8n, webhooks). Si no, genera uno con crypto.randomUUID().
//
// El ID se propaga al logger vía `res.log` (pino-http) y se devuelve
// en el header x-request-id de la respuesta para que el cliente pueda
// referenciarlo en reportes de error.

import crypto from 'crypto';

export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
}

export default requestId;
