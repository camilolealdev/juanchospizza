import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  turso: {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
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
  if (!config.turso.url) errors.push('TURSO_DATABASE_URL');
  if (!config.turso.authToken) errors.push('TURSO_AUTH_TOKEN');
  if (!config.gemini.apiKey) errors.push('GEMINI_API_KEY');
  if (errors.length > 0) {
    console.error('Config errors:', errors);
    process.exit(1);
  }
  console.log('Config OK');
}

export { config, validateConfig };
export default config;