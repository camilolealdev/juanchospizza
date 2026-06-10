
// Gemini AI Service - Optional module
// Requires @google/generative-ai package and GEMINI_API_KEY environment variable

import type { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { PRODUCTS, INGREDIENTS } from '../constants';

let aiModel: GenerativeModel | null = null;
let isInitialized = false;

const initAI = async () => {
  if (isInitialized) return;
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Gemini API key not configured. Skipping AI init.');
      return;
    }
    const client: GoogleGenerativeAI = new GoogleGenerativeAI(apiKey);
    aiModel = client.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    isInitialized = true;
    console.log('Gemini AI initialized successfully');
  } catch (error) {
    console.warn('Gemini AI not available. Install @google/generative-ai and set GEMINI_API_KEY.', error);
  }
};

export const getSmartRecommendations = async (userInput: string) => {
  await initAI();
  if (!aiModel) {
    // Fallback: return random product
    const randomProduct = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
    return { recommendedId: randomProduct.id, reasoning: `Te recomendamos ${randomProduct.nombre}: ${randomProduct.descripcion}` };
  }
  
  try {
    const response = await aiModel.generateContent([
      {
        text: `User is looking for: "${userInput}". Based on these pizzas: ${JSON.stringify(
          PRODUCTS.map(p => ({ id: p.id, name: p.nombre, desc: p.descripcion }))
        )}. Recommend the best match and explain why. Responde en JSON con campos recommendedId y reasoning.`
      }
    ]);

    const parsed = response.response?.text();
    return parsed ? JSON.parse(parsed) : null;
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return null;
  }
};

export const getChatbotResponse = async (history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  await initAI();
  if (!aiModel) {
    const fallbackResponses = [
      "¡Hola! Soy el asistente de Guido Pizza. ¿Qué te gustaría pedir hoy?",
      "Tenemos las mejores pizzas artesanales de Bogotá. ¿Te gustaría ver nuestro menú?",
      "Nuestra masa fermenta 48 horas. ¿Qué pizza te gustaría ordenar?"
    ];
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
  
  try {
  const systemInstruction = `Eres el "Concierge" de Guido Pizza en Bogotá. Tu objetivo es ayudar a los clientes a hacer pedidos.
    REGLAS:
    1. Solo productos del menú: ${JSON.stringify(PRODUCTS.map(p => ({nombre: p.nombre, precio: p.basePrice})))}
    2. Solo ingredientes disponibles: ${JSON.stringify(INGREDIENTS.map(i => ({nombre: i.nombre, precio: i.precio_extra})))}
    3. Tono elegante y servicial.
    4. Masa fermenta 48 horas.
    5. Precios en COP.
    6. Responde en Español.`;

    const response = await aiModel.generateContent({
      contents: history.map(h => ({ role: h.role, parts: h.parts })),
      safetySettings: [],
      systemInstruction
    });

    return response.response?.text() || "Fue un placer atenderte. ¿Algo más?";
  } catch (error) {
    console.error("Chatbot Error:", error);
    return "¡Bienvenido a Guido Pizza! ¿En qué puedo ayudarte?";
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
