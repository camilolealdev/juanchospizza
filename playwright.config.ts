import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // En CI arrancamos el stack completo (Vite + Express vía `dev:all`)
    // porque api-smoke y full-audit pegan al backend real (proxy /api
    // de Vite a :3001) y esperamos el /api/health antes de correr tests.
    // En local solo hace falta Vite (reuseExistingServer permite usar el
    // stack de docker compose si ya está levantado).
    command: process.env.CI ? 'npm run dev:all' : 'npm run dev',
    url: process.env.CI ? 'http://localhost:3001/api/health' : 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
  },
});
