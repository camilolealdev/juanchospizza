// [2026-07-21] Frontend audit P0: el fallback legacy horneaba
// 'http://localhost:3001/api' en CADA bundle de producción. Vite inlinea
// import.meta.env.* al buildear, así que esa URL acababa dentro del JS
// servido a visitantes reales — cuando el browser resolvía ''/api/...',
// golpeaba SU PROPIO localhost:3001, no al backend del deploy. Resultado:
// shell cargaba OK, todo lo que dependía de la API moría silencioso.
// Mismo arreglo que ya está aplicado en services/api.ts (const API_BASE).
// services/api.ts es la fuente de verdad en runtime; este módulo de
// configuración queda como superficie pública para settings de UI pero el
// apiUrl debe comportarse idéntico.
const API_BASE_FALLBACK = '';

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || API_BASE_FALLBACK,
  requestTimeout: 10000,
  maxRetries: 3,
  retryDelay: 1000,
};

export default config;

// [2026-07-21] Frontend audit P0: pista visible en consola SOLO en builds
// de producción que olvidaron configurar VITE_API_URL. NO tira error —
// queremos que el sitio cargue y el equipo vea el warning claramente en
// DevTools. Dev local sigue funcionando porque .env fija VITE_API_URL.
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    '[config] VITE_API_URL no está definido en producción — las llamadas al backend\n' +
      '          irán al mismo origen del frontend. Si tu backend está en otro\n' +
      '          dominio, configuralo en el .env antes de buildear.'
  );
}
