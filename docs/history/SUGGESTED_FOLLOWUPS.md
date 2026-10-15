# PizzaCRM — Suggested followups (15 opciones)

> Documento vivo. Cada ítem tiene: **WHY** (por qué importa), **WHAT** (qué
> hacer), **HOW** (cómo verificarlo), y **EFFORT/PRIORITY**. Marcá los
> que querés atacar y los vamos incorporando como issues separados.
>
> Contexto: la auditoría interna (`docs/AUDIT_COMPLETO.md`) más los gaps
> que cerramos en los commits `bf6d230` y `a7f3582` dejan una lista de
> mejoras que no son "P0 que rompe" pero sí acercan al estándar mundial
> y a la operación real de la pizzería.

---

## 1. Limpiar el baseline de ESLint (192 errores pre-existentes)
- **WHY**: `server/routes/*` y `server/schemas/*` tienen ~192 `catch (e)` y
  destructures sin uso acumulados. El CI actualmente usa
  `continue-on-error: true` por esta razón — cualquier regresión NUEVA en
  esos archivos queda oculta detrás del ruido.
- **WHAT**: ripgrep → rewrite de `catch (e) {` a `catch {` (Node 22+) en
  server/routes; y `const { x, ...rest } = o; void x;` o rename a `_x`
  donde aplique. Después: revisar `.github/workflows/ci.yml` y volver
  `run: npm run lint` sin `continue-on-error`.
- **HOW**: `npx eslint . --ext .ts,.tsx,.js` debe devolver exit 0. Luego
  commit que flip el workflow a strict lint.
- **EFFORT**: M (1 día). **PRIORITY**: P1.

---

## 2. Smoke test de CSP en producción
- **WHY**: El commit `bf6d230` outer la extracción de ~1900 líneas de `<style>`
  inline + JSON-LD a archivos externos. La promesa es que el browser los
  carga sin violar el prod CSP (sin `'unsafe-inline'`). Si por algún error
  queda referencia inline (un `<script>` que se nos escapó, una clase que
  solo existe inline), el sitio se rompe silenciosamente en prod.
- **WHAT**: Playwright spec que arranca con `NODE_ENV=production`, hace
  GET `/`, y (a) verifica con `page.evaluate` que el response header
  CSP no contiene `'unsafe-inline'`, (b) hace screenshot del hero y
  compara con la baseline, (c) ejecuta Google's Rich Results Test
  contra `/schema.json` y verifica que la estructura sigue parseando.
- **HOW**: `npm run test:e2e -- --grep "prod CSP"`. El spec debe impedir
  deploy a origin/main si falla.
- **EFFORT**: M (0.5 día). **PRIORITY**: P1 (regresión silenciosa).

---

## 3. DIAN signXml() end-to-end contra sandbox del proveedor
- **WHY**: `server/services/dianSigner.js` calcula CUFE y firma con
  RSA-SHA256, pero tira error si `DIAN_CERT_PATH` no está seteado. No
  hemos probado contra un sandbox real de Muisca / Dataico / Novasoft /
  Alegra. Cualquier drift de canonicalization (que es simplificada, no
  C14N estricto) entre lo que firmamos y lo que la DIAN rechaza la
  factura en seco.
- **WHAT**: (a) Obtener `.p12` de prueba de Certicámara;
  (b) setear `DIAN_CERT_PATH` + `DIAN_CERT_PASSWORD` + `DIAN_CLAVE_TECNICA`
  en `.env`; (c) ejecutar `POST /api/invoices` con un payload de prueba;
  (d) si Muisca sandbox devuelve error de canonicalization, reemplazar
  `canonicalizeSimple` por `xml-crypto` (C14N 1.0 estricto según spec).
- **HOW**: crear un fixture `tests/fixtures/sample-invoice.json` con IVA
  19% y receptor de prueba, y un script `node scripts/dian-smoke.js`
  que corre contra sandbox de Muisca y afirma `accepted === true`.
- **EFFORT**: H (1 semana con iteraciones). **PRIORITY**: P0 antes de
  facturar electrónicamente de verdad.

---

## 4. Vite manual chunks + bundle analysis
- **WHY**: `dist/assets/index-*.js` hoy pesa 362 KB (110 KB gzip). El bundle
  entero se sirve en el initial load. Vite permite separar `react`,
  `framer-motion`, `recharts` y `zod` en chunks dedicados para que
  queden cacheados independientemente entre releases.
- **WHAT**: en `vite.config.ts`, agregar `build.rollupOptions.output.manualChunks`
  agrupando por vendor (`node_modules/react`, `node_modules/framer-motion`, etc.),
  y luego correr `vite build --mode analyze` con `rollup-plugin-visualizer`
  para confirmar que el initial chunk bajó ~25%.
- **HOW**: comparar TTFB del `/assets/index-*.js` antes/después con
  Lighthouse en `localhost:3001` (después de `npm run build && npm run server`).
- **EFFORT**: S (0.5 día). **PRIORITY**: P2.

---

