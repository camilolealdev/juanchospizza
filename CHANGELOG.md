# Changelog — Juancho's Pizza / GastroPro

> **Repositorio:** https://github.com/jastigoga/pizzeria
> **Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Express + PostgreSQL

---

## [2.0.0] — 2026-07-15

### 🚀 Seguridad (100%)

- **Helmet configurado** — Headers de seguridad HTTP (CSP, HSTS, X-Frame-Options, etc.) compatibles con SPA
- **Auth contra DB** — Login autentica contra tabla `employees`, no más usuarios hardcodeados en memoria
- **JWT con refresh automático** — 15 min access / 7d refresh, máx 30 días de sesión
- **Refresh automático en frontend** — `api.ts` renueva token 2 min antes de expirar, reintenta en 401
- **Rate limiting** — General (100 req/min) + Login (10 intentos/15min) por IP
- **Timing-safe** — `crypto.timingSafeEqual` en comparación de tokens y PINs
- **PBKDF2 + SHA-512** — Hash de PINs con 100,000 iteraciones y salt único
- **Service Key middleware** — Autenticación para servicios externos (n8n, scripts)
- **Input validation (Zod)** — Todos los endpoints POST/PUT/PATCH validados
- **SQL injection prevention** — Parámetros `$1` en todas las queries

### 🗄️ Sistema de Migraciones DB

- Sistema versionado en `server/migrate.js` con 4 migraciones aplicadas:
  - **#001** — Seed de usuarios por defecto (admin, cocina, repartidor, marketing)
  - **#002** — Columna email + índice en employees
  - **#003** — Tabla refresh_tokens para tracking persistente
  - **#004** — username/password como 2do factor, flag isSuperAdmin

### 📦 Nuevos Módulos Backend

- **Comandas** — CRUD completo con split, kitchen ticket, cierre con liberación de mesa
- **Impresión PDF** — Tickets de cocina, recibos, facturas
- **Procurement/Compras** — Órdenes de compra con recepción y actualización automática de inventario
- **Facturación/DIAN** — Facturas + notas crédito/débito (estructura lista, falta integración real)
- **Carta QR Digital** — Menú digital público con dark mode, QR por mesa
- **WebSocket** — Comunicación en tiempo real (backend listo, frontend pendiente)

### 📦 Nuevos Módulos Frontend (Lazy-loaded)

- `ComandasView.tsx` — Grid de mesas, creación, bulk items, split
- `ComprasView.tsx` — Órdenes de compra con filtros y recepción
- `InvoicesView.tsx` — Tabs facturas/notas crédito con impresión

### 🧪 Testing

- **68 tests unitarios** — Schemas Zod validados al 100%
- **2 tests E2E** — Playwright para rutas críticas
- **TypeScript 0 errores** — Build limpio
- **Vite build 4.47s** — 24 chunks, ~1.13 MiB total

### 🎨 UI/UX

- Diseño oscuro premium consistente en 17 módulos CRM
- Dashboard con gráficos Recharts interactivos
- Clientes CRM con segmentación, badges VIP, optimisic updates
- Menú Inteligente con drag & drop visual (1,489 líneas)
- Animaciones, micro-interacciones y estados loading/empty/error completos

### 🏗️ Infraestructura

- Docker multi-stage con non-root user
- docker-compose con 5 servicios (app, worker, nginx, postgres, redis)
- Nginx con TLS, rate limiting, cache headers, WebSocket support
- CI/CD completo: lint → test → build → Docker → Trivy scan → deploy
- PWA con service worker y manifest

### 🔧 Migraciones/Actualizaciones

- **Vistas legacy archivadas** → `_legacy/views/` (AdminDashboard, KitchenView, OperatorView, RepartidorView, ProfileView)
- **npm audit fix** → Vulnerabilidades corregidas

---

## [1.0.0] — 2026-06

### 🚀 Lanzamiento Inicial

- Landing page pública con menú digital, carrito y pedidos por WhatsApp
- GastroPro CRM con dashboard, clientes, inventario, finanzas, reportes
- Backend Express + PostgreSQL con CRUD completo
- Autenticación JWT con PINs
- Integración con Bold (pagos Colombia)
- Integración con Google Gemini (IA Concierge)
- Docker + docker-compose para desarrollo y producción

---

## 📊 Leyenda

- `[MAJOR]` — Breaking changes
- `[MINOR]` — Nuevas funcionalidades backwards-compatible
- `[PATCH]` — Bug fixes y mejoras menores
