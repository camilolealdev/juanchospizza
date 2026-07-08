import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.svg'],
          manifest: {
            name: "Guido Pizza — Juancho's Pizza",
            short_name: 'Guido Pizza',
            description: 'Pide tu pizza artesanal en Nemocón y Zipaquirá',
            theme_color: '#ea580c',
            background_color: '#0c0a09',
            display: 'standalone',
            start_url: '/',
            icons: [
              { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
            ]
          },
          workbox: {
            // Network-first para todo lo que no sea /api: prioriza contenido
            // fresco, cae a caché solo si el usuario está sin conexión.
            runtimeCaching: [
              {
                urlPattern: ({ url }) => !url.pathname.startsWith('/api/'),
                handler: 'NetworkFirst',
                options: { cacheName: 'guido-pizza-shell' }
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        manifest: true,
      },
    };
});
