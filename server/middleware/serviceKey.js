// Middleware de autenticación para servicios externos (n8n, scripts, etc.)
// que necesitan llamar a la API sin ser un usuario humano con PIN.
//
// Uso desde n8n:
//   Headers: { "x-service-key": "<SERVICE_KEY>" }
//
// Configuración:
//   SERVICE_KEY=<tu_clave_secreta> en .env
//   SERVICE_KEY_NAME=n8n (opcional, para logging)

import logger from '../services/logger.js';

const VALID_SERVICES = new Map();

// Inicializar al arranque del servidor
export function initServiceKeys() {
  // Se pueden definir múltiples servicios: SERVICE_KEY_N8N, SERVICE_KEY_CRON, etc.
  // ponytail: rol por integración vía env (SERVICE_ROLE_N8N/_CRON), default
  // ADMIN por compat -- setear a un rol menos privilegiado en .env apenas
  // se sepa qué necesita cada integración realmente (auditoría ALTA #1).
  const patterns = [
    { env: 'SERVICE_KEY_N8N', name: 'n8n', role: process.env.SERVICE_ROLE_N8N || 'ADMIN' },
    { env: 'SERVICE_KEY_CRON', name: 'cron', role: process.env.SERVICE_ROLE_CRON || 'ADMIN' },
  ];

  VALID_SERVICES.clear();
  for (const pattern of patterns) {
    const key = process.env[pattern.env];
    if (key) {
      VALID_SERVICES.set(key, { name: pattern.name, role: pattern.role });
      logger.info(
        { service: pattern.name, role: pattern.role },
        `Service key registered: ${pattern.name} (${pattern.role})`
      );
    }
  }

  // Backward compat: SERVICE_KEY genérico
  const genericKey = process.env.SERVICE_KEY;
  if (genericKey && !VALID_SERVICES.has(genericKey)) {
    VALID_SERVICES.set(genericKey, { name: 'generic-service', role: 'ADMIN' });
    logger.info('Generic service key registered');
  }

  logger.info({ total: VALID_SERVICES.size }, `Total service keys: ${VALID_SERVICES.size}`);
}

// Express middleware: valida x-service-key en los headers
export function serviceKeyMiddleware(req, res, next) {
  const serviceKey = req.headers['x-service-key'];

  if (!serviceKey) {
    return next(); // No tiene service key, pasa al siguiente middleware (auth normal)
  }

  const service = VALID_SERVICES.get(serviceKey);
  if (!service) {
    return res.status(403).json({ error: 'Service key inválida' });
  }

  // Autenticado como servicio, no como usuario humano
  req.auth = {
    sub: `service:${service.name}`,
    role: service.role,
    type: 'service',
    serviceName: service.name,
  };

  // ponytail: rastro de auditoría por request -- antes solo se logueaba el
  // registro de la clave al arranque, nunca su uso (auditoría ALTA #1).
  logger.info(
    { service: service.name, role: service.role, method: req.method, path: req.path, ip: req.ip },
    'Service key usada'
  );

  next();
}

export default {
  initServiceKeys,
  serviceKeyMiddleware,
};
