import logger from '../services/logger.js';

// Middleware global de manejo de errores Express.
// Atrapa errores no capturados en la cadena de middleware y responde
// con un JSON seguro (nunca filtra stack traces internos en producción).
// Orden: app.use(last), después de todas las rutas.
export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.expose ? err.message : 'Error interno del servidor';

  logger.error(
    { err, statusCode, path: req.path, method: req.method },
    `[${req.method}] ${req.path} → ${statusCode}`
  );

  if (statusCode >= 500 && !err.expose) {
    logger.error({ err, stack: err.stack }, 'Server error — no expuesto al cliente');
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

// 404 handler — se monta después de todas las rutas
export function notFoundHandler(req, res) {
  logger.warn({ path: req.path, method: req.method }, `404 — Ruta no encontrada`);
  res.status(404).json({ error: `Ruta ${req.method} ${req.path} no encontrada` });
}
