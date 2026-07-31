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

### 📚 Documentación

- **`docs/DOCUMENTATION_INDEX.md`** — Índice maestro con catálogo de 14 documentos, mapa de relaciones y recomendaciones de limpieza
- **`DEPLOY.md`** — Guía completa de despliegue (Docker Compose, Railway, CI/CD, rollback, post-deploy checklist)
- **`docs/AUDIT_COMPLETO.md`** — Auditoría integral: 29 módulos backend, 22 vistas frontend, 29 tablas DB, seguridad, brechas resueltas
- **`docs/DIAN_MODULE_STATUS.md`** — Estado de integración DIAN con XML UBL 2.1, firma digital, checklist de proveedores
- **`docs/PENDIENTES_PROVEEDORES.md`** — Pasos detallados para Bold, DIAN y configuración de credenciales externas
- **`docs/GAPS_REMEDIATION_PLAN.md`** — Plan de remediación organizado en sprints S0-S4 con criterios de aceptación
- **`docs/DEPLOY_READINESS_2026-07-21.md`** — Verificación pre-despliegue

### 🔧 Migraciones/Actualizaciones

- **Vistas legacy archivadas** → `_legacy/views/` (AdminDashboard, KitchenView, OperatorView, RepartidorView, ProfileView)
- **npm audit fix** → Vulnerabilidades corregidas
- **ESLint `catch(e)`** → ~130 instancias corregidas a `catch(_e)`/`catch{}` en 38+ archivos
- **Compresión HTTP** — Middleware `compression({ threshold: 1024 })` agregado
- **Vendor chunks** — `manualChunks()` separa react, framer-motion, recharts, zod
- **PWA CacheFirst** — Assets cacheados 365 días con límite de 50 entradas
- **Paginación endpoints** — `orders`, `clients`, `digiturno` con backward compatibility
- **LoginModal lazy-loaded** — Extraído a `LoginModal.tsx` + `React.lazy()` + `<Suspense>`
- **WebSocket raíz** — `useWebSocket` conecta automáticamente con rol/sede
- **`computeNivel()` testeable** — Función exportada + tests unitarios reales (131 tests total)

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

## [unreleased] — 2026-07-29 — Docker production hardening + PWA icons + payments fixes

### 🔴 CRITICAL: redis.expire() milliseconds vs seconds bug

- **`server/middleware/rateLimit.js`**: `redis.expire(redisKey, windowMs)` where `windowMs` is in **milliseconds** but `redis.expire()` expects **seconds**. The general limiter (windowMs=60000) was setting a TTL of **60000 seconds (~16.6 hours)** instead of 60 seconds. Login limiter (15 min) was setting 900000 seconds (~10.4 days!).
- **Fix**: `Math.ceil(windowMs / 1000)` — now the correct timeout in seconds.
- **Impact**: Rate limits never expired. A user hitting the limit would be blocked for hours/days instead of seconds/minutes.

### 🔴 Docker HEALTHCHECK falso positivo (429 por rate limiter)

- **`server/index.js`**: `/api/health` y `/api/metrics` estaban definidos **después** de `app.use(generalRateLimit)`. Docker HEALTHCHECK (`wget http://localhost:3001/api/health` directo, sin pasar por nginx) se comía 2 requests cada 30s del bucket del rate limiter. Durante el PWA audit (Playwright haciendo ~100 requests desde la misma IP Docker), el rate limiter se agotó y el health check recibió HTTP 429 por 35 ciclos consecutivos — Docker marcó el contenedor `unhealthy`.
- **Fix**: Movidos ambos endpoints **antes** de `app.use(generalRateLimit)`. Agregado comentario detallado explicando el porqué.
- **nginx.conf**: Ya tenía `/api/health` y `/api/metrics` como locations sin `limit_req` — consistente.

### 🔴 CSP bloqueaba estilos y scripts en producción

