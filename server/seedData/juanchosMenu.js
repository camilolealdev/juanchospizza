// Carta real de Juancho's Pizza -- fuente de verdad única para el sitio
// público (MenuDigital.tsx, index.html) y la CRM (MenuInteligente.tsx),
// ambos leen /api/products, /api/categories, /api/ingredients y
// /api/pizza-sizes en vez de tener datos hardcodeados por separado.
//
// Usado por POST /api/seed (server/routes/misc.js). Todos los ids son
// deterministas para que re-sembrar sea un upsert idempotente, no una
// duplicación.

const COMBINING_DIACRITICS = new RegExp(
  '[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']',
  'g'
);

function slug(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '') // strip accents (NFD decomposes é -> e + combining mark)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const CATEGORIES = [
  { id: 'pizzas', name: 'Pizza', icon: 'pizza-slice', color: 'text-orange-500' },
  { id: 'hamburguesas', name: 'Hamburguesas', icon: 'burger', color: 'text-amber-600' },
  { id: 'pastas', name: 'Lasagnas & Spaghettis', icon: 'bowl-food', color: 'text-yellow-600' },
  { id: 'calientes', name: 'Salchipapas & Perros calientes', icon: 'hotdog', color: 'text-red-500' },
  { id: 'especiales', name: 'Especiales', icon: 'star', color: 'text-purple-500' },
  { id: 'adicionales', name: 'Adicionales', icon: 'plus', color: 'text-stone-500' },
  { id: 'bebidas', name: 'Bebidas', icon: 'wine-glass', color: 'text-cyan-500' },
];
// { id, categoryId, subcategory, nombre, descripcion, basePrice, type, image,
//   vegetariano, comboPrice? } -- comboPrice se traduce a una menu_variant
// "Combo" (delta) en el seed, no es columna real de products.
export const PRODUCTS = [
  // ── Pizza (13 sabores fijos, precio = tamaño Small; el resto de tamaños
  //    sale de pizza_sizes) ──────────────────────────────────────────
  {
    id: 'pz-hawaiana',
    categoryId: 'pizzas',
    nombre: 'Hawaiana',
    descripcion: 'Piña, Jamón',
    basePrice: 30000,
    type: 'tradicional',
  },
  {
    id: 'pz-pollo-champinones',
    categoryId: 'pizzas',
    nombre: 'Pollo y champiñones',
    descripcion: 'Jamón, Champiñones, Pollo desmechado',
    basePrice: 30000,
    type: 'tradicional',
  },
  {
    id: 'pz-carnes',
    categoryId: 'pizzas',
    nombre: 'Carnes',
    descripcion: 'Jamón, Salami, Cabano',
    basePrice: 30000,
    type: 'tradicional',
  },
  {
    id: 'pz-costillitas-bbq',
    categoryId: 'pizzas',
    nombre: 'Costillitas BBQ',
    descripcion: 'Jamón, Costillas BBQ, Maíz tierno',
    basePrice: 30000,
    type: 'tradicional',
  },
  {
    id: 'pz-criolla',
    categoryId: 'pizzas',
    nombre: 'Criolla',
    descripcion: 'Carne desmechada, Maíz tierno',
    basePrice: 30000,
    type: 'tradicional',
  },
  {
    id: 'pz-mexicana',
    categoryId: 'pizzas',
    nombre: 'Mexicana',
    descripcion: 'Carne molida, Maíz tierno, Tomate, Cilantro, Tostacos',
    basePrice: 30000,
    type: 'tradicional',
  },
  {
    id: 'pz-ranchera',
    categoryId: 'pizzas',
    nombre: 'Ranchera',
    descripcion: 'Champiñones, Cebolla, Maíz tierno, Chorizo',
    basePrice: 30000,
    type: 'tradicional',
  },
  {
    id: 'pz-de-la-casa',
    categoryId: 'pizzas',
    nombre: 'De la casa',
    descripcion: 'Champiñones, Cebolla, Carne desmechada',
    basePrice: 30000,
    type: 'tradicional',
  },
  {
    id: 'pz-espanola',
    categoryId: 'pizzas',
    nombre: 'Española',
    descripcion: 'Espinaca, Tocineta, Maíz tierno, Champiñón',
    basePrice: 30000,
    type: 'tradicional',
  },
  {
    id: 'pz-napolitana',
    categoryId: 'pizzas',
    nombre: 'Napolitana',
    descripcion: 'Tomate, Orégano',
    basePrice: 30000,
    type: 'tradicional',
  },
  {
    id: 'pz-vegetariana',
    categoryId: 'pizzas',
    nombre: 'Vegetariana',
    descripcion: 'Champiñón, Maíz tierno, Cebolla',
    basePrice: 30000,
    type: 'tradicional',
    vegetariano: true,
  },
  {
    id: 'pz-tropical',
    categoryId: 'pizzas',
    nombre: 'Tropical',
    descripcion: 'Cerezas, Piña, Duraznos, Uvas pasas',
    basePrice: 30000,
    type: 'tradicional',
    vegetariano: true,
  },
  {
    id: 'pz-queso-bocadillo',
    categoryId: 'pizzas',
    nombre: 'Queso y bocadillo',
    descripcion: 'Queso y bocadillo',
    basePrice: 30000,
    type: 'tradicional',
    vegetariano: true,
  },
  {
    id: 'pz-porcion',
    categoryId: 'pizzas',
    subcategory: 'Porción',
    nombre: 'Porción individual',
    descripcion: 'Porción individual de pizza',
    basePrice: 9200,
    type: 'tradicional',
  },

  // ── Hamburguesas (3 tiers) ───────────────────────────────────────
  {
    id: 'ham-plancha-sencilla',
    categoryId: 'hamburguesas',
    subcategory: 'A la plancha',
    nombre: 'Hamburguesa sencilla',
    descripcion: 'Tomate, lechuga, cebolla, queso, pan',
    basePrice: 17500,
    comboPrice: 25500,
    type: 'tradicional',
  },
  {
    id: 'ham-plancha-especial',
    categoryId: 'hamburguesas',
    subcategory: 'A la plancha',
    nombre: 'Hamburguesa especial',
    descripcion: 'Tomate, lechuga, cebolla, queso, pan, champiñones, pollo, salsas showy',
    basePrice: 18000,
    comboPrice: 26500,
    type: 'tradicional',
  },
  {
    id: 'ham-plancha-sencilla-doble',
    categoryId: 'hamburguesas',
    subcategory: 'A la plancha',
    nombre: 'Sencilla doble carne',
    descripcion: 'Tomate, lechuga, cebolla, queso, pan, champiñones, pollo, salsas showy',
    basePrice: 21500,
    comboPrice: 28000,
    type: 'tradicional',
  },
  {
    id: 'ham-plancha-especial-doble',
    categoryId: 'hamburguesas',
    subcategory: 'A la plancha',
    nombre: 'Especial doble carne',
    descripcion: 'Tomate, lechuga, cebolla, queso, pan, champiñones, pollo, salsas showy',
    basePrice: 22000,
    comboPrice: 29000,
    type: 'tradicional',
  },
  {
    id: 'ham-apanada-sencilla',
    categoryId: 'hamburguesas',
    subcategory: 'Apanadas',
    nombre: 'Sencilla apanada',
    descripcion: 'Tomate, lechuga, cebolla, queso, pan',
    basePrice: 20000,
    comboPrice: 27000,
    type: 'tradicional',
  },
  {
    id: 'ham-apanada-especial',
    categoryId: 'hamburguesas',
    subcategory: 'Apanadas',
    nombre: 'Especial apanada',
    descripcion: 'Tomate, lechuga, cebolla, queso, pan',
    basePrice: 21000,
    comboPrice: 28000,
    type: 'tradicional',
  },
  {
    id: 'ham-apanada-2carnes',
    categoryId: 'hamburguesas',
    subcategory: 'Apanadas',
    nombre: 'Especial apanada 2 carnes',
    descripcion: 'Tomate, lechuga, cebolla, queso, pan, champiñones, pollo',
    basePrice: 22000,
    comboPrice: 28500,
    type: 'tradicional',
  },
  {
    id: 'ham-apanada-tocineta',
    categoryId: 'hamburguesas',
    subcategory: 'Apanadas',
    nombre: 'Especial apanada tocineta',
    descripcion: 'Tomate, lechuga, cebolla, queso, pan, pollo, champiñones',
    basePrice: 22000,
    comboPrice: 29000,
    type: 'tradicional',
  },
  {
    id: 'ham-apanada-mixta',
    categoryId: 'hamburguesas',
    subcategory: 'Apanadas',
    nombre: 'Especial mixta',
    descripcion: 'Tomate, lechuga, cebolla, queso, pan, pollo, champiñones, carne de res y de pollo',
    basePrice: 23500,
    comboPrice: 30000,
    type: 'tradicional',
  },
  {
    id: 'ham-casa-sencilla',
    categoryId: 'hamburguesas',
    subcategory: 'De la casa',
    nombre: 'Sencilla de la casa',
    descripcion: 'Tomate, lechuga, cebolla, queso, pan, carne',
    basePrice: 17000,
    comboPrice: 25000,
    type: 'tradicional',
  },
  {
    id: 'ham-casa-especial',
    categoryId: 'hamburguesas',
    subcategory: 'De la casa',
    nombre: 'Especial de la casa',
    descripcion: 'Tomate, lechuga, cebolla, queso, pan, carne, champiñones, pollo, maíz, chorizo, carne desmechada',
    basePrice: 18000,
    comboPrice: 26000,
    type: 'tradicional',
  },

  // ── Pastas (mismo precio en lasagna o spaghetti) ────────────────
  {
    id: 'pasta-champinones',
    categoryId: 'pastas',
    nombre: 'Champiñones',
    descripcion:
      'Salsa boloñesa, pasta, champiñones, queso, pan tajado. Disponible en lasagna o spaghetti, mismo precio.',
    basePrice: 19000,
    type: 'tradicional',
    vegetariano: true,
  },
  {
    id: 'pasta-mixta',
    categoryId: 'pastas',
    nombre: 'Mixta',
    descripcion:
      'Salsa boloñesa, pasta, champiñón, pollo, jamón, queso, pan tajado. Disponible en lasagna o spaghetti, mismo precio.',
    basePrice: 21000,
    type: 'tradicional',
  },
  {
    id: 'pasta-pollo',
    categoryId: 'pastas',
    nombre: 'Pollo',
    descripcion: 'Salsa boloñesa, pasta, pollo, queso, pan tajado. Disponible en lasagna o spaghetti, mismo precio.',
    basePrice: 23000,
    type: 'tradicional',
  },
  {
    id: 'pasta-jamon',
    categoryId: 'pastas',
    nombre: 'Jamón',
    descripcion: 'Salsa boloñesa, pasta, jamón, queso, pan tajado. Disponible en lasagna o spaghetti, mismo precio.',
    basePrice: 23500,
    type: 'tradicional',
  },

  // ── Salchipapas & perros calientes ───────────────────────────────
  {
    id: 'salchi-sencilla',
    categoryId: 'calientes',
    subcategory: 'Salchipapas',
    nombre: 'Sencilla',
    descripcion: 'Papa francesa, chorizo, salchicha, queso, salami',
    basePrice: 16000,
    type: 'tradicional',
  },
  {
    id: 'salchi-americana',
    categoryId: 'calientes',
    subcategory: 'Salchipapas',
    nombre: 'Americana',
    descripcion: 'Papa francesa, chorizo, salchicha americana, queso, costillas de cerdo',
    basePrice: 17000,
    type: 'tradicional',
  },
  {
    id: 'salchi-super-especial',
    categoryId: 'calientes',
    subcategory: 'Salchipapas',
    nombre: 'Súper especial',
    descripcion: 'Papa francesa, chorizo, salchicha americana, champiñón, pollo, queso, costillas de cerdo',
    basePrice: 20000,
    type: 'tradicional',
  },
  {
    id: 'perro-sencillo',
    categoryId: 'calientes',
    subcategory: 'Perros calientes',
    nombre: 'Sencillo',
    descripcion: 'Pan, salchicha, queso, salsas, papa en fósforos',
    basePrice: 15500,
    comboPrice: 22000,
    type: 'tradicional',
  },
  {
    id: 'perro-americano',
    categoryId: 'calientes',
    subcategory: 'Perros calientes',
    nombre: 'Americano',
    descripcion: 'Pan, salchicha americana, queso, salsas, papa en fósforos, cebolla y piña en trozos',
    basePrice: 16500,
    comboPrice: 24000,
    type: 'tradicional',
  },
  {
    id: 'perro-super-especial',
    categoryId: 'calientes',
    subcategory: 'Perros calientes',
    nombre: 'Súper especial',
    descripcion: 'Cebolla, piña en trozos, champiñón y pollo',
    basePrice: 18000,
    comboPrice: 25000,
    type: 'tradicional',
  },

  // ── Especiales ────────────────────────────────────────────────────
  {
    id: 'esp-mazorcada',
    categoryId: 'especiales',
    nombre: 'Mazorcada',
    descripcion: 'Champiñones, pollo, carne desmechada, maíz, chorizo, queso + francesa',
    basePrice: 27000,
    type: 'tradicional',
  },
  {
    id: 'esp-pechuga-gratinada',
    categoryId: 'especiales',
    nombre: 'Pechuga gratinada',
    descripcion: 'Queso, francesas, ensalada, arepa',
    basePrice: 28000,
    type: 'tradicional',
  },
  {
    id: 'esp-pechuga-rancho',
    categoryId: 'especiales',
    nombre: 'Pechuga al rancho',
    descripcion: 'Champiñones, pollo, carne desmechada, maíz, chorizo, queso + francesa',
    basePrice: 31000,
    type: 'tradicional',
  },
  {
    id: 'esp-churrasco',
    categoryId: 'especiales',
    nombre: 'Churrasco',
    descripcion: 'Carne 350 gramos, francesa, ensalada, arepa',
    basePrice: 29000,
    type: 'tradicional',
  },
  {
    id: 'esp-costillitas-bbq',
    categoryId: 'especiales',
    nombre: 'Costillitas BBQ',
    descripcion: 'Costilla 350 gramos, francesa, ensalada, arepa',
    basePrice: 29000,
    type: 'tradicional',
  },

  // ── Adicionales (sección propia del menú -- ingrediente extra en
  //    cualquier plato + porciones de papa sueltas) ────────────────
  {
    id: 'add-ingrediente',
    categoryId: 'adicionales',
    nombre: 'Adicional de ingrediente',
    descripcion:
      'Súmale un ingrediente extra a cualquier plato del menú: pizza / hamburguesa / salchipapa / perro caliente',
    basePrice: 3500,
    type: 'entrada',
    vegetariano: true,
  },
  {
    id: 'add-francesa',
    categoryId: 'adicionales',
    nombre: 'Porción de francesa',
    descripcion: 'Porción de papa francesa sola -- para acompañar o compartir',
    basePrice: 7000,
    type: 'entrada',
    vegetariano: true,
  },
  {
    id: 'add-criolla',
    categoryId: 'adicionales',
    nombre: 'Porción de criolla',
    descripcion: 'Porción de papa criolla sola -- para acompañar o compartir',
    basePrice: 7000,
    type: 'entrada',
    vegetariano: true,
  },

  // ── Bebidas ──────────────────────────────────────────────────────
  {
    id: 'beb-jugo-agua',
    categoryId: 'bebidas',
    subcategory: 'Jugos naturales',
    nombre: 'Jugo natural con agua',
    descripcion: 'Jugo natural preparado con agua',
    basePrice: 6000,
    type: 'bebida',
    vegetariano: true,
  },
  {
    id: 'beb-jugo-leche',
    categoryId: 'bebidas',
    subcategory: 'Jugos naturales',
    nombre: 'Jugo natural con leche',
    descripcion: 'Jugo natural preparado con leche',
    basePrice: 7000,
    type: 'bebida',
    vegetariano: true,
  },
  {
    id: 'beb-agua-pequena',
    categoryId: 'bebidas',
    subcategory: 'Botella de agua',
    nombre: 'Agua pequeña',
    descripcion: 'Botella de agua pequeña',
    basePrice: 2000,
    type: 'bebida',
    vegetariano: true,
  },
  {
    id: 'beb-agua-grande',
    categoryId: 'bebidas',
    subcategory: 'Botella de agua',
    nombre: 'Agua grande',
    descripcion: 'Botella de agua grande',
    basePrice: 3000,
    type: 'bebida',
    vegetariano: true,
  },
  {
    id: 'beb-agua-bretana',
    categoryId: 'bebidas',
    subcategory: 'Botella de agua',
    nombre: 'Agua Bretaña',
    descripcion: 'Botella de agua Bretaña',
    basePrice: 3500,
    type: 'bebida',
    vegetariano: true,
  },
  {
    id: 'beb-cocacola-15l',
    categoryId: 'bebidas',
    subcategory: 'Gaseosas',
    nombre: 'Coca-Cola 1.5L',
    descripcion: 'Gaseosa Coca-Cola 1.5 litros',
    basePrice: 8500,
    type: 'bebida',
    vegetariano: true,
  },
  {
    id: 'beb-postobon-15l',
    categoryId: 'bebidas',
    subcategory: 'Gaseosas',
    nombre: 'Postobón 1.5L',
    descripcion: 'Gaseosa Postobón 1.5 litros',
    basePrice: 7500,
    type: 'bebida',
    vegetariano: true,
  },
  {
    id: 'beb-gaseosa-350',
    categoryId: 'bebidas',
    subcategory: 'Gaseosas',
    nombre: 'Gaseosa 350 ml',
    descripcion: 'Gaseosa personal 350 ml',
    basePrice: 3800,
    type: 'bebida',
    vegetariano: true,
  },
  {
    id: 'beb-gaseosa-500',
    categoryId: 'bebidas',
    subcategory: 'Gaseosas',
    nombre: 'Gaseosa 500 ml',
    descripcion: 'Gaseosa personal 500 ml',
    basePrice: 4000,
    type: 'bebida',
    vegetariano: true,
  },
  {
    id: 'beb-gaseosa-250-vidrio',
    categoryId: 'bebidas',
    subcategory: 'Gaseosas',
    nombre: 'Gaseosa 250 ml (vidrio)',
    descripcion: 'Gaseosa en botella de vidrio 250 ml',
    basePrice: 2800,
    type: 'bebida',
    vegetariano: true,
  },
  {
    id: 'beb-gaseosa-250-plastica',
    categoryId: 'bebidas',
    subcategory: 'Gaseosas',
    nombre: 'Gaseosa 250 ml (plástica)',
    descripcion: 'Gaseosa en botella plástica 250 ml',
    basePrice: 2800,
    type: 'bebida',
    vegetariano: true,
  },
];

