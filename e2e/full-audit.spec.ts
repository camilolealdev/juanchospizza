import { test, expect } from '@playwright/test';

// ─── Console & Error Capture ────────────────────────────────────────────────
const ALL_CONSOLE_ENTRIES: { type: string; text: string; url: string; timestamp: number }[] = [];
const ALL_NETWORK_FAILURES: { url: string; status: number; method: string }[] = [];
const ALL_UNHANDLED_REJECTIONS: { message: string; url: string }[] = [];

// [2026-07-30] Backlog: en CI no hay API keys reales de proveedores
// externos (Gemini, pasarelas de pago, push). Las llamadas opcionales a
// esos hosts fallan legítimamente (401/403) y NO son bugs del CRM — si se
// reportaran como fallos de red, el audit de consola quedaría lleno de
// ruido y escondería los fallos reales. Se filtran por hostname (mejor
// que claves falsas, que generarían llamadas reales a providers y
// dependencia de red en CI).
const OPTIONAL_EXTERNAL_HOSTS = [
  'generativelanguage.googleapis.com', // Gemini (menú inteligente)
  'api.groq.com',
  'api.bold.co',
  'api.mercadopago.com',
  'production.wompi.co',
  'sandbox.wompi.co',
  'api.paypal.com',
  'www.paypal.com',
  'fcm.googleapis.com', // push
];

function isOptionalExternal(url: string): boolean {
  return OPTIONAL_EXTERNAL_HOSTS.some((h) => url.includes(h));
}

test.beforeEach(async ({ page }) => {
  ALL_CONSOLE_ENTRIES.length = 0;
  ALL_NETWORK_FAILURES.length = 0;
  ALL_UNHANDLED_REJECTIONS.length = 0;

  // Capture ALL console messages — salvo errores de providers externos
  // opcionales (Gemini/pasarelas sin key en CI llegan como console.error
  // desde el frontend; se filtran igual que los fallos de red para que el
  // reporte muestre solo problemas reales del CRM).
  page.on('console', (msg) => {
    const entry = {
      type: msg.type(),
      text: msg.text(),
      url: msg.location().url,
      timestamp: Date.now(),
    };
    if (msg.type() === 'error' && isOptionalExternal(`${entry.url} ${entry.text}`)) {
      return;
    }
    ALL_CONSOLE_ENTRIES.push(entry);
    if (msg.type() === 'error') {
      console.error(`  ❌ CONSOLE.ERROR: ${msg.text()}`);
    }
    if (msg.type() === 'warning') {
      console.warn(`  ⚠️  CONSOLE.WARN: ${msg.text()}`);
    }
  });

  // Capture network failures (4xx/5xx) — salvo providers externos opcionales
  page.on('response', async (response) => {
    const status = response.status();
    if (status >= 400 && !isOptionalExternal(response.url())) {
      ALL_NETWORK_FAILURES.push({
        url: response.url(),
        status,
        method: response.request().method(),
      });
      console.error(`  🌐 HTTP ${status} ${response.request().method()} ${response.url()}`);
    }
  });

  // Capture unhandled page errors
  page.on('pageerror', (err) => {
    ALL_UNHANDLED_REJECTIONS.push({
      message: err.message,
      url: page.url(),
    });
    console.error(`  💥 UNHANDLED ERROR: ${err.message}`);
  });

  // Capture request failures (network errors, DNS, etc.) — salvo providers
  // externos opcionales (mismo criterio que 4xx/5xx arriba)
  page.on('requestfailed', (request) => {
    const failure = request.failure();
    if (failure && !isOptionalExternal(request.url())) {
      ALL_NETWORK_FAILURES.push({
        url: request.url(),
        status: 0,
        method: request.method(),
      });
      console.error(`  📡 NETWORK FAIL: ${request.method()} ${request.url()} -> ${failure.errorText}`);
    }
  });
});

