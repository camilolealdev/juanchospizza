# Arquitectura — Juancho's Pizza / GastroPro

Este documento explica el _por qué_ detrás de las decisiones estructurales del proyecto.
Para setup local ver `README.md`. Para despliegue ver `DEPLOY.md`.

---

## Índice

- [El patrón híbrido landing + CRM + portales](#el-patrón-híbrido-landing--crm--portales)
- [Frontend vs. Backend](#frontend-vs-backend)
- [Backend: routers por recurso](#backend-routers-por-recurso)
- [Autenticación](#autenticación)
- [Pagos](#pagos)
- [Base de datos](#base-de-datos)
- [Infraestructura Docker](#infraestructura-docker)
  - [Rate Limiting](#rate-limiting)
  - [Nginx](#nginx)
- [PWA](#pwa)
- [Deuda estructural conocida](#deuda-estructural-conocida)

---

## El patrón híbrido landing + CRM + portales

El sitio público (menú, carrito, pedido por WhatsApp) es `index.html` estático — carga rápido, no depende de JavaScript pesado ni del backend. El CRM completo (GastroPro: dashboard, inventario, clientes, finanzas, etc.) es una SPA de React que se monta sobre esa misma página cuando un usuario hace login (botón corona, esquina inferior izquierda).

Dos piezas de React (`MenuDigital`, `CartSection`) necesitan vivir _dentro_ del flujo de la landing estática (el menú y el carrito son parte del sitio público, no del CRM) — para eso existen los "mount points" en `index.html` (`#menu-mount`, `#cart-mount`, `#reviews-mount`) y `App.tsx` las inyecta ahí vía `createPortal`. El resto del árbol de React (el overlay del CRM) se monta directo en `#root`.

**Por qué no un router (React Router, etc.):** no hay suficientes rutas distintas para justificarlo — la única excepción es `/confirmacion` (post-checkout de Bold), resuelta con un chequeo directo de `window.location.pathname` en `App.tsx`. Si se agregan más páginas standalone, esto merece revisarse.

**Historia:** este patrón reemplazó una versión anterior donde `CustomerView.tsx` era una re-implementación completa del storefront dentro del CRM (commit `1fcc7eb`, 2026-06-05). Esa pieza quedó muerta (nunca se volvió a rutear) pero siguió recibiendo código nuevo por sesiones que no se dieron cuenta — fue borrada el 2026-07-09 después de rastrear su historia con `git log`, rescatando lo único valioso que tenía (`TrackOrderModal`, `ApprovedReviews`) hacia la landing real.

---

## Frontend vs. Backend

`vercel.json` es una config de Vite SPA pura — sin funciones serverless, sin carpeta `/api`. **Vercel solo construye y sirve el frontend estático.** El backend Express (`server/`) es una app aparte, pensada para correr en Docker sobre un VPS (`docker-compose.yml`), no en Vercel.

Mientras el backend no esté desplegado, el sitio público (menú + WhatsApp) sigue funcionando igual: `MenuDigital.tsx` usa datos hardcodeados (`PRODUCTS`/`CATEGORIES` en el mismo archivo), nunca llama a la API. Los puntos que sí dependen del backend (login CRM, checkout con Bold, seguimiento de pedido) degradan con un mensaje honesto en vez de romperse — ver `apiFetch()` en `src/services/api.ts`.

---

## Backend: routers por recurso

`server/index.js` es solo bootstrap (102 líneas: middleware, monta routers, listen). Cada recurso tiene:

- `server/routes/<recurso>.js` — las rutas Express.
- `server/schemas/<recurso>.js` — validación Zod del body de cada POST/PUT/PATCH.

`server/auth.js`, `server/db.js`, `server/push.js` no siguen ese patrón a propósito — son singletons transversales (un pool de conexión, un módulo de auth), no recursos con CRUD propio.

**Convención de update parcial:** las rutas PUT usan un array `updates`/`params` construido dinámicamente (solo los campos presentes en el body entran al `UPDATE ... SET`), no una lista fija de columnas — una lista fija sobreescribe con `NULL` cualquier campo que el caller no haya mandado. Dos rutas (`inventory`, `expenses`) tuvieron este bug al agregarse y ya se corrigieron; si se agrega una ruta PUT nueva, seguir el patrón dinámico.

---

## Autenticación

JWT firmado a mano (HMAC-SHA256, sin librería externa) + PINs de 4 dígitos con PBKDF2 y salt random por usuario. La lista de usuarios sigue hardcodeada en `server/auth.js` (deuda conocida, ver [Deuda estructural](#deuda-estructural-conocida)). Access tokens duran 15 minutos; el refresh token tiene un tope de sesión total de 30 días vía `origIat`, aunque el frontend hoy no llama al endpoint de refresh en ningún lado (queda para cuando se implemente auto-refresh).

**Fix aplicado (2026-07-29):** `GEMINI_API_KEY` ahora es opcional en `server/config.js`. Antes causaba `process.exit(1)` si faltaba, bloqueando todo el servidor aunque Gemini solo sea menú inteligente. Ahora muestra un warning y continúa.

---

## Pagos

### Arquitectura general

Cada proveedor sigue el mismo patrón: la orden se crea PRIMERO (con `paymentStatus: 'pending'` para métodos online), y solo el webhook del proveedor — nunca el cliente ni la respuesta síncrona del create-payment — puede pasarla a `'paid'`.

Los tres webhooks (Bold, MercadoPago, Wompi) fallan cerrados (503) si falta su secret de verificación, en vez de procesar sin validar.

### Bold (🇨🇴 Colombia) — ✅ Producción

- **Create-link**: endpoint `/api/payments/bold/create-link` crea un link de pago con `expiration_date` (24h en nanosegundos) + `callback_url` que redirige a `/confirmacion?orderNumber=...`.
- **Webhook**: usa **HMAC-SHA256** con el body RAW (capturado con `express.raw()` en `server/index.js` antes de `express.json()`). El header `x-bold-signature` (o fallback a `x-webhook-secret`) se verifica contra `BOLD_WEBHOOK_SECRET`. Soporta formato CloudEvents y formato legacy.
- **Fix crítico (2026-07-29):** `express.raw()` hace que `req.body` sea un Buffer — el handler original accedía a `body.type` sobre un Buffer (todo `undefined`). Corregido parseando con `Buffer.isBuffer()`.

### Wompi (🇨🇴 Colombia) — ✅ Producción

- **Create-transaction**: endpoint `/api/payments/wompi/create-transaction` usa URL de **producción** (`production.wompi.co`) cuando `NODE_ENV=production`, sandbox en desarrollo.
- Incluye `payment_method.type: 'CARD'` + `installments: 1` en el request body.
- `redirect_url` apunta a `/confirmacion?orderNumber=`.
- **Webhook**: verifica checksum contra `WOMPI_EVENTS_SECRET`, status `APPROVED` (mayúsculas — Wompi usa mayúsculas, diferencia de Bold que usa minúsculas).

### MercadoPago — 🚫 Bloqueado

- No aplica a Colombia (hardcodeaba `payment_method_id: 'pix'` que es método brasileño).
- El endpoint retorna **503** con mensaje claro: _"MercadoPago requiere configuración adicional para Colombia. Usar Bold o Wompi."_
- El código comentado en `server/routes/payments.js` tiene el reemplazo listo (PSE/Nequi) para cuando se implemente.

### PayPal — 🚧 Stub

- Endpoint listo pero oculto del selector de métodos en el frontend.

---

## Base de datos

PostgreSQL 17. `server/db.js`'s `initDB()` es la fuente de verdad real (se corre en cada boot, es idempotente vía `IF NOT EXISTS`). `docker/postgres/schema.sql` es un espejo para bootstrapear un volumen vacío desde cero — si divergen, `initDB()` gana.

### Migraciones

Sistema versionado en `server/migrate.js`. Estado actual: 6 migraciones aplicadas.

- `001`: Seed usuarios default
- `002`: Columna email + índice
- `003`: Tabla refresh_tokens
- `004`: username/password 2FA
- `005`: isSuperAdmin flag (idempotente, duplicado con initDB)
- `006`: Más ALTER TABLE (idempotente)

> ⚠️ Migraciones 005 y 006 son redundantes con `initDB()` — no causan error por `IF NOT EXISTS` pero son código muerto.

---

## Infraestructura Docker

### Servicios (4)

| Servicio   | Imagen                         | Propósito                         |
| ---------- | ------------------------------ | --------------------------------- |
| `app`      | `node:22-alpine` (multi-stage) | Express API + frontend estático   |
| `nginx`    | `nginx:alpine`                 | Reverse proxy SSL, rate-limit, WS |
| `postgres` | `postgres:17-alpine`           | Base de datos                     |
| `redis`    | `redis:8-alpine`               | Cache + sesiones (AOF + LRU)      |

### Hardening

- **Multi-stage Dockerfile**: 4 etapas (base → deps → build → runtime)
- **Non-root user**: `appuser:1001`
- **Read-only FS**: con `tmpfs` para `/tmp`, `/var/cache`
- **Capability drop**: `cap_drop: ALL` (nginx exceptions: `NET_BIND_SERVICE`, `CHOWN`, `SETUID`, `SETGID`)
- **No new privileges**: `no-new-privileges:true`
- **Redes separadas**: `app-network` (internal) + `edge` (solo nginx)
- **Límites de recursos**: CPU/memoria reservas + límites
- **Healthchecks**: en todos los servicios

### Rate Limiting

Las zonas de rate limit están definidas en **nginx** (límite por IP a nivel proxy) y reforzadas en **Express** (límite por IP a nivel aplicación, con Redis compartido entre réplicas).

| Límiter            | Ventana | Máx                 | Medio                    | Dónde                      |
| ------------------ | ------- | ------------------- | ------------------------ | -------------------------- |
| General            | 60 s    | 100 req             | Redis (fallback memoria) | Express `generalRateLimit` |
| Login              | 15 min  | 10 intentos         | Redis                    | Express `loginRateLimit`   |
| Review             | 30 min  | 5 reseñas           | Redis                    | Express `reviewRateLimit`  |
| Consent (Ley 1581) | 15 min  | 20 req              | Redis                    | Express `consentRateLimit` |
| ARCO               | 24 h    | 5 solicitudes       | Redis (por email/tel)    | Express `derechoRateLimit` |
| nginx general      | 1 s     | 100 req + burst 200 | Nginx shared memory      | `limit_req zone=general`   |
| nginx login        | 1 min   | 10 req + burst 5    | Nginx shared memory      | `limit_req zone=login`     |
| nginx API          | 1 min   | 200 req + burst 50  | Nginx shared memory      | `limit_req zone=api`       |

**Redis como capa compartida:** Cuando hay múltiples réplicas del backend, Redis sincroniza los contadores entre instancias. Sin Redis, el factory de `rateLimit.js` degrada a un `Map` en memoria — funciona igual pero cada réplica tiene su propio contador independiente.

**Fix crítico aplicado (2026-07-29) — `redis.expire()` ms vs segundos:**

```diff
- await redis.expire(redisKey, windowMs);   // windowMs en MILISEGUNDOS
+ await redis.expire(redisKey, Math.ceil(windowMs / 1000));  // redis.expire espera SEGUNDOS
```

El general limiter (windowMs=60000) creaba un TTL de **60000 segundos (~16.6 horas)** en vez de 60 segundos. El login limiter (15 min) creaba **900000 segundos (~10.4 días)**. El consent y ARCO tenían ventanas aún más largas. **Impacto:** un usuario que excedía el límite quedaba bloqueado por horas o días completos, no por segundos o minutos como estaba diseñado.

**Fix aplicado (2026-07-29) — Health check bypass:**

`/api/health` y `/api/metrics` estaban definidos **después** de `app.use(generalRateLimit)` en `server/index.js`. Docker HEALTHCHECK (`wget http://localhost:3001/api/health` directo al contenedor, sin pasar por nginx) consumía 1 request cada 30s (~2 por minuto) del bucket del rate limiter. Durante el PWA audit (Playwright haciendo ~100 requests desde la misma IP Docker), el rate limiter se agotó y el health check recibió HTTP 429 por 35 ciclos consecutivos — Docker marcó el contenedor `unhealthy` aunque servía tráfico real sin problema.

**Solución:** Movidos ambos endpoints **antes** de `app.use(generalRateLimit)`. Coincide con nginx, donde `/api/health` y `/api/metrics` ya eran locations sin `limit_req`.

### Nginx

**Fixes aplicados (2026-07-29):**

1. **`limit_req off` removido**: las locations `/api/health` y `/api/metrics` se movieron fuera del bloque `/api/` padre para evitar la herencia de rate-limit, ya que nginx 1.31 no soporta `limit_req off;` en locations anidadas.
2. **Logs a stdout/stderr**: el contenedor tiene `read_only: true` — `/var/log/nginx` no es escribible. Todos los logs van a `/dev/stdout` y `/dev/stderr` (patrón Docker estándar).
3. **`http2 on;` separado**: nginx 1.25+ deprecó el parámetro `http2` en `listen 443 ssl http2`. Ahora se usa `listen 443 ssl` + directiva `http2 on;` independiente.
4. **Consistente con Express**: `/api/health` y `/api/metrics` ya eran locations sin rate-limit en nginx. El fix del sidecar (Express) completa la simetría.

### .env Strategy

Docker Compose lee variables de dos fuentes:

- **`.env`**: para interpolación de `${VARIABLES}` en `docker-compose.yml` (como `${POSTGRES_PASSWORD}`).
- **`.env.production`**: como `env_file` del servicio `app` (contiene todas las variables de runtime: API keys, JWT, URLs, etc.).

Esta separación es necesaria porque docker-compose no usa `env_file` para interpolación de compose.

---

## PWA

### Service Worker

`vite-plugin-pwa` con `registerType: 'autoUpdate'` y estrategias:

- **Assets con hash** (JS/CSS/imágenes): `StaleWhileRevalidate` (30 días)
- **Navegación/HTML**: `NetworkFirst` (7 días, cae a caché offline)
- **API**: no se cachea (datos dinámicos)

### Iconos

Generados en SVG (vectoriales) + convertidos a PNG con `sharp`:

- **Temática**: pizza artesanal con masa dorada, pepperoni, aceitunas, pimientos, queso derretido y fondo naranja degradado.
- **Maskable**: el 512×512 mantiene la pizza dentro del 80% central para recorte Android.
- **iOS**: `apple-touch-icon` 180×180 + meta tags `apple-mobile-web-app-capable`.

> Ver `tools/generate-pwa-icons.cjs` para regenerar PNGs desde SVGs.

---

## Deuda estructural conocida

1. **Sin tests automatizados sobre `server/routes/`** — los tests existentes cubren schemas Zod, auth y orders, pero no las 30 rutas restantes.
2. **`tsconfig.json` sin `strict: true`** — aunque `tsc --noEmit` da 0 errores, no está en modo estricto.
3. **Usuarios hardcodeados en `server/auth.js`** — deberían migrarse a la tabla `employees` completamente.
4. **Migraciones 005/006 redundantes** con `initDB()` — código muerto.
5. **No hay auto-refresh de JWT en frontend** — el endpoint de refresh existe pero el frontend nunca lo llama.
6. **MercadoPago bloqueado para Colombia** — requiere implementación con PSE/Nequi.
7. **DIAN** — estructura de facturación lista pero sin integración real con proveedor tecnológico.

---

> _Documento actualizado: Julio 2026. Próxima revisión: post-deploy._
