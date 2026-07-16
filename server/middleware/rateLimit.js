// Rate limiting básico por IP
const rateLimit = new Map();
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, record] of rateLimit) {
      if (now > record.reset) {
        rateLimit.delete(ip);
      }
    }
  },
  5 * 60 * 1000
);
export function generalRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, reset: now + windowMs });
    return next();
  }

  const record = rateLimit.get(ip);
  if (now > record.reset) {
    record.count = 1;
    record.reset = now + windowMs;
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({ error: 'Demasiadas solicitudes' });
  }

  record.count++;
  next();
}

// Rate limit propio para login -- el genérico (100 req/min) deja un PIN de
// 4 dígitos (10,000 combinaciones) agotable en ~100 minutos por fuerza
// bruta. 10 intentos / 15 min por IP es suficiente para un usuario real que
// se equivoca de PIN, no para probarlos todos.
const loginAttempts = new Map();
export function loginRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;

  const record = loginAttempts.get(ip);
  if (!record || now > record.reset) {
    loginAttempts.set(ip, { count: 1, reset: now + windowMs });
    return next();
  }
  if (record.count >= maxAttempts) {
    return res.status(429).json({ error: 'Demasiados intentos de login, esperá unos minutos' });
  }
  record.count++;
  next();
}

// Rate limit propio para reviews públicas -- la ruta no tiene auth (cualquier
// cliente puede postear), y el límite genérico (100 req/min) no frena spam
// dedicado. 5 reseñas / 30 min por IP alcanza para un cliente real, no para
// inundar la tabla de reseñas.
const reviewAttempts = new Map();
export function reviewRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 30 * 60 * 1000;
  const maxAttempts = 5;

  const record = reviewAttempts.get(ip);
  if (!record || now > record.reset) {
    reviewAttempts.set(ip, { count: 1, reset: now + windowMs });
    return next();
  }
  if (record.count >= maxAttempts) {
    return res.status(429).json({ error: 'Demasiadas reseñas enviadas, intentá más tarde' });
  }
  record.count++;
  next();
}
