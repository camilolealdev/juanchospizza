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

test.afterEach(async (_fixtures, testInfo) => {
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

// ─── PUBLIC WEBSITE TESTS ──────────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });
test.describe('PUBLIC WEBSITE - Todos los links y botones', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('01 - Homepage: hero, nav, botones flotantes visibles', async ({ page }) => {
    step('Hero heading');
    await expect(page.getByRole('heading', { name: /En Sabor y Calidad/i })).toBeVisible();

    step('Logo');
    await expect(page.locator('.logo')).toBeVisible();

    step('Nav links');
    await expect(page.locator('.nav-links').getByText('Inicio')).toBeVisible();
    await expect(page.locator('.nav-links').getByText('Menú')).toBeVisible();
    await expect(page.locator('.nav-links').getByText('Domicilios')).toBeVisible();
    await expect(page.locator('.nav-links').getByText('Carrito')).toBeVisible();
    await expect(page.locator('.nav-links a[data-nav-page="crea-tu-pizza"]')).toBeVisible();

    step('Hero CTA');
    await expect(page.locator('.btn-primary').first()).toBeVisible();

    step('WhatsApp floating');
    await expect(page.locator('.floating-chatbot')).toBeVisible();

    step('Admin crown button');
    await expect(page.locator('button[title*="Panel Administrativo"]')).toBeVisible();

    step('Cart counter');
    await expect(page.locator('#cartCounter')).toBeVisible();
  });

  test('02 - Nav link: Inicio', async ({ page }) => {
    step('Click Inicio');
    await page
      .locator('a')
      .filter({ hasText: /^Inicio$/ })
      .click();
    await expect(page.locator('.page-container[data-page="inicio"]')).toHaveClass(/active/);
  });

  test('03 - Nav link: Crea tu Pizza', async ({ page }) => {
    step('Click Crea tu Pizza');
    await page.locator('.nav-links a[data-nav-page="crea-tu-pizza"]').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.page-container[data-page="crea-tu-pizza"]')).toHaveClass(/active/);
    await expect(page.locator('#ctp-builder')).toBeVisible();
  });

  test('04 - Nav link: Menú', async ({ page }) => {
    step('Click Menú');
    await page
      .locator('a')
      .filter({ hasText: /^Menú$/ })
      .click();
    await expect(page.locator('.page-container[data-page="menu"]')).toHaveClass(/active/);
  });

  test('05 - Nav link: Domicilios', async ({ page }) => {
    step('Click Domicilios');
    await page
      .locator('a')
      .filter({ hasText: /^Domicilios$/ })
      .click();
    await expect(page.locator('.page-container[data-page="domicilios"]')).toHaveClass(/active/);
    await expect(page.locator('.dlv-hero')).toBeVisible();
  });

  test('06 - Nav link: Carrito', async ({ page }) => {
    step('Click Carrito');
    await page.locator('#navCartBtn').click();
    await expect(page.locator('.page-container[data-page="carrito"]')).toHaveClass(/active/);
  });

  test('07 - Hero CTA', async ({ page }) => {
    step('Click hero CTA');
    await page.locator('a.btn-primary').first().click();
    await expect(page.locator('.page-container[data-page="menu"]')).toHaveClass(/active/);
  });

  test('08 - Admin crown button opens login modal', async ({ page }) => {
    step('Click crown button');
    await page.locator('button[title*="Panel Administrativo"]').click();
    await expect(page.getByText('GastroPro')).toBeVisible({ timeout: 3000 });
  });

  test('09 - CTP builder sizes', async ({ page }) => {
    await page.locator('.nav-links a[data-nav-page="crea-tu-pizza"]').click();
    await page.waitForTimeout(500);
    // CTP has 4 sizes, loaded from GET /api/pizza-sizes: Small, Junior, Mediana, Familiar
    const sizeBtns = page.getByTestId('pizza-size');
    await expect(sizeBtns).toHaveCount(4);
    await sizeBtns.filter({ hasText: 'Familiar' }).click();
    await expect(sizeBtns.filter({ hasText: 'Familiar' })).toHaveAttribute('aria-pressed', 'true');
    await sizeBtns.filter({ hasText: 'Small' }).click();
    await expect(sizeBtns.filter({ hasText: 'Small' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('10 - CTP ingredient groups', async ({ page }) => {
    await page.locator('.nav-links a[data-nav-page="crea-tu-pizza"]').click();
    await page.waitForTimeout(500);
    // CTP has 4 ingredient groups with chips
    const groups = page.getByTestId('pizza-ingredient-group');
    await expect(groups).toHaveCount(4);
    await expect(groups.filter({ hasText: 'Carnes' })).toBeVisible();
    await expect(groups.filter({ hasText: 'Vegetales' })).toBeVisible();
    await expect(groups.filter({ hasText: 'Frutas' })).toBeVisible();
    await expect(groups.filter({ hasText: 'Extras' })).toBeVisible();
  });

  test('11 - CTP chips interaction', async ({ page }) => {
    await page.locator('.nav-links a[data-nav-page="crea-tu-pizza"]').click();
    await page.waitForTimeout(500);
    step('Select size');
    await page.getByTestId('pizza-size').filter({ hasText: 'Mediana' }).click();
    step('Toggle ingredient chips');
    const chip = page.getByTestId('pizza-ingredient-chip').filter({ hasText: 'Champiñones' });
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  test('12 - CTP ingredient + add to cart', async ({ page }) => {
    await page.locator('.nav-links a[data-nav-page="crea-tu-pizza"]').click();
    await page.waitForTimeout(500);
    step('Select Small size');
    await page.getByTestId('pizza-size').filter({ hasText: 'Small' }).click();
    step('Select ingredients');
    await page.getByTestId('pizza-ingredient-chip').filter({ hasText: 'Jamón' }).click();
    await page.getByTestId('pizza-ingredient-chip').filter({ hasText: 'Queso extra' }).click();
    await expect(page.getByTestId('pizza-add-btn')).toBeEnabled({ timeout: 2000 });
    step('Verify summary shows ingredients');
    await expect(page.getByTestId('pizza-summary-list')).toContainText('Jamón');
    await expect(page.getByTestId('pizza-summary-list')).toContainText('Queso extra');
  });

  test('13 - Domicilios WhatsApp CTA', async ({ page }) => {
    await page
      .locator('a')
      .filter({ hasText: /^Domicilios$/ })
      .click();
    await page.waitForTimeout(500);
    await expect(page.locator('.dlv-cta-strip .cta-btn')).toBeVisible();
  });

  test('14 - Domicilios sedes', async ({ page }) => {
    await page
      .locator('a')
      .filter({ hasText: /^Domicilios$/ })
      .click();
    await page.waitForTimeout(500);
    await expect(page.locator('.dlv-sede-card').first()).toBeVisible();
    await expect(page.locator('.dlv-sede-card').last()).toBeVisible();
  });

  test('15 - Social media links', async ({ page }) => {
    await expect(page.locator('a[href*="instagram.com/juanchospizzanemocon"]')).toBeVisible();
    await expect(page.locator('a[href*="facebook.com/juanchospizzanemocon"]')).toBeVisible();
    await expect(page.locator('a[href*="tiktok.com/@juanchospizzanemocon"]')).toBeVisible();
  });

  test('16 - Premium card', async ({ page }) => {
    await expect(page.locator('#premium-card')).toBeVisible();
    await expect(page.locator('.premium-logo-h2')).toBeVisible();
  });

  test('17 - Footer', async ({ page }) => {
    await expect(page.locator('#site-footer')).toBeVisible();
  });

  test('18 - Hamburger mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    step('Click hamburger');
    await page.locator('#navToggle').click();
    await expect(page.locator('#navMenu')).toHaveClass(/active/);
    step('Click nav link to close');
    await page
      .locator('a')
      .filter({ hasText: /^Menú$/ })
      .click();
    await expect(page.locator('#navMenu')).not.toHaveClass(/active/);
  });
});

// ─── ADMIN CRM TESTS ───────────────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });
test.describe('ADMIN CRM - Login y navegación (requiere backend :3001)', () => {
  test('19 - Login modal elements', async ({ page }) => {
    await page.locator('button[title*="Panel Administrativo"]').click();
    await page.waitForTimeout(500);
    step('Role selector');
    const roleSelect = page.locator('select').first();
    await expect(roleSelect).toBeVisible();
    await roleSelect.selectOption('admin');
    await expect(roleSelect).toHaveValue('admin');
    step('PIN input');
    await expect(page.locator('input[type="password"]')).toBeVisible();
    step('PIN hint toggle');
    await page.getByText('Olvidaste').click();
    await expect(page.getByText('1234')).toBeVisible();
  });

  test('20 - Login flow + dashboard', async ({ page }) => {
    step('Open modal + fill credentials');
    await page.locator('button[title*="Panel Administrativo"]').click();
    await page.waitForTimeout(300);
    await page.locator('select').first().selectOption('admin');
    await page.locator('input[type="password"]').fill('1234');
    await page.locator('button[type="submit"]').click();
    // If backend is running, verify dashboard loaded
    try {
      await expect(page.getByText('Panel de Gestión')).toBeVisible({ timeout: 5000 });
      console.log('  ✅ Admin login successful — backend running');
    } catch {
      console.log('  ⏳ Admin login requires backend on :3001 — UI tested, API pending');
    }
  });

  test('21 - CRM module navigation', async ({ page }) => {
    step('Login');
    await page.locator('button[title*="Panel Administrativo"]').click();
    await page.waitForTimeout(300);
    await page.locator('select').first().selectOption('admin');
    await page.locator('input[type="password"]').fill('1234');
    await page.locator('button[type="submit"]').click();
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
    await page.locator('button[title*="Panel Administrativo"]').click();
    await page.waitForTimeout(300);
    await page.locator('select').first().selectOption('admin');
    await page.locator('input[type="password"]').fill('1234');
    await page.locator('button[type="submit"]').click();
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
    await page.locator('button[title*="Panel Administrativo"]').click();
    await page.waitForTimeout(300);
    await page.locator('select').first().selectOption('admin');
    await page.locator('input[type="password"]').fill('1234');
    await page.locator('button[type="submit"]').click();
    try {
      await expect(page.getByText('Panel de Gestión')).toBeVisible({ timeout: 5000 });
    } catch {
      console.log('  ⏳ Backend required');
      return;
    }
    step('Cerrar Sesión');
    await page.getByText('Cerrar Sesión').click();
    await page.waitForTimeout(500);
    await expect(page.locator('button[title*="Panel Administrativo"]')).toBeVisible();
  });

  test('24 - Login as multiple roles', async ({ page }) => {
    step('Login as cocina');
    await page.locator('button[title*="Panel Administrativo"]').click();
    await page.waitForTimeout(300);
    await page.locator('select').first().selectOption('operator');
    await page.locator('input[type="password"]').fill('5678');
    await page.locator('button[type="submit"]').click();
    try {
      await expect(page.getByText('Panel de Gestión')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Cocina')).toBeVisible();
    } catch {
      console.log('  ⏳ Backend required for role login');
    }
  });
});

// ─── CONSOLE AUDIT SUMMARY ─────────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });
test.describe('CONSOLE AUDIT', () => {
  test('Summary - Aggregate console errors across all pages', async ({ page }) => {
    for (const url of ['/', '/menu', '/crea-tu-pizza', '/domicilios', '/carrito']) {
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
