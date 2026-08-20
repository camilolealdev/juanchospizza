import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Proxy /api/* al backend Express (puerto 3001) para que
      // `npm run dev` (Vite solo) sirva las llamadas del builder
      // inline de "Crea-tu-Pizza" sin requerir `npm run dev:all`.
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon.png', 'favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: "Guido Pizza — Juancho's Pizza",
          short_name: 'Guido Pizza',
          description: 'Pide tu pizza artesanal en Nemocón y Zipaquirá',
          theme_color: '#ea580c',
          background_color: '#0c0a09',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: '/favicon.png', sizes: '32x32', type: 'image/png', purpose: 'any' },
            { src: '/pwa-192x192.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512x512.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // recharts (~363 KB) se excluye del precache: es un chunk dinámico
          // que solo se descarga cuando una vista con gráficos lo importa
          // (useLazyCharts). El personal que nunca abre Finanzas/Dashboard
          // no paga esos KB, y la primera visita instala la PWA sin el peso.
          globIgnores: ['**/recharts-*.js'],
          // Estrategias de caché diferenciadas por tipo de recurso:
          //   - Assets con hash (JS/CSS/imágenes) → StaleWhileRevalidate
          //     (carga instantánea desde caché, actualiza en segundo plano)
          //   - HTML/Navegación → NetworkFirst (contenido siempre fresco,
          //     cae a caché solo sin conexión)
          //   - API → no se cachea (datos dinámicos)
          runtimeCaching: [
            {
              // Assets estáticos con hash (inmutables por definición)
              urlPattern: /\.(?:js|css|svg|png|jpg|jpeg|gif|ico|woff2?)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'guido-pizza-assets',
                expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 },
              },
            },
            {
              // Navegación y HTML (siempre fresco, fallback a caché offline)
              urlPattern: ({ url }) =>
                !url.pathname.startsWith('/api/') &&
                !/\.(?:js|css|svg|png|jpg|jpeg|gif|ico|woff2?)$/.test(url.pathname),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'guido-pizza-pages',
                expiration: { maxEntries: 30, maxAgeSeconds: 7 * 24 * 60 * 60 },
              },
            },
          ],
        },
      }),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      manifest: true,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            // Nombre estable para recharts: con import dinámico el chunk no
            // se puede tree-shakear por acceso a namespace, así que se aísla
            // para poder excluirlo del precache (globIgnores abajo) y que
            // solo baje on-demand vía useLazyCharts.
            if (id.includes('node_modules/recharts')) return 'recharts';
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react';
            if (id.includes('react-router-dom')) return 'router';
            if (id.includes('@radix-ui')) return 'ui';
          },
        },
      },
    },
  };
});