// Tamaños del menú de pizza (sabores fijos y armador "Crea tu pizza").
// incluidos = # de sabores fijos que trae el tamaño, o # de ingredientes
// libres del armador -- el mismo número cubre ambos casos en esta carta.
export const PIZZA_SIZES = [
  { id: 'small', nombre: 'Small', precio: 30000, incluidos: 1, porciones: 4 },
  { id: 'junior', nombre: 'Junior', precio: 42000, incluidos: 2, porciones: 6 },
  { id: 'mediana', nombre: 'Mediana', precio: 52000, incluidos: 2, porciones: 8 },
  { id: 'familiar', nombre: 'Familiar', precio: 88000, incluidos: 3, porciones: 10 },
];

// Ingredientes del armador "Crea tu pizza" -- precio_extra es el cobro plano
// por ingrediente que exceda los "incluidos" del tamaño elegido ($3.500,
// igual al pill "Adicionales" del menú fijo).
const EXTRA_INGREDIENTE_PRECIO = 3500;
const buildIngredient = (id, nombre, categoria, extra = {}) => ({
  id,
  nombre,
  descripcion: '',
  precio_extra: EXTRA_INGREDIENTE_PRECIO,
  categoria,
  vegetariano: categoria !== 'carne',
  vegano: categoria === 'fruta' || categoria === 'vegetal',
  premium: false,
  dulce: categoria === 'fruta',
  disponible: true,
  defaultIng: false,
  ...extra,
});

export const INGREDIENTS = [
  ...[
    'Jamón',
    'Pollo desmechado',
    'Carne desmechada',
    'Carne molida',
    'Salami',
    'Cabano',
    'Costillas BBQ',
    'Chorizo',
    'Tocineta',
  ].map((nombre) => buildIngredient(`ing-${slug(nombre)}`, nombre, 'carne')),
  ...['Champiñones', 'Cebolla', 'Maíz tierno', 'Tomate', 'Cilantro', 'Espinaca', 'Orégano'].map((nombre) =>
    buildIngredient(`ing-${slug(nombre)}`, nombre, 'vegetal')
  ),
  ...['Piña', 'Cerezas', 'Duraznos', 'Uvas pasas'].map((nombre) =>
    buildIngredient(`ing-${slug(nombre)}`, nombre, 'fruta')
  ),
  ...['Tostacos', 'Queso extra', 'Bocadillo'].map((nombre) => buildIngredient(`ing-${slug(nombre)}`, nombre, 'extra')),
];