- **`server/index.js`**: `styleSrc` en producción solo permitía `'self'` y `fonts.googleapis.com` — React + Tailwind generan estilos inline en runtime, rompiendo TODO el frontend.
- **`scriptSrc`**: `'unsafe-inline'` solo en desarrollo — `vite-plugin-pwa` injecta scripts inline para SW registration flow.
- **`fontSrc`**: Faltaba `cdnjs.cloudflare.com` necesario para FontAwesome.
- **`imgSrc`**: Faltaba `blob:` necesario para OG image preview (canvas-to-blob).
- **Fix**: `'unsafe-inline'` agregado a ambos `styleSrc` y `scriptSrc` en producción; `blob:` en `imgSrc`; `cdnjs.cloudflare.com` en `fontSrc`.

### 🖼️ PWA Icons (JUL-29)

- **`tools/lighthouse-pwa-check.cjs`**: FIX — `const URL = 'https://localhost'` sombreaba el constructor global `URL` causando "URL is not a constructor" en `new URL(icon.src, APP_URL).href`. Renombrado a `APP_URL`.
- **Misma file**: `waitUntil: 'networkidle'` cambiado a `waitUntil: 'load'` — WebSocket persistente impide que la red llegue a "idle", matando el timeout del audit.
- **Console listener**: Movido **antes** de `page.goto()` para capturar errores de carga de página.
- **SW check**: Cambiado de `navigator.serviceWorker.controller` a `navigator.serviceWorker.getRegistrations()` para detectar SW aunque no esté activo aún.
- **OG image**: Validación de dimensiones reales (1200×630) vía `fetch + Image()`.
- **Resultado audit final**: 0 errores de consola, todos los assets HTTP 200, PWA icons verificados, manifest OK, health endpoint OK.

### 🐳 Docker fixes

- **nginx.conf**: Moví `/api/health` y `/api/metrics` fuera del bloque `/api/` para evitar herencia de `limit_req` (nginx 1.31 no soporta `limit_req off;` en locations anidadas)
- **nginx.conf**: Cambié logs de `/var/log/nginx/*` a `/dev/stdout` + `/dev/stderr` — el contenedor tiene `read_only: true`, no puede escribir en `/var/log`
- **nginx.conf**: Actualicé `listen 443 ssl http2` → `listen 443 ssl` + `http2 on;` (sintaxis deprecada en nginx 1.25+)
- **nginx.conf**: Arreglé crash-loop de nginx por no poder escribir `/var/log/nginx/ws.log` (read-only FS)
- **`.env`**: Creado archivo `.env` para interpolación de `${VARIABLES}` en docker-compose.yml (separado de `.env.production` que es `env_file` del servicio app)
- **`certs/`**: Generados self-signed SSL certificates para desarrollo local

### 🖼️ PWA Icons

- Creados SVGs de pizza artesanal: `favicon.svg`, `pwa-192x192.svg`, `pwa-512x512.svg`
- Convertidos a PNG multi-size con `sharp`: `favicon.png` (32×32), `favicon.ico` (32×32), `apple-touch-icon.png` (180×180), `pwa-192x192.png` (192×192), `pwa-512x512.png` (512×512)
- FIX: `pwa-512x512.svg` — reemplacé entidad HTML `&bull;` por `&#8226;` (no válida en XML/SVG)
- `tools/generate-pwa-icons.cjs`: script para regenerar PNGs desde SVGs
- `index.html`: agregados apple-touch-icon, favicon.ico, favicon.png, meta tags `apple-mobile-web-app-capable`
- `vite.config.ts`: PWA manifest ahora incluye PNG icons con sizes específicos + maskable

### 🔒 Admin panel: acceso oculto (JUL-30)

- **Botón flotante eliminado** (`src/App.tsx`): El botón con ícono de corona `title="Panel Administrativo"` que estaba visible para TODOS los visitantes en la esquina inferior izquierda fue eliminado.
- **3 formas ocultas de acceso**:
  - `/login` en la URL → abre el modal de login automáticamente y limpia la URL
  - `/admin` o `/admin/*` (deep-link) → muestra login si no hay sesión, redirige al dashboard si ya autenticado
  - `Ctrl+Shift+A` → shortcut secreto para staff (solo funciona cuando NO hay sesión activa)
