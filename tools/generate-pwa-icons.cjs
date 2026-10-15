const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.resolve(__dirname, '..', 'public');

const iconDefs = [
  // favicon variants (PNG - browser standard)
  { src: 'favicon.svg', sizes: [16, 32, 48], name: (s) => s === 32 ? 'favicon' : `favicon-${s}x${s}` },
  // apple-touch-icon (180x180 iOS standard)
  { src: 'pwa-512x512.svg', sizes: [180], name: () => 'apple-touch-icon' },
  // PWA standard sizes
  { src: 'pwa-192x192.svg', sizes: [192], name: () => 'pwa-192x192' },
  { src: 'pwa-512x512.svg', sizes: [512], name: () => 'pwa-512x512' },
];

async function main() {
  console.log('🔨 Generating PWA icons from SVGs...\n');

  for (const def of iconDefs) {
    const svgPath = path.join(PUBLIC, def.src);
    if (!fs.existsSync(svgPath)) {
      console.warn(`  ⚠️  Source not found: ${def.src} — skipping`);
      continue;
    }

    for (const size of def.sizes) {
      const outName = def.name(size);
      const ext = outName.endsWith('.ico') ? '' : '.png';
      const outPath = path.join(PUBLIC, `${outName}${ext}`);

      try {
        const svgBuffer = fs.readFileSync(svgPath);
        await sharp(svgBuffer)
          .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toFile(outPath);
        console.log(`  ✅ ${outName}${ext} (${size}x${size})`);
      } catch (err) {
        console.error(`  ❌ ${outName}${ext}: ${err.message}`);
      }
    }
  }

  // Generate multi-size favicon.ico from the 32x32 PNG
  // (ICO not easily doable with sharp alone — we use a 32x32 PNG as favicon,
  // which all modern browsers support. The .ico filename is kept for legacy.)
  try {
    const src32 = path.join(PUBLIC, 'favicon.png');
    if (fs.existsSync(src32)) {
      // Copy as favicon.ico (browsers auto-detect PNG content in .ico)
      fs.copyFileSync(src32, path.join(PUBLIC, 'favicon.ico'));
      console.log('  ✅ favicon.ico (32x32 PNG wrapped — compatible with all browsers)');
    }
  } catch (err) {
    console.error(`  ❌ favicon.ico: ${err.message}`);
  }

  // Clean up intermediate files (keep only the 32x32 as favicon.png)
  try {
    const toRemove = ['favicon-16x16.png', 'favicon-48x48.png'];
    for (const f of toRemove) {
      const p = path.join(PUBLIC, f);
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        console.log(`  🗑️  Cleaned up intermediate: ${f}`);
      }
    }
  } catch (err) {
    // ignore
  }

  console.log('\n✨ Done! Generated icons are in public/');
}

main().catch(console.error);
