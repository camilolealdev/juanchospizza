export type PizzaSize = 'familiar' | 'mediana' | 'junior' | 'small';

export interface PizzaSizeInfo {
  id: PizzaSize;
  label: string;
  portions: number;
  maxFlavors: number;
  price: number;
}

export interface PizzaFlavor {
  id: string;
  name: string;
  ingredients: string;
}

export interface MenuItem {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  priceCombo?: number;
  tags?: string[];
  image?: string;
  subcat?: string;
  variants?: { label: string; price: number }[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export const PIZZA_SIZES: PizzaSizeInfo[] = [
  { id: 'familiar', label: 'Familiar', portions: 10, maxFlavors: 3, price: 88000 },
  { id: 'mediana', label: 'Mediana', portions: 8, maxFlavors: 2, price: 52000 },
  { id: 'junior', label: 'Junior', portions: 6, maxFlavors: 2, price: 42000 },
  { id: 'small', label: 'Small', portions: 4, maxFlavors: 1, price: 30000 },
];

export const PIZZA_FLAVORS: PizzaFlavor[] = [
  { id: 'hawaiana', name: 'Hawaiana', ingredients: 'Piña, jamón' },
  { id: 'pollo-champinones', name: 'Pollo y Champiñones', ingredients: 'Jamón, champiñones, pollo desmechado' },
  { id: 'carnes', name: 'Carnes', ingredients: 'Jamón, salami, cabano' },
  { id: 'costillitas-bbq', name: 'Costillitas BBQ', ingredients: 'Jamón, costillas BBQ, maíz tierno' },
  { id: 'criolla', name: 'Criolla', ingredients: 'Carne desmechada, maíz tierno' },
  { id: 'mexicana', name: 'Mexicana', ingredients: 'Carne molida, maíz tierno, tomate, cilantro, tostacos' },
  { id: 'ranchera', name: 'Ranchera', ingredients: 'Champiñones, cebolla, maíz tierno, chorizo' },
  { id: 'de-la-casa', name: 'De la Casa', ingredients: 'Champiñones, cebolla, carne desmechada' },
  { id: 'espanola', name: 'Española', ingredients: 'Espinaca, tocineta, maíz tierno, champiñón' },
  { id: 'napolitana', name: 'Napolitana', ingredients: 'Tomate, orégano' },
  { id: 'vegetariana', name: 'Vegetariana', ingredients: 'Champiñón, maíz tierno, cebolla' },
  { id: 'tropical', name: 'Tropical', ingredients: 'Cerezas, piña, duraznos, uvas pasas' },
  { id: 'queso-bocadillo', name: 'Queso y Bocadillo', ingredients: 'Queso y bocadillo' },
];

export const PIZZA_INDIVIDUAL_PRICE = 9200;

export const CATEGORIES: Category[] = [
  { id: 'pizzas', name: 'Pizzas', icon: '🍕' },
  { id: 'hamburguesas', name: 'Hamburguesas', icon: '🍔' },
  { id: 'hamburguesa-apanada', name: 'Hamburguesa Apanada', icon: '🍔' },
  { id: 'lasanas', name: 'Lasañas', icon: '🍝' },
  { id: 'spaguettis', name: 'Spaguettis', icon: '🍝' },
  { id: 'salchipapas', name: 'Salchipapas', icon: '🍟' },
  { id: 'perros-calientes', name: 'Perros Calientes', icon: '🌭' },
  { id: 'especiales', name: 'Especiales', icon: '⭐' },
  { id: 'bebidas', name: 'Bebidas', icon: '🥤' },
  { id: 'postres', name: 'Postres', icon: '🍦' },
];

export const MENU_ITEMS: MenuItem[] = [
  // ─── PIZZAS ───
  {
    id: 'pizza-hawaiana',
    category: 'pizzas',
    name: 'Porción Pizza Hawaiana',
    description: 'Una porción. Piña, jamón',
    price: 9200,
    tags: ['popular'],
  },
  {
    id: 'pizza-pollo-champinones',
    category: 'pizzas',
    name: 'Porción Pizza Pollo y Champiñones',
    description: 'Una porción. Jamón, champiñones, pollo desmechado',
    price: 9200,
  },
  {
    id: 'pizza-carnes',
    category: 'pizzas',
    name: 'Porción Pizza Carnes',
    description: 'Una porción. Jamón, salami, cabano',
    price: 9200,
  },
  {
    id: 'pizza-costillitas-bbq',
    category: 'pizzas',
    name: 'Porción Pizza Costillitas BBQ',
    description: 'Una porción. Jamón, costillas BBQ, maíz tierno',
    price: 9200,
  },
  {
    id: 'pizza-criolla',
    category: 'pizzas',
    name: 'Porción Pizza Criolla',
    description: 'Una porción. Carne desmechada, maíz tierno',
    price: 9200,
  },
  {
    id: 'pizza-mexicana',
    category: 'pizzas',
    name: 'Porción Pizza Mexicana',
    description: 'Una porción. Carne molida, maíz tierno, tomate, cilantro, tostacos',
    price: 9200,
  },
  {
    id: 'pizza-ranchera',
    category: 'pizzas',
    name: 'Porción Pizza Ranchera',
    description: 'Una porción. Champiñones, cebolla, maíz tierno, chorizo',
    price: 9200,
  },
  {
    id: 'pizza-de-la-casa',
    category: 'pizzas',
    name: 'Porción Pizza De la Casa',
    description: 'Una porción. Champiñones, cebolla, carne desmechada',
    price: 9200,
    tags: ['popular'],
  },
  {
    id: 'pizza-espanola',
    category: 'pizzas',
    name: 'Porción Pizza Española',
    description: 'Una porción. Espinaca, tocineta, maíz tierno, champiñón',
    price: 9200,
  },
  {
    id: 'pizza-napolitana',
    category: 'pizzas',
    name: 'Porción Pizza Napolitana',
    description: 'Una porción. Tomate, orégano',
    price: 9200,
  },
  {
    id: 'pizza-vegetariana',
    category: 'pizzas',
    name: 'Porción Pizza Vegetariana',
    description: 'Una porción. Champiñón, maíz tierno, cebolla',
    price: 9200,
    tags: ['vegetariana'],
  },
  {
    id: 'pizza-tropical',
    category: 'pizzas',
    name: 'Porción Pizza Tropical',
    description: 'Una porción. Cerezas, piña, duraznos, uvas pasas',
    price: 9200,
  },
  {
    id: 'pizza-queso-bocadillo',
    category: 'pizzas',
    name: 'Porción Pizza Queso y Bocadillo',
    description: 'Una porción. Queso y bocadillo',
    price: 9200,
  },

  // ─── HAMBURGUESAS ───
  {
    id: 'hamb-sencilla',
    category: 'hamburguesas',
    name: 'Hamburguesa Sencilla',
    description: 'Tomate, lechuga, cebolla, queso, pan',
    price: 17500,
    priceCombo: 25500,
  },
  {
    id: 'hamb-especial',
    category: 'hamburguesas',
    name: 'Hamburguesa Especial',
    description: 'Tomate, lechuga, cebolla, queso, pan, champiñones, pollo, salsas showy',
    price: 18000,
    priceCombo: 26500,
  },
  {
    id: 'hamb-sencilla-doble',
    category: 'hamburguesas',
    name: 'Hamburguesa Sencilla Doble Carne',
    description: 'Tomate, lechuga, cebolla, queso, pan, champiñones, pollo, salsas showy',
    price: 21500,
    priceCombo: 28000,
  },
  {
    id: 'hamb-especial-doble',
    category: 'hamburguesas',
    name: 'Hamburguesa Especial Doble Carne',
    description: 'Tomate, lechuga, cebolla, queso, pan, champiñones, pollo, salsas showy',
    price: 22000,
    priceCombo: 29000,
  },

  // ─── HAMBURGUESA APANADA ───
  {
    id: 'hamb-apan-sencilla',
    category: 'hamburguesa-apanada',
    name: 'Hamburguesa Sencilla Apanada',
    description: 'Tomate, lechuga, cebolla, queso, pan',
    price: 20000,
    priceCombo: 27000,
  },
  {
    id: 'hamb-apan-especial',
    category: 'hamburguesa-apanada',
    name: 'Hamburguesa Especial Apanada',
    description: 'Tomate, lechuga, cebolla, queso, pan',
    price: 21000,
    priceCombo: 28000,
  },
  {
    id: 'hamb-apan-2carnes',
    category: 'hamburguesa-apanada',
    name: 'Hamburguesa Especial Apanada 2 Carnes',
    description: 'Tomate, lechuga, cebolla, queso, pan, champiñones, pollo',
    price: 22000,
    priceCombo: 28500,
  },
  {
    id: 'hamb-apan-tocineta',
    category: 'hamburguesa-apanada',
    name: 'Hamburguesa Especial Apanada Tocineta',
    description: 'Tomate, lechuga, cebolla, queso, pan, pollo, champiñones',
    price: 22000,
    priceCombo: 29000,
  },
  {
    id: 'hamb-apan-mixta',
    category: 'hamburguesa-apanada',
    name: 'Hamburguesa Especial Mixta',
    description: 'Tomate, lechuga, cebolla, queso, pan, pollo, champiñones, carne de res y carne de pollo',
    price: 23500,
    priceCombo: 30000,
  },
  {
    id: 'hamb-casa-sencilla',
    category: 'hamburguesa-apanada',
    name: 'Hamburguesa Sencilla de la Casa',
    description: 'Tomate, lechuga, cebolla, queso, pan, carne',
    price: 17000,
    priceCombo: 25000,
  },
  {
    id: 'hamb-casa-especial',
    category: 'hamburguesa-apanada',
    name: 'Hamburguesa Especial de la Casa',
    description: 'Tomate, lechuga, cebolla, queso, pan, carne, champiñones, pollo, maíz, chorizo, carne desmechada',
    price: 18000,
    priceCombo: 26000,
  },

  // ─── LASAÑAS ───
  {
    id: 'lasana-mixta',
    category: 'lasanas',
    name: 'Lasaña Mixta',
    description: 'Salsa boloñesa, pasta, champiñón, pollo, jamón, queso, pan tajado',
    price: 21000,
  },
  {
    id: 'lasana-pollo',
    category: 'lasanas',
    name: 'Lasaña de Pollo',
    description: 'Salsa boloñesa, pasta, pollo, queso, pan tajado',
    price: 23000,
  },
  {
    id: 'lasana-jamon',
    category: 'lasanas',
    name: 'Lasaña de Jamón',
    description: 'Salsa boloñesa, pasta, jamón, queso, pan tajado',
    price: 23500,
  },
  {
    id: 'lasana-champinones',
    category: 'lasanas',
    name: 'Lasaña de Champiñones',
    description: 'Salsa boloñesa, pasta, champiñones, queso, pan tajado',
    price: 19000,
  },

  // ─── SPAGUETTIS ───
  {
    id: 'spag-mixto',
    category: 'spaguettis',
    name: 'Spaguetti Mixto',
    description: 'Salsa boloñesa, pasta, champiñón, pollo, jamón, queso, pan tajado',
    price: 21000,
  },
  {
    id: 'spag-pollo',
    category: 'spaguettis',
    name: 'Spaguetti de Pollo',
    description: 'Salsa boloñesa, pasta, pollo, queso, pan tajado',
    price: 23000,
  },
  {
    id: 'spag-jamon',
    category: 'spaguettis',
    name: 'Spaguetti de Jamón',
    description: 'Salsa boloñesa, pasta, jamón, queso, pan tajado',
    price: 23500,
  },
  {
    id: 'spag-champinones',
    category: 'spaguettis',
    name: 'Spaguetti de Champiñones',
    description: 'Salsa boloñesa, pasta, champiñones, queso, pan tajado',
    price: 19000,
  },

  // ─── SALCHIPAPAS ───
  {
    id: 'salchi-sencilla',
    category: 'salchipapas',
    name: 'Salchipapa Sencilla',
    description: 'Papa francesa, chorizo, salchicha, queso, salami',
    price: 16000,
  },
  {
    id: 'salchi-americana',
    category: 'salchipapas',
    name: 'Salchipapa Americana',
    description: 'Papa francesa, chorizo, salchicha americana, queso, costillas de cerdo',
    price: 17000,
  },
  {
    id: 'salchi-super',
    category: 'salchipapas',
    name: 'Salchipapa Súper Especial',
    description: 'Papa francesa, chorizo, salchicha americana, champiñón, pollo, queso, costillas de cerdo',
    price: 20000,
  },

  // ─── PERROS CALIENTES ───
  {
    id: 'perro-sencillo',
    category: 'perros-calientes',
    name: 'Perro Sencillo',
    description: 'Pan, salchicha, queso, salsas, papa en fósforos',
    price: 15500,
    priceCombo: 22000,
  },
  {
    id: 'perro-americano',
    category: 'perros-calientes',
    name: 'Perro Americano',
    description: 'Pan, salchicha americana, queso, salsas, papa en fósforos, cebolla y piña en trozos',
    price: 16500,
    priceCombo: 24000,
  },
  {
    id: 'perro-super',
    category: 'perros-calientes',
    name: 'Perro Súper Especial',
    description: 'Cebolla, piña en trozos, champiñón y pollo',
    price: 18000,
    priceCombo: 25000,
  },

  // ─── ESPECIALES ───
  {
    id: 'mazorcada',
    category: 'especiales',
    name: 'Mazorcada',
    description: 'Champiñones, pollo, carne desmechada, maíz, chorizo, queso + francesa',
    price: 27000,
    tags: ['popular'],
  },
  {
    id: 'pechuga-gratinada',
    category: 'especiales',
    name: 'Pechuga Gratinada',
    description: 'Queso, francesas, ensalada, arepa',
    price: 28000,
  },
  {
    id: 'pechuga-rancho',
    category: 'especiales',
    name: 'Pechuga al Rancho',
    description: 'Champiñones, pollo, carne desmechada, maíz, chorizo, queso + francesa',
    price: 31000,
  },
  {
    id: 'churrasco',
    category: 'especiales',
    name: 'Churrasco',
    description: 'Carne 350 gramos, francesa, ensalada, arepa',
    price: 29000,
    tags: ['popular'],
  },
  {
    id: 'costillitas-bbq-esp',
    category: 'especiales',
    name: 'Costillitas BBQ',
    description: 'Costilla 350 gramos, francesa, ensalada, arepa',
    price: 29000,
  },
  {
    id: 'francesa',
    category: 'especiales',
    name: 'Porción de Francesa',
    description: '',
    price: 7000,
  },
  {
    id: 'criolla-porcion',
    category: 'especiales',
    name: 'Porción de Criolla',
    description: '',
    price: 7000,
  },

  // ─── BEBIDAS ───
  {
    id: 'jugo-agua',
    category: 'bebidas',
    name: 'Jugo Natural en Agua',
    description: 'Jugo natural de frutas en agua',
    price: 6000,
  },
  {
    id: 'jugo-leche',
    category: 'bebidas',
    name: 'Jugo Natural en Leche',
    description: 'Jugo natural de frutas en leche',
    price: 7000,
  },
  {
    id: 'agua-grande',
    category: 'bebidas',
    name: 'Botella de Agua Grande',
    description: '',
    price: 3000,
  },
  {
    id: 'agua-bretana',
    category: 'bebidas',
    name: 'Botella de Agua Bretaña',
    description: '',
    price: 3500,
  },
  {
    id: 'coca-1500',
    category: 'bebidas',
    name: 'Coca-Cola 1.5L',
    description: '',
    price: 8500,
  },
  {
    id: 'postobon-1500',
    category: 'bebidas',
    name: 'Postobón 1.5L',
    description: '',
    price: 7500,
  },
  {
    id: 'hit-litro',
    category: 'bebidas',
    name: 'Hit de Litro',
    description: '',
    price: 5500,
  },
  {
    id: 'gaseosa-250-vidrio',
    category: 'bebidas',
    name: 'Gaseosa 250ml (Vidrio)',
    description: '',
    price: 2800,
  },
  {
    id: 'gaseosa-250-plastico',
    category: 'bebidas',
    name: 'Gaseosa 250ml (Plástica)',
    description: '',
    price: 2800,
  },
  {
    id: 'gaseosa-500',
    category: 'bebidas',
    name: 'Gaseosa 500ml',
    description: '',
    price: 4000,
  },
];

export const DESTACADOS = [
  {
    id: 'dest-pizza-especial',
    name: 'Pizza Especial Juancho\'s',
    description: 'Nuestra joya de la corona. Sabor que conquista al primer bocado y te hace volver por más.',
    price: 24900,
    image: '/images/featured.webp',
  },
  {
    id: 'dest-lasana',
    name: 'Lasaña Súper Mixta',
    description: 'Capas de sabor que se deshacen en tu boca. Calor, textura y un toque casero que enamora.',
    price: 18500,
    image: '/images/menu/lasagna-destacada.webp',
  },
  {
    id: 'dest-spaguetti',
    name: 'Spaguetti a la Boloñesa',
    description: 'Receta de la abuela, sabor de otro nivel. Cada bocado es una carta de amor a la pasta.',
    price: 15900,
    image: '/images/menu/spaghetti-1.webp',
  },
  {
    id: 'dest-hamburguesa',
    name: 'Hamburguesa de la Casa',
    description: 'Jugosa, contundente y con personalidad. La burger que definiste el estándar de la zona.',
    price: 13500,
    image: '/images/menu/burger-1.webp',
  },
  {
    id: 'dest-salchipapas',
    name: 'Salchipapas Súper Especial',
    description: 'La textura crujiente que te faltaba en la vida. Sencilla pero adictiva.',
    price: 17000,
    image: '/images/menu/salchi-super.webp',
  },
];

export const SEDES = {
  nemocon: {
    name: 'Nemocón',
    address: 'Cra 6 No. 5-40, Vía Principal, Nemocón, Cundinamarca',
    phone: '310 861 3690',
    phoneLink: 'https://wa.me/573108613690',
    telLink: 'tel:+573108613690',
    coverage: 'Nemocón y veredas',
    mapsQuery: 'Cra+6+No.+5-40+Nemoc%C3%B3n+Cundinamarca+Colombia',
  },
  zipaquira: {
    name: 'Zipaquirá',
    address: 'Diagonal 4 #29-10, Barrio Las Villas, Zipaquirá, Cundinamarca',
    phone: '322 769 9056',
    phoneLink: 'https://wa.me/573227699056',
    telLink: 'tel:+573227699056',
    coverage: 'Zipaquirá urbano',
    mapsQuery: 'Diagonal+4+%2329-10+Zipaquir%C3%A1+Cundinamarca+Colombia',
  },
};

export const WHATSAPP_NUMBERS = {
  nemocon: '573108613690',
  zipaquira: '573227699056',
};

export function formatPrice(price: number): string {
  return '$' + price.toLocaleString('es-CO');
}

// ─── PRODUCT IMAGES ──────────────────────────────────────────────────────────

const CATEGORY_IMAGES: Record<string, string[]> = {
  pizzas: ['pizza-1.webp', 'pizza-2.webp', 'pizza-3.webp', 'pizza-4.webp', 'pizza-5.webp'],
  hamburguesas: ['burger-1.webp', 'burger-2.webp', 'burger-3.webp'],
  'perros-calientes': ['hotdog-1.webp', 'hotdog-2.webp'],
  'hamburguesa-apanada': ['burger-1.webp', 'burger-2.webp', 'burger-3.webp'],
  salchipapas: ['fries-1.webp', 'fries-2.webp'],
  lasanas: ['lasagna-1.webp'],
  spaguettis: ['spaghetti-1.webp', 'spaghetti-2.webp'],
  especiales: ['steak-1.webp', 'steak-2.webp'],
  bebidas: ['drink-1.webp', 'drink-2.webp', 'drink-3.webp'],
  postres: ['pizza-1.webp'],
};

const ITEM_IMAGE: Record<string, string> = {
  'pizza-porcion': 'pizza-1.webp',
  'mazorcada': 'mazorcada-destacada.webp',
  'pechuga-gratinada': 'pechuga-gratinada.webp',
  'pechuga-rancho': 'pechuga-rancho.webp',
  'churrasco': 'churrasco.webp',
  'costillitas-bbq-esp': 'costillas-bbq.webp',
  'francesa': 'papa-francesa.webp',
  'criolla-porcion': 'papa-criolla.webp',
  'spag-mixto': 'spag-mixto.webp',
  'spag-pollo': 'spag-pollo.webp',
  'spag-jamon': 'spag-jamon.webp',
  'spag-champinones': 'spag-champinones.webp',
  'pizza-hawaiana': 'pizza-hawaiana.webp',
  'pizza-pollo-champinones': 'pizza-pollo-champinones.webp',
  'pizza-carnes': 'pizza-carnes.webp',
  'pizza-costillitas-bbq': 'pizza-costillitas-bbq.webp',
  'pizza-criolla': 'pizza-criolla.webp',
  'pizza-mexicana': 'pizza-mexicana.webp',
  'pizza-ranchera': 'pizza-ranchera.webp',
  'pizza-de-la-casa': 'pizza-de-la-casa.webp',
  'pizza-espanola': 'pizza-espanola.webp',
  'pizza-napolitana': 'pizza-napolitana.webp',
  'pizza-vegetariana': 'pizza-vegetariana.webp',
  'pizza-tropical': 'pizza-tropical.webp',
  'pizza-queso-bocadillo': 'pizza-queso-bocadillo.webp',
  'hamb-sencilla': 'hamb-sencilla.webp',
  'hamb-especial': 'hamb-especial.webp',
  'hamb-sencilla-doble': 'hamb-sencilla-doble.webp',
  'hamb-especial-doble': 'hamb-especial-doble.webp',
  'hamb-apan-sencilla': 'hamb-apan-sencilla.webp',
  'hamb-apan-especial': 'hamb-apan-especial.webp',
  'hamb-apan-2carnes': 'hamb-apan-2carnes.webp',
  'hamb-apan-tocineta': 'hamb-apan-tocineta.webp',
  'hamb-apan-mixta': 'hamb-apan-mixta.webp',
  'hamb-casa-sencilla': 'hamb-casa-sencilla.webp',
  'hamb-casa-especial': 'hamb-casa-especial.webp',
  'lasana-mixta': 'lasana-mixta.webp',
  'lasana-pollo': 'lasana-pollo.webp',
  'lasana-jamon': 'lasana-jamon.webp',
  'lasana-champinones': 'lasana-champinones.webp',
  'salchi-sencilla': 'salchi-sencilla.webp',
  'salchi-americana': 'salchi-americana.webp',
  'salchi-super': 'salchi-super.webp',
  'perro-sencillo': 'perro-sencillo.webp',
  'perro-americano': 'perro-americano.webp',
  'perro-super': 'perro-super.webp',
  'jugo-agua': 'jugo-agua.webp',
  'jugo-leche': 'jugo-leche.webp',
  'gaseosa-500': 'gaseosa-500.webp',
  'agua-bretana': 'agua-bretana.webp',
  'agua-grande': 'agua-grande.webp',
  'coca-1500': 'coca-1500.webp',
  'postobon-1500': 'postobon-1500.webp',
  'gaseosa-250-plastico': 'gaseosa-250-plastico.webp',
  'hit-litro': 'hit-litro.webp',
  'gaseosa-250-vidrio': 'gaseosa-250-vidrio.webp',
  // Postres — heladería real
  'hel-sencillo': 'hel-sencillo.webp',
  'hel-doble': 'hel-doble.webp',
  'hel-triple': 'hel-triple.webp',
  'waf-sencillo': 'waf-sencillo.webp',
  'waf-achocolatado': 'waf-achocolatado.webp',
  'esp-banana-split': 'esp-banana-split.webp',
  'ens-junior': 'ens-junior.webp',
  'ens-sencilla': 'ens-sencilla.webp',
  'ens-mixta': 'ens-mixta.webp',
  'ens-mega': 'ens-mega.webp',
  'malt-clasica': 'malt-clasica.webp',
  'can-tradicional': 'can-tradicional.webp',
  'can-chococanasta': 'can-chococanasta.webp',
  'fre-sencillas': 'fre-sencillas.webp',
  'fre-biscolatta': 'fre-biscolatta.webp',
  'oblea-tradicional': 'oblea-tradicional.webp',
  'oblea-especial': 'oblea-especial.webp',
  'mer-juancho': 'mer-juancho.webp',
};

export function getProductImage(category: string, itemId: string): string {
  if (ITEM_IMAGE[itemId]) return `/images/menu/${ITEM_IMAGE[itemId]}`;
  const images = CATEGORY_IMAGES[category];
  if (!images || images.length === 0) return '/images/menu/pizza-1.webp';
  const index = Math.abs(itemId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % images.length;
  return `/images/menu/${images[index]}`;
}

// ─── ADD-ONS ─────────────────────────────────────────────────────────────────

export const PAPAS_ADDON = { id: 'papas-fritas', name: 'Papas Fritas', price: 7000 };

export const BEBIDAS_ADDON = [
  { id: 'gaseosa-500', name: 'Gaseosa 500ml', price: 4000 },
  { id: 'hit-litro', name: 'Hit de Litro', price: 5500 },
  { id: 'agua-grande', name: 'Agua Grande', price: 3000 },
];

export const COMBO_GASEOSAS = [
  { id: 'combo-gaseosa-500', name: 'Gaseosa 500ml', price: 0 },
  { id: 'combo-gaseosa-250', name: 'Gaseosa 250ml', price: 0 },
  { id: 'combo-hit-litro', name: 'Hit de Litro', price: 1500 },
  { id: 'combo-agua', name: 'Agua Grande', price: 0 },
];

// ─── WHATSAPP MESSAGE BUILDER ────────────────────────────────────────────────

export function buildWhatsAppMessage(
  items: Array<{ name: string; quantity: number; price: number; details?: string; notes?: string }>,
  sede: 'nemocon' | 'zipaquira'
): string {
  const sedeName = sede === 'nemocon' ? 'Nemocón' : 'Zipaquirá';
  const lines: string[] = [
    'Hola, quiero hacer un pedido 🍕',
    '',
    `Sede: ${sedeName}`,
    '',
  ];

  items.forEach((item, i) => {
    const total = item.price * item.quantity;
    lines.push(`${i + 1}. ${item.name} x${item.quantity} — ${formatPrice(total)}`);
    if (item.details) lines.push(`   _${item.details}_`);
    if (item.notes) lines.push(`   📝 Nota: ${item.notes}`);
  });

  const grandTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  lines.push('');
  lines.push(`Total estimado: ${formatPrice(grandTotal)}`);
  lines.push('');
  lines.push('Nombre:');
  lines.push('Dirección:');

  return lines.join('\n');
}
