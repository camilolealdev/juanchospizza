// Middleware de autenticación para servicios externos (n8n, scripts, etc.)
// que necesitan llamar a la API sin ser un usuario humano con PIN.
//
// Uso desde n8n:
//   Headers: { "x-service-key": "<SERVICE_KEY>" }
//
// Configuración:
//   SERVICE_KEY=<tu_clave_secreta> en .env
//   SERVICE_KEY_NAME=n8n (opcional, para logging)

const VALID_SERVICES = new Map();

// Inicializar al arranque del servidor
export function initServiceKeys() {
  // Se pueden definir múltiples servicios: SERVICE_KEY_N8N, SERVICE_KEY_CRON, etc.
  const patterns = [
    { env: 'SERVICE_KEY_N8N', name: 'n8n', role: 'ADMIN' },
    { env: 'SERVICE_KEY_CRON', name: 'cron', role: 'ADMIN' },
  ];

  VALID_SERVICES.clear();
  for (const pattern of patterns) {
    const key = process.env[pattern.env];
    if (key) {
      VALID_SERVICES.set(key, { name: pattern.name, role: pattern.role });
      console.log(`  🔑 Service key registered: ${pattern.name} (${pattern.role})`);
    }
  }

  // Backward compat: SERVICE_KEY genérico
  const genericKey = process.env.SERVICE_KEY;
  if (genericKey && !VALID_SERVICES.has(genericKey)) {
    VALID_SERVICES.set(genericKey, { name: 'generic-service', role: 'ADMIN' });
    console.log('  🔑 Generic service key registered');
  }

  console.log(`  📊 Total service keys: ${VALID_SERVICES.size}`);
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

  next();
}

export default {
  initServiceKeys,
  serviceKeyMiddleware,
};
