# 🏗️ TRD — Technical Reference Document

> **Propósito:** Documento de referencia técnica completo del sistema
> **Stack:** React 18 + Express 4 + PostgreSQL 17 + Redis 8 + Docker
> **Versión:** 2.0.0 | **Fecha:** Julio 2026

---

## 1. Arquitectura General

### 1.1 Diagrama de Alto Nivel

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  Cliente     │────▶│  Vercel      │     │   VPS/Docker  │
│  (Browser)   │     │  (Frontend)  │     │  (Backend)    │
│              │     │  index.html  │     │               │
│  Landing     │     │  + React SPA │     │  Express API  │
│  + CRM       │     │  PWA Assets  │     │  :3001        │
└─────────────┘     └──────────────┘     └───────┬───────┘
       │                                        │
       │           ┌────────────────┐           │
       └──────────▶│  Nginx Proxy   │◀──────────┘
                   │  TLS + Cache   │
                   │  WS Upgrade    │
                   └────┬──────┬────┘
                        │      │
              ┌─────────┘      └─────────┐
              ▼                           ▼
       ┌────────────┐            ┌────────────┐
       │ PostgreSQL │            │   Redis    │
       │  :5432     │            │   :6379    │
       │  - Orders  │            │  - Cache   │
       │  - Clients │            │  - Rate    │
       │  - Menu    │            │    Limit   │
       │  - CRM     │            └────────────┘
       └────────────┘
```

### 1.2 Patrón Híbrido (Landing + SPA)

El sitio público (menú, carrito) es HTML estático en `index.html`. El CRM (GastroPro) es una SPA React que se monta como overlay cuando el usuario hace login. Componentes de React se portalizan en la landing vía `createPortal()`:

```
index.html
├── #root            → App.tsx (CRM overlay condicional)
├── #menu-mount      → <MenuDigital /> portal
├── #cart-mount      → <CartSection /> portal
├── #reviews-mount   → <ApprovedReviews /> portal
└── #track-mount     → <TrackOrderModal /> portal
```

---

## 2. Backend — Express API

### 2.1 Estructura de Archivos

```
server/
├── index.js              # Bootstrap: middleware, routes, listen
├── auth.js               # JWT manual + PBKDF2 + RBAC
├── db.js                 # PostgreSQL Pool + schema init
├── config.js             # Config central con validación
├── migrate.js            # Sistema de migraciones versionadas
├── push.js               # VAPID push notifications
├── websocket.js          # WebSocket server con broadcasting selectivo
│
├── middleware/
│   ├── rateLimit.js      # Factory con Redis, degradación a memoria
│   ├── validate.js       # Wrapper Zod para schemas
│   ├── serviceKey.js     # Autenticación de servicios externos
│   └── errorHandler.js   # Global error handler con Pino
│
├── services/
│   ├── logger.js         # Pino estructurado
│   ├── redis.js          # Redis singleton con fallback Map
│   ├── email.js          # Nodemailer + templates HTML
│   ├── pdf.js            # Generación PDF (recibos, tickets)
│   ├── webhooks.js       # Disparo de webhooks externos
│   ├── dianXml.js        # Generación XML UBL 2.1
│   ├── dianSigner.js     # Firma XAdES-EPES
│   └── dianProvider.js   # Conexión proveedor DIAN
│
├── routes/               # 32 archivos de rutas
│   ├── auth.js, orders.js, clients.js, menu.js, ...
│   └── orders.test.js    # Tests unitarios
│
├── schemas/              # Schemas Zod para cada recurso
└── scripts/
    ├── backup.sh         # pg_dump + compresión + S3
    └── restore.sh        # pg_restore con verificación
```

### 2.2 Middleware Pipeline

```
Request
  │
  ├── trust proxy (1)
  ├── helmet()            → Security headers + CSP
  ├── cors()              → ALLOWED_ORIGINS
  ├── express.json()      → 10MB limit
  ├── generalRateLimit    → 100 req/15min
  ├── serviceKeyMiddleware → x-service-key
  │
  ├── Route Matcher
  │   ├── authMiddleware  → JWT verification
  │   ├── requireRole()   → RBAC check
  │   ├── validate()      → Zod schema check
  │   └── handler()       → Business logic
  │
  ├── notFoundHandler     → 404 JSON
  └── errorHandler        → 500 JSON (+ stack trace en dev)
