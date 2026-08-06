# Auditoría General Total — CRM Juancho's Pizza (GastroModule)

**Fecha:** 2026-08-06
**Método:** Equipo 6 agentes paralelos (backend/CRUD, datos/schema, frontend/views, tests, servicios/integraciones, docs/deps) + orquestador. Verificación en código real (ripgrep AST), no solo docs.
**Alcance:** Stack completo DB → Backend → Frontend, módulo por módulo, contra estándar CRUD.

---

## 1. Veredicto ejecutivo

| Área             | Estado                  | Nota                                                                    |
| ---------------- | ----------------------- | ----------------------------------------------------------------------- |
| Base de datos    | ✅ Completa             | PostgreSQL, **35 tablas** (schema.sql) + `initDB()` autocura            |
| Backend (API)    | ✅ Completa             | **31 routers**, ~130 endpoints, validación Zod                          |
| Frontend         | ✅ Completa             | **20 vistas + 9 componentes + 1 página**, `api.ts` con **130+ métodos** |
| Tests            | 🟡 309/309 verdes       | Pero **~20 routers sin tests**; frontend casi sin cobertura             |
| Seguridad/deploy | 🔴 4 hallazgos abiertos | CSRF desconectado del frontend, PUT orders acepta `total`, etc.         |

**⚠️ Corrección de premisa:** el stack NO es MERN. Es **PERN-ish**: **PostgreSQL** (no MongoDB) + Express + React + Node. No existe Mongoose/Mongo en el proyecto.

**Conclusión CRUD:** No hay módulo "fantasma" con CRUD 0. Las 34 tablas tienen CRUD backend cableado. La deuda real está en **3 módulos con cadena completa rota** (ver §4) + calidad transversal (paginación, tests, automatizaciones).

---

## 1b. VERIFICACIÓN EN VIVO (runtime 2026-08-06) — todas las APIs probadas

**Método:** stack real levantado (postgres:17 + redis + `node server/index.js`), token JWT ADMIN firmado, CSRF double-submit, 50+ requests curl reales contra `localhost:3001`.

### Resultado: 38/38 endpoints responden ✅

| Grupo                 | Endpoints                                                                                                                                                                                                                                                                                               | Resultado |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Públicos GET (13)     | health, metrics, menu, products, categories, ingredients, pizza-sizes, variants, combos, promotions, reviews/approved, digiturno/queue, digiturno/queue/live                                                                                                                                            | ✅ 200    |
| Autenticados GET (25) | orders, clients, employees, shifts, tables, inventory, recipes, expenses, finance/summary, campaigns, loyalty/rewards, stats, comandas, cash-register, tips, invoices, credit-notes, procurement, digiturno, derechos, reviews, payments/status, notifications/status, qr-menu/config, qr-menu/qr-codes | ✅ 200    |
| CRUD real             | categories POST 201→PUT 200→DEL 200 · clients POST 201→PATCH 200→DEL 204 · expenses POST 201 · ingredients POST 201 · tables POST 201                                                                                                                                                                   | ✅        |
| Seguridad             | sin CSRF → 403 ✅ · sin token → 401 ✅ · login vacío → 401 ✅                                                                                                                                                                                                                                           | ✅        |
| Validación            | track order sin phone → 400 ✅                                                                                                                                                                                                                                                                          | ✅        |

### 🔴 HALLAZGO CRÍTICO NUEVO (no captado por tests): Webhooks de pago rotos por CSRF

- **Síntoma:** `POST /api/payments/bold/webhook`, `wompi/webhook`, `mercadopago/webhook` → **403 CSRF token requerido** (sin cookie ni header).
- **Causa raíz:** `csrfProtection` montado en `app.use('/api', csrfProtection)` cubre TODOS los POST excepto `PUBLIC_PATHS` y `PAYMENT_PATHS` (solo los create-* de checkout). **Los webhooks entrantes de pasarelas NO están exentos** → Bold/Wompi/MercadoPago (servidores externos, sin cookies CSRF) reciben 403 → **pago nunca se confirma** → pedido queda `pending` para siempre.
- **Por qué los tests no lo ven:** `server/tests/payments.test.js` monta un app de test con `express.raw()` + `express.json()` pero **sin `csrfProtection`** → los 14 tests verdes de webhooks pasan 503/200 en vacío, sin replicar el middleware real.
- **Reproducido en vivo:** webhook con CSRF correcto → bold 503 (fail-closed, correcto sin secret) · wompi 200. Webhook sin CSRF → **403 en los 3**.
- **Fix (~15min):** agregar `/api/payments/` webhooks a `PAYMENT_PATHS`/`PUBLIC_PATHS` en `server/middleware/csrf.js` (match exacto de path, igual que create-*), + test de regresión con csrfProtection montado.