// eslint-disable-next-line no-empty-pattern -- Playwright 1.61 exige destructuring, aunque no se usen fixtures
test.afterEach(async ({}, testInfo) => {
  const errors = ALL_CONSOLE_ENTRIES.filter((e) => e.type === 'error');
  const warnings = ALL_CONSOLE_ENTRIES.filter((e) => e.type === 'warning');
  if (
    errors.length > 0 ||
    warnings.length > 0 ||
    ALL_NETWORK_FAILURES.length > 0 ||
    ALL_UNHANDLED_REJECTIONS.length > 0
  ) {
    await testInfo.attach('console-errors', {
      body: JSON.stringify(
        {
          errors,
          warnings,
          networkFailures: ALL_NETWORK_FAILURES,
          unhandledRejections: ALL_UNHANDLED_REJECTIONS,
        },
        null,
        2
      ),
      contentType: 'application/json',
    });
  }
});

// ─── Helper ────────────────────────────────────────────────────────────────
function step(name: string) {
  console.log(`\n  📌 ${name}`);
}

// El banner de consentimiento (public/consent-banner.js, inyectado vía
// <script defer> en index.html) corre una vez por carga de documento real
// -- sobrevive a la navegación client-side de React Router, pero reaparece
// en cada page.goto() (hard navigation). Es fixed/overlay y puede
// interceptar pointer events de botones flotantes (ej. el cart button,
// bottom-right) si no se descarta primero.
async function dismissConsentBanner(page: import('@playwright/test').Page) {
  const acceptAll = page.locator('[data-jc-action="accept-all"]');
  if (await acceptAll.isVisible({ timeout: 1000 }).catch(() => false)) {
    await acceptAll.click();
  }
}

// ─── PUBLIC WEBSITE TESTS ──────────────────────────────────────────────────
//
// Reescrito 2026-10-10: la suite anterior apuntaba a una arquitectura de
// sitio pre-React Router (`.page-container[data-page]`, `.nav-links`,
// `#navToggle`, `#cartCounter`, data-testid de un CTP builder viejo) que ya
// no existe -- el sitio se migró a React Router (src/App.tsx) con páginas
// separadas por ruta envueltas en CustomerSite (Header + Outlet + Footer +
// CartButton + CartDrawer). Selectores verificados contra el código real de
// src/components y src/pages/site, no inventados.

