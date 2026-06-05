const API_URL = 'http://localhost:3001/api';

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || API_URL,
  requestTimeout: 10000,
  maxRetries: 3,
  retryDelay: 1000
};

export default config;