- **Stale closure corregido**: Uso de `useRef(isAuthenticated)` para que el shortcut no intente abrir login cuando ya hay sesión.
- **docker-compose.yml**: Agregado volume mount `./dist:/app/dist:ro` en el servicio `app`. Permite actualizar el frontend compilado sin rebuildear la imagen Docker (útil mientras el build tenga timeout de red).

### 🐳 Docker fixes (JUL-30)

- **🚨 CRÍTICO: `app-network` con `internal: true` bloqueaba internet** (`docker-compose.yml`): La red interna `app-network` tiene `internal: true` lo que **bloquea TODO el tráfico saliente** del contenedor `app` hacia internet. Esto rompía pagos (Bold, MercadoPago, Wompi, PayPal), correos (SendGrid), y AI (Gemini). Fix: agregado `app` también a la red `edge` (no interna) para permitir outbound, manteniendo `app-network` como internal para aislar postgres/redis.

- **Dockerfile:** Eliminado `npm cache clean --force` innecesario después de `npm ci` (no aporta beneficio, desperdicia 2s de build).
- **docs/DOCKER_DNS_FIX.md:** Verificación DNS cambiada de `ping` (ICMP, bloqueado en Windows) a `wget` (HTTP, más confiable).
- **`docker-reset.ps1`:** Nuevo script PowerShell que automatiza: matar procesos Node.js/npm zombi, borrar node_modules, limpiar npm cache manualmente, configurar DNS 1.1.1.1/8.8.8.8 en daemon.json, ejecutar ipconfig /flushdns. Ejecutar como Administrador cuando Docker Desktop esté congelado.
- **docs/DOCKER_DNS_FIX.md:** Creada guía con 4 soluciones para el timeout de npm registry en Docker Desktop Windows (causa raíz: proxy DNS virtual + IPv6).

### 💳 Payments fixes

#### Bold (Colombia) — Auditoría profunda 2026-07-29

- **🔴 CRITICAL: `expiration_date` en nanosegundos** (`server/routes/payments.js`): Bold espera timestamp UNIX en **milisegundos**, no nanosegundos. El código original multiplicaba `(Date.now() + 24h) * 1_000_000` produciendo ~19 dígitos (~año 49710). Fix: `Date.now() + 24 * 60 * 60 * 1000`.
- **🟡 Nuevo endpoint: `GET /api/payments/bold/status/:paymentLink`**: Consulta el estado de un link Bold contra la API oficial (`GET /online/link/v1/{paymentLink}`). Mapea estados Bold (`ACTIVE`, `PAID`, `REJECTED`, `CANCELLED`, `EXPIRED`) a nuestro `paymentStatus`. Protegido con `authMiddleware` + `requireRole('ADMIN')`. Valida que paymentLink comience con `LNK_`.
- **🟡 Webhook responde 200 inmediatamente**: Bold espera respuesta HTTP ≤2 segundos. El handler ahora responde `res.sendStatus(200)` **antes** de tocar la DB, y procesa la actualización en `setImmediate()` (no bloqueante). Elimina reintentos de Bold por timeout.
- **🟡 payer_email desde clients table**: El create-link ahora resuelve el email del cliente desde la tabla `clients` usando `order.clientId`. Bold lo usa para pre-rellenar el checkout y mejorar tasa de conversión.
- **🟡 Reuso de links existentes**: Antes de crear un link nuevo, verifica si `order.paymentProviderRef` ya existe. Si el link anterior sigue `ACTIVE` o `PROCESSING`, lo reutiliza en vez de crear uno nuevo (evita links huérfanos).
- **🟢 Retry logic con backoff**: 2 intentos con backoff exponencial (1s, 2s) + `AbortController` con timeout de 10s por intento. Previene fallos por timeout de red transitorio.
- **🟢 Códigos de error Bold**: Ahora se capturan y retornan los códigos de error específicos de Bold (`AP001`-`AP006`) junto al mensaje de error.
- **🟢 `Math.floor()` para montos COP**: Cambiado `Math.round()` a `Math.floor()` para evitar discrepancias por decimales en montos de pesos colombianos (COP no tiene sub-unidades).
- **🟢 Logging estructurado**: Todos los errores Bold ahora incluyen contexto (`orderNumber`, `total`, `errorCode`, `orderId`) para facilitar debugging.