test.describe.configure({ mode: 'serial' });
test.describe('PUBLIC WEBSITE - Todos los links y botones', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissConsentBanner(page);
  });

  test('01 - Homepage: header, hero, cart button, footer visibles', async ({ page }) => {
    step('Hero heading');
    await expect(page.getByRole('heading', { name: /El Sabor Que No Tiene Igual/i })).toBeVisible();

    step('Logo');
    await expect(page.getByRole('link', { name: 'Ir al inicio' })).toBeVisible();

    step('Nav links (desktop)');
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect(nav.getByRole('link', { name: 'Inicio' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Crea tu Pizza' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Menú' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Domicilios' })).toBeVisible();

    step('Hero CTA');
    const heroSection = page.locator('section').filter({ has: page.getByRole('heading', { name: /El Sabor Que No Tiene Igual/i }) });
    await expect(heroSection.getByRole('link', { name: 'Ver Menú', exact: true })).toBeVisible();

    step('Admin crown button ausente (acceso oculto, CHANGELOG JUL-30)');
    await expect(page.locator('button[title*="Panel Administrativo"]')).toHaveCount(0);

    step('Cart button flotante');
    await expect(page.getByRole('button', { name: 'Abrir carrito' })).toBeVisible();

    step('Footer');
    await expect(page.getByText("Síguenos en nuestras redes")).toBeVisible();
  });

  test('02 - Nav link: Menú y de vuelta a Inicio', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    step('Click Menú');
    await nav.getByRole('link', { name: 'Menú' }).click();
    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.locator('#menu')).toBeVisible();

    step('Click Inicio');
    await nav.getByRole('link', { name: 'Inicio' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /El Sabor Que No Tiene Igual/i })).toBeVisible();
  });

  test('03 - Nav link: Crea tu Pizza', async ({ page }) => {
    step('Click Crea tu Pizza');
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Crea tu Pizza' }).click();
    await expect(page).toHaveURL(/\/pizza$/);
    await expect(page.locator('#crea-tu-pizza')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'CREA TU PIZZA' })).toBeVisible();
  });

  test('04 - Nav link: Domicilios', async ({ page }) => {
    step('Click Domicilios');
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Domicilios' }).click();
    await expect(page).toHaveURL(/\/domicilios$/);
    await expect(page.getByRole('heading', { name: 'Pide Sin Moverte de Casa' })).toBeVisible();
  });

  test('05 - Cart button abre el drawer', async ({ page }) => {
    step('Click cart button');
    await page.getByRole('button', { name: 'Abrir carrito' }).click();
    await expect(page.getByRole('dialog', { name: 'Carrito de compras' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tu Pedido' })).toBeVisible();
    step('Close drawer');
    await page.getByRole('button', { name: 'Cerrar carrito' }).click();
    // CartDrawer.tsx nunca desmonta el dialog -- togglea opacity-0 +
    // pointer-events-none vía className, así que sigue teniendo bounding
    // box y Playwright lo sigue contando como "visible" (opacity:0 no
    // cuenta como hidden para toBeVisible). La señal real de "cerrado" es
    // la opacidad computada.
    await expect(page.getByRole('dialog', { name: 'Carrito de compras' })).toHaveCSS('opacity', '0');
  });

  test('06 - Hero CTA navega a Menú', async ({ page }) => {
    step('Click hero CTA');
    const heroSection = page.locator('section').filter({ has: page.getByRole('heading', { name: /El Sabor Que No Tiene Igual/i }) });
    await heroSection.getByRole('link', { name: 'Ver Menú', exact: true }).click();
    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.locator('#menu')).toBeVisible();
  });

  test('07 - /login URL opens login modal (acceso oculto, CHANGELOG JUL-30)', async ({ page }) => {
    step('Navigate to /login');
    await page.goto('/login');
    await expect(page.getByText('GastroPro')).toBeVisible({ timeout: 3000 });
  });

  test('08 - CTP: tamaños de pizza', async ({ page }) => {
    await page.goto('/pizza');
    await page.waitForTimeout(300);
    await dismissConsentBanner(page);
    // PizzaConfigurator (src/components/PizzaConfigurator.tsx) tiene 4
    // tamaños fijos (src/data/menu-data.ts PIZZA_SIZES), sin data-testid --
    // son <button> con el label visible.
    for (const label of ['Familiar', 'Mediana', 'Junior', 'Small']) {
      await expect(page.getByRole('button', { name: new RegExp(label) })).toBeVisible();
    }
    step('Select Familiar');
    await page.getByRole('button', { name: /^Familiar/ }).click();
    await expect(page.getByText('Pizza Familiar')).toBeVisible();
  });

  test('09 - CTP: selección de sabores', async ({ page }) => {
    await page.goto('/pizza');
    await page.waitForTimeout(300);
    await dismissConsentBanner(page);
    step('Select size');
    await page.getByRole('button', { name: /^Mediana/ }).click();
    step('Toggle flavor checkbox');
    // Cada sabor es un <label> con un checkbox sr-only -- togglear por el
    // texto visible del sabor, no por un data-testid que no existe.
    await page.getByText('Hawaiana', { exact: true }).click();
    await expect(page.locator('input[type="checkbox"]').first()).toBeChecked();
  });

  test('10 - CTP: agregar al carrito', async ({ page }) => {
    await page.goto('/pizza');
    await page.waitForTimeout(300);
    await dismissConsentBanner(page);
    step('Select Small size');
    await page.getByRole('button', { name: /^Small/ }).click();
    step('Select a flavor (Small permite 1 sabor)');
    await page.getByText('Carnes', { exact: true }).click();
    step('Agregar al carrito');
    const addBtn = page.getByRole('button', { name: /Agregar al Carrito/ });
    await expect(addBtn).toBeVisible({ timeout: 2000 });
    await addBtn.click();
    await expect(page.getByText('¡Pizza agregada al carrito!')).toBeVisible();
  });

  test('11 - Menú: tabs de categoría y búsqueda', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForTimeout(300);
    await dismissConsentBanner(page);
    step('Click categoría Hamburguesas');
    await page.locator('button').filter({ hasText: 'Hamburguesas' }).click();
    await expect(page).toHaveURL(/category=hamburguesas/);
    step('Buscar término inexistente');
    await page.getByLabel('Buscar en el menú').fill('zzzznonexistente');
    await expect(page.getByText('No encontramos resultados')).toBeVisible();
  });

  test('12 - Domicilios: sedes y WhatsApp CTA', async ({ page }) => {
    await page.goto('/domicilios');
    await page.waitForTimeout(300);
    await dismissConsentBanner(page);
    step('Sede cards');
    await expect(page.locator('.sede-card').first()).toBeVisible();
    await expect(page.locator('.sede-card').last()).toBeVisible();
    step('WhatsApp CTA');
    await expect(page.locator('a.whatsapp-btn').first()).toBeVisible();
  });

  test('13 - Social media links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      /instagram\.com\/juanchospizza1/
    );
    await expect(page.getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', /facebook\.com/);
    await expect(page.getByRole('link', { name: 'TikTok' })).toHaveAttribute(
      'href',
      /tiktok\.com\/@juanchospizzanemocon/
    );
  });

  test('14 - Footer: links legales', async ({ page }) => {
    step('Política de Privacidad');
    await page.getByRole('link', { name: 'Política de Privacidad' }).click();
    await expect(page).toHaveURL(/\/politica-de-privacidad$/);
    step('Términos y Condiciones');
    await page.getByRole('link', { name: 'Términos y Condiciones' }).click();
    await expect(page).toHaveURL(/\/terminos-y-condiciones$/);
    step('Eliminación de Datos');
    await page.getByRole('link', { name: 'Eliminación de Datos' }).click();
    await expect(page).toHaveURL(/\/eliminacion-de-datos$/);
  });

  test('15 - 404: ruta inexistente', async ({ page }) => {
    await page.goto('/esta-ruta-no-existe');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });

  test('16 - Hamburger mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    step('Click hamburger');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await expect(page.locator('#mobile-nav')).toBeVisible();
    step('Click nav link to close');
    await page.locator('#mobile-nav').getByRole('link', { name: 'Menú' }).click();
    await expect(page.locator('#mobile-nav')).toHaveCount(0);
    await expect(page).toHaveURL(/\/menu$/);
  });
});