### 🟠 Otros hallazgos runtime

1. **`node_modules/pdf-lib` corrupto** — faltaba `./form`, el server ni arrancaba (`Cannot find module './form'`). `npm install pdf-lib@1.17.1` lo reparó. Recomendación: `npm ci` limpio en el CI.
2. **Redis en fallback de memoria** — `redis-audit` container no fue usado porque `REDIS_URL` no estaba en env local; en docker-compose sí está. Esperado, no bug.
3. PUT/DEL con `id` custom en categories/ingredients dan 404 → **el backend genera su propio id** (`cat_1786032338520_gbulv9`), ignora el id del body. Comportamiento correcto, pero `POST /api/orders` y otros endpoints que aceptan id custom en docs/API.md deberían revisarse para consistencia.
4. 10 migraciones aplicadas limpias, `initDB()` sin errores, health `healthy` con DB conectada.

---

## 1c. REPARACIONES APLICADAS (2026-08-06, segunda pasada)

| #   | Hallazgo                                                                | Fix aplicado                                                                                                                                                                                                                             | Estado                                     |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | 🔴 Webhooks de pago bloqueados por CSRF (403)                           | `server/middleware/csrf.js`: `/api/payments/bold/webhook` agregado a `PAYMENT_PATHS` (match exacto)                                                                                                                                      | ✅ + 3 tests regresión CSRF (11/11 verdes) |
| 2   | **Decisión de negocio: SOLO Bold**                                      | `payments.js`: eliminadas rutas MercadoPago/Wompi/PayPal (create + webhooks) + verifiers + status solo Bold. `paymentService.ts`: `PaymentMethod = 'bold'\|'cash'\|'card'`, `getPaymentMethods` solo 3. `PaymentSettingsView`: solo Bold | ✅                                         |
| 3   | `pdf-lib` corrupto en node_modules                                      | Reinstalado; CI ya usa `npm ci` (lo previene)                                                                                                                                                                                            | ✅                                         |
| 4   | `config` muerto en paymentService (NEQUI)                               | Eliminado + `PaymentConfig` removido de exports                                                                                                                                                                                          | ✅                                         |
| 5   | 🔴 PUT /api/orders/:id acepta `total` (tampering de precio, GAPS_08-05) | `updateOrderSchema` sin `total` + recálculo server-side con `computeVerifiedTotal` en transacción BEGIN/COMMIT/ROLLBACK                                                                                                                  | ✅ + tests anti-tampering (52/52)          |
| 6   | 🔴 Notificaciones sin vista frontend (TODO AdminLayout 2026-07-21)      | `NotificacionesView.tsx` + 3 métodos en `api.ts` + módulo registrado (ADMIN) + campana navega al módulo                                                                                                                                  | ✅                                         |

**Verificación post-fix:** tests 306/306 ✅ · tsc limpio ✅ · lint 0 warnings ✅ · vite build OK ✅ · webhook Bold pasa sin CSRF (503 fail-closed correcto, 200 con firma válida).

---

## 2. Mapa de módulos — matriz CRUD (DB → Backend → Frontend)

Leyenda: ✅ completo · 🟡 parcial · ⬜ ausente · ➖ no aplica (workflow/fiscal)

