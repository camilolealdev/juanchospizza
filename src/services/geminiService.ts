
// Gemini AI Service - Optional module
// Requires @google/genai package and GEMINI_API_KEY environment variable

import { PRODUCTS, INGREDIENTS } from "../constants";

let ai: any = null;
let isInitialized = false;

const initAI = () => {
  if (isInitialized) return;
  try {
    const { GoogleGenAI } = require("@google/generative-ai");
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
    if (apiKey) {
      ai = new GoogleGenAI({ apiKey });
      isInitialized = true;
      console.log("Gemini AI initialized successfully");
    }
  } catch (e) {
    console.warn("Gemini AI not available. Install @google/generative-ai and set GEMINI_API_KEY.");
  }
};

export const getSmartRecommendations = async (userInput: string) => {
  initAI();
  if (!ai) {
    // Fallback: return random product
    const randomProduct = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
    return { recommendedId: randomProduct.id, reasoning: `Te recomendamos ${randomProduct.nombre}: ${randomProduct.descripcion}` };
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: `User is looking for: "${userInput}". Based on these pizzas: ${JSON.stringify(PRODUCTS.map(p => ({id: p.id, name: p.nombre, desc: p.descripcion})))}. Recommend the best match and explain why.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    return null;
  }
};

export const getChatbotResponse = async (history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  initAI();
  if (!ai) {
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

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: history.map(h => ({ role: h.role, parts: h.parts })),
      config: { systemInstruction },
    });

    return response.text || "Fue un placer atenderte. ¿Algo más?";
  } catch (error) {
    console.error("Chatbot Error:", error);
    return "¡Bienvenido a Guido Pizza! ¿En qué puedo ayudarte?";
  }
};

export const generateProductImage = async (productName: string, description: string) => {
  initAI();
  if (!ai) return null;
  
  try {
    const prompt = `Professional food photography of "${productName}". ${description}. Italian restaurant, dark moody background, warm lighting, 4k.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ text: prompt }],
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const generateIngredientImage = async (name: string, description: string) => {
  initAI();
  if (!ai) return null;
  
  try {
    const prompt = `Minimalist icon of pizza ingredient: "${name}". ${description}. Flat design, clean, white background.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ text: prompt }],
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (error) {
    return null;
  }
};
