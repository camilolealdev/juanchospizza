// Genera un SVG de producto por cada ítem del menú (seed), reemplazando las
// fotos de Unsplash por ilustraciones locales propias. Cada imagen deriva de
// la categoría y los ingredientes reales de la descripción del producto, así
// que dos pizzas distintas se ven distintas (toppings diferentes) y el estilo
// es consistente con los SVGs legacy (pizza-default.svg / pizza-tradicional.svg).
//
// Uso:  node tools/generate-product-images.cjs
// Salida: public/assets/images/products/<product-id>.svg  (idempotente)
//
// Decisión (REVISION_6_FRENTES_2026-08-17, Opción B): quitar la dependencia
// de Unsplash (fotos de terceros que pueden romper/expirar) y servir
// ilustraciones propias servidas por Express desde public/.

/* eslint-disable @typescript-eslint/no-var-requires */
// Script de herramienta dev (CommonJS a propósito: corre con node directo).
const fs = require('fs');
const path = require('path');

// ── PRNG determinístico por id ─────────────────────────────────
// Misma semilla → misma imagen en cada corrida; así el repo no genera
// imágenes que cambian entre builds (diff limpio en git).
function seededRandom(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// ── Color por ingrediente (de la descripción del producto) ─────
const INGREDIENT_COLORS = {
  jamon: '#f2a0a0',
  jamón: '#f2a0a0',
  champinon: '#e8d8c8',
  champiñon: '#e8d8c8',
  champiñones: '#e8d8c8',
  champinones: '#e8d8c8',
  pollo: '#f5e6c8',
  'pollo desmechado': '#f5e6c8',
  carne: '#8b5a2b',
  'carne desmechada': '#8b5a2b',
  'carne molida': '#9c6b30',
  salami: '#d64541',
  cabano: '#c0392b',
  costillas: '#a04000',
  costilla: '#a04000',
  maiz: '#f9e79f',
  'maíz': '#f9e79f',
  'maíz tierno': '#f9e79f',
  tomate: '#e74c3c',
  cilantro: '#27ae60',
  tostacos: '#d68910',
  cebolla: '#f5f5f5',
  espinaca: '#52be80',
  oregano: '#196f3d',
  orégano: '#196f3d',
  cerezas: '#a93226',
  pina: '#f4d03f',
  piña: '#f4d03f',
  duraznos: '#f5b041',
  'uvas pasas': '#6e2c00',
  queso: '#f8c471',
  bocadillo: '#e74c3c',
  tocineta: '#e59866',
  huevo: '#fdfefe',
  lechuga: '#7dce82',
  pan: '#e0a96d',
  salchicha: '#d35400',
  'salchicha americana': '#c0392b',
  chorizo: '#a04000',
  'papa francesa': '#f0c060',
  francesas: '#f0c060',
  'papa en fósforos': '#f0c060',
  arepa: '#f5deb3',
  ensalada: '#7dce82',
  'salsa boloñesa': '#b03a2e',
  pasta: '#f2d28c',
  fideos: '#f2d28c',
  'pechuga gratinada': '#f5e6c8',
};

// Normaliza la descripción (sin acentos/ñ, minúsculas) y devuelve los
// colores de los ingredientes que matcheen. Los duplicados se descartan.
function ingredientColors(desc) {
  const norm = (desc || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const colors = [];
  for (const [name, color] of Object.entries(INGREDIENT_COLORS)) {
    const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (key && norm.includes(key)) colors.push(color);
  }
  return [...new Set(colors)];
}

// ── Helpers SVG ────────────────────────────────────────────────
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function label(name, y = 225) {
  const short = String(name).length > 24 ? String(name).slice(0, 23) + '…' : String(name);
  return `<text x="200" y="${y}" text-anchor="middle" fill="#f5deb3" font-size="15" font-family="Arial, sans-serif" font-weight="bold">${esc(short)}</text>`;
}

function toppings(colors, rng, count = 6, cx = 200, cy = 150, radius = 62) {
  let out = '';
  const n = colors.length ? count : 0;
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const r = rng() * radius * 0.85;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const size = 5 + rng() * 5;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" fill="${colors[i % colors.length]}" opacity="0.9"/>`;
  }
  return out;
}

// ── Compositores por categoría ─────────────────────────────────
function pizzaSvg({ id, nombre, desc }) {
  const rng = seededRandom(id);
  const colors = ingredientColors(desc);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect fill="#1a1a1a" width="400" height="300"/>
  <circle cx="200" cy="145" r="100" fill="#dcae73"/>
  <circle cx="200" cy="145" r="85" fill="#c9884a"/>
  <circle cx="200" cy="145" r="70" fill="#e74c3c" opacity="0.85"/>
  ${toppings(colors, rng, 7)}
  ${label(nombre)}
</svg>
`;
}

function burgerSvg({ id, nombre }) {
  const rng = seededRandom(id);
  const lettuce = ['#7dce82', '#5cb85c'][Math.floor(rng() * 2)];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect fill="#1a1a1a" width="400" height="300"/>
  <ellipse cx="200" cy="105" rx="110" ry="42" fill="#e0a96d"/>
  <ellipse cx="200" cy="98" rx="95" ry="30" fill="#f0c98a"/>
  <circle cx="140" cy="128" r="8" fill="#8b5a2b" opacity="0.7"/>
  <circle cx="260" cy="128" r="8" fill="#8b5a2b" opacity="0.7"/>
  <rect x="100" y="128" width="200" height="26" rx="10" fill="#8b5a2b"/>
  <rect x="100" y="140" width="200" height="10" fill="#f8c471"/>
  <path d="M95 148 Q150 165 200 148 Q250 165 305 148 L305 165 Q200 185 95 165 Z" fill="${lettuce}"/>
  <rect x="100" y="162" width="200" height="24" rx="10" fill="#e0a96d"/>
  ${label(nombre)}
</svg>
`;
}

function pastaSvg({ nombre }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect fill="#1a1a1a" width="400" height="300"/>
  <ellipse cx="200" cy="165" rx="105" ry="22" fill="#b03a2e"/>
  <ellipse cx="200" cy="145" rx="95" ry="70" fill="#f5f0e6"/>
  <ellipse cx="200" cy="145" rx="82" ry="58" fill="#f2d28c"/>
  <ellipse cx="200" cy="145" rx="78" ry="52" fill="#d9a85a"/>
  <circle cx="175" cy="130" r="5" fill="#f5e6c8"/>
  <circle cx="210" cy="150" r="5" fill="#f5e6c8"/>
  <circle cx="190" cy="162" r="5" fill="#f5e6c8"/>
  <circle cx="228" cy="132" r="5" fill="#f5e6c8"/>
  ${label(nombre)}
</svg>
`;
}

function hotDogSvg({ nombre }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect fill="#1a1a1a" width="400" height="300"/>
  <rect x="95" y="130" width="210" height="42" rx="20" fill="#e0a96d"/>
  <rect x="110" y="140" width="180" height="22" rx="11" fill="#d35400"/>
  <path d="M115 165 Q200 185 285 165" stroke="#f9e79f" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M120 172 Q200 192 280 172" stroke="#e74c3c" stroke-width="4" fill="none" stroke-linecap="round"/>
  ${label(nombre)}
</svg>
`;
}

function plateSvg({ id, nombre, desc, main }) {
  const rng = seededRandom(id);
  const colors = ingredientColors(desc).length ? ingredientColors(desc) : [main];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect fill="#1a1a1a" width="400" height="300"/>
  <circle cx="200" cy="160" r="95" fill="#e8e4da"/>
  <circle cx="200" cy="160" r="78" fill="#f7f4ec"/>
  ${toppings(colors, rng, 8, 200, 160, 60)}
  ${label(nombre)}
</svg>
`;
}

function friesSvg({ id, nombre }) {
  const rng = seededRandom(id);
  let sticks = '';
  for (let i = 0; i < 9; i++) {
    const x = 160 + i * 10 + (rng() - 0.5) * 6;
    const h = 55 + rng() * 25;
    const rot = (rng() - 0.5) * 30;
    sticks += `<rect x="${x.toFixed(1)}" y="${(185 - h).toFixed(1)}" width="9" height="${h.toFixed(1)}" rx="4" fill="#f0c060" transform="rotate(${rot.toFixed(1)} ${(x + 4).toFixed(1)} 185)"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect fill="#1a1a1a" width="400" height="300"/>
  <path d="M130 190 L160 120 L240 120 L270 190 Z" fill="#e74c3c"/>
  <path d="M140 190 L160 130 L240 130 L260 190 Z" fill="#c0392b"/>
  ${sticks}
  ${label(nombre)}
</svg>
`;
}

function drinkSvg({ nombre }) {
  const isBottle = /agua|bretaña|coca|postobón|gaseosa/.test(nombre);
  if (isBottle) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect fill="#1a1a1a" width="400" height="300"/>
  <rect x="175" y="90" width="50" height="20" rx="5" fill="#b0b0b0"/>
  <rect x="185" y="105" width="30" height="16" rx="3" fill="#8a8a8a"/>
  <path d="M180 121 L172 245 Q172 255 182 255 L218 255 Q228 255 228 245 L220 121 Z" fill="#1f6fb2"/>
  <rect x="172" y="180" width="56" height="26" rx="8" fill="#ffffff" opacity="0.25"/>
  ${label(nombre)}
</svg>
`;
  }
  // Vaso con pajilla (jugos)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect fill="#1a1a1a" width="400" height="300"/>
  <path d="M160 120 L172 255 Q173 262 182 262 L218 262 Q227 262 228 255 L240 120 Z" fill="#f39c12"/>
  <path d="M166 140 Q200 165 234 140 L230 160 Q200 185 170 160 Z" fill="#f5b041"/>
  <rect x="196" y="88" width="8" height="50" rx="4" fill="#e74c3c"/>
  <circle cx="192" cy="86" r="7" fill="#e74c3c"/>
  ${label(nombre)}
</svg>
`;
}

function ingredientAddonSvg({ nombre }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <rect fill="#1a1a1a" width="400" height="300"/>
  <circle cx="200" cy="160" r="90" fill="#e8e4da"/>
  <circle cx="200" cy="160" r="72" fill="#f7f4ec"/>
  <circle cx="185" cy="145" r="12" fill="#f2a0a0"/>
  <circle cx="215" cy="170" r="11" fill="#f9e79f"/>
  <circle cx="205" cy="140" r="10" fill="#52be80"/>
  <circle cx="190" cy="175" r="10" fill="#e8d8c8"/>
  ${label(nombre)}
</svg>
`;
}

