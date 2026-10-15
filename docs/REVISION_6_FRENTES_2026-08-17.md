# 🔬 Revisión Detallada 6 Frentes — Juancho's Pizza / GastroPro

> **Fecha:** 2026-08-17
> **Proyecto:** pizzeria-merge (React 18 + TS + Vite + Tailwind / Express + PostgreSQL 17 + Redis 8 + Nginx + Docker)
> **Método:** 6 frentes especializados — Arquitectura, Backend, Frontend, Ponytail (sobre-ingeniería), Imágenes y estado de tareas previas. Las afirmaciones históricas se marcan como tales; el estado vigente está en las tablas de resolución y en `PENDIENTES_OPERACIONALES_2026-08-17.md`.
> **Base:** revisión previa de 8 agentes en `docs/REVISION_2026-08-14.md` y `docs/INFORME_CONSOLIDADO_PENDIENTES_2026-08-17.md`.

---

## 📊 Veredicto General

| Frente            | Estado         | Hallazgos críticos                                                           |
| ----------------- | -------------- | ---------------------------------------------------------------------------- |
| 1. Arquitectura   | ✅ Sólida      | 1 deuda de documentación                                                     |
| 2. Backend        | ✅ Sólido      | 1 decisión funcional externa (WhatsApp)                                      |
| 3. Frontend       | ✅ Sólido      | 1 pendiente menor                                                            |
| 4. Ponytail       | 🟠 3 hallazgos | Código muerto + archivo basura                                               |
| 5. Imágenes       | ✅ Resuelto    | Imágenes locales verificadas; queda solo decidir si se re-seedea producción  |
| 6. Tareas previas | 🟠 Parcial     | Código principal resuelto; quedan operación externa y decisiones de producto |

---

## Frente 1 — Arquitectura

**Verificado contra `ARCHITECTURE.md`:**

