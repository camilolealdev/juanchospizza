import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDB } from './db.js';
import { initPush } from './push.js';
import { generalRateLimit } from './middleware/rateLimit.js';
import { initServiceKeys, serviceKeyMiddleware } from './middleware/serviceKey.js';
import { initWebSocket } from './websocket.js';

import miscRoutes from './routes/misc.js';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import categoriesRoutes from './routes/categories.js';
import ingredientsRoutes from './routes/ingredients.js';
import ordersRoutes from './routes/orders.js';
import paymentsRoutes from './routes/payments.js';
import campaignsRoutes from './routes/campaigns.js';
import statsRoutes from './routes/stats.js';
import clientsRoutes from './routes/clients.js';
import inventoryRoutes from './routes/inventory.js';
import recipesRoutes from './routes/recipes.js';
import financeRoutes from './routes/finance.js';
import loyaltyRoutes from './routes/loyalty.js';
import menuExtrasRoutes from './routes/menuExtras.js';
import pushRoutes from './routes/push.js';
import reviewsRoutes from './routes/reviews.js';
import menuRoutes from './routes/menu.js';
import tablesRoutes from './routes/tables.js';
import cashRegisterRoutes from './routes/cashRegister.js';

import employeesRoutes from './routes/employees.js';
import shiftsRoutes from './routes/shifts.js';
import comandasRoutes from './routes/comandas.js';
import printRoutes from './routes/print.js';
import procurementRoutes from './routes/procurement.js';
import invoicesRoutes from './routes/invoices.js';
import qrMenuRoutes from './routes/qrMenu.js';

dotenv.config();
initPush();
initServiceKeys();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Detrás de un proxy (nginx/docker-compose en el deploy documentado), sin
// esto req.ip colapsa a la IP del proxy para todo el tráfico y el rate
// limiter se vuelve un solo balde compartido entre todos los visitantes.
// '1' = confiar el primer hop (el proxy inmediato), no toda la cadena.
app.set('trust proxy', 1);

// ── Helmet: headers de seguridad HTTP ──────────────────────────
// Configuración compatible con SPA (CSP relajado para archivos .js/.css
// servidos por Vite/build, conexiones WebSocket, y APIs de terceros
// como Google Fonts/Gemini/Bold/MercadoPago/Wompi).
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'ws://localhost:*',
          'wss://*.up.railway.app',
          'https://api.groq.com',
          'https://generativelanguage.googleapis.com',
          'https://api.bold.co',
          'https://api.mercadopago.com',
          'https://sandbox.wompi.co',
          'https://production.wompi.co',
        ],
        frameSrc: ["'self'", 'https://checkout.bold.co', 'https://www.mercadopago.com.co'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(generalRateLimit);
app.use(serviceKeyMiddleware);

// Rutas por recurso -- ver server/routes/. Cada router mantiene sus propios
// paths completos (p.ej. '/api/orders'), así que se montan en '/'.
app.use('/', miscRoutes);
app.use('/', authRoutes);
app.use('/', productsRoutes);
app.use('/', categoriesRoutes);
app.use('/', ingredientsRoutes);
app.use('/', ordersRoutes);
app.use('/', paymentsRoutes);
app.use('/', campaignsRoutes);
app.use('/', statsRoutes);
app.use('/', clientsRoutes);
app.use('/', inventoryRoutes);
app.use('/', recipesRoutes);
app.use('/', financeRoutes);
app.use('/', loyaltyRoutes);
app.use('/', menuExtrasRoutes);
app.use('/', pushRoutes);
app.use('/', reviewsRoutes);
app.use('/', menuRoutes);
app.use('/', tablesRoutes);
app.use('/', cashRegisterRoutes);

app.use('/', employeesRoutes);
app.use('/', shiftsRoutes);
app.use('/', comandasRoutes);
app.use('/', printRoutes);
app.use('/', procurementRoutes);
app.use('/', invoicesRoutes);
app.use('/', qrMenuRoutes);

// Serve static files from dist in production
app.use(
  express.static(path.join(__dirname, '../dist'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.set('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.css')) {
        res.set('Content-Type', 'text/css');
      } else if (filePath.endsWith('.svg')) {
        res.set('Content-Type', 'image/svg+xml');
      }
    },
  })
);

// Fallback to frontend for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
});

// Validar config al iniciar
if (!process.env.DATABASE_URL) {
  console.error('❌ Falta DATABASE_URL en .env');
  process.exit(1);
}

initDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🍕 Guido Pizza API Server running on port ${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  });
  initWebSocket(server);
});