```

### 2.3 Autenticación (JWT + PBKDF2)

```
Login Flow:
  POST /api/auth/login
  ├── Buscar employee por username en DB
  ├── Verificar PIN con PBKDF2-100k + salt
  ├── Si isSuperAdmin: verificar password (2FA)
  ├── Generar access token (15min HMAC-SHA256)
  ├── Generar refresh token (7d, almacenado en DB)
  └── Setear HttpOnly cookie + responder JSON

Token Refresh:
  POST /api/auth/refresh
  ├── Verificar refresh token (hash vs DB)
  ├── Verificar expired / revoked
  ├── Verificar origIat ≤ 30 días
  ├── Revocar refresh token anterior
  ├── Emitir nuevo par access + refresh
  └── Rotar cookie
```

### 2.4 Rate Limiting (Redis-backed)

```javascript
createLimiter({
  windowMs: 15 * 60 * 1000,   // 15 min ventana
  max: 100,                     // 100 requests
  keyFromReq: (req) => req.ip,  // key por defecto: IP
})
```

| Limiter | Ventana | Máx | Key | Ubicación |
|---------|---------|-----|-----|-----------|
| General | 15 min | 100 | IP | Global |
| Login | 15 min | 10 | IP | POST /api/auth/login |
| Reviews | 60 min | 3 | IP | POST /api/reviews |
| Consenso | 15 min | 20 | IP | POST /api/consent |
| ARCO | 24 hrs | 5 | email/phone | POST /api/derecho/:tipo |

### 2.5 WebSocket Events

```
Conexión: ws://host/ws?role=OPERATOR&locationId=nemocon

Eventos Broadcasting (según rol):
  order:new       → ALL + OPERATOR + REPARTIDOR
  order:update    → ALL
  table:update    → ALL + OPERATOR
  comanda:update  → ALL + OPERATOR
  digiturno:update → ALL + OPERATOR
  digiturno:new   → ALL + OPERATOR
  invoice:update  → ADMIN only (via notifyAuthorized)

Seguridad:
  - Conexiones sin auth → role='public'
  - Roles solicitados vs role real desde JWT
  - Filtro por locationId para multi-sede
```

---

## 3. Frontend — React SPA

### 3.1 Estructura de Componentes

```
src/
├── App.tsx               # Root: login, portals, lazy views
├── main.tsx              # Entry point
├── index.css             # Tailwind + WCAG overrides
├── config.ts             # API URL, timeouts
│
├── components/
│   ├── AdminLayout.tsx   # CRM shell: sidebar, header, outlet
│   ├── MenuDigital.tsx   # Menú público portalizado
│   ├── CartSection.tsx   # Carrito portalizado
│   ├── LoginModal.tsx    # Login lazy-loaded + WCAG focus trap
│   ├── TrackOrderModal.tsx
│   └── ApprovedReviews.tsx
│
├── views/
│   ├── GastroProDashboard.tsx
│   ├── ClientsView.tsx
│   ├── InventarioView.tsx
│   └── ... (15+ views por rol)
│
├── pages/                # Páginas standalone
├── hooks/                # Custom hooks personalizados
├── context/              # CartContext, AuthContext
├── services/
│   ├── api.ts            # Cliente HTTP con refresh automático
│   └── geminiService.ts  # IA Concierge
├── types/                # TypeScript types
├── utils/
│   ├── orderNumber.ts    # generateOrderNumber()
│   └── useBodyScrollLock.ts  # Ref-counted scroll lock
└── constants/            # Constantes de negocio
```

### 3.2 Lazy Loading

```typescript
// Componentes cargados bajo demanda (React.lazy):
const AdminLayout = React.lazy(() => import('./components/AdminLayout'));
const LoginModal = React.lazy(() => import('./components/LoginModal'));
const GastroProDashboard = React.lazy(() => import('./views/GastroProDashboard'));
// ... etc para cada vista del CRM

