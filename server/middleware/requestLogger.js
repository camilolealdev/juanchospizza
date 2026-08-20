// ── Request Logger Middleware ───────────────────────────────────────
// Log estructurado de cada request usando pino-http.
// Reemplaza el on-demand console.log de rutas individuales con un log
// consistente: método, path, status code, duración (ms), y request ID.
//
// En producción genera JSON para ingestión (Datadog, Logtail, etc.).
// En desarrollo usa pino-pretty coloreado (configurado en logger.js).

import pinoHttp from 'pino-http';
import logger from '../services/logger.js';

const httpLogger = pinoHttp({
  logger,
  // Propagar el request ID al log
  genReqId: (req) => req.id,
  // Redactar headers sensibles
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-api-key"]'],
    censor: '[REDACTED]',
  },
  // Customizar el mensaje de log
  customLogLevel: (res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // No loguear health endpoint (ruido innecesario)
  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },
});

export default httpLogger;