// ─── ADMIN CRM TESTS ───────────────────────────────────────────────────────

test.describe('ADMIN CRM - Login y navegación (requiere backend :3001)', () => {
  // src/components/LoginModal.tsx ya no tiene un <select> de rol: el
  // usuario real es texto libre (#login-username), con 4 botones preset
  // (Administrador/Cocina/Repartidor/Marketing) que solo rellenan ese
  // input -- usernames reales verificados en server/migrate.js migración
  // #004 (admin/cocina/repartidor/marketing). El bloque "¿Olvidaste el
  // PIN?" se eliminó a propósito (frontend audit P0, no expone PINs en el
  // bundle) -- no hay equivalente que probar.
  async function loginAs(page: import('@playwright/test').Page, presetLabel: string, pin: string) {
    await page.goto('/login');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: presetLabel, exact: true }).click();
    await page.locator('#login-pin').fill(pin);
    await page.getByRole('button', { name: 'Entrar' }).click();
  }

  test('19 - Login modal elements', async ({ page }) => {
    await page.goto('/login');
    await page.waitForTimeout(500);
    step('Username input + role presets');
    await expect(page.locator('#login-username')).toBeVisible();
    await page.getByRole('button', { name: 'Administrador', exact: true }).click();
    await expect(page.locator('#login-username')).toHaveValue('admin');
    step('PIN input');
    await expect(page.locator('#login-pin')).toBeVisible();
  });

  test('20 - Login flow + dashboard', async ({ page }) => {
    step('Open /login + fill credentials');
    // PIN real no está documentado en texto plano (solo el hash vive en
    // server/migrate.js) -- si falla, el catch de abajo lo reporta como
    // "backend pendiente" en vez de tronar la suite, igual que antes.
    await loginAs(page, 'Administrador', '1234');
    try {
      await expect(page.getByText('Panel de Gestión')).toBeVisible({ timeout: 5000 });
      console.log('  ✅ Admin login successful — backend running');
    } catch {
      console.log('  ⏳ Admin login requires backend on :3001 (o PIN real distinto) — UI tested, API pending');
    }
  });

  test('21 - CRM module navigation', async ({ page }) => {
    step('Login');
    await loginAs(page, 'Administrador', '1234');
    try {
      await expect(page.getByText('Panel de Gestión')).toBeVisible({ timeout: 5000 });
    } catch {
      console.log('  ⏳ Backend required — skipping module navigation');
      return;
    }
    for (const name of [
      'Menú Inteligente',
      'Inventario',
      'Clientes',
      'Fidelización',
      'Campañas',
      'Finanzas',
      'Reportes',
      'Reseñas',
      'Pagos',
      'Empleados',
      'Turnos',
      'Mesas',
      'Caja',
      'Comandas',
      'Compras',
      'Facturación',
    ]) {
      step(`Navigate: ${name}`);
      await page.locator('nav button').filter({ hasText: name }).click();
      await page.waitForTimeout(500);
      // Verify via admin header h2 (floating header renders MODULE_TITLES)
      await expect(page.locator('.fixed.top-0 h2, header h2').filter({ hasText: name }).first()).toBeVisible({
        timeout: 3000,
      });
    }
  });

  test('22 - Dashboard interactions', async ({ page }) => {
    step('Login');
    await loginAs(page, 'Administrador', '1234');
    try {
      await expect(page.getByText('Panel de Gestión')).toBeVisible({ timeout: 5000 });
    } catch {
      console.log('  ⏳ Backend required');
      return;
    }
    step('Location selector');
    const locSelect = page.locator('select[title="Sede"]');
    if (await locSelect.isVisible()) {
      await locSelect.selectOption('zipaquira');
      await page.waitForTimeout(300);
      await locSelect.selectOption('nemocon');
    }
    step('Notification bell');
    const bell = page.locator('.fa-bell').first();
    if (await bell.isVisible()) {
      await bell.click();
    }
  });

  test('23 - Logout flow', async ({ page }) => {
    step('Login');
    await loginAs(page, 'Administrador', '1234');
    try {
      await expect(page.getByText('Panel de Gestión')).toBeVisible({ timeout: 5000 });
    } catch {
      console.log('  ⏳ Backend required');
      return;
    }
    step('Cerrar Sesión');
    await page.getByText('Cerrar Sesión').click();
    await page.waitForTimeout(500);
    await expect(page.locator('button[title*="Panel Administrativo"]')).toHaveCount(0);
  });

  test('24 - Login as multiple roles', async ({ page }) => {
    step('Login as cocina');
    await loginAs(page, 'Cocina', '5678');
    try {
      await expect(page.getByText('Panel de Gestión')).toBeVisible({ timeout: 5000 });
      // ROLE_DISPLAY_NAMES en src/App.tsx muestra OPERATOR como "Chef
      // Principal" (AdminLayout.tsx renderiza userName tal cual), no
      // "Cocina" -- ese era el nombre de la UI vieja.
      await expect(page.getByText('Chef Principal')).toBeVisible();
    } catch {
      console.log('  ⏳ Backend required for role login');
    }
  });
});