## 5. Middleware de compresión HTTP
- **WHY**: Sin `compression` middleware, las respuestas JSON y JS estáticos
  se sirven sin gzip ni brotli. La auditoría marcó esto como gap
  performance P3.
- **WHAT**: `npm install compression`, agregar `app.use(compression())`
  en `server/index.js` antes de los route handlers (no después de los
  static, o no comprime nada). Configurar threshold razonable (>= 1KB).
- **HOW**: `curl -H "Accept-Encoding: gzip" http://localhost:3001/api/menu | wc -c`
  → tamaño menor que sin el header. Smoke en Chrome DevTools Network
  tab: columna "Size" debe mostrar valores gzip.
- **EFFORT**: S (1 hora). **PRIORITY**: P2.

---

## 6. Estrategia del Service Worker del PWA
- **WHY**: `vite.config.ts` declara `NetworkFirst` para TODO lo que no es
  `/api/*`, lo que vuelve a la page offline-first frágil cuando la red
  está flakey. El App Shell debería ser `CacheFirst` o
  `StaleWhileRevalidate`.
- **WHAT**: en `vite.config.ts` → `VitePWA({ workbox: { runtimeCaching: [...] } })`,
  declarar rutas explícitas: `CacheFirst` para `/assets/*` (font comes con
  hash), `StaleWhileRevalidate` para `/styles.css` + `/schema.json`,
  `NetworkFirst` solo para HTML root.
- **HOW**: en Chrome DevTools → Application → Service Workers → Offline,
  verificar que navegar `/` sigue cargando el bundle cacheado (no error
  "no internet").
- **EFFORT**: S (2 horas). **PRIORITY**: P2.

---

## 7. Paginación LIMIT/OFFSET en endpoints de listado
- **WHY**: `/api/orders`, `/api/clients` y `/api/digiturno` cargan la tabla
  completa a memoria del cliente. Riesgo de OOM en semanas de operación.
- **WHAT**: agregar `?limit=50&offset=0` o `?cursor=<base64>` a esos
  endpoints. Validar `limit <= 200`. Devolver `{ items, nextCursor, total }`.
- **HOW**: desde `InvoicesView` / `ClientesView`, cargar primera página y
  verificar que la respuesta pesa < 50 KB (no la tabla entera).
- **EFFORT**: M (1 día). **PRIORITY**: P1 antes de crecimiento real.

---

## 8. Imágenes: srcset + WebP/AVIF + lazy
- **WHY**: `index.html` carga 4 imágenes de Unsplash sin `srcset`,
  sin `loading="lazy"`, sin formato moderno. Mobile 3G tarda 8s.
- **WHAT**: descargar originals a `public/assets/images/products/*.jpg`,
  generar `*.webp` y `*.avif` con `sharp`, agregar `<img srcset=...>` con
  3 breakpoints (mobile/tablet/desktop), `loading="lazy"` en las que
  no son LCP.
- **HOW**: Lighthouse mobile en Chrome DevTools → Performance, debería
  mejorar LCP ~40%.
- **EFFORT**: M (1 día). **PRIORITY**: P2.

---

## 9. Rate limit con Redis (no en memoria)
- **WHY**: `server/middleware/rateLimit.js` usa un `Map` en memoria.
  Cuando reiniciás el server todos los contadores vuelven a 0, y si
  escalás horizontalmente cada réplica tiene su propio balde → rate
  limit global efectivo = N × RPS.
- **WHAT**: `npm install rate-limit-redis ioredis`, reemplazar el backend.
  Ya hay `redis` en `docker-compose.yml` — solo agregamos wiring.
- **HOW**: load test con `wrk -t 10 -c 100 -d 30s http://localhost:3001/api/orders`,
  todas las réplicas detrás de nginx deben cortar a la misma cuenta
  global; sin Redis cada réplica permite sus 100 requests.
- **EFFORT**: M (1 día). **PRIORITY**: P1.

---

## 10. Test E2E de Host Header Injection en /api/payments/*
- **WHY**: El commit `bf6d230` reemplazó `req.get('origin')` por
  `process.env.FRONTEND_URL` en `server/routes/payments.js`. Es una
  decisión correcta pero queremos un test que la bloquee como regresión.
- **WHAT**: Playwright spec que envía `POST /api/payments/wompi/create-transaction`
  con header `Origin: https://attacker.example.com` y verifica que la
  respuesta tiene `redirect_url` apuntando a `https://fronted-real.example`,
  NO `https://attacker.example.com`.
- **HOW**: spec agregado a `e2e/security.spec.ts`, ejecutado en CI.
- **EFFORT**: S (2 horas). **PRIORITY**: P1.

---

## 11. Rate-limit + CAPTCHA en /api/consent
- **WHY**: `POST /api/consent` es público (sin auth), lo que significa
  que cualquier bot puede inflar la tabla `consent_eventos` hasta
  agotar storage.
- **WHAT**: (a) aplicar `generalRateLimit` específico con techo bajo
  (10 req / IP / hora); (b) para volumen alto, exigir prueba de turnstile
  / reCAPTCHA v3 desde el `public/consent-banner.js`.
