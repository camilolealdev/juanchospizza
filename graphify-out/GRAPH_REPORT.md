# Graph Report - pizzeria-master (2026-07-16)

## Corpus Check

- 192 files · ~584,674 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 1314 nodes · 2029 edges · 135 communities (99 shown, 36 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `1dbd6997`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- index.js
- helpers.js
- MenuDigital.tsx
- App.tsx
- dependencies
- devDependencies
- MenuInteligente.tsx
- compilerOptions
- AdminDashboard.tsx
- api.ts
- Arquitectura — Juancho's Pizza / GastroPro
- index.ts
- api
- ClientesView.tsx
- FidelizacionView.tsx
- OperatorView.tsx
- FinanzasView.tsx
- Informe de Auditoría de Responsividad — Juancho's Pizza
- Project Context — Juancho's Pizza & GastroPro CRM
- 🔍 INFORME DE AUDITORÍA — Juancho's Pizza v10.0
- Instrucciones para Claude
- ReportesView.tsx
- InventarioView.tsx
- GastroProDashboard.tsx
- Core Mandates — Juancho's Pizza
- 🤖 Instrucciones para Asistentes de IA
- .prettierrc.json
- index.ts
- Limpieza de Branding de IA Externa
- vercel.json
- OrderConfirmationPage.tsx
- PaymentSettingsView.tsx
- h
- config.js
- vite-env.d.ts
- h
- applypatch-msg
- commit-msg
- husky.sh
- post-applypatch
- post-checkout
- post-commit
- post-merge
- post-rewrite
- pre-applypatch
- pre-auto-gc
- pre-commit
- pre-merge-commit
- pre-push
- pre-rebase
- prepare-commit-msg
- config.ts
- applypatch-msg
- commit-msg
- husky.sh
- post-applypatch
- post-checkout
- post-commit
- post-merge
- post-rewrite
- pre-applypatch
- pre-auto-gc
- pre-commit
- pre-merge-commit
- pre-push
- pre-rebase
- prepare-commit-msg
- API Documentation — Juancho's Pizza / GastroPro
- Contribuyendo a Juancho's Pizza / GastroPro
- 🚀 Estado de Pre-Deploy — Juancho's Pizza / GastroPro v2.0.0
- dependencies
- [2.0.0] — 2026-07-15
- str
- 🏷️ Menu Variants / Combos / Promotions
- ✅ COMPLETADO
- orders.js
- 📋 Comandas
- helpers.js
- helpers.test.js
- websocket.js
- menuExtras.js
- boolOpt
- useWebSocket.ts
- 👥 Clients (CRM)
- package.json
- ⭐ Loyalty / Fidelización
- 🍕 Products (Menú)
- 🪑 Dining Tables
- 📦 Orders
- pdf.js
- TurnosView.tsx
- 👨‍🍳 Employees
- 💰 Expenses / Finance
- 📦 Procurement / Purchase Orders
- ⭐ Reviews
- 📦 Inventory
- campaigns.js
- EmpleadosView.tsx
- 📢 Campaigns / Marketing
- 🥬 Ingredients
- 🧾 Invoices / Credit Notes
- 🖨️ Print
- 📱 QR Menu
- 🕐 Shifts / Turnos
- full-audit.spec.ts
- reviews.js
- 💵 Cash Register
- 💰 Tips
- Servicios Directos — Opción B
- Módulo DIAN — Estado de Integración
- DigiturnoView.tsx
- inventory.js
- dianSigner.js
- 🔐 Auth
- extract-inline-styles.js
- consent-banner.js
- consent.js
- 🔷 7. BRECHAS vs CHECKLIST ORIGINAL
- categories.js
- derechos.js
- 🔷 3. SEGURIDAD — Auditoría de Brechas
- 🔷 5. DEUDA TÉCNICA DETECTADA
- 🔷 8. RECOMENDACIONES PRIORIZADAS
- 🔷 1. INVENTARIO DE MÓDULOS vs CHECKLIST
- 🔷 2. BASE DE DATOS — Auditoría de Tablas
- 🎯 S4 — Performance
- 🎯 S1 — Datos y cuentas
- AUTH_COOKIE

## God Nodes (most connected - your core abstractions)

1. `pool` - 32 edges
2. `API Documentation — Juancho's Pizza / GastroPro` - 32 edges
3. `authMiddleware()` - 30 edges
4. `requireRole()` - 28 edges
5. `validate()` - 25 edges
6. `api` - 25 edges
7. `str()` - 23 edges
8. `strOpt()` - 22 edges
9. `LocationId` - 21 edges
10. `scripts` - 20 edges

## Surprising Connections (you probably didn't know these)

- `initAI()` --references--> `@google/generative-ai` [EXTRACTED]
  src/services/geminiService.ts → package.json
- `InvoicesView()` --calls--> `useWebSocket()` [EXTRACTED]
  src/views/roles/InvoicesView.tsx → src/hooks/useWebSocket.ts
- `Props` --references--> `LocationId` [EXTRACTED]
  src/views/roles/ComandasView.tsx → src/types/index.ts
- `Props` --references--> `LocationId` [EXTRACTED]
  src/views/roles/DigiturnoView.tsx → src/types/index.ts
- `GastroProDashboardProps` --references--> `LocationId` [EXTRACTED]
  src/views/roles/GastroProDashboard.tsx → src/types/index.ts

## Import Cycles

- None detected.

## Communities (135 total, 36 thin omitted)

### Community 0 - "index.js"

Cohesion: 0.13
Nodes (20): initPush(), isPushEnabled(), sendPushToPhone(), router, computeNivel(), notifyOrderConfirmation(), notifyOrderStatusChange(), notifyWebhook() (+12 more)

### Community 1 - "helpers.js"

Cohesion: 0.11
Nodes (31): router, createEmployeeSchema, LOCATIONS, ROLES, setPasswordSchema, bool(), boolOpt(), clampedNumber() (+23 more)

### Community 2 - "MenuDigital.tsx"

Cohesion: 0.08
Nodes (26): CartSection(), BADGE_STYLES, CATEGORIES, CROSS_SELL, MenuDigital(), MenuProduct, PIZZA_SIZES, PRODUCTS (+18 more)

### Community 3 - "App.tsx"

Cohesion: 0.05
Nodes (42): App(), AuthContext, AuthContextType, CajaView, ClientesView, ComandasView, ComprasView, DigiturnoView (+34 more)

### Community 4 - "dependencies"

Cohesion: 0.10
Nodes (20): scripts, build, deploy:prod, deploy:staging, dev, dev:all, docker:build, docker:clean (+12 more)

### Community 5 - "devDependencies"

Cohesion: 0.07
Nodes (27): devDependencies, autoprefixer, concurrently, eslint, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, husky (+19 more)

### Community 6 - "MenuInteligente.tsx"

Cohesion: 0.12
Nodes (21): RFC-4180, MenuCombo, MenuPromotion, MenuVariant, CATEGORY_COLORS, colorForCategory(), COMBO_GRADIENTS, CSV_TRUE (+13 more)

### Community 7 - "compilerOptions"

Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+13 more)