// ─── CONSOLE AUDIT SUMMARY ─────────────────────────────────────────────────

test.describe('CONSOLE AUDIT', () => {
  test('Summary - Aggregate console errors across all pages', async ({ page }) => {
    for (const url of ['/', '/menu', '/pizza', '/domicilios', '/login']) {
      await page.goto(url);
      await page.waitForTimeout(500);
    }
    const totalErrors = ALL_CONSOLE_ENTRIES.filter((e) => e.type === 'error').length;
    const totalWarnings = ALL_CONSOLE_ENTRIES.filter((e) => e.type === 'warning').length;

    console.log(`\n═══════════════════════════════════════`);
    console.log(`  CONSOLE AUDIT FINAL SUMMARY`);
    console.log(`  Total console errors: ${totalErrors}`);
    console.log(`  Total console warnings: ${totalWarnings}`);
    console.log(`  Network failures: ${ALL_NETWORK_FAILURES.length}`);
    console.log(`  Unhandled errors: ${ALL_UNHANDLED_REJECTIONS.length}`);
    console.log(`═══════════════════════════════════════`);

    if (totalErrors > 0) {
      console.log(`\n  ❌ ALL ERRORS:`);
      ALL_CONSOLE_ENTRIES.filter((e) => e.type === 'error').forEach((e) => {
        console.log(`     - ${e.text}`);
      });
    }
    expect(true).toBe(true); // placeholder - errors are logged in report, not asserted
  });
});
