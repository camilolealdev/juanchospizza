# Arquitectura — Juancho's Pizza / GastroPro

Este documento explica el *por qué* detrás de las decisiones estructurales del proyecto. Para el *qué* (stack, convenciones, roadmap) ver `.ai/shared/project-context.md`. Para setup local ver `README.md`.

## El patrón híbrido landing + CRM + portales

El sitio público (menú, carrito, pedido por WhatsApp) es `index.html` estático — carga rápido, no depende de JavaScript pesado ni del backend. El CRM completo (GastroPro: dashboard, inventario, clientes, finanzas, etc.) es una SPA de React que se monta sobre esa misma página cuando un usuario hace login (botón corona, esquina inferior izquierda).

Dos piezas de React (`MenuDigital`, `CartSection`) necesitan vivir *dentro* del flujo de la landing estática (el menú y el carrito son parte del sitio público, no del CRM) — para eso existen los "mount points" en `index.html` (`#menu-mount`, `#cart-mount`, `#reviews-mount`) y `App.tsx` las inyecta ahí vía `createPortal`. El resto del árbol de React (el overlay del CRM) se monta directo en `#root`.

**Por qué no un router (React Router, etc.):** no hay suficientes rutas distintas para justificarlo — la única excepción es `/confirmacion` (post-checkout de Bold), resuelta con un chequeo directo de `window.location.pathname` en `App.tsx`. Si se agregan más páginas standalone, esto merece revisarse.

**Historia:** este patrón reemplazó una versión anterior donde `CustomerView.tsx` era una re-implementación completa del storefront dentro del CRM (commit `1fcc7eb`, 2026-06-05). Esa pieza quedó muerta (nunca se volvió a rutear) pero siguió recibiendo código nuevo por sesiones que no se dieron cuenta -- fue borrada el 2026-07-09 después de rastrear su historia con `git log`, rescatando lo único valioso que tenía (`TrackOrderModal`, `ApprovedReviews`) hacia la landing real.

## Frontend vs. backend: dos cosas separadas, un solo repo

`vercel.json` es una config de Vite SPA pura -- sin funciones serverless, sin carpeta `/api`. **Vercel solo construye y sirve el frontend estático.** El backend Express (`server/`) es una app aparte, pensada para correr en Docker sobre un VPS (`docker-compose.yml`), no en Vercel. Confundir esto lleva a asumir que "desplegar a Vercel" alcanza para tener el sitio funcionando de punta a punta -- no alcanza, el CRM/checkout necesitan el backend vivo en algún lado aparte.

Mientras el backend no esté desplegado, el sitio público (menú + WhatsApp) sigue funcionando igual: `MenuDigital.tsx` usa datos hardcodeados (`PRODUCTS`/`CATEGORIES` en el mismo archivo), nunca llama a la API. Los puntos que sí dependen del backend (login CRM, checkout con Bold, seguimiento de pedido) degradan con un mensaje honesto en vez de romperse -- ver `apiFetch()` en `src/services/api.ts`.

## Backend: routers por recurso

`server/index.js` es solo bootstrap (102 líneas: middleware, monta routers, listen). Cada recurso tiene:
- `server/routes/<recurso>.js` — las rutas Express.
- `server/schemas/<recurso>.js` — validación Zod del body de cada POST/PUT/PATCH.

`server/auth.js`, `server/db.js`, `server/push.js` no siguen ese patrón a propósito -- son singletons transversales (un pool de conexión, un módulo de auth), no recursos con CRUD propio.

**Convención de update parcial:** las rutas PUT usan un array `updates`/`params` construido dinámicamente (solo los campos presentes en el body entran al `UPDATE ... SET`), no una lista fija de columnas -- una lista fija sobreescribe con `NULL` cualquier campo que el caller no haya mandado. Dos rutas (`inventory`, `expenses`) tuvieron este bug al agregarse y ya se corrigieron; si se agrega una ruta PUT nueva, seguir el patrón dinámico.

## Autenticación

JWT firmado a mano (HMAC-SHA256, sin librería externa) + PINs de 4 dígitos con PBKDF2 y salt random por usuario. La lista de usuarios sigue hardcodeada en `server/auth.js` (deuda conocida, ver `.ai/shared/project-context.md`). Access tokens duran 15 minutos; el refresh token tiene un tope de sesión total de 30 días vía `origIat`, aunque el frontend hoy no llama al endpoint de refresh en ningún lado (queda para cuando se implemente auto-refresh).

## Pagos

Cada proveedor sigue el mismo patrón: la orden se crea PRIMERO (con `paymentStatus: 'pending'` para métodos online), y solo el webhook del proveedor -- nunca el cliente ni la respuesta síncrona del create-payment -- puede pasarla a `'paid'`. Los tres webhooks (Bold, MercadoPago, Wompi) fallan cerrado (503) si falta su secret de verificación, en vez de procesar sin validar. PayPal y MercadoPago están ocultos del selector de métodos en el frontend hasta tener integraciones reales (PayPal es un stub, MercadoPago hardcodea un método de pago que no aplica a Colombia) -- el código sigue ahí, solo no se ofrece.

## Base de datos

Postgres. `server/db.js`'s `initDB()` es la fuente de verdad real (se corre en cada boot, es idempotente vía `IF NOT EXISTS`). `docker/postgres/schema.sql` es un espejo para bootstrapear un volumen vacío desde cero -- si divergen, `initDB()` gana.

## Deuda estructural conocida

Ver la sección "Deuda Técnica" en `.ai/shared/project-context.md` para la lista viva. Las dos más grandes al escribir esto: sin tests automatizados sobre `server/routes/`/`server/schemas/`, y `tsconfig.json` sin `strict: true`.