#### Bold — Frontend (`paymentService.ts` + `OrderConfirmationPage.tsx`)

- **Tipo `processBold` actualizado**: Incluye campos `reused?: boolean` y `code?: string`. Mensajes de error mejorados con código Bold: `"Bold: mensaje (AP001)"`.
- **Mensaje de reuso**: Cuando el link es reutilizado, muestra `"Reusando link de pago existente..."` en vez de `"Redirigiendo a Bold..."`.
- **`OrderConfirmationPage`**: `poll()` envuelto en `useCallback()` para evitar recreaciones innecesarias. Agregado botón **"↻ Verificar ahora"** para polling manual sin esperar los 5 segundos automáticos. Estado `isVerifying` para feedback visual durante verificación manual.
- **Polling inteligente**: El polling automático se detiene (`isPolling = false`) cuando el pago se asienta (`paid`, `failed` o `CANCELLED`).

#### Wompi

- Usa URL de producción (`production.wompi.co`) cuando `NODE_ENV=production` + `payment_method.installments: 1` + `redirect_url` → `/confirmacion`
- Corregido lowercase `'approved'` → uppercase `'APPROVED'` (Wompi usa mayúsculas)

#### MercadoPago

- Endpoint retorna 503 con mensaje claro (método 'pix' no aplica a Colombia). Código comentado listo para PSE/Nequi

### 🚀 CI/CD

- **`.github/workflows/deploy-prod.yml`**: Nuevo workflow de deploy con Docker Compose via SSH (`appleboy/ssh-action`). Pipeline: quality → docker-check → deploy (git pull + compose up -d --build + healthcheck) → smoke test
- **`.github/workflows/deploy.yml`**: Corregido comando PM2 (sesión anterior)

### ⚙️ Config

- **`server/config.js`**: `GEMINI_API_KEY` ahora opcional (warning en vez de `process.exit(1)`)
- **`.env.production.example`**: Creado template comprehensive con todas las variables

### 📚 Documentación

- **README.md**: Rewrite completo con badges, tablas de pagos/PWA/Docker, sección seguridad, roadmap
- **ARCHITECTURE.md**: Agregadas secciones de pagos (Bold/Wompi/MP fixes), nginx changes, .env strategy, PWA icons
- **DEPLOY.md**: Actualizado con deploy-prod.yml pipeline, certbot standalone/webroot, post-deploy checklist
- **CONTRIBUTING.md**: Actualizado estructura del proyecto, comandos Docker, eliminadas referencias a workers/ y _legacy/

### 🧪 Validación

- Tests: 131/131 passed
- TypeScript: 0 errors
- Docker: 4 servicios (app, nginx, postgres, redis) todos healthy
- Code review: 3 rondas de `code-reviewer-deepseek-flash` (todos aprobados)

---

## [unreleased] — 2026-07-21 — Frontend audit fixes (corrected strategy)

