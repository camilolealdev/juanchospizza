# 🔬 Informe de Brechas Detallado — Juancho's Pizza / GastroPro

> **Documento histórico:** auditoría del 2026-08-05. Sus hallazgos pendientes no representan automáticamente el estado vigente; para el estado actual consultar `docs/REVISION_6_FRENTES_2026-08-17.md` y `docs/PENDIENTES_OPERACIONALES_2026-08-17.md`.

**Fecha:** 2026-08-05 · **Origen:** Auditoría multi-agente (DB, CRUD, Frontend, Seguridad, Tests, Performance) con skills tokensaver/ponytail/caveman
**Base:** Working tree actual + `docs/BREACHES_2026-08-04.md` + `docs/AUDIT_2026-07-30.md`
**Método:** extracción AST real por agente (34 tablas, 32 routers, 20 vistas, 130 métodos API) + verificación de gaps conocidos + **verificación línea por línea en código (pasada 2, 05-08)**

---

## 📊 Resumen Ejecutivo

**Backend tiene TODO el CRUD de las 34 tablas cableado** (incluidos los 3 verbos faltantes agregados el 05-08). **El frontend cubre los 19 módulos.** La deuda real no es "falta lo que no existe" — es **calidad de lo existente**: 0 paginación real en listas grandes y ~20 routers sin un solo test. **Los 8MB de imágenes/video ya no existen (-6.82MB), recharts se carga diferido por vista y fuera del precache (ver §7), el PUT con lista fija (NULL-overwrite) quedó RESUELTO en los 18 routers verificados (ver §2), y `notifications.js` ya está montado (ver §2 y §5).**

**Lo que existe (bien):** DB completa (34/34 tablas, schema.sql al 100% con sync verificado por test), CRUD completo en 32/32 routers, webhooks de pago con firma + idempotencia, auth en todas las rutas privadas, ARCO/Habeas Data implementado, cobertura 66.34% con gate CI.

**Lo que falta / está roto:** ver secciones por dominio.

---

# 1. 🗄️ BASE DE DATOS — tabla por tabla

**34 tablas en `initDB()` (server/db.js). schema.sql tiene 34/34 — ✅ sync total verificado (05-08) con test de regresión en `server/tests/db.test.js`.**

## 1.1 Tablas catálogo (menú)