### Community 8 - "AdminDashboard.tsx"

Cohesion: 0.19
Nodes (13): @google/generative-ai, CATEGORIES, INGREDIENTS, PRODUCTS, SIZE_FACTORS, generateIngredientImage(), generateProductImage(), getChatbotResponse() (+5 more)

### Community 9 - "api.ts"

Cohesion: 0.08
Nodes (30): apiFetch(), clearAuthSession(), ClientPayload, EmployeeUpdatePayload, ExpensePayload, handleResponse(), InventoryItem, InventoryItemPayload (+22 more)

### Community 10 - "Arquitectura — Juancho's Pizza / GastroPro"

Cohesion: 0.12
Nodes (15): Arquitectura — Juancho's Pizza / GastroPro, Autenticación, Backend: routers por recurso, Base de datos, Deuda estructural conocida, El patrón híbrido landing + CRM + portales, Frontend vs. backend: dos cosas separadas, un solo repo, Pagos (+7 more)

### Community 11 - "index.ts"

Cohesion: 0.12
Nodes (21): connect(), disconnect(), globalListeners, reconnectWS(), scheduleReconnect(), subscribeWS(), useWebSocket(), WSEvent (+13 more)

### Community 12 - "api"

Cohesion: 0.09
Nodes (12): STATUS_LABELS, TrackOrderModalProps, PAYMENT_LABELS, STATUS_LABELS, TrackedOrder, api, Review, subscribeToPushNotifications() (+4 more)

