// ── Metrics Middleware (Prometheus-compatible) ──────────────────────
// Expone métricas en /api/metrics para scraping por Prometheus o
// consulta manual. Incluye:
//   http_requests_total      — contador de requests por método+ruta+status
//   http_request_duration_ms — histograma de duración
//   http_requests_active     — gauge de requests en curso
//
// Diseñado para que funcione sin dependencias externas (no requiere
// servidor Prometheus aparte — las métricas se sirven desde Express).

import promClient from 'prom-client';
import logger from '../services/logger.js';

// ── Registro ────────────────────────────────────────────────────────
const register = new promClient.Registry();

// Default labels: app, environment
register.setDefaultLabels({
  app: 'guido-pizza',
  env: process.env.NODE_ENV || 'development',
});

// ── Métricas ────────────────────────────────────────────────────────

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total de requests HTTP',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duración de requests HTTP en ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [register],
});

const httpRequestsActive = new promClient.Gauge({
  name: 'http_requests_active',
  help: 'Requests actualmente en curso',
  labelNames: ['method'],
  registers: [register],
});

const dbQueryTotal = new promClient.Counter({
  name: 'db_queries_total',
  help: 'Total de consultas a la base de datos',
  labelNames: ['status'],
  registers: [register],
});

const wsConnectionsActive = new promClient.Gauge({
  name: 'ws_connections_active',
  help: 'Conexiones WebSocket activas',
  registers: [register],
});

const redisStatus = new promClient.Gauge({
  name: 'redis_available',
  help: '1 si Redis está disponible, 0 si usa fallback en memoria',
  registers: [register],
});

// ── Middleware de medición (montar ANTES de las rutas) ───────────────
export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  const method = req.method;

  httpRequestsActive.inc({ method });

  // Hookear el response para capturar el status code final
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path || 'unknown';

    httpRequestTotal.inc({ method, route, status_code: res.statusCode });
    httpRequestDuration.observe({ method, route, status_code: res.statusCode }, duration);
    httpRequestsActive.dec({ method });

    originalEnd.apply(this, args);
  };

  next();
}

// ── Endpoint de métricas ───────────────────────────────────────────
export async function metricsHandler(_req, res) {
  try {
    res.setHeader('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    logger.error({ err }, 'Error generating metrics');
    res.status(500).json({ error: 'Error generating metrics' });
  }
}

// ── Helpers para otros módulos ──────────────────────────────────────
export function trackDbQuery(status) {
  dbQueryTotal.inc({ status });
}

export function trackWsConnection(delta) {
  // delta = +1 (nueva conexión) o -1 (desconexión)
  wsConnectionsActive.inc(delta);
}

export function trackRedisStatus(available) {
  redisStatus.set(available ? 1 : 0);
}

export default {
  metricsMiddleware,
  metricsHandler,
  trackDbQuery,
  trackWsConnection,
  trackRedisStatus,
};