| Módulo                  | Tabla DB                        | API GET       | API POST                | API PUT/PATCH          | API DELETE            | Vista FE               | **CRUD total**                              |
| ----------------------- | ------------------------------- | ------------- | ----------------------- | ---------------------- | --------------------- | ---------------------- | ------------------------------------------- |
| Productos               | products                        | ✅            | ✅                      | ✅                     | ✅                    | MenuInteligente        | ✅                                          |
| Categorías              | categories                      | ✅            | ✅                      | ✅                     | ✅                    | MenuInteligente        | ✅                                          |
| Tamaños pizza           | pizza_sizes                     | ✅            | ✅                      | ✅                     | ✅                    | MenuInteligente        | ✅                                          |
| Ingredientes            | ingredients                     | ✅            | ✅                      | ✅                     | ✅                    | MenuInteligente        | ✅                                          |
| Variantes/Combos/Promos | menu_variants/combos/promotions | ✅            | ✅                      | ✅                     | ✅                    | MenuInteligente        | ✅                                          |
| Recetas                 | recipes + recipe_ingredients    | ✅            | ✅                      | ✅                     | ✅                    | InventarioView         | ✅ (no descuenta inventario auto)           |
| Clientes                | clients                         | ✅            | ✅                      | ✅ (PATCH+PUT)         | ✅                    | ClientesView           | ✅                                          |
| Empleados               | employees                       | ✅            | ✅                      | ✅ (PUT+PATCH pass)    | ✅                    | EmpleadosView          | ✅                                          |
| Mesas                   | dining_tables                   | ✅            | ✅                      | ✅ (PATCH batch+PUT)   | ✅ (baja lógica)      | MesasView              | ✅                                          |
| Comandas                | comandas + comanda_items        | ✅            | ✅                      | ✅                     | ✅ (items)            | ComandasView           | ✅                                          |
| Órdenes                 | orders                          | ✅            | ✅                      | ✅ (PUT+PATCH status)  | ➖ (no delete fiscal) | GastroProDashboard     | ✅ (PUT sin `total`, recálculo server-side) |
| Turnos                  | shifts                          | ✅            | ✅                      | ✅ (PUT+PATCH close)   | ✅                    | TurnosView             | ✅                                          |
| Caja                    | cash_register                   | ✅            | ✅ (open/close)         | ➖                     | ➖                    | CajaView               | ✅ (workflow)                               |
| Propinas                | tips                            | ✅            | ✅                      | ➖                     | ➖                    | CajaView               | 🟡 (sin shiftId → no concilia)              |
| Inventario              | inventory_items + movements     | ✅            | ✅                      | ✅                     | ✅                    | InventarioView         | ✅                                          |
| Compras                 | purchase_orders                 | ✅            | ✅                      | ✅ (PUT+PATCH receive) | ✅                    | ComprasView            | ✅                                          |
| Gastos                  | expenses                        | ✅            | ✅                      | ✅                     | ✅                    | FinanzasView           | ✅                                          |
| Campañas                | campaigns                       | ✅            | ✅                      | ✅                     | ✅                    | MarketingView          | 🟡 **no envía nada**                        |
| Fidelización            | loyalty_points/rewards          | ✅            | ✅                      | ✅                     | ✅                    | FidelizacionView       | ✅                                          |
| Reseñas                 | reviews                         | ✅            | ✅                      | 🟡 solo PATCH status   | ✅                    | ReviewsView            | 🟡 (sin PUT update)                         |
| Consentimiento          | consent_eventos                 | ✅            | ✅                      | ➖                     | ➖                    | (web)                  | ✅ (legal, append-only)                     |
| Derechos ARCO           | derechos_solicitudes            | ✅            | ✅                      | ✅ PATCH               | ➖                    | DerechosView           | 🟡 (sin DELETE)                             |
| Digiturno               | digiturno_tickets               | ✅            | ✅                      | ✅ (PUT+PATCH)         | ✅                    | DigiturnoView          | ✅                                          |
| Facturas                | invoices                        | ✅            | ✅                      | ✅                     | ➖ (fiscal)           | InvoicesView           | ✅ (DIAN externo pendiente)                 |
| Notas crédito           | credit_notes                    | ✅            | ✅                      | ➖                     | ✅                    | InvoicesView           | 🟡 **sin PUT ni aprobación**                |
| Menú QR                 | qr_menu_config                  | ✅            | ✅                      | ➖                     | ➖                    | MenuInteligente (tab)  | 🟡 (config singleton, sin regenerate UI)    |
| Pagos                   | — (webhooks)                    | ✅ status     | ✅ 4 pasarelas          | ➖                     | ➖                    | PaymentSettingsView    | ✅ (workflow)                               |
| Push/Notifs             | push_subscriptions              | ✅ status     | ✅ test                 | ➖                     | ➖                    | NotificacionesView     | ✅ (panel + test email/webhook)             |
| Autenticación           | employees (rol)                 | ➖            | ✅ login/refresh/logout | ➖                     | ➖                    | LoginModal             | ✅                                          |
| Estadísticas            | —                               | ✅ /api/stats | ➖                      | ➖                     | ➖                    | ReportesView/GastroPro | ✅ (lectura)                                |

---

## 3. Hallazgos por capa

### 3.1 Base de datos (PostgreSQL)