### Community 13 - "ClientesView.tsx"

Cohesion: 0.23
Nodes (13): capitalize(), ClientesView(), ClientOrderSummary, daysSince(), emptyNewClient, formatCurrency(), formatDate(), getInitial() (+5 more)

### Community 14 - "FidelizacionView.tsx"

Cohesion: 0.18
Nodes (12): LoyaltyLevel, emptyForm, FidelizacionView(), formatDate(), LEVEL_ACCENT, LEVEL_BADGE, LEVEL_BORDER, NIVELES (+4 more)

### Community 15 - "OperatorView.tsx"

Cohesion: 0.25
Nodes (6): 4.1 Métricas de Calidad, 4.2 Tests Desglosados, 🔷 4. ESTADO DEL CÓDIGO — Build, Tests, Lint, 🔷 6. DOCUMENTACIÓN — Estado, 🔷 9. RESUMEN VISUAL, 📋 Auditoría Completa — Juancho's Pizza / GastroPro v2.0.0

### Community 16 - "FinanzasView.tsx"

Cohesion: 0.22
Nodes (9): Expense, FinanceSummary, BarTooltipPayload, categorias, CustomBarTooltip(), FinanzasView(), formatCOP(), gastosColors (+1 more)

### Community 17 - "Informe de Auditoría de Responsividad — Juancho's Pizza"

Cohesion: 0.20
Nodes (9): 1. Breakpoints y Media Queries, 2. Elementos Flexibles y Unidades, 3. Desbordamiento (Overflow), 4. Multimedia y Complementos, 5. Accesibilidad Táctil (Mobile-First), 6. Problemas Específicos Identificados, Informe de Auditoría de Responsividad — Juancho's Pizza, Mejoras Implementadas (Junio 2026) (+1 more)

### Community 18 - "Project Context — Juancho's Pizza & GastroPro CRM"

Cohesion: 0.22
Nodes (8): Arquitectura de Aplicación, Convenciones de Desarrollo, Deuda Técnica & Roadmap, Estados de Pedidos, Project Context — Juancho's Pizza & GastroPro CRM, ¿Qué es este proyecto?, Sobre el Branding, Stack Tecnológico

### Community 19 - "🔍 INFORME DE AUDITORÍA — Juancho's Pizza v10.0"

Cohesion: 0.22
Nodes (8): 🛠️ ACCIONES TÉCNICAS REALIZADAS, Avances v10.0 (Design Skills):, Flujos Flotantes, 🔍 INFORME DE AUDITORÍA — Juancho's Pizza v10.0, Menú Digital & Pizza Builder, 📱 OPTIMIZACIÓN MÓVIL (Deep Dive), 📋 PRÓXIMOS PASOS RECOMENDADOS (v11.0), 📊 RESUMEN EJECUTIVO (UX/UI & Responsividad)

### Community 20 - "Instrucciones para Claude"

Cohesion: 0.25
Nodes (7): Antes de cualquier cambio, Comandos útiles del proyecto, Instrucciones para Claude, Para Claude Code (CLI), Reglas de seguridad, Reglas específicas, Stack del proyecto

### Community 21 - "ReportesView.tsx"

Cohesion: 0.20
Nodes (8): Campaign, LoyaltyReward, OrderStatus, emptyForm, ApiOrder, normalizeOrder(), ReportesView(), reportTypes

### Community 22 - "InventarioView.tsx"

Cohesion: 0.09
Nodes (28): calcPrice(), cartCounter, CAT_COLORS, CAT_ICONS, CAT_LABELS, CAT_VIS_COLORS, confirmBtn, getCurrentMasa() (+20 more)

### Community 23 - "GastroProDashboard.tsx"

Cohesion: 0.25
Nodes (7): Client, ApiOrder, DIA_LABELS, GastroProDashboard(), GastroProDashboardProps, normalizeOrder(), WeeklyPoint

### Community 24 - "Core Mandates — Juancho's Pizza"

Cohesion: 0.29
Nodes (6): 🤖 AI Mandates, 🏗️ Arquitectura & Integridad, 🎨 Branding & UX, 🛠️ Convenciones de Código, Core Mandates — Juancho's Pizza, 🔒 Seguridad & Privacidad

