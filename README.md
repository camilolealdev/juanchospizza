# Guido Pizza Bogotá - Premium Pizza App

Sistema integral de gestión para pizzería con múltiples vistas: Cliente, Cocina, Repartidor, Admin y Marketing.

## Características

- **Vista Cliente**: Catálogo de pizzas, constructor visual de pizzas personalizadas, carrito de compras
- **Vista Cocina**: Comanda digital para seguimiento de pedidos en tiempo real
- **Vista Repartidor**: Gestión de entregas
- **Vista Admin**: Dashboard con métricas y gestión de activos
- **Vista Marketing**: Gestión de campañas promocionales
- **AI Chat Widget**: Asistente virtual con Gemini AI
- **Constructor Visual de Pizza**: Interfaz visual para personalizar pizzas con algoritmo de distribución orgánica

## Tecnologías

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Recharts (gráficos)
- Gemini AI (generación de imágenes y chatbot)
- Express.js (Backend API)

## Estructura del Proyecto

```
PIZZERIAv2/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── AIChatWidget.tsx
│   │   ├── PizzaBuilder.tsx
│   │   └── VisualPizzaBuilder.tsx
│   ├── views/               # Vistas principales
│   │   └── roles/
│   │       ├── AdminDashboard.tsx
│   │       ├── CustomerView.tsx
│   │       ├── KitchenView.tsx
│   │       ├── MarketingView.tsx
│   │       ├── OperatorView.tsx
│   │       ├── ProfileView.tsx
│   │       └── RepartidorView.tsx
│   ├── services/            # Servicios externos
│   │   └── geminiService.ts
│   ├── constants/           # Datos estáticos (ingredientes, productos)
│   ├── types/               # TypeScript types
│   ├── hooks/              # React hooks
│   ├── utils/              # Funciones utilitarias
│   ├── context/            # React context
│   ├── config/             # Configuraciones
│   ├── App.tsx             # Componente principal
│   ├── main.tsx            # Entry point
│   └── index.css           # Estilos globales
├── server/                 # Backend Express.js
│   └── index.js
├── public/                 # Archivos estáticos
├── dist/                   # Build de producción
├── tailwind.config.js      # Configuración de Tailwind
├── postcss.config.js       # Configuración de PostCSS
├── vite.config.ts          # Configuración de Vite
└── package.json
```

## Instalación

```bash
npm install
```

## Desarrollo

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Desarrollo Completo (Frontend + Backend)

```bash
npm run dev:all
```

Esto iniciara:
- Frontend en http://localhost:3000
- Backend API en http://localhost:3001

## Build Production

```bash
npm run build
```

## Configuración de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# API Keys
GEMINI_API_KEY=tu_api_key_de_gemini

# Puerto del servidor
PORT=3001
NODE_ENV=development

# URL del API
VITE_API_URL=http://localhost:3001/api
```

Para obtener una API Key de Gemini:
1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey) (requiere cuenta de Google)
2. Crea una nueva API key
3. Añádela a tu archivo `.env` (nunca hacer commit de valores reales)

## Roles del Sistema

- **CLIENT**: Vista de cliente
- **ADMIN**: Dashboard administrativo
- **OPERATOR**: Gestión de cocina
- **REPARTIDOR**: Entregas
- **MARKETING**: Campañas promocionales

## Backend API

El backend proporciona los siguientes endpoints:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/health` | GET | Estado del servidor |
| `/api/products` | GET | Lista de productos |
| `/api/orders` | GET, POST | Gestión de pedidos |
| `/api/ingredients` | GET | Catálogo de ingredientes |

## Despliegue en Vercel

La forma más fácil de hacer deploy es usando Vercel:

1. Conecta tu repositorio en [vercel.com](https://vercel.com)
2. Vercel detectará automáticamente Vite como framework
3. Deployment automático en cada push

O usando CLI:

```bash
npm i -g vercel
vercel
```

## Notas

- Los pedidos se almacenan en localStorage para persistencia (en desarrollo)
- La generación de imágenes IA requiere API key de Gemini
- El chat AI usa Gemini para respuestas conversacionales
- Para producción, se recomienda usar una base de datos real

## Créditos

**Desarrollado por:**
- Morcego de easy-marketing.xyz
- contacto@easy-marketing.xyz

**Tecnologías:**
- React + TypeScript + Vite
- Tailwind CSS
- Gemini AI
- Express.js

---

© 2024 Guido Pizza Bogotá. Todos los derechos reservados.