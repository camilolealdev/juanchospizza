# 📋 Plan de Remediación — Juancho's Pizza v2.0.0

> **Documento vivo:** continuación del [GAPS_REPORT 2026-07-15](./AUDIT_COMPLETO.md).
> **Propósito:** convertir hallazgos del audit en sprints accionables con criterios de aceptación verificables.
> **Estado:** julio 2026 — sprint 0 cerrado (este archivo creado).

---

## 🗺️ Vista por sprint

| Sprint | Énfasis | Brechas cerradas | Effort | DRI |
|---|---|---|---|---|
| **S0** | Fundaciones | C1, S4 (S2 trivial) | 1d | ya cerrado |
| **S1** | Datos y cuentas | Habeas Data + cookie HttpOnly | 3d | backend lead |
| **S2** | Web segura | CSP endurecido + scripts extraídos | 2d | frontend lead |
| **S3** | Facturación real | DIAN proveedor + certificado + firmas | 10+d | backend lead + proveedor externo |
| **S4** | Performance | compresión + cache PWA + paginación | 5d | frontend lead |

---

## 🎯 S0 — Fundaciones (cerrado)

### S2 — Host Header Injection en pasarelas

| | |
|---|---|
| **Estado:** ✅ Cerrado 2026-07-15 |
| **Implementación:** `server/routes/payments.js` usa `process.env.FRONTEND_URL \|\| 'http://localhost:3000'` en lugar de `req.get('origin')` (3 ocurrencias: Wompi `redirect_url`, PayPal return/cancel). Variables documentadas en `.env.example`. |
| **Criterio de aceptación:** | (a) Variable `FRONTEND_URL` obligatoria en prod (fail-fast al boot si falta + NODE_ENV=production). (b) Pruebas de pen-test con header `Origin` forjado ya no producen URL válida. |

### C1 — DIAN estructura base

| | |
|---|---|
| **Estado del commit:** 🟡 Estructura completa (tabla `invoices` + `credit_notes`, XML UBL 2.1, schema Zod). 🔴 Firma/CUFE/provider real pendientes — ver S3. |

---

## 🎯 S1 — Datos y cuentas

### Habeas Data (Ley 1581/2012)