> ⚠️ **Corrección importante.** Una sesión AI previa (2026-07-21) generó
> `pizzeria-merge/_run_merge_three_projects.sh`, `pizzeria-merge/docs/FORK_MERGE_PROPOSAL_2026-07-21.md`
> y `pizzeria-merge/docs/FORK_MERGE_EXECUTED_2026-07-21.md` con un diagnóstico
> **incorrecto**: trataba a `pizzeria-master`, `pizzeria-merge` y (un inexistente)
> `pizzeria-audit` como tres carpetas independientes sin historial git.
> **Esos archivos fueron eliminados el 2026-07-21** porque partían de premisa falsa.
> La realidad verificada con `git rev-parse` + `git worktree list`:
>
> - `pizzeria-master` = git repo completo. Branch actual `ci/fix-pipelines-v2`. HEAD `feb1820`. 158 commits. Dos remotes: `origin` (jastigoga) + `camilo` (camilolealdev).
> - `pizzeria-merge` = **worktree** del mismo `.git`. Branch actual `master`. HEAD `41a9c01`. 175 commits (incluye los 19 de `feat/pizza-sizes` ya mergeados, ya pusheados).
> - `pizzeria-audit` = no existe en disco. Probablemente ruido del snapshot inicial del filesystem o expectativa del operador.
>
> **La estrategia correcta es 100% git-native**: `git add` + `git commit` en cada worktree, luego `git merge ci/fix-pipelines-v2` desde el worktree `master`.

### 🛡️ Seguridad (P0, audit findings)

- **LoginModal** (`src/App.tsx`): removed leaked "Olvidaste tu PIN?" block that exposed PINs reales (`1234/5678/0000/9999`) en el bundle público — brute-force trivial con devtools. Inline comment ahora apunta a `server/routes/employees.js#setEmployeePassword` como el camino oficial.
- **src/config.ts** + **src/services/api.ts**: removed hardcoded `const API_URL = 'http://localhost:3001/api'` (Vite inlinea `import.meta.env.*` al bundlear; cada visitante intentaba pegarle a su propio localhost). Reemplazo: `import.meta.env.VITE_API_URL || ''` + `console.warn` en PROD si falta.
- **AdminLayout.tsx**: removed fake hardcoded `3` en el badge de la campana de notificaciones (mintiendo al operador sobre unread count). Agregado `aria-label="Notificaciones"` + `aria-hidden="true"` en el icono decorativo. TODO inline para wire-up real.

### ♿ Accesibilidad (P1, WCAG 2.2)

- **LoginModal** (`src/App.tsx`): `role="dialog"` + `aria-modal="true"` + `aria-labelledby`; `htmlFor`/`id` en inputs; `aria-describedby` para helper del PIN; `autoComplete="current-password"` / `"one-time-code"`; capture-phase `keydown` listener para Escape; focus trap; autoFocus al primer input; `lockBodyScroll()` al abrir, `unlockBodyScroll()` al cerrar.
- **MenuDigital.tsx**: ARIA dialog roles en cart drawer + pizza builder modal; `aria-live="polite"` + `aria-atomic="true"` en el contador del carrito; `aria-label` dinámico `Ver pedido (N productos)`; `htmlFor` + `autoComplete` en los 3 inputs del checkout.
- **CartSection.tsx**: `htmlFor` + `autoComplete` en inputs del checkout; fix `item.size || PizzaSize.PERSONAL` fallback (B2 cart-total bug).
- **index.css**: global `*:focus-visible { outline: ... }`; `@media (prefers-reduced-motion: reduce)` con deshabilitar animaciones; `.sr-only` utility.
- **index.html**: `title="..."` agregado a los iframes de Google Maps (Nemocón + Zipaquirá) para screen readers.

### 🧩 Shared utilities (NUEVAS)

- **src/utils/useBodyScrollLock.ts** — refcount a nivel de módulo (`lockCount` + `savedOverflow`); primera llamada captura y aplica `overflow: hidden`; último unlock restaura el valor original. Resuelve race condition entre LoginModal y MenuDigital modales apilados. SSR-safe con `typeof document !== 'undefined'` guard.
- **src/utils/orderNumber.ts** — `crypto.randomUUID()` con fallback a `Math.random()` para entornos donde WebCrypto no esté disponible; formato `GUIDO-XXXXXXXX`.

