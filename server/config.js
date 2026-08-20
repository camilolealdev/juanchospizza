import dotenv from 'dotenv';
import logger from './services/logger.js';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  apiUrl: process.env.VITE_API_URL || 'http://localhost:3001',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
};

function validateConfig() {
  const errors = [];
  // Leer de process.env en tiempo de llamada (no del objeto config capturado
  // al importar) para que la validación siempre vea el env actual.
  if (!process.env.DATABASE_URL) errors.push('DATABASE_URL');
  // FRONTEND_URL obligatorio en producción — si falta, las pasarelas de pago
  // redirigirían al literal 'undefined' (rompiendo el checkout). Fail-fast al
  // boot es mejor que discover-on-deploy.
  if (config.nodeEnv === 'production' && !process.env.FRONTEND_URL) {
    errors.push('FRONTEND_URL');
  }
  if (errors.length > 0) {
    logger.fatal({ errors }, 'Config validation failed: missing required vars');
    process.exit(1);
  }
  if (!config.gemini.apiKey) {
    logger.warn('GEMINI_API_KEY no configurada — men\u00fa inteligente deshabilitado');
  }
  logger.info('Config OK');
}

export { config, validateConfig };
export default config;
