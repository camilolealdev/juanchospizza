// ══════════════════════════════════════════════════════════
//  Generate OG Image (1200×630 JPG) from SVG source
//  npm run generate-og  —or—  node tools/generate-og-image.mjs
// ══════════════════════════════════════════════════════════
import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'public', 'og-image.svg');
const outPath = resolve(root, 'public', 'og-image.jpg');

async function generate() {
  const svgContent = `<html><body style="margin:0;background:transparent;width:1200px;height:630px;">
    <img src="file://${svgPath}" width="1200" height="630" style="display:block"/>
  </body></html>`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

  await page.setContent(svgContent, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.screenshot({ path: outPath, fullPage: false, type: 'jpeg', quality: 92 });
  await browser.close();

  console.log('✅ OG image generated: public/og-image.jpg');
}

generate().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