### Community 25 - "🤖 Instrucciones para Asistentes de IA"

Cohesion: 0.29
Nodes (6): Convenciones, Cómo usar, Estructura, 🤖 Instrucciones para Asistentes de IA, Reglas inquebrantables, Stack del Proyecto

### Community 26 - ".prettierrc.json"

Cohesion: 0.29
Nodes (6): endOfLine, printWidth, semi, singleQuote, tabWidth, trailingComma

### Community 27 - "index.ts"

Cohesion: 0.48
Nodes (4): getProductImage(), PRODUCT_IMAGES, getIngredientImage(), INGREDIENT_IMAGES

### Community 28 - "Limpieza de Branding de IA Externa"

Cohesion: 0.33
Nodes (5): Dónde buscar, Eliminar siempre, Limpieza de Branding de IA Externa, NO eliminar, Regla

### Community 29 - "vercel.json"

Cohesion: 0.33
Nodes (5): buildCommand, devCommand, framework, installCommand, rewrites

### Community 30 - "OrderConfirmationPage.tsx"

Cohesion: 0.06
Nodes (32): 1. Bold — Pasarela de Pagos, 2. DIAN — Facturación Electrónica, 3. Resumen de Variables de Entorno, Bold, Bold — ¿Cuándo está listo?, Checklist Rápido, Correo (para enviar facturas por email a clientes), DIAN — ¿Cuándo está lista? (+24 more)

### Community 31 - "PaymentSettingsView.tsx"

Cohesion: 0.09
Nodes (22): 🔐 Admin CRM — 17 Módulos (requieren backend), 🌐 Análisis de Red (Requests), 🟢 Bajo (3), Botones Hero y Acción, ✅ Conclusión, 🔴 Crítico (1), Domicilios, ❌ ERROR #1 — CORS en API Reviews (CRÍTICO) (+14 more)

### Community 74 - "API Documentation — Juancho's Pizza / GastroPro"

Cohesion: 0.08
Nodes (25): API Documentation — Juancho's Pizza / GastroPro, 🔐 Auth, 📂 Categories, ⚠️ Códigos de Error, `GET /api/categories`, `GET /api/health`, `GET /api/menu`, `GET /api/payments/status` (+17 more)

### Community 75 - "Contribuyendo a Juancho's Pizza / GastroPro"

Cohesion: 0.11
Nodes (17): Backend, Contribuyendo a Juancho's Pizza / GastroPro, 🔧 Convenciones de Código, 🚀 Despliegue, 🐳 Docker, Escribir Tests, 🏗️ Estructura del Proyecto, Frontend (+9 more)

### Community 76 - "🚀 Estado de Pre-Deploy — Juancho's Pizza / GastroPro v2.0.0"

Cohesion: 0.12
Nodes (15): 1.1 Dashboard Ejecutivo (`GastroProDashboard.tsx`), 1.2 Clientes CRM (`ClientesView.tsx`), 1.3 Inventario Avanzado (`InventarioView.tsx`), 1.4-1.17 (Ver docs/AUDIT_COMPLETO.md para el análisis completo de los 17 módulos), 🔷 1. ANÁLISIS MÓDULO POR MÓDULO, 🔷 2. SEGURIDAD — Verificación Final, 🔷 3. DOCUMENTACIÓN — Verificación Final, 🔷 4. PENDIENTES POST-DEPLOY (+7 more)

### Community 77 - "dependencies"

Cohesion: 0.12
Nodes (17): dependencies, cors, dotenv, express, framer-motion, helmet, node-forge, nodemailer (+9 more)

### Community 78 - "[2.0.0] — 2026-07-15"

Cohesion: 0.14
Nodes (13): [1.0.0] — 2026-06, [2.0.0] — 2026-07-15, Changelog — Juancho's Pizza / GastroPro, 🏗️ Infraestructura, 🚀 Lanzamiento Inicial, 📊 Leyenda, 🔧 Migraciones/Actualizaciones, 📦 Nuevos Módulos Backend (+5 more)

### Community 79 - "str"

Cohesion: 0.43
Nodes (5): router, createClientSchema, ESTADOS, patchClientSchema, updateClientSchema

