import { type MenuItem } from './menu-data';

// ─── HELADERÍA — POSTRES & HELADOS ──────────────────────────────────────────
// Fuente: menú detallado de la heladería asociada.
// Horario: 11:00 a.m. – 8:00 p.m. (todos los días)
// Servicio a domicilio disponible por WhatsApp (mismos teléfonos que Juancho's Pizza).
//
// ⚠️ PLACEHOLDER — El teléfono de la heladería de origen debe confirmarse
// con el cliente antes de publicar si se decide mostrar un contacto propio.
// Por defecto se usan los teléfonos ya validados de Juancho's Pizza.

export const SUBCATEGORIES = [
  { id: 'helados', name: 'Helados', icon: '🍦', accent: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
  { id: 'waffles', name: 'Waffles', icon: '🧇', accent: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: 'especiales-postre', name: 'Especiales', icon: '✨', accent: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-200' },
  { id: 'ensaladas-fruta', name: 'Ensaladas de Fruta', icon: '🥗', accent: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'malteadas', name: 'Malteadas', icon: '🥤', accent: 'text-rose-400', bg: 'bg-rose-50', border: 'border-rose-200' },
  { id: 'canastas', name: 'Canastas', icon: '🧺', accent: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'fresas-crema', name: 'Fresas con Crema', icon: '🍓', accent: 'text-red-400', bg: 'bg-red-50', border: 'border-red-200' },
  { id: 'obleas-merengues', name: 'Obleas y Merengues', icon: '🥞', accent: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
] as const;

export type Subcategory = (typeof SUBCATEGORIES)[number]['id'];

export interface PostreItem extends MenuItem {
  subcat: Subcategory;
  variants?: { label: string; price: number }[];
}

// ─── HELADOS (en cono) ───────────────────────────────────────────────────────

const HELADOS: PostreItem[] = [
  {
    id: 'hel-sencillo',
    subcat: 'helados',
    category: 'postres',
    name: 'Helado Sencillo',
    description: 'Cono, 1 helado, salsa, 1 topping',
    price: 3000,
    image: '/images/menu/hel-sencillo.webp',
  },
  {
    id: 'hel-doble',
    subcat: 'helados',
    category: 'postres',
    name: 'Helado Doble',
    description: 'Cono, 2 helados, salsa, 1 topping',
    price: 5000,
    image: '/images/menu/hel-doble.webp',
  },
  {
    id: 'hel-triple',
    subcat: 'helados',
    category: 'postres',
    name: 'Helado Triple',
    description: 'Cono, 3 helados, salsa, 1 topping premium',
    price: 7500,
    image: '/images/menu/hel-triple.webp',
  },
];

// ─── WAFFLES ─────────────────────────────────────────────────────────────────

const WAFFLES: PostreItem[] = [
  {
    id: 'waf-sencillo',
    subcat: 'waffles',
    category: 'postres',
    name: 'Waffle Sencillo',
    description: '2 frutas a elección, queso, crema, 1 helado',
    price: 12500,
    image: '/images/menu/waf-sencillo.webp',
  },
  {
    id: 'waf-achocolatado',
    subcat: 'waffles',
    category: 'postres',
    name: 'Waffle Achocolatado',
    description: '2 frutas a elección, base de nutella, crema, queso, chantilly, 1 helado, decoración',
    price: 15500,
    image: '/images/menu/waf-achocolatado.webp',
  },
];

// ─── ESPECIALES (postres) ────────────────────────────────────────────────────

const ESPECIALES_POSTRE: PostreItem[] = [
  {
    id: 'esp-banana-split',
    subcat: 'especiales-postre',
    category: 'postres',
    name: 'Banana Split',
    description: '2 helados, banano, 2 frutas a elección',
    price: 14000,
    image: '/images/menu/esp-banana-split.webp',
  },
];

// ─── ENSALADAS DE FRUTA ──────────────────────────────────────────────────────

const ENSALADAS_FRUTA: PostreItem[] = [
  {
    id: 'ens-junior',
    subcat: 'ensaladas-fruta',
    category: 'postres',
    name: 'Ensalada Junior',
    description: 'Picado de fruta, crema, queso, 1 mini bola de helado',
    price: 10000,
    image: '/images/menu/ens-junior.webp',
  },
  {
    id: 'ens-sencilla',
    subcat: 'ensaladas-fruta',
    category: 'postres',
    name: 'Ensalada Sencilla',
    description: 'Picado de fruta, crema, queso, 1 bola de helado',
    price: 12000,
    image: '/images/menu/ens-sencilla.webp',
  },
  {
    id: 'ens-mixta',
    subcat: 'ensaladas-fruta',
    category: 'postres',
    name: 'Ensalada Mixta',
    description: 'Picado de fruta, crema, queso, 2 bolas de helado',
    price: 16000,
    image: '/images/menu/ens-mixta.webp',
  },
  {
    id: 'ens-mega',
    subcat: 'ensaladas-fruta',
    category: 'postres',
    name: 'Ensalada Mega',
    description: 'Picado de fruta, queso, crema, 3 bolas de helado + 1 topping',
    price: 23000,
    image: '/images/menu/ens-mega.webp',
  },
];

// ─── MALTEADAS ───────────────────────────────────────────────────────────────

const MALTEADAS: PostreItem[] = [
  {
    id: 'malt-clasica',
    subcat: 'malteadas',
    category: 'postres',
    name: 'Malteada',
    description: 'Helado a elección, decoración',
    price: 14000,
    image: '/images/menu/malt-clasica.webp',
  },
];

// ─── CANASTAS ────────────────────────────────────────────────────────────────

const CANASTAS: PostreItem[] = [
  {
    id: 'can-tradicional',
    subcat: 'canastas',
    category: 'postres',
    name: 'Canasta Tradicional',
    description: 'Tres bolas de helado, crema, queso y decoración',
    price: 9000,
    image: '/images/menu/can-tradicional.webp',
  },
  {
    id: 'can-chococanasta',
    subcat: 'canastas',
    category: 'postres',
    name: 'Chococanasta',
    description: '2 bolas de helado, crema, queso, salsa de chocolate, maní, chocolate rayado',
    price: 10500,
    image: '/images/menu/can-chococanasta.webp',
  },
];

// ─── FRESAS CON CREMA ────────────────────────────────────────────────────────

const FRESAS_CREAMA: PostreItem[] = [
  {
    id: 'fre-sencillas',
    subcat: 'fresas-crema',
    category: 'postres',
    name: 'Fresas Sencillas',
    description: 'Fresas, crema de la casa, nutella + 1 topping',
    price: 8000,
    image: '/images/menu/fre-sencillas.webp',
  },
  {
    id: 'fre-biscolatta',
    subcat: 'fresas-crema',
    category: 'postres',
    name: 'Fresas Biscolatta',
    description: 'Fresas, crema de la casa, cereal/biscolata, queso',
    price: 10000,
    image: '/images/menu/fre-biscolatta.webp',
    variants: [
      { label: 'Sencilla', price: 10000 },
      { label: 'Mega', price: 12000 },
    ],
  },
];

// ─── OBLEAS Y MERENGUES ──────────────────────────────────────────────────────

const OBLEAS_MERENGUES: PostreItem[] = [
  {
    id: 'mer-juancho',
    subcat: 'obleas-merengues',
    category: 'postres',
    name: 'Merengue Juancho',
    description: 'Merengue, fruta a elección, queso, salsa de caramelo y decoración',
    price: 15000,
    image: '/images/menu/mer-juancho.webp',
  },
  {
    id: 'oblea-tradicional',
    subcat: 'obleas-merengues',
    category: 'postres',
    name: 'Oblea Tradicional',
    description: 'Arequipe, queso',
    price: 3500,
    image: '/images/menu/oblea-tradicional.webp',
  },
  {
    id: 'oblea-especial',
    subcat: 'obleas-merengues',
    category: 'postres',
    name: 'Oblea Especial',
    description: 'Arequipe, queso, salsa a elección + 1 topping (fruta a elección)',
    price: 5500,
    image: '/images/menu/oblea-especial.webp',
  },
];

// ─── ALL POSTRES ─────────────────────────────────────────────────────────────

export const POSTRES_ITEMS: PostreItem[] = [
  ...HELADOS,
  ...WAFFLES,
  ...ESPECIALES_POSTRE,
  ...ENSALADAS_FRUTA,
  ...MALTEADAS,
  ...CANASTAS,
  ...FRESAS_CREAMA,
  ...OBLEAS_MERENGUES,
];

// ─── POSTRES IMAGE LOOKUP ────────────────────────────────────────────────────
// Each product now has a real image path. Fallback to pizza-1.webp if missing.

export function getPostreImage(_subcat: Subcategory, itemId: string): string {
  const item = POSTRES_ITEMS.find((p) => p.id === itemId);
  return item?.image || '/images/menu/pizza-1.webp';
}

// ─── SUBCATEGORY SEPARATOR COMPONENT HELPER ──────────────────────────────────

export function getSubcatName(subcatId: string): string {
  const found = SUBCATEGORIES.find((s) => s.id === subcatId);
  return found?.name ?? subcatId;
}

export function getSubcatIcon(subcatId: string): string {
  const found = SUBCATEGORIES.find((s) => s.id === subcatId);
  return found?.icon ?? '🍰';
}
