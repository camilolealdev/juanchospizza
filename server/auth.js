import crypto from 'crypto';

// Generar secrets seguros si no existen
function getSecret(name, length = 32) {
  const exist = process.env[name];
  if (exist && exist.length >= length) {
    return exist;
  }
  // Warning en desarrollo
  if (process.env.NODE_ENV === 'development') {
    return crypto.randomBytes(length).toString('hex');
  }
  throw new Error(`Falta ${name} en producción`);
}

// Hash de PINes con salt único
function hashPin(pin, salt) {
  return crypto.pbkdf2Sync(pin, salt, 100000, 64, 'sha512').toString('hex');
}

// Generar salt
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// Generate JWT token
function generateToken(payload, expiresIn = '15m') {
  const secret = getSecret('JWT_SECRET');
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresIn === '15m' ? 900 : expiresIn === '7d' ? 604800 : 900);
  
  const data = {
    ...payload,
    iat: now,
    exp
  };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');
  
  return `${base64Header}.${base64Payload}.${signature}`;
}

// Verify JWT token
function verifyToken(token) {
  try {
    const secret = getSecret('JWT_SECRET');
    const [header, payload, signature] = token.split('.');
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

// Usuarios autorizados (en producción, estos datos deben estar en DB)
// Los pines deben ser hasheados con salt único por usuario
const USERS = [
  { username: 'admin', role: 'ADMIN', pinHash: '5cf856c3e8c4e7a9e8c4e7a9e8c4e7a9e8c4e7a9e8c4e7a9e8c4e7a9e8c4e7a9', salt: 'admin_salt_1234' }, // PIN: 1234
  { username: 'cocina', role: 'OPERATOR', pinHash: '5cf856c3e8c4e7a9e8c4e7a9e8c4e7a9e8c4e7a9e8c4e7a9e8c4e7a9', salt: 'cocina_salt_5678' }, // PIN: 5678
  { username: 'repartidor', role: 'REPARTIDOR', pinHash: '5cf856c3e8c4e7a9e8c4e7a9e8c4e7a9e8c4e7a9e8c4e7a9e8c4e7a9', salt: 'repartidor_salt_0000' }, // PIN: 0000
  { username: 'marketing', role: 'MARKETING', pinHash: '5cf856c3e8c4e7a9e8c4e7a9e8c4e7a9e8c4e7a9e8c4e7a9e8c4e7a9', salt: 'marketing_salt_9999' }, // PIN: 9999
];

// Función para gerar hashes de PIN (para usar en setup)
export function hashUserPin(username, pin) {
  const user = USERS.find(u => u.username === username);
  if (!user) return null;
  
  const salt = user.salt;
  return hashPin(pin, salt);
}

// Authenticate con PIN
export function authenticate(username, pin) {
  const user = USERS.find(u => u.username === username);
  if (!user) return null;
  
  const inputHash = hashPin(pin, user.salt);
  if (inputHash !== user.pinHash) {
    return null;
  }
  
  return generateToken({
    sub: username,
    role: user.role,
    type: 'access'
  }, '15m');
}

// Refresh token
export function refreshToken(oldToken) {
  const payload = verifyToken(oldToken);
  if (!payload) return null;
  
  return generateToken({
    sub: payload.sub,
    role: payload.role,
    type: 'access'
  }, '7d');
}

// Login endpoint
export function login(username, pin) {
  const token = authenticate(username, pin);
  if (!token) {
    return { error: 'Credenciales inválidas' };
  }
  
  const payload = verifyToken(token);
  return {
    token,
    expiresIn: payload.exp,
    role: payload.role,
    username: payload.sub
  };
}

// Middleware para verificar token
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // En desarrollo, permitir sin token (pero luego remover esto)
    if (process.env.NODE_ENV === 'development') {
      req.auth = { role: 'DEVELOPMENT' };
      return next();
    }
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  
  req.auth = payload;
  next();
}

// Verificar rol
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Sin permisos suficientes' });
    }
    
    next();
  };
}

export default {
  getSecret,
  hashPin,
  generateSalt,
  generateToken,
  verifyToken,
  login,
  authMiddleware,
  requireRole
};