### Community 80 - "🏷️ Menu Variants / Combos / Promotions"

Cohesion: 0.15
Nodes (13): `DELETE /api/menu/combos/:id`, `DELETE /api/menu/promotions/:id`, `DELETE /api/menu/variants/:id`, `GET /api/menu/combos`, `GET /api/menu/promotions`, `GET /api/menu/variants`, 🏷️ Menu Variants / Combos / Promotions, `POST /api/menu/combos` (+5 more)

### Community 81 - "✅ COMPLETADO"

Cohesion: 0.17
Nodes (11): 📁 ARCHIVOS CLAVE, ✅ COMPLETADO, Documentación (100%), Frontend, Infraestructura, Limpieza, 📊 MÉTRICAS, 🚀 PRÓXIMOS PASOS SUGERIDOS (+3 more)

### Community 82 - "orders.js"

Cohesion: 0.39
Nodes (5): requireSameLocation(), router, LOCATION_IDS, closeShiftSchema, openShiftSchema

### Community 83 - "📋 Comandas"

Cohesion: 0.18
Nodes (11): 📋 Comandas, `DELETE /api/comandas/items/:id`, `GET /api/comandas/:id`, `GET /api/comandas/:id/kitchen-ticket` — Ticket de cocina, `GET /api/comandas?status=open&locationId=nemocon`, `PATCH /api/comandas/:id/close` — Cerrar comanda y liberar mesa, `PATCH /api/comandas/items/:id`, `POST /api/comandas` — Abrir comanda en mesa (+3 more)

### Community 84 - "helpers.js"

Cohesion: 0.08
Nodes (26): CartItem, CashFlow, CashRegisterEntry, Combo, CreditNote, Expense, InventoryItem, InventoryMovement (+18 more)

### Community 85 - "helpers.test.js"

Cohesion: 0.40
Nodes (4): router, addPointsSchema, createRewardSchema, updateRewardSchema

### Community 86 - "websocket.js"

Cohesion: 0.06
Nodes (41): readAuthCookie(), router, router, notifyInvoiceUpdate(), router, bulkAddItemsSchema, closeComandaSchema, createComandaItemSchema (+33 more)

### Community 87 - "menuExtras.js"

Cohesion: 0.20
Nodes (14): authenticate(), buildAuthCookie(), buildClearAuthCookie(), devSecretCache, generateSalt(), generateToken(), getSecret(), hashPin() (+6 more)

### Community 88 - "boolOpt"

Cohesion: 0.15
Nodes (12): validate(), router, router, router, router, createPurchaseOrderSchema, createQrMenuConfigSchema, purchaseItemSchema (+4 more)

### Community 89 - "useWebSocket.ts"

