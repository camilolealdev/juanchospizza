/**
 * PWA + Icons Audit Script
 * Verifica manifest, service worker e iconos PWA en vivo
 * Uso: node tools/lighthouse-pwa-check.cjs
 */
const { chromium } = require('playwright');

// ⚠️ NO llamar esta variable 'URL' — sombrearía el constructor global URL
// y rompería todos los new URL(...) del script.
const APP_URL = 'https://localhost';

async function run() {
  console.log('🔍 PWA & Icons Audit — Juancho\'s Pizza\n');

  const browser = await chromium.launch({
    args: ['--ignore-certificate-errors', '--no-sandbox'],
  });

  const page = await browser.newPage();

  // ── Console listener (ANTES de navegar) ─────────────────
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), url: msg.location()?.url || '' });
    }
  });

  // ── Escuchar peticiones de red ──────────────────────────
  const responses = [];
  page.on('response', res => {
    const url = res.url();
    if (url.includes('favicon') || url.includes('apple-touch') || url.includes('pwa-') || url.includes('manifest') || url.includes('og-image')) {
      responses.push({
        url,
        status: res.status(),
        type: res.headers()['content-type'] || '?',
        size: res.headers()['content-length'] || '?',
      });
    }
  });

  // ── Navegar ─────────────────────────────────────────────
  // Usamos 'load' en vez de 'networkidle' porque el WebSocket persistente
  // y el Service Worker mantienen actividad de red continua, impidiendo
  // que 'networkidle' se alcance.
  try {
    await page.goto(APP_URL, { waitUntil: 'load', timeout: 20000 });
  } catch (_e) {
    console.log('  ⚠️  Primera navegación falló (SSL self-signed), reintentando...');
    await page.goto(APP_URL, { waitUntil: 'load', timeout: 20000 });
  }

  // ── Verificar meta tags en HTML ─────────────────────────
  console.log('📄 META TAGS');
  const checks = [
    { name: 'favicon.svg', sel: 'link[rel="icon"][type="image/svg+xml"]', attr: 'href' },
    { name: 'favicon.png', sel: 'link[rel="icon"][type="image/png"]', attr: 'href' },
    { name: 'favicon.ico', sel: 'link[rel="icon"][type="image/x-icon"]', attr: 'href' },
    { name: 'apple-touch-icon', sel: 'link[rel="apple-touch-icon"]', attr: 'href' },
    { name: 'apple-mobile-web-app-capable', sel: 'meta[name="apple-mobile-web-app-capable"]', attr: 'content' },
    { name: 'apple-mobile-web-app-title', sel: 'meta[name="apple-mobile-web-app-title"]', attr: 'content' },
    { name: 'og:image', sel: 'meta[property="og:image"]', attr: 'content' },
    { name: 'manifest', sel: 'link[rel="manifest"]', attr: 'href' },
  ];

  let metaTagsOk = 0;
  for (const c of checks) {
    const el = await page.$(c.sel);
    if (el) {
      const val = await el.getAttribute(c.attr);
      console.log(`  ✅ ${c.name}: ${val}`);
      metaTagsOk++;
    } else {
      console.log(`  ❌ ${c.name}: NO ENCONTRADO`);
    }
  }

  // ── Verificar respuestas HTTP de assets ─────────────────
  console.log('\n📦 ASSETS (HTTP responses)');
  // Esperar a que se capturen todas las respuestas
  await page.waitForTimeout(500);

  let assetsOk = 0;
  const seen = new Set();
  for (const r of responses) {
    const key = r.url.split('?')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    const icon = key.split('/').pop()?.substring(0, 50) || key;
    const statusIcon = r.status === 200 ? '✅' : r.status === 301 || r.status === 304 ? '🔄' : '❌';
    if (r.status === 200) assetsOk++;
    console.log(`  ${statusIcon} ${icon} → HTTP ${r.status} (${r.type}, ${r.size}B)`);
  }

  // ── Verificar PWA manifest ──────────────────────────────
  console.log('\n📋 PWA MANIFEST');
  const manifestLink = await page.$('link[rel="manifest"]');
  if (manifestLink) {
    const manifestUrl = await manifestLink.getAttribute('href');
    console.log(`  ✅ href: ${manifestUrl}`);

    try {
      const manifestResp = await page.evaluate(async (url) => {
        const res = await fetch(url);
        return await res.json();
      }, manifestUrl);

      console.log(`  📛 Name: ${manifestResp.name}`);
      console.log(`  🏷️  Short name: ${manifestResp.short_name}`);
      console.log(`  🎨 Theme color: ${manifestResp.theme_color}`);
      console.log(`  📱 Display: ${manifestResp.display}`);

      if (manifestResp.icons && manifestResp.icons.length > 0) {
        console.log(`  🖼️  Icons (${manifestResp.icons.length}):`);
        for (const icon of manifestResp.icons) {
          const sizeOk = icon.sizes && icon.sizes !== 'any';
          const purposeOk = icon.purpose || 'any';
          console.log(`     ${sizeOk ? '✅' : '⚠️'} ${icon.src} (${icon.sizes}, ${icon.type}, purpose: ${purposeOk})`);

          // Verificar que cada icono del manifest se descargue OK
          const iconFullUrl = new URL(icon.src, APP_URL).href;
          try {
            const iconResp = await page.evaluate(async (u) => {
              const res = await fetch(u);
              return { status: res.status, size: res.headers.get('content-length'), type: res.headers.get('content-type') };
            }, iconFullUrl);
            if (iconResp.status === 200) {
              console.log(`        → HTTP 200 (${iconResp.type}, ${iconResp.size || '?'}B) ✅`);
              assetsOk++;
            } else {
              console.log(`        → HTTP ${iconResp.status} ❌`);
            }
          } catch (e2) {
            console.log(`        → Error: ${e2.message} ❌`);
          }
        }
      } else {
        console.log('  ⚠️  Sin iconos en el manifest');
      }
    } catch (e) {
      console.log(`  ❌ Error al obtener manifest: ${e.message}`);
    }
  } else {
    console.log('  ❌ NO SE ENCONTRÓ LINK AL MANIFEST');
  }

  // ── Verificar OG Image dimensiones ───────────────────────
  console.log('\n🖼️  OG IMAGE');
  try {
    const ogData = await page.evaluate(async () => {
      const res = await fetch('/og-image.jpg');
      if (!res.ok) return { status: res.status, error: 'HTTP error' };
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve({ status: res.status, width: img.naturalWidth, height: img.naturalHeight, type: blob.type, size: blob.size });
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({ status: res.status, error: 'Image decode failed' });
        };
        img.src = url;
      });
    });
    if (ogData.width === 1200 && ogData.height === 630) {
      console.log(`  ✅ /og-image.jpg → ${ogData.width}×${ogData.height} (${ogData.type}, ${(ogData.size / 1024).toFixed(1)} KB)`);
    } else if (ogData.error) {
      console.log(`  ❌ /og-image.jpg: ${ogData.error}`);
    } else {
      console.log(`  ⚠️  /og-image.jpg → ${ogData.width}×${ogData.height} (esperado 1200×630)`);
    }
  } catch (e) {
    console.log(`  ❌ /og-image.jpg: ${e.message}`);
  }

  // ── Service worker ───────────────────────────────────────
  console.log('\n⚙️  SERVICE WORKER');
  try {
    const swRegs = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { supported: false };
      const regs = await navigator.serviceWorker.getRegistrations();
      return {
        supported: true,
        count: regs.length,
        registrations: regs.map(r => ({
          scriptURL: r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || null,
          state: r.active ? 'active' : r.installing ? 'installing' : r.waiting ? 'waiting' : 'unknown',
        })),
      };
    });

    if (!swRegs.supported) {
      console.log('  ⚠️  Service Worker no soportado en este navegador');
    } else if (swRegs.count === 0) {
      console.log('  ⚠️  No hay Service Workers registrados (puede requerir build de producción + reload)');
    } else {
      for (const sw of swRegs.registrations) {
        const icon = sw.state === 'active' ? '✅' : '⏳';
        console.log(`  ${icon} SW: ${sw.scriptURL || 'sin URL'} [${sw.state}]`);
      }
    }
  } catch (e) {
    console.log(`  ⚠️  Error SW: ${e.message}`);
  }

  // ── Console errors (post-carga) ─────────────────────────
  console.log('\n🚫 CONSOLE ERRORS');
  // Pequeña espera para capturar errores tardíos
  await page.waitForTimeout(1500);
  if (consoleErrors.length === 0) {
    console.log('  ✅ Sin errores de consola (incluyendo carga inicial)');
  } else {
    console.log(`  ⚠️  ${consoleErrors.length} error(es) en consola:`);
    consoleErrors.forEach(e => console.log(`     ❌ ${e.text}`));
  }

  // ── Resumen ─────────────────────────────────────────────
  const totalAssetChecks = responses.filter(r => r.status === 200).length;

  console.log(`\n${'═'.repeat(55)}`);
  console.log('📊 RESUMEN PWA & ICONS');
  console.log(`${'═'.repeat(55)}`);
  console.log(`  Meta tags:    ${metaTagsOk}/${checks.length} encontrados ✅`);
  console.log(`  Assets HTTP:  ${totalAssetChecks} assets servidos correctamente`);
  console.log(`  Manifest:     ${manifestLink ? '✅ Presente y verificado' : '❌ Ausente'}`);
  console.log(`  Console:      ${consoleErrors.length === 0 ? '✅ Sin errores' : `⚠️ ${consoleErrors.length} errores`}`);
  console.log(`${'═'.repeat(55)}`);

  console.log('\n✅ Audit completo.');
  await browser.close();
}

run().catch(err => {
  console.error('\n❌ FATAL:', err);
  process.exit(1);
});
