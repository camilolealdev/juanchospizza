# Auditoría CRUD/Funcional — Juancho's Pizza CRM (2026-08-21)

> Sucesora de `AUDITORIA_CRUD_GENERAL_2026-08-06.md`. No repite esa matriz — verifica DRIFT desde esa fecha con 5 agentes especialistas paralelos (backend/JS, DB/Postgres, frontend/React, seguridad/integraciones, tests/QA), cruzando contra `INFORME_CONSOLIDADO_PENDIENTES_2026-08-17.md` y root `docs/PENDIENTES.md` (2026-08-20). Método: código real, no solo docs.

## Veredicto ejecutivo

Núcleo CRUD (31 routers, 35 tablas, 21 vistas) sigue completo, sin módulos fantasma. Desde 08-06: 30 commits, 4 hallazgos ALTA de seguridad ya parcheados (2 completos, 2 parciales), 1 gap nuevo real sin documentar (orders PATCH/PUT sin scoping por sede), varios docs ya desactualizados por commits del mismo día que reportan.

## 🔴 Gaps reales nuevos (no en ningún doc previo)

| #   | Hallazgo                                                                                                                                                                                                                                                                                                                                                | Evidencia                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | ~~`GET /api/orders` y `GET /:id` ya filtran por sede (commit 7263f5d) pero PATCH `/:id/status` y PUT `/:id` seguían sin scoping~~ **RESUELTO 2026-08-22**: ambas rutas ahora hacen `SELECT "locationId"` previo y devuelven 404 (mismo criterio que GET /:id) si el token no es ADMIN y la sede no coincide. +2 tests de regresión, suite 518/518 verde | `server/routes/orders.js` (PATCH ~L379-390, PUT ~L468-478); `server/tests/orders.test.js` |
| 2   | `POST /api/orders` ahora crea fila en `clients` por teléfono nuevo, en la misma transacción — no está documentado en ninguna matriz/informe                                                                                                                                                                                                             | `server/routes/orders.js:190-212`                                                         |
| 3   | `DIAN_SOFTWARE_ID` usa mismo patrón placeholder que PIN/clave técnica pero `validateDianConfig()` no lo valida al boot (sí valida PIN y clave técnica)                                                                                                                                                                                                  | `server/services/dianXml.js:92-108`                                                       |
| 4   | Rol de service-key (`n8n`/`cron`) configurable por env var pero **ningún `.env*` la define** → default sigue `ADMIN` en la práctica                                                                                                                                                                                                                     | `server/middleware/serviceKey.js:22-23`                                                   |

## ✅ Confirmado arreglado desde 08-06/08-20

- Los 4 ALTA de `docs/PENDIENTES.md` (08-20) recibieron fix el mismo/día siguiente (commit `59ea860`, 2026-08-20): `rejectUnauthorized` en Postgres — sólido, sin cambios necesarios (`server/db.js:14-27`).
- JWT: `exp` se valida, sin bypass `alg:none` (HMAC recalculado, no se confía en header), cookie `HttpOnly` — confirma versión vigente de `docs/PENDIENTES.md`, **refuta** el set obsoleto en `pizzeria-merge/PENDIENTES.md`/`findings/` (ya marcado para archivar).
- `requireSameLocation` con `targetLocationId` nulo: el BAJA de `docs/PENDIENTES-agente1-auth.md` ya estaba resuelto (commit 5de8bff) al momento de leer ese doc.
- Notificaciones: vista existe y está cableada (`NotificacionesView.tsx`).
- WebSocket: frontend ya consume WS en vivo (dashboard, mesas, digiturno, facturas, comandas) — cero polling de pedidos, sólo un `setInterval` no relacionado (carrusel).
- InvoicesView: CRUD completo + firma DIAN, ya no es solo lectura.
- E2E (`full-audit.spec.ts`): corre en CI (`ci.yml:178`), gap cerrado.
- Suite de tests: 46 archivos / 516 tests, todos verdes (crecimiento sano desde 429/429 del 08-17).

## 🟡 Reevaluado (el hallazgo original estaba mal diagnosticado)