| Tabla                | Columnas                                                                                                                         | Estado | Gaps                                                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `categories`         | id, name, icon, color                                                                                                            | ✅     | —                                                                                                                                                         |
| `products`           | id, categoryId, nombre, descripcion, basePrice, type, image, tiempo, popularidad, vegetariano, isPremium, exclusiva, subcategory | ✅     | `basePrice`/`categoryId`/`isPremium` viven solo en seed (los ALTER los agrega `migrate.js`? ver #234 subcategory — basePrice puede faltar si no hay seed) |
| `pizza_sizes`        | id, nombre, precio, incluidos, porciones, activo                                                                                 | ✅     | —                                                                                                                                                         |
| `ingredients`        | id, nombre, descripcion, precio_extra, categoria, vegetariano, vegano, premium, dulce, disponible, defaultIng                    | ✅     | `defaultIng` solo en seed                                                                                                                                 |
| `menu_variants`      | id, nombre, activo                                                                                                               | ✅     | —                                                                                                                                                         |
| `menu_combos`        | id, nombre, descripcion, productos, ahorro, imagen, activo                                                                       | ✅     | —                                                                                                                                                         |
| `menu_promotions`    | id, nombre, descripcion, tipo, valor, inicia, termina, activo, usado, limite                                                     | ✅     | —                                                                                                                                                         |
| `recipes`            | id, nombre, porciones, instrucciones                                                                                             | ✅     | —                                                                                                                                                         |
| `recipe_ingredients` | id, recipeId, nombre, cantidad, unidad, costo                                                                                    | ✅     | ✅ FK verificado en db.js: `"recipeId" TEXT REFERENCES recipes(id)` (cerrado 05-08)                                                                       |

## 1.2 Tablas transaccionales (dinero)

| Tabla                | Columnas                                                                                                          | Estado | Gaps                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orders`             | id, orderNumber, address, items, total, status, clientId, paymentMethod, paymentStatus, createdAt, locationId     | ✅     | ⚠️ **items es JSONB**: no normalizado → reporting/lealtad cuesta caro. Índice compuesto agregado (migración #310) ✅                                              |
| `comandas`           | id, status, notes, total, tableId, locationId                                                                     | ✅     | ⚠️ **solo falta `clientId`** — `tableId` (FK) y `locationId` verificados en db.js (05-08); conciliación caja/turno pendiente en el flujo (ver AUDIT_07-30)        |
| `comanda_items`      | id, quantity, subtotal, notes, status                                                                             | ✅     | sin FK a comandas                                                                                                                                                 |
| `expenses`           | id, categoria, descripcion, monto, fecha, metodo, proveedor, factura, notas, recurrente, locationId               | ✅     | —                                                                                                                                                                 |
| `cash_register`      | id, difference, status, notes, openedBy, closedBy, initialAmount, expectedAmount, finalAmount, openedAt, closedAt | ✅     | ✅ apertura/cierre real verificado (05-08): 11 columnas; el cierre recalcula `expectedAmount` desde ventas reales (orders paid/cash/card por sede desde apertura) |
| `shifts`             | id, status, difference, notas, openedBy, locationId, openedAt, closedAt                                           | ✅     | —                                                                                                                                                                 |
| `tips`               | id, amount, method, locationId, orderId                                                                           | ✅     | ✅ `locationId` + FK `orderId` verificados (05-08); falta solo `shiftId` para conciliar con caja                                                                  |
| `invoices`           | id, orderId, cufe, xml, pdf_url, status, notes, moneda                                                            | ✅     | índice único anti-duplicados ✅ (migración #270)                                                                                                                  |
| `credit_notes`       | id, motivo, monto, items, status, xml, cude                                                                       | ✅     | ⚠️ sin `orderId`/`invoiceId` FK                                                                                                                                   |
| `processed_webhooks` | provider, sourceId, orderId                                                                                       | ✅     | ✅ **agregada a schema.sql el 05-08** (espejo exacto de initDB + migración #008)                                                                                  |
| `purchase_orders`    | id, proveedor, items, total, status, notas                                                                        | ✅     | items JSONB                                                                                                                                                       |

## 1.3 Tablas CRM / personas

| Tabla                | Columnas                                                                                                                                                                                                  | Estado | Gaps                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------- |
| `clients`            | id, nombre, telefono, email, direccion, notas, creado, vip, puntos, nivel, tags, estado, cumpleanos, dataTreatmentAuthorized, marketingAuthorized, consentAt, consentIp, consentUserAgent, consentVersion | ✅     | Habeas Data completo ✅                       |
| `employees`          | id, nombre, role, salt, activo, creado, email, username, passwordHash, passwordSalt, isSuperAdmin, failedLoginAttempts, lockedUntil                                                                       | ✅     | lockout anti fuerza bruta ✅ (commit 9c4eee1) |
| `reviews`            | id, rating, comment, status, clientName, createdAt                                                                                                                                                        | ✅     | —                                             |
| `loyalty_points`     | id, clientId, puntos, concepto, referencia, creado                                                                                                                                                        | ✅     | —                                             |
| `loyalty_rewards`    | id, nombre, descripcion, tipo, valor, vigente                                                                                                                                                             | ✅     | —                                             |
| `push_subscriptions` | id, phone, clientId, endpoint, p256dh, auth                                                                                                                                                               | ✅     | —                                             |

> **Corrección posterior (2026-08-18):** las menciones de scheduler inexistente, paginación ausente y anti-tampering abierto que aparecen más abajo son hallazgos de la fotografía del 2026-08-05. Fueron resueltos posteriormente; no ejecutarlos como tareas vigentes. Consultar `docs/REVISION_6_FRENTES_2026-08-17.md` para el estado actualizado.

## 1.4 Tablas operativas

| Tabla                  | Columnas                                                                      | Estado | Gaps                                                              |
| ---------------------- | ----------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| `inventory_items`      | id, nombre, categoria, unidad, proveedor, lote, ubicacion, activo, locationId | ✅     | —                                                                 |
| `inventory_movements`  | id, itemId, tipo, cantidad, motivo, referencia, creado, usuario               | ✅     | —                                                                 |
| `dining_tables`        | id, name, capacity, area, status, notes, qr_code, active                      | ✅     | —                                                                 |
| `digiturno_tickets`    | id, ticketNumber, status, source, items, total, notes                         | ✅     | reset diario ✅                                                   |
| `qr_menu_config`       | id, title, categories, active, locationId                                     | ✅     | —                                                                 |
| `consent_eventos`      | id, clientId, granted, ip, source, path, created_at                           | ✅     | —                                                                 |
| `derechos_solicitudes` | id, clientId, tipo, descripcion, estado, created_at                           | ✅     | ARCO implementado ✅                                              |
| `campaigns`            | id, name, type, discount, status, reach, conversions, budget                  | ✅     | ⚠️ reach/conversions son contadores manuales — sin automatización |

**🔴 GAP DB crítico → ✅ RESUELTO (05-08):** `docker/postgres/schema.sql` ahora incluye `processed_webhooks` (espejo exacto de initDB y de la migración #008). Un deploy fresco con volumen nuevo mantiene la idempotencia de webhooks. **Además se agregó un test de regresión** (`server/tests/db.test.js` → "sync con initDB") que falla si schema.sql y db.js vuelven a divergir.

**🟡 GAP DB medio:** `comandas` ya tiene `tableId` (FK) y `locationId` (verificado 05-08); **solo falta `clientId`** — la conciliación de caja/turno documentada en AUDIT_07-30 como "activamente mal" sigue pendiente en el **flujo** (no en el esquema).

---

# 2. 🔄 CRUD — componente por componente

**32 routers · ~120 endpoints. CRUD completo en 29/32.**

| Módulo          | Router           | GET                                  | POST                              | PUT              | PATCH          | DELETE                         | Auth      | Estado                                 |
| --------------- | ---------------- | ------------------------------------ | --------------------------------- | ---------------- | -------------- | ------------------------------ | --------- | -------------------------------------- |
| Auth            | auth.js          | —                                    | login/refresh/logout              | —                | —              | —                              | ✅        | ✅ completo                            |
| Categorías      | categories.js    | ✅                                   | ✅                                | ✅               | —              | ✅                             | ✅        | ✅ completo                            |
| Productos       | products.js      | ✅ (+:id)                            | ✅ (+bulk)                        | ✅               | —              | ✅                             | ✅        | ✅ completo                            |
| Pizza Sizes     | pizzaSizes.js    | ✅                                   | ✅                                | ✅               | —              | ✅                             | ✅        | ✅ completo                            |
| Ingredientes    | ingredients.js   | ✅                                   | ✅                                | ✅               | —              | ✅                             | ✅        | ✅ completo                            |
| **Órdenes**     | orders.js        | ✅ (list/detail/track)               | ✅                                | ✅               | ✅ status      | —                              | mixto     | ✅ (checkout público + admin)          |
| **Pagos**       | payments.js      | status                               | bold/mp/wompi/paypal + 3 webhooks | —                | —              | —                              | mixto     | ✅ webhooks firmados                   |
| Campañas        | campaigns.js     | ✅                                   | ✅                                | ✅               | —              | ✅                             | ✅        | ✅                                     |
| Clientes        | clients.js       | ✅ (list/:id/orders)                 | ✅                                | ✅               | ✅             | ✅                             | ✅        | ✅ completo                            |
| **Inventario**  | inventory.js     | ✅ (list/movements)                  | ✅ (+movement)                    | ✅               | —              | ✅ (baja lógica 05-08)         | ✅        | ✅ completo                            |
| Recetas         | recipes.js       | ✅                                   | ✅                                | ✅               | —              | ✅                             | ✅        | ✅                                     |
| Gastos/Finanzas | finance.js       | ✅ (+summary)                        | ✅                                | ✅               | —              | ✅                             | ✅        | ✅                                     |
| Lealtad         | loyalty.js       | ✅ (rewards/points)                  | ✅                                | ✅               | —              | ✅                             | ✅        | ✅                                     |
| Menu Extras     | menuExtras.js    | ✅ (v/c/p)                           | ✅                                | ✅               | —              | ✅                             | ✅        | ✅                                     |
| Reviews         | reviews.js       | ✅ (list/approved)                   | ✅                                | —                | ✅ status      | ✅                             | ✅        | ✅                                     |
| **Mesas**       | tables.js        | ✅ (list/floor-plan/:id)             | ✅                                | ✅               | ✅ batch       | ✅ (baja lógica 05-08)         | ✅        | ✅ completo                            |
| **Turnos**      | shifts.js        | ✅ (list/current)                    | ✅                                | ✅ notas (05-08) | ✅ close       | ✅ solo abiertos/ADMIN (05-08) | ✅        | ✅ completo                            |
| Comandas        | comandas.js      | ✅ (list/:id/kitchen-ticket)         | ✅ (+items/bulk)                  | ✅               | ✅ close/items | ✅ items                       | ✅        | ✅                                     |
| Caja            | cashRegister.js  | ✅ (+tips)                           | ✅ open/close + tips              | —                | —              | —                              | ✅        | ✅                                     |
| Compras         | procurement.js   | ✅ (list/:id)                        | ✅                                | ✅               | ✅ receive     | ✅                             | ✅        | ✅ completo                            |
| Facturas        | invoices.js      | ✅ (+xml)                            | ✅                                | ✅               | —              | ✅ credit-notes                | ✅        | ✅ (DIAN pendiente externo)            |
| QR Menu         | qrMenu.js        | ✅ (config/codes/menu)               | ✅                                | —                | —              | —                              | mixto     | ✅                                     |
| Digiturno       | digiturno.js     | ✅ (queue/live/stats/current)        | ✅                                | ✅               | ✅ status      | ✅                             | ✅        | ✅ completo                            |
| Derechos ARCO   | consent.js       | ✅ (derechos/history)                | ✅ (consent/derecho)              | —                | ✅ respond     | —                              | ✅        | ✅ completo                            |
| Empleados       | employees.js     | ✅                                   | ✅                                | ✅               | ✅ password    | ✅                             | ✅        | ✅ completo                            |
| Push            | push.js          | —                                    | ✅ subscribe                      | —                | —              | —                              | público   | ✅ (subscribe público, correcto)       |
| Notificaciones  | notifications.js | ✅ status                            | ✅ test-email/webhook             | —                | —              | —                              | ✅        | ✅ montado en index.js + tests (05-08) |
| Impresión       | print.js         | ✅ (receipt/kitchen/comanda/invoice) | —                                 | —                | —              | —                              | ✅        | ✅                                     |
| Stats           | stats.js         | ✅                                   | —                                 | —                | —              | —                              | ✅        | ✅                                     |
| Menú público    | menu.js          | ✅                                   | —                                 | —                | —              | —                              | público   | ✅                                     |
| Seed            | misc.js          | —                                    | ✅ seed                           | —                | —              | —                              | protegido | ⚠️ dev-only                            |

**🔴 Verbos CRUD faltantes → ✅ RESUELTOS (05-08, con tests):**

1. `inventory.js` — **DELETE** agregado: baja lógica `activo=false` (el historial de `inventory_movements` no se rompe), check de sede para OPERATOR. Tests: `server/tests/inventory.test.js` (5).
2. `tables.js` — **DELETE** agregado: baja lógica `active=false` (comandas/floor-plan intactos), solo ADMIN, notifica `table:update` por WS. Tests: `server/tests/tables.test.js` (3).
3. `shifts.js` — **PUT** (solo `notas`, nunca montos: la reconciliación de caja deriva de ellos) + **DELETE** (solo turnos ABIERTOS y solo ADMIN; turno cerrado = registro financiero → 409). Tests: `server/tests/shifts.test.js` (11) + `updateShiftSchema` en `schemas/shifts.test.js`.

**🟡 Gaps CRUD transversales:**

- **PUT con lista fija de columnas (riesgo NULL-overwrite) → ✅ RESUELTO (verificado en código, 05-08):** los 18 routers (`campaigns, categories, clients, comandas, digiturno, employees, finance, ingredients, inventory, invoices, loyalty, menuExtras, orders, pizzaSizes, procurement, products, recipes, tables`) usan **updates dinámicos** con guardas `if (campo !== undefined)` — un campo ausente YA no se escribe NULL (hay comentarios en código: "Update dinámico — antes sobreescribía todas las columnas"). **Deuda B-7 de BREACHES_08-04, CERRADA.**
- ~~**🔴 PUT de `orders` acepta `total` del cliente (hallazgo 05-08):**~~ **✅ RESUELTO posteriormente:** el PUT ignora el total del cliente y recalcula server-side; se conserva esta línea como evidencia histórica.
- **🔴 `notifications.js` sin montar → ✅ RESUELTO (05-08):** el router (3 endpoints: `/api/notifications/status`, `test-email`, `test-webhook`) **ya se importa y monta en `server/index.js`** — dejó de devolver 404. Tests: `server/tests/notifications.test.js` (9). El frontend todavía no lo llama (solo un TODO en AdminLayout) — el endpoint queda listo para el panel.
- **`requireSameLocation` en `tables.js` → ✅ RESUELTO (05-08):** `requireSameLocation` ya cubría el mismatch explícito; el hueco real era que un OPERATOR que **omite** `locationId` veía TODAS las sedes (el middleware no bloquea omisión). Se agregó `effectiveLocationId()` (mismo patrón que inventory.js) que fuerza la sede del token server-side en `GET /api/tables` y `GET /api/tables/floor-plan`. **Hallazgo HIGH #5 de AUDIT_07-30, cerrado** con tests de scoping en `server/tests/tables.test.js`.
- **`/api/inventory/movement` y `/api/inventory/movements`** sin DELETE de movimiento (auditoría).

---

# 3. 🖥️ FRONTEND — vistas, componentes y cobertura de módulos

**20 vistas de roles + 9 componentes + 1 página + 3 services. Todos los 19 módulos GastroModule tienen vista.**

| Módulo       | Vista                                      | API usada (api.ts)                                  | Estado                                                                                                     |
| ------------ | ------------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| dashboard    | GastroProDashboard.tsx                     | stats, finance, inventory, orders                   | ✅                                                                                                         |
| menu         | MenuInteligente.tsx (74KB — la más pesada) | products, categories, sizes, variants/combos/promos | ✅                                                                                                         |
| inventario   | InventarioView.tsx                         | inventory, recipes                                  | ✅                                                                                                         |
| clientes     | ClientesView.tsx (42KB)                    | clients                                             | ✅                                                                                                         |
| fidelizacion | FidelizacionView.tsx                       | loyalty                                             | ✅                                                                                                         |
| campanas     | MarketingView.tsx                          | campaigns                                           | ✅ (fotografía 2026-08-05: entonces sin scheduler; **resuelto posteriormente**, ver §6 del estado vigente) |
| finanzas     | FinanzasView.tsx                           | finance/expenses                                    | ✅                                                                                                         |
| reportes     | ReportesView.tsx                           | stats, finance                                      | ✅                                                                                                         |
| reviews      | ReviewsView.tsx                            | reviews                                             | ✅                                                                                                         |
| pagos        | PaymentSettingsView.tsx (2.4KB — mínima)   | payments/status                                     | ⚠️ es solo estado de configuración                                                                         |
| empleados    | EmpleadosView.tsx (+test)                  | employees                                           | ✅                                                                                                         |
| turnos       | TurnosView.tsx                             | shifts                                              | ✅                                                                                                         |
| mesas        | MesasView.tsx                              | tables                                              | ✅                                                                                                         |
| caja         | CajaView.tsx                               | cashRegister, tips                                  | ✅                                                                                                         |
| comandas     | ComandasView.tsx                           | comandas                                            | ✅                                                                                                         |
| compras      | ComprasView.tsx                            | procurement                                         | ✅                                                                                                         |
| facturacion  | InvoicesView.tsx                           | invoices, credit-notes                              | ✅                                                                                                         |
| digiturno    | DigiturnoView.tsx                          | digiturno                                           | ✅                                                                                                         |
| derechos     | DerechosView.tsx                           | derechos ARCO                                       | ✅                                                                                                         |

**Componentes públicos:** MenuDigital, CartSection, PizzaBuilder, ApprovedReviews, TrackOrderModal, LoginModal, BoldCheckoutButton, AdminLayout, OrderConfirmationPage.

**🔴 Gaps frontend:**

- **Solo 3 archivos de test frontend** (`LoginModal.test.tsx`, `CartContext.test.tsx`, `EmpleadosView.test.tsx`) — 17 vistas sin test. Cobertura `src/views/roles/` = **48.18%**.
- **PaymentSettingsView es "decorativa"** (2.4KB): solo lee `/api/payments/status` — no configura credenciales, no prueba webhooks. GAP del módulo Pagos real.
- **`PaymentSettingsView` NO aparece en `GASTRO_MODULES` como 'pagos'?** — sí aparece (módulo `pagos` → PaymentSettingsView ✅ verificado en App.tsx).

---

# 4. 🔒 SEGURIDAD — verificación de brechas conocidas

| Brecha                                                | Estado 2026-08-05                                                                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 vulnerabilidades npm audit                          | ✅ (fast-uri fixeado 04-08)                                                                                                                                   |
| CSRF desconectado del frontend (Critical #1 de 07-30) | ✅ RESUELTO en commit 73e08da — `PUBLIC_PATHS` correcto, `/api/orders` excluido por caso puntual                                                              |
| Precio de pedido controlado por cliente (Critical #2) | ✅ RESUELTO — server-side re-pricing en `orderPricing.js` + anti-tampering en tests                                                                           |
| `pizza_sizes` en schema.sql (Critical #3)             | ✅ RESUELTO — está en schema.sql                                                                                                                              |
| Bind-mount `./dist` (Critical #4)                     | ✅ RESUELTO — removido del compose                                                                                                                            |
| XSS en print.js (High #6)                             | ✅ RESUELTO                                                                                                                                                   |
| PII WebSocket broadcast (High #7)                     | ✅ RESUELTO — `notifyAuthorized()`                                                                                                                            |
| Inyección XML dianXml (High #8)                       | ✅ RESUELTO — escaping probado (dianXml.test.js)                                                                                                              |
| Race TOCTOU facturas (High #9)                        | ✅ RESUELTO — índice único (#270)                                                                                                                             |
| Migrador no atómico (High #10)                        | ✅ RESUELTO — `migrate.test.js` con transacciones                                                                                                             |
| **`requireSameLocation` en tables.js (High #5)**      | ✅ **RESUELTO 05-08** — `effectiveLocationId()` fuerza la sede del token en GET list + floor-plan (el OPERATOR que omite locationId ya no ve todas las sedes) |
| **`processed_webhooks` faltante en schema.sql**       | ✅ **RESUELTO 05-08** — agregada a schema.sql + test de regresión de sync db.js↔schema.sql                                                                    |
| **CSRF PUBLIC_PATHS por prefijo** (Backlog)           | ⚠️ riesgo documentado: `/api/digiturno` público exime también sub-rutas — verificado que sigue startsWith                                                     |

**Verificación nueva:**

- **Todas las rutas privadas tienen authMiddleware** (excepto menu público, push subscribe público, seed protegido). ✅
- **Rate limiting:** generalRateLimit + serviceRateLimit (servicios x-service-key) + nginx zones (login 10r/m, api 200r/m). ✅
- **`/api/digiturno/stats` es público** (en PUBLIC_PATHS) — exposición menor de métricas de turnero, aceptado por diseño.

---

# 5. 🧪 TESTS — cobertura por módulo

**13 archivos de test cubren rutas** (verificado 05-08): `auth-cookie`, `auth-lockout`, `consent`, `digiturno`, `inventory`, `notifications` (9, nuevo), `orders` (+ `routes/orders.test.js` de funciones puras), `payments`, `print`, `push`, `shifts`, `tables`. **Suite completa: 309/309 tests en 29 archivos, todos verdes** (`npx vitest run`).

**🔴 Sin NINGÚN test (~20 routers):** products, categories, pizzaSizes, ingredients, campaigns, clients, recipes, finance, loyalty, menuExtras, reviews, menu, comandas, cashRegister, procurement, invoices, qrMenu, stats, misc, employees.

**Cobertura real (gate CI 60/40/55/62):**

| Área              | % stmts                                         |
| ----------------- | ----------------------------------------------- |
| TOTAL             | 66.34                                           |
| server/routes     | 43.42 (casi toda de orders 87% + digiturno 67%) |
| server/middleware | 36.11                                           |
| src/views/roles   | 48.18                                           |
| server/services   | 84.79                                           |
| server/schemas    | 91.66                                           |

**🔴 El 60% de la API (rutas de dinero/CRM) no tiene red de seguridad.** El flujo de pagos SÍ está cubierto (14 tests webhooks) y el 05-08 se sumaron inventory (5), tables (3) y shifts (11) + auth (lockout/cookie), pero CRUD de productos/clientes/finanzas/comandas/caja NO.

---

# 6. ⚙️ AUTOMATIZACIONES — estado

| Automatización                                    | Estado                                                                                                                                               |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backup diario BD (GitHub Action 04:00 COT)        | ✅ existe (backup.yml + scripts/backup.sh)                                                                                                           |
| Reset diario digiturno                            | ✅ implementado                                                                                                                                      |
| Idempotencia webhooks de pago                     | ✅                                                                                                                                                   |
| Push notifications                                | ✅ (server/push.js + VAPID)                                                                                                                          |
| Webhooks salientes (pedido/pago)                  | ✅ (webhooks.js con retry)                                                                                                                           |
| **Campañas `scheduled`**                          | ~~🔴 NO había scheduler/cron en la fotografía del 05-08~~ → **✅ RESUELTO posteriormente** con `campaignScheduler.js`; consultar el informe vigente. |
| **Monitoreo n8n de /api/health + /api/metrics**   | 🟡 propuesto (docs/MONITOREO_N8N.md) — NO implementado                                                                                               |
| **Reconciliación caja/turno automática**          | 🔴 no existe — comandas no alimentan órdenes                                                                                                         |
| **Descuento de inventario por receta automático** | 🔴 no existe (backlog B-…)                                                                                                                           |

---

# 7. 🚀 PERFORMANCE — diagnóstico de lentitud

**El sitio público carga (tras la optimización 05-08): index.html (24KB) + index.js (245KB) + react (140KB) + css (65KB) + logo.webp (82KB) + footer-img.webp (7.7KB) + pizza-logo.mp4 (1.58MB con poster de 73KB que pinta al instante). Total assets: 1.67MB vs los 8.49MB previos.**

**🔴 Críticos (causa de "está súper lento") → ✅ RESUELTOS (05-08, medido en build):**

1. **`footer-img.png` (4.3 MB)** — era un archivo **corrupto** (PNG mangled, el navegador no mostraba nada). Reemplazado por `footer-img.webp` generado (gradientes de marca 1920×1080) de **7.7 KB**. `public/styles.css` → `url('/footer-img.webp')`.
2. **`pizza-logo.mp4` (3.6 MB autoplay, 2827 kb/s @ 1280×720)** — re-codificado con ffmpeg (H.264 CRF 30, sin audio innecesario, +faststart) → **1.58 MB (-57%)**. Se agregó `poster="/pizza-logo-poster.webp"` (73 KB, frame real a resolución nativa 1280×720) para que el hero pinte al instante.
3. **`logo.png` (692 KB, 608×573)** — convertido a `logo.webp` (lossy q90) → **82.7 KB (-88%)**. `index.html` → `src="/logo.webp"`.

**Resultado medido (build real):** los 3 assets pasan de **8.49 MB → 1.67 MB** (incluye poster) = **6.82 MB menos, -80.3%**. Dist total: **3.3 MB**. Precache PWA: 1178 KiB (los assets pesados ya no se precachean).

**🟡 Medios:** 4. **recharts = 498KB (125KB gzip) on-demand** — ✅ RESUELTO 05-08 con lazy fino: `useLazyCharts` importa el chunk dinámicamente solo cuando la vista con gráficos lo habilita y el contenedor está en viewport (IO), y `globIgnores` lo excluye del precache PWA (antes: 363KB precacheados en toda primera visita; hoy MarketingView con métricas=0 nunca lo descarga). 5. **`index.js` = 245KB (70KB gzip)** — bundle principal: MenuDigital/CartSection/PizzaBuilder importados EAGER en App.tsx (necesarios para la landing, correcto) + framer-motion en el path crítico. 6. **Google Fonts + Font Awesome por CDN** — 2 requests render-blocking terceros.

**✅ Lo que ya está bien:** lazy-loading de los 19 módulos admin (nunca cargan para visitantes), PWA con SW (39 assets precacheados), manualChunks (react/router/ui), gzip en nginx, `loading="lazy"` en iframes de mapas.

**Prioridad de fix → ✅ COMPLETADA (05-08):** ahorro real **6.82 MB (-80.3%)** en estos 3 assets (medido en `npm run build`). **Siguiente pendiente también completado:** recharts con **lazy fino por vista** (índice #9) — precache PWA baja de 1178 → 792 KiB (-385 KiB en la primera visita).

---

# 8. 🏗️ ARQUITECTURA / FULLSTACK — hallazgos

- **Patrón híbrido correcto:** landing estática (index.html vanilla + portales React) + CRM overlay React con auth real. Documentado en ARCHITECTURE.md.
- **Sin router:** navegación admin vía `history.pushState` + `moduleFromPath()` — funciona, pero 19 módulos en un switch gigante en App.tsx (245KB) es el precio.
- **`api.ts` = 130 métodos** (facade completo frontend→backend) — capa de servicio bien estructurada. ✅
- **`CartContext` al 97% de cobertura** ✅ · **`useWebSocket`** reconexión con backoff ✅.
- **Over-engineering (ponytail):** `useBodyScrollLock` + `useFocusTrap` duplican utilidades que un `<dialog>` nativo resuelve (deuda menor, no tocar hoy). `BoldCheckoutButton` solo para Bold mientras paymentService soporta 6 métodos.

---

# 9. 🎯 PLAN DE ACCIÓN PRIORIZADO

| #   | Prioridad | Brecha                                                                                                                                                                                                                                                                                                                                   | Archivos                                | Effort        |
| --- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------- |
| 1   | 🔴        | ~~Optimizar footer-img.png / pizza-logo.mp4 / logo.png~~ → **✅ RESUELTO 05-08** — **6.82 MB menos (-80.3%)** medido en build (footer corrupto reemplazado por WebP 7.7KB, video CRF30 1.58MB + poster 73KB, logo WebP 82.7KB)                                                                                                           | `public/` + `index.html` + `styles.css` | ✅ 1h         |
| 2   | 🔴        | ~~`requireSameLocation` en tables.js (High #5)~~ → **✅ RESUELTO 05-08** (`effectiveLocationId`, 5 tests de scoping)                                                                                                                                                                                                                     | `server/routes/tables.js`               | ✅ 30min      |
| 3   | 🔴        | ~~`processed_webhooks` en schema.sql~~ → **✅ RESUELTO 05-08** (tabla agregada + test de sync en db.test.js)                                                                                                                                                                                                                             | `docker/postgres/schema.sql`            | ✅ 5min       |
| 4   | 🟠        | ~~DELETE en inventory.js y tables.js; PUT/DELETE en shifts.js~~ → **✅ RESUELTO 05-08** (3 routers, 19 tests)                                                                                                                                                                                                                            | 3 routers                               | ✅ 1h         |
| 5   | 🟠        | ~~Estrategia PUT lista fija (18 routers)~~ → **✅ RESUELTO (verificado en código 05-08):** los 18 usan updates dinámicos con guardas `if (x !== undefined)` — sin NULL-overwrite. Riesgo nuevo: PUT de `orders` acepta `total` del cliente (ver #13)                                                                                     | 18 routers                              | ✅ verificado |
| 6   | 🟠        | Tests de rutas sin cobertura (~21 routers: clients, products, categories, pizzaSizes, ingredients, campaigns, recipes, finance, loyalty, menuExtras, reviews, menu, comandas, cashRegister, procurement, invoices, qrMenu, stats, misc, employees…) — auth/inventory/tables/shifts ya cubiertos                                          |
| 7   | 🟠        | Paginación real en orders/clients/inventory/finance (hoy LIMIT hardcodeado 2000/100/50 — **y `GET /api/clients` SIN LIMITE ninguno**, peor que lo documentado)                                                                                                                                                                           | routers + api.ts                        | 1d            |
| 8   | 🟠        | Scheduler de campañas `scheduled` (cron mínimo o bandera de estado)                                                                                                                                                                                                                                                                      | `server/`                               | 0.5d          |
| 9   | 🟡        | ~~Lazy fino de recharts por vista~~ → **✅ RESUELTO 05-08** — `useLazyCharts` (import dinámico + IntersectionObserver + gating) en MarketingView/FinanzasView/GastroProDashboard + chunk excluido del precache (792 KiB vs 1178). Tradeoff documentado: 498KB on-demand (namespace impide tree-shaking) vs 363KB estáticos precacheados. | 3 vistas + hook + vite.config           | ✅            |
| 10  | 🟡        | Reconciliación caja/turno: comandas→orders (deuda estructural)                                                                                                                                                                                                                                                                           | comandas.js + cashRegister.js           | 2d            |
| 11  | 🟡        | Test frontend de 17 vistas (mínimo: inventario, finanzas, clientes)                                                                                                                                                                                                                                                                      | `src/views/roles/*.test.tsx`            | 2d            |
| 12  | 🟠        | ~~Montar `notifications.js` en `server/index.js`~~ → **✅ RESUELTO 05-08** — importado + montado (fin de los 404) + 9 tests en `server/tests/notifications.test.js`. Pendiente menor: conectar el TODO del AdminLayout al endpoint.                                                                                                      | `server/index.js` + test                | ✅ 15min      |
| 13  | 🟠        | Validar/eliminar `total` en PUT de orders — precio controlable por cliente (hallazgo 05-08)                                                                                                                                                                                                                                              | `server/routes/orders.js`               | 0.5d          |

---

**Conclusión:** No hay "sistema fantasma" ni módulos prometidos que no existan — **todo el CRUD de las 34 tablas y los 19 módulos está implementado, y los gaps 🔴 de seguridad/deploy/perf (#1 assets -6.82MB, #2 sede en tables, #3 processed_webhooks) quedaron resueltos el 05-08, más el #9 (lazy fino de recharts: precache 792 KiB vs 1178)**. **Pasada 2 de verificación (mismo día):** el PUT con lista fija quedó **cerrado** (18/18 routers con updates dinámicos, B-7 CERRADA) y el esquema DB es **más completo que lo documentado** (cash_register con apertura/cierre real de 11 columnas, comandas con tableId+locationId, recipe_ingredients con FK, tips con locationId+orderId). Las brechas reales: **~20 routers sin tests, paginación inexistente (clients sin LIMIT), 4 automatizaciones que no se disparan solas (campañas, reconciliación, inventario por receta, monitoreo n8n)** + **1 hallazgo abierto: PUT de orders que acepta `total`** (`notifications.js` quedó montado y testeado).

_Informe generado por auditoría multi-agente el 2026-08-05 — actualizado el mismo día (pasada 2) con: resolución de gaps #1-#4 y #9; verificación en código de PUT dinámico en 18 routers (B-7 CERRADA), esquema real de cash_register/comandas/tips/recipe_ingredients; hallazgos nuevos (notifications.js sin montar, PUT de orders acepta total); suite 300/300 tests en 28 archivos. Actualizado (mismo día, pasada 3): notifications.js montado en index.js + 9 tests (suite 309/309 en 29 archivos), plan #12 cerrado._