| | |
|---|---|
| **Severidad:** 🔴 Crítica (multa SIC hasta $1.115M COP) |
| **Implementación:** Banner de consentimiento (`public/consent-banner.js`) + endpoint `/api/consent` + columna `consent_at TIMESTAMPTZ` + `consent_ip` + `consent_user_agent` en `clients` (migración #005). El banner bloquea campos sensibles del carrito/compra hasta aceptar; persiste preferencia en localStorage. |
| **DRI:** Backend lead |
| **Criterio de aceptación:** (a) Aceptar datos personales dispara POST /api/consent con cliente_id o session_id, IP y UA. (b) Política de tratamiento visible en footer. (c) Endpoint ARCO público `/api/derechos-arco` para consulta/reclamo. |
| **Dépen:** S2 (CSP permite cargar el banner) |

### JWT Cookie HttpOnly

| | |
|---|---|
| **Severidad:** 🟠 Alta (OWASP A07 — robo de token vía XSS) |
| **Implementación:** Cambia `localStorage('auth_token')` → cookie `auth_token` con `HttpOnly; SameSite=Lax; Secure(prod)`. `authMiddleware` acepta cookie O `Authorization: Bearer` (dual path para clientes no-browser que aún usan la app `src/services/api.ts`). Nuevo `/api/auth/logout` que limpia la cookie. |
| **DRI:** Backend lead |
| **Criterio de aceptación:** (a) Sesiones pre-deploy siguen funcionando (compat con localStorage). (b) `document.cookie` no muestra `auth_token`. (c) Playwright verifica que tras login, la cookie viene con flags correctos. |
| **Dépen:** Ninguna |

---

## 🎯 S2 — Web segura

### CSP endurecido (sin `unsafe-inline` en `script-src`)

| | |
|---|---|
| **Severidad:** 🟠 Alta (OWASP A03 — XSS) |
| **Implementación:** (a) Extraer los 2 scripts inline grandes de `index.html` (`pizza builder ~400 líneas` + `consent banner` ya extraído en S1) a `public/*.js`. (b) `helmet` ahora es dev-aware: `'unsafe-inline'` solo en `script-src` cuando `NODE_ENV !== 'production'`. (c) Mantener `'unsafe-inline'` en `style-src` (extraer 1400 líneas de CSS no compensa el riesgo; afecta mucho menos). |
| **DRI:** Frontend lead |
| **Criterio de aceptación:** (a) Build de producción pasa el auditor CSP de Mozilla Observatory con grado A- o A. (b) Pizza builder funciona sin tocar la consola. (c) Carga inicial del HTML baja ~450 líneas. |
| **Dépen:** S1 (consent-banner.js debe existir) |

---

## 🎯 S3 — Facturación real

### DIAN firma + CUFE + proveedor

| | |
|---|---|
| **Severidad:** 🔴 Crítica (riesgo tributario desde día 1) |
| **Implementación:** (a) `dianSigner.js` ahora usa `node-forge` con algoritmo real XAdES-EPES + RSA-SHA256 + Canonical XML 1.0. (b) `calcularCUFE()` calcula hash SHA-384 sobre la cadena DIAN (`NumFac + FecFac + HorFac + NitFac + DocAdq + …` según Resolución 000008/2023). (c) Nuevo `dianProvider.js` abstracción con adapters Muisca / Dataico / Novasoft / Alegra — elige vía `process.env.DIAN_PROVIDER`. (d) Estructura completa de envío ya está (`POST /api/invoices/:id/send`). Pendiente externo: certificado digital real y credenciales del proveedor. |
| **DRI:** Backend lead + acciones con proveedor externo |
| **Esfuerzo:** 5d código + 5+d coordinar certificado digital con entidad autorizada (Andrés Díaz / Certicámara / GSE) y alta del software ante DIAN |
| **Criterio de aceptación:** (a) `signXml()` toma un `.p12` real, devuelve XML firmado XAdES-EPES válido según spec. (b) CUFE generado por código coincide con cálculo de la DIAN en su sandbox de pruebas. (c) Endpoint `/send` envía al proveedor elegido y actualiza estado a `sent`/`accepted`. |
| **Dépen:** Ninguna más, pero bloqueante para emisión real |

---

## 🎯 S4 — Performance

### Compresión HTTP + paginación

| | |
|---|---|
| **Severidad:** 🟠 Media |
| **Esfuerzo estimado:** 5d |
| **Implementación:** (a) `compression` middleware global. (b) LIMIT/OFFSET en `/api/orders`, `/api/clients`, `/api/recipes`. (c) Materialized view `mv_orders_daily` para `/api/stats`. (d) PWA tuning: cambiar `NetworkFirst` a `CacheFirst` para App Shell. |
| **DRI:** Frontend + Backend |
| **Criterio de aceptación:** TTFB < 200ms p50, FCP < 1.5s en 3G slow, Lighthouse Performance > 85. |

### Migración UUID

| | |
|---|---|
| **Severidad:** 🟠 Media |
| **Esfuerzo estimado:** 7d (re-mapeo de datos existentes) |
| **Implementación:** nueva migración convierte PKs `TEXT` a `UUID DEFAULT gen_random_uuid()` tabla por tabla, con FK updates. **Solo viable antes de tener datos reales en producción.** |
| **DRI:** Backend lead |
| **Criterio de aceptación:** Bloat de índices B-Tree reducido > 30%; queries con JOIN por PK aceleradas. |
| **Bloqueante:** no hacerlo hasta deploy final con datos limpios |

---

## ✅ Definition of Done (DoD) global

1. Todos los nuevos endpoints cubiertos por tests Vitest (happy + 2 sad paths mínimo).
2. E2E Playwright verde (`npm run test:e2e`).
3. `npm run lint` sin errores ni warnings nuevos.
4. `npm run build` sin errores TypeScript.
5. Comentario `// S<n>:` en cada archivo modificado referencia el sprint que lo cambió (rollback-friendly).
6. `CHANGELOG.md` actualizado.

---

## 📅 Calendario tentativo

| Sprint | Semanas | Owner |
|---|---|---|
| S0 (cerrado) | 2026-07-15 | — |
| S1 | 2026-07-22 → 07-29 | @backend-lead |
| S2 | 2026-07-29 → 08-05 | @frontend-lead |
| S3 | 2026-08-05 → 08-19 (+ coord. externa) | @backend-lead + @dian-coordinator |
| S4 | 2026-08-19 → 08-26 | @fullstack |

---

## ⚠️ Riesgos identificados

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | DIAN pide un cambio de Resolución o normativa entre sprints | Sprint S3 va con bandera verde solo al coordinar con proveedor final |
| R2 | Cambiar JWT a cookie puede romper el refresh flow | Dual path Bearer + Cookie; monitoreo de 401s por 7 días post-deploy |
| R3 | CSP estricto bloquea features de Vite dev | `'unsafe-inline'` solo cuando `NODE_ENV !== 'production'` |
| R4 | Banner de Habeas Data daña flujo de conversión | Banner bloquea SOLO campos sensibles (teléfono, email, dirección); el menú y precios son públicos |

---

_Documento vivo — actualizar al cerrar cada sprint._