- **Webhook idempotency "fail-open"** (ALTA #2, 08-20): el código en error de DB SÍ procesa el pago (no lo descarta) — el riesgo real es doble-procesamiento en error transitorio de DB, no pérdida de confirmación como decía el hallazgo original. Ya tiene logging estructurado para alertar.

## ⬜ Sigue abierto, sin cambios

| Área                                | Estado                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `comandas.clientId`, `tips.shiftId` | Columnas siguen ausentes en schema (cero commits en DB desde 07-31/08-05); reconciliación de caja funciona igual porque nunca dependió de `tips` |
| MarketingView                       | CRUD de campañas sí, envío (email/push/WhatsApp) no — comentario explícito en código lo confirma                                                 |
| Paginación                          | Inventario resuelto; clientes, orders (dashboard) y finanzas siguen sin paginar                                                                  |
| Tests sin router                    | `auth.js`, `comandas.js`, `invoices.js`, `menuExtras.js`, `qrMenu.js` (5, bajó de ~20)                                                           |
| Tests frontend                      | 19/20 vistas de `src/views/roles/` sin test (solo EmpleadosView)                                                                                 |
| DIAN real                           | Sigue en placeholders, `ambiente` hardcoded en `'1'` (test) — sin integración real con proveedor                                                 |

## Arquitectura (nuevo desde 08-06)

Un solo bundle React: sitio público (menú/carrito/checkout WhatsApp/configurador pizza, nuevo desde 08-06) montado por rutas normales (`react-router-dom`); el CRM admin sigue siendo un view-switch por estado (no rutas anidadas), gateado por `/admin/*` + auth. Ambos comparten `api.ts`, `CartContext`, `useWebSocket`.

## ✅ CI/CD e infra — confirmado resuelto (verificado contra 39 deploy runs reales)

Los pendientes de VPS de `INFORME_CONSOLIDADO_PENDIENTES_2026-08-17` (§2: "backup cron sin instalar en VPS", "nginx desactualizado, falta reload manual") ya no aplican — `.github/workflows/deploy-prod.yml` los automatizó:

- **Auto-deploy en push a `master`/`main`**: quality gate (tsc+build+vitest) → docker build check → deploy SSH → smoke test Playwright contra producción. Falla el job si algo no pasa (no hay "verde falso").
- **Backup pre-deploy obligatorio**: `pg_dump -Fc -Z9` + sha256 + rotación >30 días, corre en el VPS antes de bajar el stack (paso 3 del script SSH).
- **Nginx**: `docker compose down --remove-orphans && up -d --build` recrea nginx en cada deploy — no requiere `nginx -s reload` manual como decía el doc viejo.
- **Health check real**: app (`/api/health`), postgres (`pg_isready`), redis (`PING`), nginx (`nginx -t`) — deploy falla si cualquiera no responde.
- **Backup diario separado** (`backup.yml`, cron 04:00 Colombia): pg_dump + compresión + artifact retention 7 días + S3 opcional, independiente del backup pre-deploy.

Verificado con la corrida de 39 "🚀 Deploy Production" + 83 "PizzaCRM CI/CD" runs — todos verdes. Los ítems de VPS de la sesión 08-17 quedan cerrados; no requieren acción manual.

## Stack confirmado (equipo especialista usado)

PERN-ish: PostgreSQL + Express + React + Node, Zod, WebSocket (`ws`), PWA (vite-plugin-pwa), Bold (único gateway de pago), DIAN (pendiente), n8n (WhatsApp AI ordering: LangChain + OpenAI + Postgres memory, 18 nodos, `n8n/juanchos-pizza-whatsapp-ai.json`).

## Prioridad recomendada

1. Sede-scoping en PATCH/PUT de orders (gap #1) — mismo patrón que ya existe en GET, fix mecánico.
2. Setear `SERVICE_ROLE_N8N`/`SERVICE_ROLE_CRON` en `.env.production` (gap #4) — un valor de config, cero código.
3. Agregar `softwareId` a `validateDianConfig()` (gap #3) — una línea.
4. Documentar el side-effect orders→clients (gap #2) — solo doc.
5. Tests de los 5 routers restantes + vistas frontend — deuda conocida, no bloqueante.
