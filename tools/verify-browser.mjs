// Verificación manual en browser (dev): menú digital + imágenes + campañas
// tras la limpieza (SVGs locales, seed sin Unsplash, scheduler con canales).
// Uso: node tools/verify-browser.mjs
// Requiere: server en :3001 y vite en :5173 (node server/index.js, npx vite).
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const API = process.env.API_URL || 'http://localhost:3001';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreHTTPSErrors: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });
const brokenImages = [];
page.on('requestfailed', (req) => {
  if (req.resourceType() === 'image') brokenImages.push(`${req.url()} (${req.failure()?.errorText})`);
});

try {
  // ── 1. Menú digital público ────────────────────────────────
  const nav = await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  check('Landing carga (HTTP 200)', nav?.status() === 200, `status=${nav?.status()}`);

  await page.waitForSelector('#menu-mount', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000); // Vite compila on-demand + React monta

  const menuCount = await page.locator('#menu-mount').count();
  const cards = await page.locator('#menu-mount img').count();
  check('Menú digital montado', menuCount > 0, `#menu-mount=${menuCount}`);
  check('Productos con imagen', cards > 5, `${cards} <img> en el menú`);

  const cats = await page.locator('#menu-mount button, #menu-mount a').count();
  check('Categorías/interactivos presentes', cats > 3, `${cats} botones/links`);

  // ── 2. Imágenes: SVGs locales, 200, sin rotas ──────────────
  const imgSrcs = await page.$$eval('#menu-mount img', (imgs) => imgs.map((i) => i.src));
  const localImgs = imgSrcs.filter((s) => s.includes('/assets/images/products/'));
  check(
    'Imágenes apuntan a SVGs locales',
    localImgs.length > 0 && localImgs.length === imgSrcs.length,
    `${localImgs.length} de ${imgSrcs.length} locales`
  );
  if (localImgs.length > 0) {
    const sample = localImgs[0];
    const r = await page.request.get(sample);
    check('SVG de producto se sirve (200)', r.status() === 200, `${sample.split('/').pop()} → ${r.status()}`);
  }

  await page.screenshot({ path: '/tmp/verify-menu.png', fullPage: false });
  check('Screenshot menú', true, '/tmp/verify-menu.png');

  // ── 3. Login admin vía /login (modal real) ─────────────────
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('form', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // El modal usa placeholders propios -- selectores exactos para no chocar
  // con el input de búsqueda de la landing ("Buscar ingredientes...").
  const userInput = page.locator('input[placeholder="tu.usuario"]').first();
  const pinInput = page.locator('input[inputmode="numeric"]').first();
  if (await userInput.count()) {
    await userInput.fill(ADMIN_USER);
    if (await pinInput.count()) await pinInput.fill(ADMIN_PIN);
    // Si el form pide password (cuentas super admin con password configurada),
    // el backend igual acepta username+pin para admin_default (bootstrap).
    await page.locator('button[type="submit"]').first().click().catch(() => page.keyboard.press('Enter'));
    await page.waitForTimeout(3500);
    const authed = await page.evaluate(() => !!localStorage.getItem('auth_username'));
    check('Login admin', authed, `localStorage auth_username=${authed}`);
  } else {
    check('Login admin (skip)', false, 'no se encontró el form de login');
  }

  // ── 4. Vista de campañas (deep-link /admin/campanas) ───────
  await page.goto(`${BASE}/admin/campanas`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000); // lazy() del módulo + fetch de campañas

  const bodyText = await page.evaluate(() => document.body.innerText);
  const campanasSection = bodyText.includes('Campañas') || bodyText.includes('campañas');
  check('Vista de campañas renderiza', campanasSection, 'texto "Campañas" presente');

  // Cards de campañas (cualquier card/button con estado active/scheduled/draft)
  const hasActive = /Activa|active/i.test(bodyText);
  const hasScheduled = /Programada|scheduled/i.test(bodyText);
  check('Estados de campaña visibles', hasActive || hasScheduled, `active=${hasActive} scheduled=${hasScheduled}`);

  const reachText = /No disponible|alcanzad|conversiones/i.test(bodyText);
  check('Métricas reach/conversions presentes', reachText, 'texto de métricas en la vista');

  await page.screenshot({ path: '/tmp/verify-campanas.png', fullPage: false });
  check('Screenshot campañas', true, '/tmp/verify-campanas.png');
} catch (e) {
  check('Ejecución completa', false, e.message);
} finally {
  await browser.close();
}

// ── 5. Scheduler end-to-end vía API (con el código actual) ──
// Crea una campaña programada con fecha pasada: el cron (60s) debe activarla
// y el despacho email/push debe correr sin crashear (fail-open sin SMTP/VAPID).
console.log('\n── Scheduler end-to-end (API) ──');
try {
  const login = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, pin: ADMIN_PIN }),
  });
  await login.json();
  const cookies = login.headers.getSetCookie?.() || [];
  let authCookie = cookies.map((c) => c.split(';')[0]).join('; ');

  // El token CSRF viaja en cookie Y header (double-submit): capturar la
  // cookie que setea el endpoint y mandar la misma en el header.
  const csrfRes = await fetch(`${API}/api/csrf-token`, { headers: { cookie: authCookie } });
  const csrfBody = await csrfRes.json().catch(() => ({}));
  const csrfCookies = csrfRes.headers.getSetCookie?.() || [];
  const csrfFromCookie = csrfCookies.map((c) => c.split(';')[0]).join('; ');
  if (csrfFromCookie) authCookie = `${authCookie}; ${csrfFromCookie}`;
  // Double-submit: el header debe llevar el MISMO valor que la cookie
  // (como hace ensureCsrfToken en api.ts) -- el body no siempre lo trae.
  const csrfCookieMatch = csrfFromCookie.match(/csrf-token=([^;]+)/);
  const csrf = csrfCookieMatch?.[1] || csrfBody?.token || '';

  const past = new Date(Date.now() - 60 * 1000).toISOString(); // hace 1 min
  const create = await fetch(`${API}/api/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: authCookie,
      'x-csrf-token': csrf,
    },
    body: JSON.stringify({
      name: `VERIF-${Date.now()}`,
      type: 'flash',
      discount: 10,
      budget: 100000,
      status: 'scheduled',
      scheduleAt: past,
    }),
  });
  const created = await create.json();
  const createdId = created?.id;
  check('Campaña programada creada (API)', !!createdId, createdId ? `id=${createdId}` : JSON.stringify(created).slice(0, 120));

  if (createdId) {
    // Esperar hasta 70s al tick del scheduler (interval 60s)
    let estado = 'scheduled';
    let activada = false;
    for (let i = 0; i < 7; i++) {
      await new Promise((r) => setTimeout(r, 10000));
      const res = await fetch(`${API}/api/campaigns`, { headers: { cookie: authCookie } });
      const list = await res.json();
      const found = (Array.isArray(list) ? list : list?.data || []).find((c) => c.id === createdId);
      if (found) {
        estado = found.status;
        if (estado === 'active') {
          activada = true;
          check(
            'Scheduler activó la campaña vencida',
            true,
            `status=active · reach=${found.reach} · conversions=${found.conversions}`
          );
          break;
        }
      }
    }
    if (!activada) check('Scheduler activó la campaña vencida', false, `sigue ${estado} tras ~70s`);
  }
} catch (e) {
  check('Scheduler end-to-end', false, e.message);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n═══ ${results.length - failed.length}/${results.length} checks OK ═══`);
if (brokenImages.length) console.log('⚠️ imágenes rotas:', brokenImages.slice(0, 5));
process.exit(failed.length ? 1 : 0);
