import dotenv from 'dotenv';
import logger from './services/logger.js';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY
  },
  apiUrl: process.env.VITE_API_URL || 'http://localhost:3001',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  }
};

function validateConfig() {
  const errors = [];
  if (!config.database.url) errors.push('DATABASE_URL');
  if (!config.gemini.apiKey) errors.push('GEMINI_API_KEY');
  if (errors.length > 0) {
    logger.error({ errors }, 'Config validation failed: missing required vars');
    process.exit(1);
  }
  logger.info('Config OK');
}

export { config, validateConfig };
export default config;