### 📚 Documentación nueva (legítima, basada en el audit real)

- **docs/ISSUES_2026-07-21.md** — priorización P0/P1/P2/P3 + follow-ups pendientes (iOS Safari scroll-lock + Escape double-close coordination + SSR guard ya aplicado).
- **docs/FRONTEND_AUDIT_2026-07-21.md** — reporte fix-por-fix del audit.
- **docs/DESIGN_SYSTEM_TOKENS.md** — catálogo de tokens visuales.

### 🛠️ Pasos git-native sugeridos (a ejecutar por el operador)

**Layout actual verificado (`git worktree list`):**

```
C:/Users/morce/.../pizzeria-master  feb1820  [ci/fix-pipelines-v2]
C:/Users/morce/.../pizzeria-merge   41a9c01  [master]
```

1. **Worktree `pizzeria-master`** (branch `ci/fix-pipelines-v2`): stage + commit los dirty files (CHANGELOG, e2e/full-audit.spec.ts, package.json, package-lock.json, server/index.js, server/middleware/rateLimit.js, server/routes/{consent,orders}.js, src/App.tsx, .github/workflows/backup.yml).
2. **Worktree `pizzeria-merge`** (branch `master`): stage + commit los audit fixes (CHANGELOG.md, index.html, src/App.tsx, src/components/{AdminLayout,CartSection,MenuDigital}.tsx, src/config.ts, src/index.css, src/utils/{orderNumber.ts,useBodyScrollLock.ts}, docs/{ISSUES,FRONTEND_AUDIT,DESIGN_SYSTEM_TOKENS}_2026-07-21.md).
3. **Desde `pizzeria-merge`:** `git merge ci/fix-pipelines-v2`. Resolver conflictos esperados en CHANGELOG.md y package.json.
4. `git push origin master`.

### ⚠️ Artefactos eliminados por diagnóstico falso (2026-07-21)

- ~~`pizzeria-merge/_run_merge_three_projects.sh`~~ — bash script con `cp -r` / `cp -n` / archive `run_<UTC>/`. Totalmente irrelevante en arquitectura worktree.
- ~~`pizzeria-merge/docs/FORK_MERGE_PROPOSAL_2026-07-21.md`~~ — análisis con afirmaciones falsas ("git log vacío en ambos" / "0 commits").
- ~~`pizzeria-merge/docs/FORK_MERGE_EXECUTED_2026-07-21.md`~~ — instrucciones para un script bash que no aplica.

### 🧪 Validación

- `npx tsc --noEmit` → EXIT=0 (0 errores strict typecheck) — confirmado en sesión.
- Auditoría previa (sobre los fixes): 2 rondas de `code-reviewer-minimax-m3` + 2 rondas de `thinker-with-files-gemini`.

### 🗂️ Reorganización de documentación (2026-07-21)

- `docs/DEPLOY_READINESS.md` (sin fecha, claim "95% madurez") → movido a `docs/history/`. Sucesor vigente: [`docs/DEPLOY_READINESS_2026-07-21.md`](docs/DEPLOY_READINESS_2026-07-21.md) (estado REAL al 2026-07-21).
- `docs/IMPLEMENTATION_SUMMARY.md`, `docs/SUGGESTED_FOLLOWUPS.md`, `docs/TEST_REPORT.md`, `docs/DEPLOY_GUIDE.md` (raíz) → archive similar; ver [`docs/DOCUMENTATION_INDEX.md`](docs/DOCUMENTATION_INDEX.md) para el catálogo completo.
- `.env.production.example` aumentado de 40 → 171 líneas (cubre DIAN, SMTP, VAPID, VITE_*, gateway provider tokens que docker-compose/server/client necesitan).

---

## 📊 Leyenda

- `[MAJOR]` — Breaking changes
- `[MINOR]` — Nuevas funcionalidades backwards-compatible
- `[PATCH]` — Bug fixes y mejoras menores
