import pino from 'pino';

// Logger estructurado con Pino — reemplaza todos los console.log/error/warn.
// En desarrollo escribe texto legible (transporte por defecto de pino).
// En producción produce JSON para ingestión por Datadog/Sentry/Logtail.
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    },
  }),
  redact: {
    paths: ['DATABASE_URL', 'JWT_SECRET', 'req.headers.cookie', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