Cohesion: 0.11
Nodes (17): 10. Test E2E de Host Header Injection en /api/payments/*, 11. Rate-limit + CAPTCHA en /api/consent, 12. 2FA TOTP para rol ADMIN, 13. Audit log de ARCO + consent, 14. Backup/restore drill de PostgreSQL mensual, 15. Auditoría WCAG 2.2 AA sobre consentimiento + pizza builder, 1. Limpiar el baseline de ESLint (192 errores pre-existentes), 2. Smoke test de CSP en producción (+9 more)

### Community 90 - "👥 Clients (CRM)"

Cohesion: 0.25
Nodes (8): 👥 Clients (CRM), `DELETE /api/clients/:id` — (Protegido por FK si tiene historial), `GET /api/clients`, `GET /api/clients/:id`, `GET /api/clients/:id/orders` — Historial de órdenes del cliente, `PATCH /api/clients/:id` — Actualizar vip/notas/tags/estado, `POST /api/clients`, `PUT /api/clients/:id` — Editar perfil completo

### Community 91 - "package.json"

Cohesion: 0.25
Nodes (7): lint-staged, *.{json,md,css}, *.{ts,tsx,js,jsx}, name, private, type, version

### Community 92 - "⭐ Loyalty / Fidelización"

Cohesion: 0.29
Nodes (7): `DELETE /api/loyalty/rewards/:id`, `GET /api/loyalty/points/:clientId`, `GET /api/loyalty/rewards`, ⭐ Loyalty / Fidelización, `POST /api/loyalty/points`, `POST /api/loyalty/rewards`, `PUT /api/loyalty/rewards/:id`

### Community 93 - "🍕 Products (Menú)"

Cohesion: 0.29
Nodes (7): `DELETE /api/products/:id`, `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `POST /api/products/bulk`, 🍕 Products (Menú), `PUT /api/products/:id`

### Community 94 - "🪑 Dining Tables"

Cohesion: 0.29
Nodes (7): 🪑 Dining Tables, `GET /api/tables/floor-plan?locationId=nemocon`, `GET /api/tables/:id`, `GET /api/tables?locationId=nemocon&area=salon&status=available`, `PATCH /api/tables/batch-status` — Actualizar estado masivo, `POST /api/tables`, `PUT /api/tables/:id`

### Community 95 - "📦 Orders"

Cohesion: 0.29
Nodes (7): `GET /api/orders`, `GET /api/orders/:id`, `GET /api/orders/track/:orderNumber?phone=XXX`, 📦 Orders, `PATCH /api/orders/:id/status`, `POST /api/orders`, `PUT /api/orders/:id`

### Community 96 - "pdf.js"

Cohesion: 0.52
Nodes (6): drawLine(), drawText(), generateInvoicePDF(), generateOrderPDF(), generatePDF(), generateReportPDF()

### Community 97 - "TurnosView.tsx"

Cohesion: 0.33
Nodes (6): Shift, formatDateTime(), formatter, LOCATION_LABELS, TurnosView(), TurnosViewProps

### Community 98 - "👨‍🍳 Employees"

Cohesion: 0.33
Nodes (6): `DELETE /api/employees/:id`, 👨‍🍳 Employees, `GET /api/employees`, `PATCH /api/employees/:id/password` — Cambiar contraseña, `POST /api/employees`, `PUT /api/employees/:id`

### Community 99 - "💰 Expenses / Finance"

Cohesion: 0.33
Nodes (6): `DELETE /api/expenses/:id`, 💰 Expenses / Finance, `GET /api/expenses?desde=2026-01-01&hasta=2026-07-15`, `GET /api/finance/summary` — Resumen ingresos/egresos/utilidad, `POST /api/expenses`, `PUT /api/expenses/:id`

### Community 100 - "📦 Procurement / Purchase Orders"

Cohesion: 0.33
Nodes (6): `DELETE /api/procurement/:id`, `GET /api/procurement/:id`, `GET /api/procurement?status=pendiente&locationId=nemocon`, `PATCH /api/procurement/:id/receive` — Recibir orden (actualiza inventario), `POST /api/procurement`, 📦 Procurement / Purchase Orders

### Community 101 - "⭐ Reviews"

Cohesion: 0.33
Nodes (6): `DELETE /api/reviews/:id`, `GET /api/reviews/approved` — Reseñas aprobadas (público), `GET /api/reviews?status=pending`, `PATCH /api/reviews/:id/status` — Aprobar/rechazar, `POST /api/reviews` — Crear reseña (público), ⭐ Reviews

### Community 102 - "📦 Inventory"

Cohesion: 0.33
Nodes (6): `GET /api/inventory`, `GET /api/inventory/movements`, 📦 Inventory, `POST /api/inventory`, `POST /api/inventory/movement` — Registrar entrada/salida, `PUT /api/inventory/:id`

### Community 103 - "campaigns.js"

Cohesion: 0.39
Nodes (5): router, CAMPAIGN_STATUSES, CAMPAIGN_TYPES, createCampaignSchema, updateCampaignSchema

### Community 104 - "EmpleadosView.tsx"

Cohesion: 0.15
Nodes (14): app, __dirname, __filename, PORT, initServiceKeys(), serviceKeyMiddleware(), VALID_SERVICES, router (+6 more)

### Community 105 - "📢 Campaigns / Marketing"

Cohesion: 0.40
Nodes (5): 📢 Campaigns / Marketing, `DELETE /api/campaigns/:id`, `GET /api/campaigns`, `POST /api/campaigns`, `PUT /api/campaigns/:id`

### Community 106 - "🥬 Ingredients"

Cohesion: 0.40
Nodes (5): `DELETE /api/ingredients/:id`, `GET /api/ingredients`, 🥬 Ingredients, `POST /api/ingredients`, `PUT /api/ingredients/:id`

### Community 107 - "🧾 Invoices / Credit Notes"

Cohesion: 0.40
Nodes (5): `GET /api/credit-notes?invoiceId=INVOICE_ID`, `GET /api/invoices?status=pending`, 🧾 Invoices / Credit Notes, `POST /api/credit-notes`, `POST /api/invoices`

### Community 108 - "🖨️ Print"

Cohesion: 0.40
Nodes (5): `GET /api/print/comanda-receipt/:comandaId?token=TOKEN`, `GET /api/print/invoice/:invoiceId?token=TOKEN`, `GET /api/print/kitchen-ticket/:comandaId?token=TOKEN`, `GET /api/print/receipt/:orderId?token=TOKEN`, 🖨️ Print

### Community 109 - "📱 QR Menu"

Cohesion: 0.40
Nodes (5): `GET /api/qr-menu/config?locationId=nemocon`, `GET /api/qr-menu/qr-codes?locationId=nemocon`, `POST /api/qr-menu/config`, `POST /api/qr-menu/regenerate`, 📱 QR Menu

### Community 110 - "🕐 Shifts / Turnos"

Cohesion: 0.40
Nodes (5): `GET /api/shifts/current?locationId=nemocon`, `GET /api/shifts?locationId=nemocon&status=open`, `PATCH /api/shifts/:id/close` — Cerrar turno, `POST /api/shifts` — Abrir turno, 🕐 Shifts / Turnos

### Community 111 - "full-audit.spec.ts"

Cohesion: 0.40
Nodes (3): ALL_CONSOLE_ENTRIES, ALL_NETWORK_FAILURES, ALL_UNHANDLED_REJECTIONS

### Community 112 - "reviews.js"

Cohesion: 0.20
Nodes (10): generalRateLimit(), loginAttempts, loginRateLimit(), rateLimit, reviewAttempts, reviewRateLimit(), router, createReviewSchema (+2 more)

### Community 113 - "💵 Cash Register"

Cohesion: 0.50
Nodes (4): 💵 Cash Register, `GET /api/cash-register?locationId=nemocon&status=open`, `POST /api/cash-register/:id/close`, `POST /api/cash-register/open`

### Community 114 - "💰 Tips"

Cohesion: 0.17
Nodes (12): C1 — DIAN estructura base, 📅 Calendario tentativo, CSP endurecido (sin `unsafe-inline` en `script-src`), ✅ Definition of Done (DoD) global, DIAN firma + CUFE + proveedor, 📋 Plan de Remediación — Juancho's Pizza v2.0.0, ⚠️ Riesgos identificados, 🎯 S0 — Fundaciones (cerrado) (+4 more)

### Community 115 - "Servicios Directos — Opción B"

Cohesion: 0.50
Nodes (3): Servicios Directos — Opción B, Servicios disponibles, Uso desde rutas

### Community 116 - "Módulo DIAN — Estado de Integración"

Cohesion: 0.08
Nodes (23): 1. Configurar datos reales del emisor, 2. Configurar resolución DIAN, 3. Configurar software PSE (Proveedor), 4. Obtener certificado digital, 5. Elegir e integrar proveedor tecnológico, Actualización de firma, 📁 Archivos del Módulo DIAN, Creación de facturas (+15 more)

### Community 117 - "DigiturnoView.tsx"

Cohesion: 0.20
Nodes (10): DigiturnoTicket, DigiturnoView(), FilterTab, playNotificationSound(), Props, SOURCE_ICONS, SOURCE_LABELS, STATUS_CONFIG (+2 more)

### Community 118 - "inventory.js"

Cohesion: 0.10
Nodes (22): authMiddleware(), requireRole(), initDB(), pool, MIGRATIONS, runMigrations(), router, router (+14 more)

### Community 119 - "dianSigner.js"

Cohesion: 0.33
Nodes (9): calcularCUFE(), canonicalizeSimple(), CERTIFICADO_CONFIG, clearLoadedCertificate(), loadCertificate(), reloadDianCertificate(), sha256Base64(), sha384() (+1 more)

### Community 120 - "🔐 Auth"

Cohesion: 0.27
Nodes (8): BASE_URL, normalizeResponse(), PROVIDER, sendInvoiceToProvider(), sendToAlegra(), sendToDataico(), sendToMuisca(), sendToNovasoft()

### Community 121 - "extract-inline-styles.js"

Cohesion: 0.20
Nodes (9): cssPath, html, htmlPath, jsonLdMatch, log, REVERT, root, schemaPath (+1 more)

### Community 122 - "consent-banner.js"

Cohesion: 0.39
Nodes (7): buildStyles(), decide(), hasAnyDecision(), init(), injectBanner(), saveDecisions(), sendToBackend()

### Community 123 - "consent.js"

Cohesion: 0.38
Nodes (3): router, consentTypeSchema, postConsentSchema

### Community 124 - "🔷 7. BRECHAS vs CHECKLIST ORIGINAL"

Cohesion: 0.33
Nodes (6): 7.1 Tier 0 — Bloqueante Técnico, 7.2 Tier 1 — Legal / DIAN, 7.3 Tier 2 — Operación de Salón, 7.4 Tier 3 — Catálogo y Ventas, 7.5 Tier 4 — Avanzado, 🔷 7. BRECHAS vs CHECKLIST ORIGINAL

### Community 125 - "categories.js"

Cohesion: 0.60
Nodes (3): router, createCategorySchema, updateCategorySchema

### Community 126 - "derechos.js"

Cohesion: 0.50
Nodes (3): derechoBaseSchema, identifierSchema, tipoSchema

### Community 127 - "🔷 3. SEGURIDAD — Auditoría de Brechas"

Cohesion: 0.50
Nodes (4): 3.1 Autenticación (server/auth.js), 3.2 Middleware de Seguridad, 3.3 Brechas Detectadas (Histórico — Resueltas), 🔷 3. SEGURIDAD — Auditoría de Brechas

### Community 128 - "🔷 5. DEUDA TÉCNICA DETECTADA"

Cohesion: 0.50
Nodes (4): 5.1 Deuda Alta (Prioritaria), 5.2 Deuda Media, 5.3 Deuda Baja / Cosmética, 🔷 5. DEUDA TÉCNICA DETECTADA

### Community 129 - "🔷 8. RECOMENDACIONES PRIORIZADAS"

Cohesion: 0.50
Nodes (4): 🔷 8. RECOMENDACIONES PRIORIZADAS, ✅ Completado — Seguridad y Documentación, 🟡 Corto Plazo (1 semana), 🟢 Mediano Plazo (2-4 semanas)

### Community 130 - "🔷 1. INVENTARIO DE MÓDULOS vs CHECKLIST"

Cohesion: 0.67
Nodes (3): 1.1 Módulos Backend (Total: 29 archivos de ruta/20 schemas), 1.2 Módulos Frontend (Total: 22 vistas de rol), 🔷 1. INVENTARIO DE MÓDULOS vs CHECKLIST

### Community 131 - "🔷 2. BASE DE DATOS — Auditoría de Tablas"

Cohesion: 0.67
Nodes (3): 2.1 Inventario Completo (29 tablas), 2.2 Verificación de Celdas Fantasma, 🔷 2. BASE DE DATOS — Auditoría de Tablas

### Community 132 - "🎯 S4 — Performance"

Cohesion: 0.67
Nodes (3): Compresión HTTP + paginación, Migración UUID, 🎯 S4 — Performance

### Community 133 - "🎯 S1 — Datos y cuentas"

Cohesion: 0.67
Nodes (3): Habeas Data (Ley 1581/2012), JWT Cookie HttpOnly, 🎯 S1 — Datos y cuentas

## Knowledge Gaps

- **627 isolated node(s):** `husky.sh script`, `husky.sh script`, `semi`, `singleQuote`, `trailingComma` (+622 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `AdminDashboard.tsx`, `package.json`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `@google/generative-ai` connect `AdminDashboard.tsx` to `dependencies`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `husky.sh script`, `husky.sh script`, `semi` to the rest of the system?**
  _627 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12962962962962962 - nodes in this community are weakly interconnected._
- **Should `helpers.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11436170212765957 - nodes in this community are weakly interconnected._
- **Should `MenuDigital.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07610993657505286 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.054078014184397165 - nodes in this community are weakly interconnected._