- ✅ Patrón híbrido landing estática + CRM overlay SPA confirmado en `App.tsx`: portales a `#menu-mount`, `#cart-mount`, `#reviews-mount`, `#pizza-builder-mount`; única ruta standalone `/confirmacion` por `window.location.pathname` — coherente sin React Router.
- ✅ Backend routers por recurso: 30 routers en `server/routes/`, cada uno con su schema Zod en `server/schemas/`. Bootstrap limpio (102 líneas en `server/index.js`).
- ✅ Convención de update parcial (arrays `updates`/`params` dinámicos): verificada en `finance.js` (expenses PUT), `campaigns.js`, `clients.js` (PATCH y PUT separados) — correcta.
- ✅ Seguridad: Helmet CSP granular, CSRF double-submit, rate limiting multi-capa (nginx + Express + Redis), `trust proxy 1`, graceful shutdown con SIGTERM/SIGINT, manejo de unhandledRejection/uncaughtException.
- ⚠️ **Deuda de doc:** `ARCHITECTURE.md` §Autenticación dice _"usuarios hardcodeados en server/auth.js"_ pero `auth.js` ya autentica contra la tabla `employees` de la DB (migración #001/#004). La deuda se pagó; el doc quedó desactualizado.

**Acción:** actualizar §Autenticación y §Deuda estructural #3 en `ARCHITECTURE.md` (5 min).

---

## Frente 2 — Backend (funcionalidad)

**Verificado:** `server/index.js`, `server/auth.js`, `server/routes/{campaigns,clients,finance}.js`.

- ✅ **Auth robusto:** PBKDF2-100k con salt por usuario, `timingSafeEqual`, lockout por cuenta (5 intentos / 15 min, ventana fija con comentario ponytail), dummy hash anti-timing-enumeration, JWT 15 min + refresh con tope de sesión 30 días (`origIat`), cookie HttpOnly + SameSite=Lax + Secure en prod.
- ✅ **Anti-tampering de precios:** `POST` y `PUT` de orders ignoran el total enviado por el cliente y recalculan el importe desde el catálogo dentro de la transacción.
- ✅ **Webhooks fail-closed** (Bold HMAC raw body, Wompi checksum), `/api/health` y `/api/metrics` fuera del rate limiter.
- ✅ **Zod en todas las rutas de escritura**; errores 404/409 correctos (FK de clientes sin CASCADE preserva historial).
- ✅ **Anti-tampering de precios en orders** (recalculo server-side, documentado en REVISION_2026-08-14).
- ✅ **Email de bienvenida no bloqueante** en POST /api/clients (`.catch` con log).

**Pendientes funcionales:**

| #   | Pendiente                                                      | Evidencia                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Scheduler de campañas `scheduled`**                          | ✅ Resuelto el 2026-08-17: `campaignScheduler.js` transiciona campañas vencidas a `active` y despacha email/push cuando hay credenciales. WhatsApp sigue pendiente por falta de API conectada.                                                                                                                                                                                                                                                                                                                       |
| 2   | ~~**Paginación incompleta**~~ → **RESUELTO (2026-08-17)**      | `GET /api/clients`, `GET /api/orders` y `GET /api/inventory/movements` aceptan `?page=&pageSize=` y devuelven `{ data, total, page, pageSize, totalPages }`; se mantiene compatibilidad sin parámetros.                                                                                                                                                                                                                                                                                                              |
| 3   | ~~**Métricas de campañas son 0**~~ → **RESUELTO (2026-08-17)** | El scheduler ahora **despacha** la campaña activada por los canales reales disponibles: **email** (SMTP, template `campaign` con `renderTemplate`) y **push** (web-push, `sendPushToPhone` por suscripciones del teléfono), y escribe `reach` = clientes alcanzados y `conversions` = envíos logrados. Ambos canales son best-effort (skip si faltan credenciales, fallo por cliente no aborta la campaña). **WhatsApp NO tiene API de envío en el repo** (solo `wa.me` para órdenes) — canal pendiente de decisión. |

---

## Frente 3 — Frontend (funcionalidad)

**Verificado:** `App.tsx`, `src/services/api.ts`, `MarketingView.tsx`, uso de imágenes en `MenuDigital.tsx`.

- ✅ **Lazy-loading por módulo CRM** (20 vistas `lazy()`), recharts lazy por vista, guard por rol en URL (`ROLE_MODULE_ACCESS` + `guardModuleAccess`), deep-linking `/admin/<module>` con popstate.
- ✅ **api.ts:** refresh queue con promesa compartida (evita N refrescos paralelos), CSRF double-submit automático en mutaciones, manejo de red con mensaje amigable, `VITE_API_URL` vacío = rutas relativas (sin localhost horneado).
- ✅ **MarketingView honesto:** el gráfico recharts ni siquiera se carga cuando no hay métricas (`useLazyCharts(!loading && !metricsNotTracked)`).
- ✅ Login con username real (no select de rol), logout que limpia cookie server-side.
- ⚠️ **Menor:** `PaymentSettingsView` sigue siendo solo un panel de estado (lee `/api/payments/status`); no configura credenciales ni prueba webhooks. Aceptable como panel informativo — decisión de producto.

---

## Frente 4 — Ponytail (sobre-ingeniería / código muerto / deps)

**Método:** ladder ponytail — ¿existe?, ¿ya está en el repo?, ¿se usa?, mínimo viable.

- ✅ **Deps todas justificadas:** `node-forge` (DIAN signer), `pdf-lib` (invoices), `sharp` (PWA icons), `prom-client` (metrics), `ioredis` (rate limit compartido), `web-push`, `nodemailer`, `ws`, `pino` — cada una con ≥1 uso real. **Cero deps muertas.**
- ✅ **Copia muerta de assets YA eliminada:** `src/assets/images/{ingredients,products}` (65 SVG) borrada en commit `4a855f3` — pendiente de la sesión anterior resuelto.
- ✅ **Hallazgo 1 RESUELTO (2026-08-17, quick wins):** los mapas legacy `config/images.ts` (PRODUCT_IMAGES) y `config/ingredientImages.ts` (INGREDIENT_IMAGES) eran código muerto (~190 líneas, nadie importaba `config/index`; el menú usa `p.image` de la DB) → **borrados**, exports removidos de `config/index.ts`. `realIngredientIcons.ts` se conserva (PizzaBuilder lo importa directo). Verificado: cero referencias de código restantes.
- ✅ **Hallazgo 2 RESUELTO (2026-08-17):** archivo `nul` de la raíz (artefacto Windows `> nul` en bash, 65 bytes) **borrado**.
- ℹ️ `graphify-out/` contiene manifiestos JSON de una herramienta de grafos (incluye rutas de `pizzeria-master` antiguas como `footer-img.png`) — no es código activo; si no se usa, candidato a `.gitignore` o borrado.

---

## Frente 5 — Imágenes (pendiente de la sesión anterior)

**Contexto:** la sesión anterior (`REVISION_2026-08-14.md`) reportó: (a) `pina.svg` perdida por typo `pioa.svg` → **RECUPERADA** ✓; (b) copia muerta `src/assets/images/{ingredients,products}` → **ELIMINADA** ✓ (commit `4a855f3`); (c) `footer-img.png`/`logo.png` reemplazados por `.webp` → correcto.

**Verificación actual (escaneo programático de 91 rutas referenciadas vs. disco):**

- ✅ **0 referencias rotas** en producción real: las 91 rutas de `src/`, `index.html`, `public/*.js`, `public/*.css` resuelven contra `public/` o `src/assets/` correctamente.
- ✅ Assets del sitio público OK: `logo.webp`, `footer-img.webp` (styles.css:259), `pizza-logo.mp4` + `pizza-logo-poster.webp` (index.html:211), favicons, `og-image.jpg` — todos existen y se referencian.
  ✅ Los hallazgos de imágenes anteriores quedaron resueltos por la Opción B: el seed ya no depende de Unsplash y cada producto tiene una imagen SVG local; `pizza-tradicional.svg` queda como asset auxiliar sin referencia directa.

**✅ Decisión tomada: Opción B — imágenes propias por producto (IMPLEMENTADA 2026-08-17)**

| Cambio                                      | Detalle                                                                                                                                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/generate-product-images.cjs` (nuevo) | Generador procedural idempotente: 54 SVGs, uno por producto, estilo consistente con los legacy (`#1a1a1a`, viewBox 400×300), toppings derivados de la descripción real, PRNG determinístico por id (diff git limpio). |
| `public/assets/images/products/<id>.svg`    | 54 SVGs generados + los 2 legacy (`pizza-default`, `pizza-tradicional`) = 56 archivos. Verificado: 54/54 productos tienen su SVG.                                                                                     |
| `server/seedData/juanchosMenu.js`           | Eliminado el bloque `IMG` (Unsplash) y las 54 líneas `image:` — el seed ya no depende de fotos de terceros.                                                                                                           |
| `server/routes/misc.js`                     | El seed deriva la imagen por id: `/assets/images/products/<id>.svg` (un solo punto de cambio en vez de 54 líneas).                                                                                                    |
| `src/components/MenuDigital.tsx`            | Fallback defensivo `onError` → `pizza-default.svg` (con guard anti-loop).                                                                                                                                             |

**Verificación:** ✅ `tsc --noEmit` 0 errores · ✅ eslint limpio · ✅ 276/276 tests server · ✅ 0 referencias `IMG.` colgantes en seed.

**Nota histórica corregida:** los mapas legacy `config/images.ts` + `config/ingredientImages.ts` fueron eliminados; `realIngredientIcons.ts` se conserva porque sí tiene uso.

---

## Frente 6 — Estado de tareas previas (paginación, tests, scheduler)

| Tarea solicitada antes                                 | Estado                                         | Evidencia                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tests para rutas críticas (products, clients, finance) | ✅ **3/3**                                     | ✅ `products.test.js`, `clients.test.js` y **`finance.test.js`** (15 tests: GET/POST/PUT/DELETE expenses + summary).                                                                                                                                                                                                                                      |
| Paginación en endpoints sin LIMIT                      | ✅ **Resuelto (clients + orders + inventory)** | `page`/`pageSize` con `COUNT(*)` + `total`/`totalPages` en los 3; back-compat sin params (movements conserva tope defensivo LIMIT 50). **Frontend conectado:** InventarioView consume el shape paginado con controles Anterior/Siguiente (tipo `Paginated<T>` nuevo en api.ts); la stat card muestra el total real de movimientos en vez de "últimos 50". |
| Scheduler para campañas `scheduled`                    | ✅ **Resuelto (2026-08-17)**                   | `server/services/campaignScheduler.js` (setInterval 60s + `UPDATE ... WHERE status='scheduled' AND "scheduleAt" <= NOW()`); migración #011 agrega `scheduleAt`; campo datetime en MarketingView; **conectado a canales reales**: email (template `campaign`) + push (web-push) con `reach`/`conversions` poblados; 308/308 tests.                         |
| Backups VPS / nginx / credenciales                     | 🟠 Operacional                                 | El deploy ya crea backup pre-deploy en el VPS; aún falta cron diario + restore de prueba, recargar nginx en producción y completar credenciales externas.                                                                                                                                                                                                 |

---

## 🎯 Plan de Acción Recomendado (priorizado)

### 🔴 Fase 1 — Quick wins

1. ✅ **`nul` borrado** de la raíz (artefacto Windows).
2. ✅ **Mapas de imágenes muertos borrados** (`config/images.ts`, `config/ingredientImages.ts`, exports de `config/index.ts`) — `realIngredientIcons.ts` conservado.
3. ✅ **`ARCHITECTURE.md` actualizado** — §Autenticación documenta login contra `employees` (migraciones #001/#004/#010), lockout por cuenta, refresh queue del frontend; §Migraciones al día (11); deuda estructural revisada (items 1/3/5 resueltos).
4. ✅ **`server/tests/finance.test.js` creado** (15 tests) — triada products/clients/finance completa.

### 🟠 Fase 2 — Funcionalidad (2-3 h)

5. ✅ **Scheduler de campañas IMPLEMENTADO + CONECTADO A CANALES:** `server/services/campaignScheduler.js` — cron simple sin `node-cron` (una query SQL, ladder ponytail rung 5). Migración #011 (`scheduleAt`), API POST/PUT con fecha, campo `datetime-local` en el form (visible con status `scheduled`), badge de activación en la card, tick inmediato al boot + `clearInterval` en graceful shutdown. **Envío real al activarse:** email (template `campaign` en `email.js` con `renderTemplate`/`sendTemplatedEmail`) + push (`sendPushToPhone` ahora devuelve conteo de entregados); `reach`/`conversions` se actualizan en la fila de la campaña. WhatsApp queda documentado como pendiente (no hay API de envío).
6. ✅ **Paginación real** en `clients` y `orders` (LIMIT/OFFSET con `page`/`pageSize` + `COUNT(*)`).

### 🟡 Fase 3 — Decisión de producto

7. ✅ **Imágenes del menú: Opción B implementada** (SVGs procedurales por producto, seed sin Unsplash, fallback onError). Pendiente operativo: decidir si se regenera la DB en producción con el seed (`POST /api/seed`).
8. **PaymentSettingsView:** ¿panel de estado o configuración activa?

---

## ❓ Preguntas para decidir

1. ✅ **Imágenes del menú — RESUELTO:** Opción B implementada (SVGs locales por producto). Queda opcional re-seedear producción.
2. ✅ **Scheduler de campañas — RESUELTO + CONECTADO:** cron simple en el server + despacho real por **email y push** (WhatsApp sin API en el repo). `reach`/`conversions` se pueblan al activarse. Verificado end-to-end en browser: campaña vencida → `active`, futura sigue `scheduled`.
3. **Paginación:** ✅ clients + orders + inventory movements resueltos (mismo shape `{data,total,page,pageSize,totalPages}`).
4. **Seguir con VPS/credenciales** (Bold/DIAN) que son el blocker de revenue, ¿o cerrar primero estas deudas de código?

---

## 🔍 Verificación en browser post-limpieza (2026-08-17, tarde)

**Script:** `tools/verify-browser.mjs` (reproducible: `node tools/verify-browser.mjs` con server :3001 + vite :5173). **Resultado: 14/14 checks ✅**

| Check                                                          | Resultado                                                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Landing HTTP 200 + menú montado                                | ✅ 14 <img> de producto                                                                                                         |
| Imágenes 100% SVGs locales (0 Unsplash)                        | ✅ 14/14 + `pz-hawaiana.svg` sirve 200                                                                                          |
| Categorías/interactivos                                        | ✅ 26 botones/links                                                                                                             |
| Login admin (admin/1234, modal real)                           | ✅ localStorage auth_username                                                                                                   |
| Vista de campañas (`/admin/campanas`)                          | ✅ estados active + scheduled visibles, métricas presentes                                                                      |
| **Scheduler end-to-end** (campaña programada con fecha pasada) | ✅ creada → activada por el cron en <60s (`status=active`; reach/conversions en 0 por falta de SMTP/VAPID — fail-open esperado) |

**Bug real encontrado y corregido durante la verificación:** el fallback en memoria de Redis (`server/services/redis.js`) nunca expiraba los contadores del rate-limiter:

- `incr()` no chequeaba `exp` → los contadores se acumulaban para siempre → el limiter terminaba bloqueando **todo** (fail-open que se volvía fail-closed) hasta reiniciar el server.
- `expire()` sumaba los **segundos** que pasa rateLimit.js como si fueran **milisegundos** (ventana de 60s vencía en 60ms).
- `ttl()` devolvía `Infinity` en vez de `-1` para llaves sin TTL.
- **Fix:** `incr` reinicia llaves vencidas y preserva el TTL existente (como Redis real); `expire` interpreta segundos; `ttl` devuelve -2/-1 con semántica Redis. **Test nuevo:** `server/tests/redis.test.js` (4 tests). Afecta a prod: si Redis cae, el fallback ya no bloquea el sitio permanentemente.

**Verificación:** ✅ 312/312 tests server (27 archivos) · ✅ tsc 0 errores · ✅ eslint limpio.

---

## 🐳 Verificación en Docker (2026-08-17, noche) — stack completo con el código actual

**Comando:** `docker compose up -d --build app` (imagen reconstruida con npm ci + vite build; nginx/postgres/redis ya corrían). **Resultado: 14/14 checks en browser contra https://localhost + API verificada + 382/382 tests.**

| Check                                                                                                                                              | Resultado                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Imagen `app` reconstruida con código actual (migraciones #10/#11 aplicadas, push habilitado, Redis conectado)                                      | ✅ health `{database: connected, redis: connected}`                                                                     |
| Frontend vía nginx (http→https 301, cert auto-firmado)                                                                                             | ✅ 200                                                                                                                  |
| Menú en browser contra el contenedor                                                                                                               | ✅ 14 <img>, 14/14 SVGs locales, `pz-hawaiana.svg` → 200 `image/svg+xml`                                                |
| **Seed re-aplicado en la DB del contenedor** (estaba stale: 16 productos sin imagen → `POST /api/seed` = 54 productos, 14 con SVG derivado por id) | ✅ `{categories:7, products:54, pizzaSizes:4, ingredients:23}`                                                          |
| Login admin vía modal real + vista de campañas                                                                                                     | ✅                                                                                                                      |
| **Scheduler end-to-end en el contenedor** (campaña flash `scheduled` con fecha pasada)                                                             | ✅ `scheduled → active` en <60s con log "Campaña activada (reach=0, conversions=0)" (fail-open sin SMTP)                |
| Paginación inventory en el contenedor                                                                                                              | ✅ `{data, total, page, pageSize, totalPages}`                                                                          |
| **Schemas de dinero exigidos en runtime** (fix de hoy)                                                                                             | ✅ pizza-sizes sin `precio` → 400; con `precio` → 201; loyalty sin `puntosCosto` → 400                                  |
| **Caja registradora end-to-end con reconciliación**                                                                                                | ✅ abierta (`initialAmount=50000`) → cerrada con `expectedAmount=50000, finalAmount=50000, difference=0, status=closed` |
| Suite completa                                                                                                                                     | ✅ **382/382 tests** (35 archivos) · ✅ tsc 0 errores · ✅ eslint limpio                                                |

**Nota:** la DB del volumen de Docker estaba stale (seed anterior sin la Opción B de imágenes) — re-seedeada con `POST /api/seed` (admin + CSRF). En producción, aplicar el mismo seed cuando se despliegue la Opción B. El `verify-browser.mjs` ahora acepta `BASE_URL=https://localhost API_URL=https://localhost` (ignora el cert auto-firmado).

---

_Informe generado el 2026-08-17 — Buffy (Codebuff)_
_Fuentes: verificación directa de código + `REVISION_2026-08-14.md` + `INFORME_CONSOLIDADO_PENDIENTES_2026-08-17.md`_