// ── Dispatcher por categoría ───────────────────────────────────
function buildSvg(product) {
  switch (product.categoryId) {
    case 'pizzas':
      return pizzaSvg(product);
    case 'hamburguesas':
      return burgerSvg(product);
    case 'pastas':
      return pastaSvg(product);
    case 'calientes':
      // Perros → pan largo; salchipapas → plato
      if (product.id.startsWith('perro')) return hotDogSvg(product);
      return plateSvg({ ...product, desc: product.descripcion, main: '#d35400' });
    case 'especiales':
      return plateSvg({ ...product, desc: product.descripcion, main: '#8b5a2b' });
    case 'adicionales':
      return product.id === 'add-ingrediente' ? ingredientAddonSvg(product) : friesSvg(product);
    case 'bebidas':
      return drinkSvg(product);
    default:
      return plateSvg({ ...product, desc: product.descripcion, main: '#dcae73' });
  }
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  const seed = await import('../server/seedData/juanchosMenu.js');
  const outDir = path.resolve(__dirname, '../public/assets/images/products');
  fs.mkdirSync(outDir, { recursive: true });

  let written = 0;
  for (const p of seed.PRODUCTS) {
    const svg = buildSvg({ id: p.id, nombre: p.nombre, descripcion: p.descripcion, categoryId: p.categoryId });
    const file = path.join(outDir, `${p.id}.svg`);
    fs.writeFileSync(file, svg);
    written++;
  }
  console.log(`Generados ${written} SVGs en ${outDir}`);
}

main().catch((err) => {
  console.error('Error generando imágenes:', err);
  process.exit(1);
});
