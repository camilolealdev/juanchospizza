// Gemini AI Service — llama al proxy server-side (server/routes/gemini.js),
// nunca a la API de Gemini directo desde el navegador.
//
// ponytail: antes este archivo instanciaba GoogleGenerativeAI acá mismo con
// import.meta.env.VITE_GEMINI_API_KEY. Cualquier variable VITE_* queda
// embebida en el bundle público por diseño de Vite -- la clave era
// extraíble desde las devtools por cualquier visitante y usable para
// consumir la cuota de Gemini del negocio sin límite (auditoría MEDIA 4.3).
// Ahora la clave (GEMINI_API_KEY, sin prefijo VITE_) vive solo en el
// backend; este archivo solo arma los mismos prompts/contexto de antes y
// se los manda a /api/gemini/*.

import { api } from './api';
import type { PizzaMenuSize } from './api';
import type { Product, Category, Ingredient } from '../types';

// ---- Real menu snapshot (DB-backed, NOT src/constants/index.tsx) ----
// The chatbot/recommendation prompts used to be built entirely from the
// hardcoded PRODUCTS/INGREDIENTS constants in src/constants/index.tsx -- a
// legacy sample menu with different category names ("PIZZAS TRADICIONALES/
// PREMIUM/DULCES") and prices that don't match what a customer can actually
// order. That let the AI quote products/prices to real customers that don't
// exist (or are priced differently) in the real DB-backed menu people order
// from (server/routes/products.js, ingredients.js, categories.js,
// pizzaSizes.js, seeded by scripts/seed-menu.sql). Fixed here by always
// grounding the prompt in a fresh-ish fetch of the real /api/* menu data.
//
// Caching: getChatbotResponse is invoked once per user message in a
// multi-turn chat (it receives the accumulating `history` array), so
// re-fetching the full menu on every keystroke/message would be wasteful.
// A short in-memory TTL cache keeps it to ~1 fetch per few minutes per page
// load while still picking up admin menu/price edits reasonably quickly
// (no need for a full cache invalidation layer for a single call-site).
interface MenuSnapshot {
  categories: Category[];
  products: Product[];
  ingredients: Ingredient[];
  pizzaSizes: PizzaMenuSize[];
}

const MENU_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
let menuCache: { data: MenuSnapshot; fetchedAt: number } | null = null;
let menuFetchPromise: Promise<MenuSnapshot> | null = null;

const fetchMenuSnapshot = async (): Promise<MenuSnapshot> => {
  const [categories, products, ingredients, pizzaSizes] = await Promise.all([
    api.getCategories().catch(() => [] as Category[]),
    api.getProducts().catch(() => [] as Product[]),
    api.getIngredients().catch(() => [] as Ingredient[]),
    api.getPizzaSizes().catch(() => [] as PizzaMenuSize[]),
  ]);
  return { categories, products, ingredients, pizzaSizes };
};

// Never throws (fetchMenuSnapshot swallows per-endpoint errors above) --
// worst case returns empty lists, which the prompt is instructed to treat as
// "don't know", not an invitation to hallucinate menu items.
const getMenuSnapshot = async (): Promise<MenuSnapshot> => {
  const now = Date.now();
  if (menuCache && now - menuCache.fetchedAt < MENU_CACHE_TTL_MS) {
    return menuCache.data;
  }
  if (!menuFetchPromise) {
    menuFetchPromise = fetchMenuSnapshot()
      .then((data) => {
        menuCache = { data, fetchedAt: Date.now() };
        return data;
      })
      .finally(() => {
        menuFetchPromise = null;
      });
  }
  return menuFetchPromise;
};

const buildMenuContext = (menu: MenuSnapshot) => {
  const categoryNameById = new Map(menu.categories.map((c) => [c.id, c.name]));
  const products = menu.products.map((p) => ({
    nombre: p.nombre,
    categoria: categoryNameById.get(p.categoryId) || p.categoryId,
    precio: p.basePrice,
  }));
  const ingredients = menu.ingredients
    .filter((i) => i.disponible !== false)
    .map((i) => ({ nombre: i.nombre, precio_extra: i.precio_extra }));
  const pizzaSizes = menu.pizzaSizes
    .filter((s) => s.activo !== false)
    .map((s) => ({ nombre: s.nombre, precio: s.precio }));
  return { products, ingredients, pizzaSizes };
};

export const getSmartRecommendations = async (userInput: string) => {
  const menu = await getMenuSnapshot();
  const products = menu.products;

  try {
    const result = await api.getGeminiRecommendation(
      userInput,
      products.map((p) => ({ id: p.id, nombre: p.nombre, descripcion: p.descripcion }))
    );
    if (result) return result;
  } catch (error) {
    console.error('AI Recommendation Error:', error);
  }

  // Fallback: sin Gemini configurada en el backend, o si falló -- producto
  // real al azar (o null si el menú también falló/está vacío).
  if (products.length === 0) return null;
  const randomProduct = products[Math.floor(Math.random() * products.length)];
  return {
    recommendedId: randomProduct.id,
    reasoning: `Te recomendamos ${randomProduct.nombre}: ${randomProduct.descripcion}`,
  };
};

export const getChatbotResponse = async (history: { role: 'user' | 'model'; parts: { text: string }[] }[]) => {
  try {
    const menu = await getMenuSnapshot();
    const context = buildMenuContext(menu);
    const { text } = await api.getGeminiChatResponse(history, context);
    if (text) return text;
  } catch (error) {
    console.error('Chatbot Error:', error);
  }

  const fallbackResponses = [
    '¡Hola! Soy el asistente de Guido Pizza. ¿Qué te gustaría pedir hoy?',
    'Tenemos las mejores pizzas de Bogotá. ¿Te gustaría ver nuestro menú?',
    'Nuestra masa fermenta 48 horas. ¿Qué pizza te gustaría ordenar?',
  ];
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
};

export const generateProductImage = async (productName: string, description: string) => {
  try {
    const { image } = await api.getGeminiProductImage(productName, description);
    return image;
  } catch (error) {
    return null;
  }
};

export const generateIngredientImage = async (name: string, description: string) => {
  try {
    const { image } = await api.getGeminiIngredientImage(name, description);
    return image;
  } catch (error) {
    return null;
  }
};