// Renderizado condicional:
{showLogin && !isAuthenticated &&
  <Suspense fallback={<div>Loading...</div>}>
    <LoginModal onClose={() => setShowLogin(false)} />
  </Suspense>
}
```

### 3.3 PWA Configuration

```javascript
// vite.config.ts → VitePWA
manifest: {
  name: "Guido Pizza — Juancho's Pizza",
  short_name: 'Guido Pizza',
  display: 'standalone',
  theme_color: '#ea580c',
  background_color: '#0c0a09',
  icons: [
    { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    { src: '/pwa-192x192.svg', sizes: 'any' },
    { src: '/pwa-512x512.svg', sizes: 'any' },
  ],
}
runtimeCaching: [
  { urlPattern: /^(?!\/api)/, handler: 'NetworkFirst', cacheName: 'guido-pizza-shell' }
]
```

---

## 4. Base de Datos

### 4.1 Esquema General (29 tablas)

```
core/
├── orders, clients, products, categories
├── pizza_sizes, ingredients, menu_variants
├── menu_combos, menu_promotions

operations/
├── dining_tables, comandas, comanda_items
├── digiturno_tickets, shifts, cash_register
├── tips, invoices, credit_notes

inventory/
├── inventory_items, inventory_movements
├── recipes, recipe_ingredients, purchase_orders

crm/
├── employees, refresh_tokens, push_subscriptions
├── loyalty_points, loyalty_rewards
├── consent_eventos, derechos_solicitudes

marketing/
├── campaigns, reviews, expenses
├── qr_menu_config
```

### 4.2 Conexión

```javascript
// SSL condicional para producción cloud
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.PG_POOL_MAX || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ...(needsSsl && { ssl: { rejectUnauthorized: true } }),
});
```

### 4.3 Migraciones (6 versiones)

| # | Nombre | Tipo |
|---|--------|------|
| 001 | Seed usuarios default | Seed |
| 002 | Columna email en employees | Schema |
| 003 | Tabla refresh_tokens | Schema |
| 004 | username + password + isSuperAdmin | Schema |
| 005 | Habeas Data (Ley 1581) | Schema |
| 006 | subcategory + pizza_sizes | Schema |

---

## 5. Pagos — Multi-proveedor

### 5.1 Proveedores Soportados

| Proveedor | Método | Webhook | Estado |
|-----------|--------|---------|--------|
| **Bold** | Crear link de pago | ✅ HMAC verify | ✅ Producción |
| **MercadoPago** | Crear preferencia | ✅ Firma HMAC + verify API | 🟡 UI oculta |
| **Wompi** | Crear transacción | ✅ Checksum verify | ✅ Sandbox |
| **PayPal** | Crear orden | ❌ | 🟡 Stub |

### 5.2 Flujo de Pago

```
1. Cliente crea orden → POST /api/orders
   - paymentStatus = 'pending' (online) / 'paid' (cash/card)
   
2. Cliente elige método → POST /api/payments/{provider}/...
   - Obtiene link/preferencia para checkout
   
3. Proveedor redirige al checkout
   - Cliente paga en la pasarela externa
   
4. Proveedor envía webhook → POST /api/payments/{provider}/webhook
   - Verificación criptográfica de firma
   - Verificación secundaria (MercadoPago: API call)
   - Actualiza paymentStatus → 'paid'/'failed'
   - Notifica WebSocket + push + email
   
REGLA: El webhook del proveedor es la ÚNICA autoridad que puede
marcar un pago como 'paid'. Ni el frontend ni la respuesta síncrona
del create-payment pueden hacerlo.
```

---

## 6. Infraestructura

### 6.1 Docker

```yaml
# docker-compose.yml — 4 servicios
services:
  app:        # Node 22-alpine, non-root, multi-stage
  nginx:      # TLS 1.2/1.3, HTTP/2, gzip, cache, WS proxy
  postgres:   # 17-alpine, volumen persistente
  redis:      # 8-alpine, appendonly, memory management
