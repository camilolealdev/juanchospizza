import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import logger from './services/logger.js';
import { pool, initDB } from './db.js';
import { initPush } from './push.js';
import { generalRateLimit, serviceRateLimit } from './middleware/rateLimit.js';
import { initServiceKeys, serviceKeyMiddleware } from './middleware/serviceKey.js';
import { initRedis, isRedisAvailable } from './services/redis.js';
import { initWebSocket } from './websocket.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';
import httpLogger from './middleware/requestLogger.js';
import { metricsMiddleware, metricsHandler, trackRedisStatus } from './middleware/metrics.js';
import cookieParser from 'cookie-parser';
import { csrfProtection, csrfTokenHandler } from './middleware/csrf.js';

import miscRoutes from './routes/misc.js';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import categoriesRoutes from './routes/categories.js';
import ingredientsRoutes from './routes/ingredients.js';
import pizzaSizesRoutes from './routes/pizzaSizes.js';
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
import digiturnoRoutes from './routes/digiturno.js';
import consentRoutes from './routes/consent.js';

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
// CSP siempre activo (no se desactiva del todo). En dev se permite
// 'unsafe-inline' en script y style para que Vite HMR + el bloque <style>
// gigante del index.html sigan funcionando; en prod esos permisos se
// retiran, porque todos los <script> ya están servidos por Express bajo
// 'self' (/src/main.tsx build hasheado + /pizza-builder.js +
// /consent-banner.js). No tocamos frameSrc/connectSrc por dominio:
// esos son los reales (Gemini, Bold, Wompi, etc.).
const isProduction = process.env.NODE_ENV === 'production';
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // 'unsafe-inline' en scripts: necesario porque vite-plugin-pwa injecta
        // scripts inline para el registration flow del Service Worker, y algunos
        // componentes de React renderizan event handlers inline. Migrar a
        // 'strict-dynamic' + nonce sería más seguro, pero requiere cambios en
        // la arquitectura SSR que están fuera del scope actual.
        scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com', "'unsafe-inline'"],
        styleSrc: [
          "'self'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com',
          // React + Tailwind generan estilos inline en runtime (CSS-in-JS,
          // estilos condicionales, animaciones). Sin 'unsafe-inline' el CSP
          // bloquea TODO el styling, rompiendo el frontend. En un futuro,
          // migrar a strict-dynamic + nonces eliminaría esta dependencia.
          "'unsafe-inline'",
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'data:'],
        // blob: necesario para OG image preview (canvas-to-blob), loaders de
        // imágenes vía fetch + createObjectURL, y capturas de pantalla internas.
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
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
        frameSrc: ["'self'", 'https://checkout.bold.co', 'https://www.mercadopago.com.co', 'https://www.google.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ── Request ID + Request Logger ────────────────────────────────
// Se montan ANTES de cualquier ruta para que toda request tenga ID y
// log. El health endpoint se excluye automáticamente del log.
app.use(requestId);
app.use(httpLogger);

// Metrics middleware (mide duración y cuenta requests)
app.use(metricsMiddleware);

// CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);
// raw body parser para webhooks que necesitan firma HMAC contra el body
// original (Bold, etc.) -- se monta ANTES de express.json() para capturar
// el buffer crudo. El buffer queda en req.rawBody para que el handler de
// webhook pueda verificar la firma contra el body exacto que recibió.
app.use('/api/payments/bold/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health & Metrics (ANTES del rateLimiter) ──────────────────────
// Docker HEALTHCHECK pega directo a localhost:3001 sin pasar por nginx.
// Si /api/health estuviera detrás del generalRateLimit, el healthcheck
// recibiría 429 en picos de tráfico desde una misma IP (como audits,
// crawlers, tests) y Docker marcaría el contenedor unhealthy — un falso
// positivo que cascada a orquestadores (K8s, Swarm, Railway) reiniciando
// el contenedor sin necesidad.
const startTime = Date.now();
app.get('/api/health', async (_req, res) => {
  let dbOk = false;
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch {
    /* pool not ready */
  }

  res.json({
    status: dbOk ? 'healthy' : 'degraded',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'connected' : 'error',
      redis: isRedisAvailable() ? 'connected' : 'memory_fallback',
    },
  });
});

// Metrics endpoint (también fuera de rate limiter para que Prometheus
// pueda scrape sin interferencias)
app.get('/api/metrics', metricsHandler);

// serviceKeyMiddleware corre ANTES del rate limiter para que req.auth.type
// ya esté seteado cuando el limiter decide qué balde usar -- un bot
// autenticado (n8n/cron) usa serviceRateLimit (por nombre de servicio, techo
// alto) en vez de generalRateLimit (por IP, pensado para navegadores).
app.use(serviceKeyMiddleware);
app.use((req, res, next) =>
  req.auth?.type === 'service' ? serviceRateLimit(req, res, next) : generalRateLimit(req, res, next)
);

// CSRF protection (solo para API, permite health/metrics sin token)
app.use('/api', csrfProtection);

// Rutas por recurso -- ver server/routes/. Cada router mantiene sus propios
// paths completos (p.ej. '/api/orders'), así que se montan en '/'.
app.use('/', miscRoutes);
app.use('/', authRoutes);
app.use('/', productsRoutes);
app.use('/', categoriesRoutes);
app.use('/', ingredientsRoutes);
app.use('/', pizzaSizesRoutes);
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
app.use('/', digiturnoRoutes);
app.use('/', consentRoutes);

// CSRF token endpoint (debe ir ANTES de servir archivos estáticos)
app.get('/api/csrf-token', csrfTokenHandler);

// Serve static files: public/ (para pantallas públicas como digiturno) y dist/
app.use(express.static(path.join(__dirname, 'public')));

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

// ── Error handlers ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// Validar config al iniciar
if (!process.env.DATABASE_URL) {
  logger.fatal('Falta DATABASE_URL en .env');
  process.exit(1);
}

// FRONTEND_URL obligatorio en producción — si falta, las pasarelas de pago
// redirigirían al literal 'undefined' (rompiendo el checkout). Hacer
// fail-fast al boot es mejor que discover-on-deploy.
if (isProduction && !process.env.FRONTEND_URL) {
  logger.fatal('Falta FRONTEND_URL en .env para entorno de producción');
  process.exit(1);
}

initRedis();
trackRedisStatus(isRedisAvailable());

initDB().then(() => {
  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, `🍕 Guido Pizza API Server running on port ${PORT}`);
    logger.info(`📊 Health: http://localhost:${PORT}/api/health`);
  });
  initWebSocket(server);
});