- **HOW**: load test del endpoint, debe cortar > 1000 req/min desde una IP.
- **EFFORT**: M (1 día). **PRIORITY**: P1.

---

## 12. 2FA TOTP para rol ADMIN
- **WHY**: ADMIN tiene acceso a /api/employees, /api/finance,
  /api/procurement, etc. Solo PIN de 4 dígitos hoy. Robo de PIN = compromiso
  total.
- **WHAT**: `npm install otplib qrcode`. En `auth.js`: tras validar PIN
  generar un challenge TOTP; el flujo de login exige además un código
  de 6 dígitos de Google Authenticator / Authy.
- **HOW**: nuevo `server/auth.test.js` test que verifica que un ADMIN sin
  código TOTP recibe 401; con código correcto obtiene JWT.
- **EFFORT**: M (2 días). **PRIORITY**: P1.

---

## 13. Audit log de ARCO + consent
- **WHY**: SIC exige demostrar trazabilidad de las solicitudes ARCO
  durante 7 años. El log app-level debe distinguir "consulta recibida",
  "consulta respondida", "dato entregado a titular", "dato eliminado",
  etc.
- **WHAT**: nueva tabla `audit_eventos` con `(tipo, actor, target,
  metadata_json, occurred_at, ip)`. Trigger automático en cada
  inserción en `consent_eventos` y `derechos_solicitudes`. Endpoint
  `GET /api/audit?from=&to=` solo para SUPER_ADMIN.
- **HOW**: vi.test.js que verifica la cascada; spec E2E que dispara
  POST /api/derecho/consulta y luego confirma que el evento quedó en
  `audit_eventos` con `tipo='arco_consulta_recibida'`.
- **EFFORT**: M (1 día). **PRIORITY**: P1 por compliance.

---

## 14. Backup/restore drill de PostgreSQL mensual
- **WHY**: `pg_dump` corre nightly en `docker-compose.yml` pero nunca
  probamos restaurar. Si el backup está corrupto nos enteramos al perder
  data — no antes.
- **WHAT**: cron mensual en un script `scripts/dr-restore.sh` que:
  (a) descarga el último backup de S3; (b) levanta un Postgres efímero
  en Docker; (c) corre `pg_restore`; (d) verifica `SELECT count(*) FROM
  orders;` contra el último valor conocido + corre 50 queries
  representativas.
- **HOW**: en CI mensual (GitHub Actions cron schedule `cron: '0 6 1 * *'`)
  o alert si falla.
- **EFFORT**: M (1 día). **PRIORITY**: P0 antes de cobrar.

---

## 15. Auditoría WCAG 2.2 AA sobre consentimiento + pizza builder
- **WHY**: El consent banner (`public/consent-banner.js`) y el pizza
  builder son UI custom con animación, focus management, y contraste que
  no podemos probar automáticamente. Ley 1681/2013 + estándares worldclass
  piden AA.
- **WHAT**: (a) `axe-core` con Playwright para barrido automático sobre
  las vistas; (b) revisión manual con NVDA en Windows y VoiceOver en
  macOS del flujo "armar pizza → checkout"; (c) documentar en
  `docs/A11Y_AUDIT.md` cada hallazgo con severidad AA y remediation.
- **HOW**: spec Playwright ejecuta axe en cada page de `e2e/` y bloquea
  si hay findings `serious` o `critical`.
- **EFFORT**: L (3 días). **PRIORITY**: P2.

---

## Sugerencias bonus (no cuentan dentro de las 15)

A. **Compresión + Cache-Control**: combinar #5 con `Cache-Control:
   public, max-age=31536000, immutable` para assets hasheados — reduce
   ancho de banda + RTTs de cache miss.

B. **Observabilidad**: pino structured logs + OpenTelemetry traces →
   Honeycomb o SigNoz. La pizzería corre fines de semana picos; sin
   tracing revertimos cambios a ciegas.

C. **Doble factor JWT_SECRET**: hoy un solo `JWT_SECRET` firma access
   + refresh. Si lo rotás, invalidas todo. Migrar a
   `kid`-keyed keyring con `JWT_SECRET_CURRENT` + `JWT_SECRET_PREVIOUS`
   para rotación sin downtime.

D. **Captcha invisible en POST /api/derecho/***: similar a #11 pero
   para ARCO — bots de suplantación masiva.

E. **Cost guardrail DIAN**: cuando entremos a producción, los PSEs
   cobran por factura emitida (aprox $50-200 COP c/u). Trackear
   emisión vs anulada y alertar si anulación > 5% en una semana.

F. **WebSocket degradation**: si `WS` (websocket.js) se cae, el
   digiturno y las comandas quedan sin realtime. Implementar fallback
   a polling cada 5s en `useWebSocket.ts`.

G. **Backup de la base con encriptación at-rest**: hoy el PGDATA de
   Postgres no está encriptado. En producción apuntar a un volumen
   LUKS-equivalent o usar `pgcrypto` para columnas sensibles
   (telefono, email).

H. **Modo oscuro para clientes + admin CRM**: `prefers-color-scheme`
   ya está soportado parcialmente; extender al admin CRM completo
   que hoy es todo dark.