networks:
  app-network: internal: true  # Aislada de internet
```

### 6.2 CI/CD Pipeline

```
Git Push → GitHub Actions
  ├── Lint (ESLint + Prettier check)
  ├── TypeScript typecheck
  ├── Unit tests (vitest)
  ├── Build (vite)
  ├── Docker build
  └── (Opcional) E2E Playwright

Backup Cron: Diario 04:00 Colombia
  └── pg_dump → gzip → SHA256 → S3 → Rotación 30 días
```

### 6.3 Monitoreo

| Herramienta | Propósito | Endpoint/Archivo |
|-------------|-----------|------------------|
| Pino | Logging estructurado JSON | `server/services/logger.js` |
| Health endpoint | Status + uptime + DB/Redis | `GET /api/health` |
| Docker HEALTHCHECK | Container health | `wget --spider /api/health` |

---

## 7. Compliance y Seguridad

### 7.1 Ley 1581/2012 (Habeas Data, Colombia)

```
Consentimiento expreso:
  - Banner público con opciones granular (todo / solo privacidad / solo marketing)
  - POST /api/consent → guarda IP + User-Agent + timestamp
  - Log auditoría en consent_eventos

Derechos ARCO:
  - POST /api/derecho/consulta     → Consultar datos
  - POST /api/derecho/rectificacion → Corregir datos
  - POST /api/derecho/supresion     → Solicitar borrado
  - POST /api/derecho/reclamo       → Reclamar uso indebido
  - Plazo de respuesta: 10 días hábiles (Art. 15)
```

### 7.2 DIAN Facturación (Resolución 000008)

```
XML UBL 2.1 con:
  - CUFE calculado con SHA-384
  - Firma XAdES-EPES con certificado digital
  - Campos obligatorios completos (emisor, receptor, items, impuestos)

Para producción:
  1. Obtener certificado digital (.p12) de entidad autorizada
  2. Solicitar resolución de facturación ante DIAN
  3. Configurar proveedor tecnológico (Muisca u otro)
  4. Probar en ambiente de habilitación
  5. Pasar a producción
```

---

## 8. Testing

| Tipo | Framework | Coverage | Estado |
|------|-----------|----------|--------|
| Unit tests | Vitest | 131 tests, 11 suites | ✅ |
| Schemas Zod | Vitest | Validación de todos los schemas | ✅ |
| Auth | Vitest | JWT, cookies, refresh, roles | ✅ |
| E2E | Playwright | Smoke (homepage + navigation) | 🟡 Mínimo |
| TypeScript | tsc --noEmit | 0 errors | ✅ |

---

## 9. Variables de Entorno Críticas

```
# Requeridas (fail-fast):
DATABASE_URL          → PostgreSQL connection string
JWT_SECRET            → HMAC-SHA256 signing key
FRONTEND_URL          → CORS + redirects base URL

# Opcionales con degradación graceful:
GEMINI_API_KEY        → Si falta: Concierge desactivado (no rompe server)
REDIS_URL             → Si falta: rate-limit en memoria (Map)
BOLD_API_KEY          → Si falta: 503 en endpoint Bold
SMTP_USER/PASS        → Si falta: emails no enviados (log warning)
VAPID_*               → Si falta: push notifications desactivadas
DIAN_*                → Si falta: facturación electrónica no disponible
```

---

## 10. Deuda Técnica Conocida

| Deuda | Impacto | Prioridad |
|-------|---------|-----------|
| Sin `strict: true` en tsconfig | Tipados laxos | Media |
| Sin E2E coverage real | Riesgo de regresión | Alta |
| Chunk principal 565KB | LCP alto en móvil | Media |
| Sin exportación de reportes (PDF/CSV) | Limitación funcional | Baja |
| Sin OpenTelemetry/Sentry | Sin tracing en producción | Media |
