// Gemini AI Service - Optional module
// Requires @google/generative-ai package and GEMINI_API_KEY environment variable

import type { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { api } from './api';
import type { PizzaMenuSize } from './api';
import type { Product, Category, Ingredient } from '../types';

let aiModel: GenerativeModel | null = null;
let isInitialized = false;

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

const initAI = async () => {
  if (isInitialized) return;
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Gemini API key not configured. Skipping AI init.');
      return;
    }
    const client: GoogleGenerativeAI = new GoogleGenerativeAI(apiKey);
    aiModel = client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    isInitialized = true;
    // Gemini AI initialized
  } catch (error) {
    console.warn('Gemini AI not available. Install @google/generative-ai and set GEMINI_API_KEY.', error);
  }
};

export const getSmartRecommendations = async (userInput: string) => {
  await initAI();
  const menu = await getMenuSnapshot();
  const products = menu.products;

  if (!aiModel) {
    // Fallback: return random real product (or null if the menu fetch failed/is empty)
    if (products.length === 0) return null;
    const randomProduct = products[Math.floor(Math.random() * products.length)];
    return {
      recommendedId: randomProduct.id,
      reasoning: `Te recomendamos ${randomProduct.nombre}: ${randomProduct.descripcion}`,
    };
  }

  try {
    const response = await aiModel.generateContent([
      {
        text: `User is looking for: "${userInput}". Based on these pizzas: ${JSON.stringify(
          products.map((p) => ({ id: p.id, name: p.nombre, desc: p.descripcion }))
        )}. Recommend the best match and explain why. Responde en JSON con campos recommendedId y reasoning.`,
      },
    ]);

    const parsed = response.response?.text();
    return parsed ? JSON.parse(parsed) : null;
  } catch (error) {
    console.error('AI Recommendation Error:', error);
    return null;
  }
};

export const getChatbotResponse = async (history: { role: 'user' | 'model'; parts: { text: string }[] }[]) => {
  await initAI();
  if (!aiModel) {
    const fallbackResponses = [
      '¡Hola! Soy el asistente de Guido Pizza. ¿Qué te gustaría pedir hoy?',
      'Tenemos las mejores pizzas artesanales de Bogotá. ¿Te gustaría ver nuestro menú?',
      'Nuestra masa fermenta 48 horas. ¿Qué pizza te gustaría ordenar?',
    ];
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }

  try {
    const menu = await getMenuSnapshot();
    const { products, ingredients, pizzaSizes } = buildMenuContext(menu);

    const systemInstruction = `Eres el "Concierge" de Guido Pizza en Bogotá. Tu objetivo es ayudar a los clientes a hacer pedidos.
    REGLAS:
    1. Solo productos del menú real, con su categoría y precio base en COP: ${JSON.stringify(products)}
    2. Tamaños de pizza disponibles y su precio en COP: ${JSON.stringify(pizzaSizes)}
    3. Solo ingredientes disponibles y su precio extra en COP: ${JSON.stringify(ingredients)}
    4. Nunca inventes productos, ingredientes, tamaños ni precios que no estén en estas listas. Si una lista está vacía o no encuentras lo que pide el cliente, decilo con honestidad y sugerí que consulte el menú completo en la página o llame al restaurante.
    5. Tono elegante y servicial.
    6. Masa fermenta 48 horas.
    7. Precios en COP.
    8. Responde en Español.`;

    const response = await aiModel.generateContent({
      contents: history.map((h) => ({ role: h.role, parts: h.parts })),
      safetySettings: [],
      systemInstruction,
    });

    return response.response?.text() || 'Fue un placer atenderte. ¿Algo más?';
  } catch (error) {
    console.error('Chatbot Error:', error);
    return '¡Bienvenido a Guido Pizza! ¿En qué puedo ayudarte?';
  }
};

export const generateProductImage = async (productName: string, description: string) => {
  await initAI();
  if (!aiModel) return null;

  try {
    const prompt = `Professional food photography of "${productName}". ${description}. Italian restaurant, dark moody background, warm lighting, 4k.`;
    const response = await aiModel.generateContent([{ text: prompt }]);
    const parts = response.response?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if ('inlineData' in part && part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const generateIngredientImage = async (name: string, description: string) => {
  await initAI();
  if (!aiModel) return null;

  try {
    const prompt = `Minimalist icon of pizza ingredient: "${name}". ${description}. Flat design, clean, white background.`;
    const response = await aiModel.generateContent([{ text: prompt }]);
    const parts = response.response?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if ('inlineData' in part && part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};
