import { defineConfig } from '@playwright/test';

/**
 * Config para el smoke test post-deploy contra PRODUCCIÓN.
 * Sin webServer: apunta directo al dominio real (PROD_URL o default).
 * Uso (CI): PROD_URL=https://juanchospizza.com npx playwright test --config=e2e/playwright.smoke.config.ts
 */
export default defineConfig({
  // testDir relativo a ESTE archivo (config vive dentro de e2e/)
  testDir: '.',
  testMatch: 'smoke.spec.ts',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: process.env.PROD_URL || 'https://juanchospizza.com',
    trace: 'on-first-retry',
  },
});
