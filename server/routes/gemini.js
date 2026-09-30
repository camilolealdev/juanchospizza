// ponytail: proxy a Gemini para las funciones de IA del sitio (recomendaciones,
// chatbot, generacion de imagenes de productos/ingredientes). Antes el
// frontend llamaba a Gemini directo desde el navegador con
// VITE_GEMINI_API_KEY -- por convencion de Vite, cualquier variable con ese
// prefijo queda expuesta en el bundle publico, asi que cualquiera podia
// extraerla de las devtools y gastar la cuota del negocio (auditoria MEDIA
// 4.3, src/services/geminiService.ts). Ahora la clave (GEMINI_API_KEY, sin
// prefijo VITE_) vive solo server-side y el navegador le pega a estas rutas.
// Rate limiting: ya cubierto por el generalRateLimit montado globalmente en
// '/api' (server/index.js) -- no hace falta repetirlo aca.
import express from 'express';
import { config } from '../config.js';
import logger from '../services/logger.js';

const router = express.Router();
const MODEL_NAME = 'gemini-2.0-flash-exp';

// Import dinamico + modelo memoizado: si GEMINI_API_KEY no esta configurada,
// nunca se carga el SDK y todas las rutas devuelven su fallback null/None.
let modelPromise = null;
async function getModel() {
  if (!config.gemini.apiKey) return null;
  if (!modelPromise) {
    modelPromise = import('@google/generative-ai').then(({ GoogleGenerativeAI }) => {
      const client = new GoogleGenerativeAI(config.gemini.apiKey);
      return client.getGenerativeModel({ model: MODEL_NAME });
    });
  }
  return modelPromise;
}

function extractInlineImage(response) {
  const parts = response.response?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

// POST /api/gemini/recommend { userInput: string, products: [{id,nombre,descripcion}] }
// El frontend arma `products` desde su propio cache del menu real (mismo
// criterio que antes) y lo manda aca -- este endpoint no vuelve a pegarle
// a la DB, solo reenvia el prompt ya armado a Gemini.
router.post('/api/gemini/recommend', async (req, res) => {
  const { userInput, products } = req.body || {};
  if (typeof userInput !== 'string' || !Array.isArray(products)) {
    return res.status(400).json({ error: 'userInput y products son requeridos' });
  }
  const model = await getModel();
  if (!model) return res.json(null);
  try {
    const response = await model.generateContent([
      {
        text: `User is looking for: "${userInput}". Based on these pizzas: ${JSON.stringify(
          products
        )}. Recommend the best match and explain why. Responde en JSON con campos recommendedId y reasoning.`,
      },
    ]);
    const text = response.response?.text();
    res.json(text ? JSON.parse(text) : null);
  } catch (err) {
    logger.error({ err: err.message }, '[Gemini] Error en /recommend');
    res.json(null);
  }
});

// POST /api/gemini/chat { history, products, ingredients, pizzaSizes }
router.post('/api/gemini/chat', async (req, res) => {
  const { history, products, ingredients, pizzaSizes } = req.body || {};
  if (!Array.isArray(history)) {
    return res.status(400).json({ error: 'history es requerido' });
  }
  const model = await getModel();
  if (!model) return res.json({ text: null });
  try {
    const systemInstruction = `Eres el "Concierge" de Guido Pizza en Bogotá. Tu objetivo es ayudar a los clientes a hacer pedidos.
    REGLAS:
    1. Solo productos del menú real, con su categoría y precio base en COP: ${JSON.stringify(products || [])}
    2. Tamaños de pizza disponibles y su precio en COP: ${JSON.stringify(pizzaSizes || [])}
    3. Solo ingredientes disponibles y su precio extra en COP: ${JSON.stringify(ingredients || [])}
    4. Nunca inventes productos, ingredientes, tamaños ni precios que no estén en estas listas. Si una lista está vacía o no encuentras lo que pide el cliente, decilo con honestidad y sugerí que consulte el menú completo en la página o llame al restaurante.
    5. Tono elegante y servicial.
    6. Masa fermenta 48 horas.
    7. Precios en COP.
    8. Responde en Español.`;

    const response = await model.generateContent({
      contents: history,
      safetySettings: [],
      systemInstruction,
    });
    res.json({ text: response.response?.text() || null });
  } catch (err) {
    logger.error({ err: err.message }, '[Gemini] Error en /chat');
    res.json({ text: null });
  }
});

// POST /api/gemini/product-image { productName: string, description?: string }
router.post('/api/gemini/product-image', async (req, res) => {
  const { productName, description } = req.body || {};
  if (typeof productName !== 'string') {
    return res.status(400).json({ error: 'productName es requerido' });
  }
  const model = await getModel();
  if (!model) return res.json({ image: null });
  try {
    const prompt = `Professional food photography of "${productName}". ${description || ''}. Italian restaurant, dark moody background, warm lighting, 4k.`;
    const response = await model.generateContent([{ text: prompt }]);
    res.json({ image: extractInlineImage(response) });
  } catch (err) {
    logger.error({ err: err.message }, '[Gemini] Error en /product-image');
    res.json({ image: null });
  }
});

// POST /api/gemini/ingredient-image { name: string, description?: string }
router.post('/api/gemini/ingredient-image', async (req, res) => {
  const { name, description } = req.body || {};
  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'name es requerido' });
  }
  const model = await getModel();
  if (!model) return res.json({ image: null });
  try {
    const prompt = `Minimalist icon of pizza ingredient: "${name}". ${description || ''}. Flat design, clean, white background.`;
    const response = await model.generateContent([{ text: prompt }]);
    res.json({ image: extractInlineImage(response) });
  } catch (err) {
    logger.error({ err: err.message }, '[Gemini] Error en /ingredient-image');
    res.json({ image: null });
  }
});

export default router;