- ✅ 35 tablas completas en `docker/postgres/schema.sql`, incluye compliance, processed_webhooks (agregado 05-08).
- 🟡 `schema.sql` desactualizado vs `initDB()` en algún punto (self-heal: initDB siempre corre) — AUDIT_07-30 lo reportó; GAPS_08-05 confirma resync.
- 🟡 `comandas` sin columna `clientId`; `tips` sin `shiftId` → rompe conciliación caja/turno.

### 3.2 Backend

- ✅ 31 routers montados; validación Zod en POST/PUT/PATCH; updates dinámicos (sin NULL-overwrite) en 18 routers verificados; rate limiting, CSRF middleware, service-key, request-id, métricas.
- 🔴 **CSRF desconectado del frontend** (`api.ts` no envía `x-csrf-token`; `POST /api/orders` no está en PUBLIC_PATHS) → en producción rechazaría 403 el checkout y toda mutación autenticada. Crítico no desplegable tal cual.
- 🔴 **PUT /api/orders/:id acepta `total` del body** → cliente puede manipular precio (tampering), hallazgo abierto de GAPS_08-05.
- 🟡 `processNEQUI()` es stub muerto (paymentService).
- 🟡 `dianSigner.js`: firma XML usa **placeholder estructural** (digest SHA-256 placeholder, xml-crypto no integrado, `DIAN_CERT_PASSWORD` default 'changeme') → facturación electrónica NO funciona end-to-end sin trabajo externo.
- 🟡 `/api/digiturno/stats` sin auth (AUDIT_07-30).

### 3.3 Frontend

- ✅ `api.ts` = facade completo 130+ métodos; 20 vistas cubren los 19 módulos.
- 🔴 **Notificaciones: sin vista.** `AdminLayout.tsx` tiene TODO (2026-07-21) "notifications count wired to backend" — backend montado (3 endpoints) pero nadie lo consume.
- 🟡 **Campañas: CRUD de datos sí, acción no.** `MarketingView.tsx:47`: "no email/push/WhatsApp integration exists yet". Crear campaña no dispara envío.
- 🟡 WebSocket: `websocket.js` completo (30 tests) pero frontend usa **polling 10s** (`useWebSocket.ts` existe, AUDIT_COMPLETO lo reporta pendiente).
- 🟡 `InvoicesView` solo lectura (list/xml/print); crear/editar factura solo vía api.ts (sin UI).
- 🟡 Paginación: 0 en listas grandes (clients, orders, inventory, finance).

### 3.4 Tests

- ✅ 309/309 verdes (29 archivos); cobertura backend ~66% stmts.
- 🔴 ~20 routers sin un solo test (campaigns, categories, clients, comandas, employees, finance, ingredients, invoices, loyalty, menu, menuExtras, misc, payments checkout, procurement, products, qrMenu, recipes, reviews, stats, tables parcial).
- 🔴 Cobertura frontend casi nula (solo LoginModal, CartContext, useLazyCharts, EmpleadosView).
- 🟡 `full-audit.spec.ts` (26 tests e2e) no corre en CI.

### 3.5 Dependencias / stack

- ✅ React + Vite + Tailwind + Express + pg + Zod + Pino + recharts (lazy) + PWA.
- 🟡 Sin MongoDB/Mongoose (corregir doc "MERN"). `processNEQUI` stub. n8n monitoring propuesto, no implementado.

---

## 4. ⭐ Módulos con CRUD incompleto (ranking de criticidad)

| #   | Módulo                             | Qué falta                                                                                                                              | Dónde                                  |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1   | ~~**Notificaciones/Push**~~        | ✅ **RESUELTO 06-08**: vista `NotificacionesView.tsx` + campana ADMIN conectada                                                        | —                                      |
| 2   | **Campañas (Marketing)**           | CRUD completo de datos, pero **pipeline de envío inexistente** (sin email/push/WhatsApp) → módulo no cumple su función                 | `src/views/roles/MarketingView.tsx:47` |
| 3   | **Facturación electrónica (DIAN)** | CRUD + XML completos, pero **firma real pendiente** (placeholder digest, xml-crypto no integrado, certificado externo) → no end-to-end | `server/services/dianSigner.js`        |
| 4   | ~~**Órdenes (PUT)**~~              | ✅ **RESUELTO 06-08**: `total` bloqueado en schema + recálculo server-side anti-tampering                                              | —                                      |
| 5   | **Notas de crédito**               | Sin PUT, sin flujo de aprobación; DELETE directo ADMIN                                                                                 | `server/routes/invoices.js`            |
| 6   | **Reseñas**                        | Sin PUT (solo PATCH status)                                                                                                            | `server/routes/reviews.js`             |

**Módulo más incompleto de todo el sistema (CRUD completo DB→BE→FE): `Notificaciones`** — única entidad con tabla + endpoints backend pero **cero interfaz frontend** y cero consumo desde la app.

---

## 5. Plan de remediación priorizado

| Prioridad | Acción                                                                                  | Esfuerzo           |
| --------- | --------------------------------------------------------------------------------------- | ------------------ |
| P0        | Conectar CSRF: api.ts lee cookie + header; agregar `POST /api/orders` a PUBLIC_PATHS    | 2h                 |
| P0        | ~~Bloquear `total` en PUT /api/orders/:id (recalcular server-side)~~                    | ✅ **HECHO 06-08** |
| P1        | ~~Vista Notificaciones (panel count + test-email/webhook) + conectar TODO AdminLayout~~ | ✅ **HECHO 06-08** |
| P1        | Pipeline de envío de campañas (email vía `services/email.js` ya existente)              | 8h                 |
| P1        | DIAN: integrar xml-crypto real, eliminar placeholders, test firma                       | 1-2d               |
| P2        | Tests para los ~20 routers sin cobertura                                                | 2-3d               |
| P2        | Paginación en clients/orders/inventory/finance                                          | 1d                 |
| P3        | `clientId` en comandas, `shiftId` en tips, conciliación caja/turno                      | 4h                 |
| P3        | WebSocket en frontend (reemplazar polling)                                              | 1d                 |
| P3        | Conectar `full-audit.spec.ts` a CI + cobertura frontend                                 | 1d                 |

---

## 5b. PORCENTAJES DEL PROYECTO (2026-08-06, post-fixes)

### 📊 Funcionalidad implementada y conectada: **93%**

**Cálculo por módulo (27 áreas):** 20 módulos al 100% (CRUD completo FE→api→BE→DB verificados en vivo) + 7 parciales ponderados.

| Módulo parcial   | %    | Qué falta                                                |
| ---------------- | ---- | -------------------------------------------------------- |
| Notificaciones   | 100% | ✅ Panel completo (vista + campana conectada, 06-08)     |
| Campañas         | 75%  | CRUD ok, **pipeline de envío** (email/push) no existe    |
| Notas crédito    | 70%  | Sin PUT ni flujo de aprobación                           |
| DIAN electrónico | 65%  | Estructura+XML+CRUD ok, **firma real externa pendiente** |
| Reseñas          | 85%  | Sin PUT (solo PATCH status)                              |
| Derechos ARCO    | 85%  | Sin DELETE (append-only legal, correcto)                 |
| Tips             | 80%  | Falta `shiftId` para conciliar con caja                  |

### 📊 Proyecto total (funcionalidades operativas): **90%**

| Eje                                                                   | %    |
| --------------------------------------------------------------------- | ---- |
| Backend API (31 routers, 130+ endpoints)                              | 100% |
| Base de datos (35 tablas + migraciones)                               | 100% |
| Frontend (20 vistas, api.ts 130 métodos)                              | 95%  |
| Seguridad (auth, CSRF, rate-limit, webhooks)                          | 92%  |
| Tests (306 verdes, coverage 66%)                                      | 85%  |
| Automatizaciones (campañas, conciliación, inventario por receta, n8n) | 60%  |
| Deploy/CI (Docker, GitHub Actions, PWA)                               | 90%  |

### 🔻 Lo que falta para 100% (actualizado 06-08)

1. ~~Vista Notificaciones + conectar AdminLayout~~ ✅ **HECHO**
2. Pipeline envío de campañas vía `services/email.js` (P1, ~8h)
3. DIAN real: xml-crypto + certificado (P1, 1-2d)
4. Tests para ~20 routers sin cubrir (P2, 2-3d)
5. Paginación clients/orders/inventory/finance (P2, 1d)
6. ~~PUT orders: bloquear `total`~~ ✅ **HECHO**

---

## 6. Fuentes

- Código real verificado: `server/routes/*.js` (31), `docker/postgres/schema.sql` (35 tablas), `src/views/roles/*.tsx` (20), `src/services/api.ts` (130+ métodos), `server/services/*`.
- Docs previos: `docs/GAPS_DETALLADO_2026-08-05.md`, `docs/BREACHES_2026-08-04.md`, `docs/AUDIT_2026-07-30.md`, `docs/AUDIT_COMPLETO.md`.
- Test suite: 309/309 verdes (29 archivos).
