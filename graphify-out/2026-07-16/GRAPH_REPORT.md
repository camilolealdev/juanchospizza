# Graph Report - pizzeria-master (2026-07-15)

## Corpus Check

- 179 files · ~575,375 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 1191 nodes · 1868 edges · 121 communities (85 shown, 36 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `4c1c022b`
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

## God Nodes (most connected - your core abstractions)

1. `API Documentation — Juancho's Pizza / GastroPro` - 32 edges
2. `pool` - 31 edges
3. `authMiddleware()` - 28 edges
4. `requireRole()` - 27 edges
5. `api` - 25 edges
6. `validate()` - 24 edges
7. `str()` - 23 edges
8. `strOpt()` - 22 edges
9. `LocationId` - 21 edges
10. `scripts` - 20 edges

## Surprising Connections (you probably didn't know these)

- `initAI()` --references--> `@google/generative-ai` [EXTRACTED]
  src/services/geminiService.ts → package.json
- `Props` --references--> `LocationId` [EXTRACTED]
  src/views/roles/CajaView.tsx → src/types/index.ts
- `Props` --references--> `LocationId` [EXTRACTED]
  src/views/roles/DigiturnoView.tsx → src/types/index.ts
- `GastroProDashboardProps` --references--> `LocationId` [EXTRACTED]
  src/views/roles/GastroProDashboard.tsx → src/types/index.ts
- `TurnosViewProps` --references--> `LocationId` [EXTRACTED]
  src/views/roles/TurnosView.tsx → src/types/index.ts

## Import Cycles

- None detected.

## Communities (121 total, 36 thin omitted)

### Community 0 - "index.js"

Cohesion: 0.05
Nodes (76): authenticate(), authMiddleware(), devSecretCache, generateSalt(), generateToken(), getSecret(), hashPin(), login() (+68 more)

### Community 1 - "helpers.js"

Cohesion: 0.22
Nodes (13): createExpenseSchema, updateExpenseSchema, bool(), boolOpt(), clampedNumberOpt(), passwordBase(), passwordRequired(), passwordSecure() (+5 more)

### Community 2 - "MenuDigital.tsx"

Cohesion: 0.08
Nodes (26): CartSection(), BADGE_STYLES, CATEGORIES, CROSS_SELL, MenuDigital(), MenuProduct, PIZZA_SIZES, PRODUCTS (+18 more)

### Community 3 - "App.tsx"

Cohesion: 0.05
Nodes (41): App(), AuthContext, AuthContextType, CajaView, ClientesView, ComandasView, ComprasView, DigiturnoView (+33 more)

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

Cohesion: 0.13
Nodes (21): apiFetch(), clearAuthSession(), ClientPayload, decodeTokenPayload(), EmployeeUpdatePayload, ensureFreshToken(), ExpensePayload, getAuthToken() (+13 more)

### Community 10 - "Arquitectura — Juancho's Pizza / GastroPro"

Cohesion: 0.12
Nodes (15): Arquitectura — Juancho's Pizza / GastroPro, Autenticación, Backend: routers por recurso, Base de datos, Deuda estructural conocida, El patrón híbrido landing + CRM + portales, Frontend vs. backend: dos cosas separadas, un solo repo, Pagos (+7 more)

### Community 11 - "index.ts"

Cohesion: 0.11
Nodes (20): useWebSocket(), Comanda, ComandaItem, CreditNote, DiningTable, FloorPlan, Invoice, LocationId (+12 more)

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

Cohesion: 0.06
Nodes (30): 1.1 Módulos Backend (Total: 29 archivos de ruta/20 schemas), 1.2 Módulos Frontend (Total: 22 vistas de rol), 🔷 1. INVENTARIO DE MÓDULOS vs CHECKLIST, 2.1 Inventario Completo (29 tablas), 2.2 Verificación de Celdas Fantasma, 🔷 2. BASE DE DATOS — Auditoría de Tablas, 3.1 Autenticación (server/auth.js), 3.2 Middleware de Seguridad (+22 more)

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

Cohesion: 0.29
Nodes (7): LoyaltyReward, OrderStatus, ApiOrder, groupOptions, normalizeOrder(), ReportesView(), reportTypes

### Community 22 - "InventarioView.tsx"

Cohesion: 0.28
Nodes (8): InventoryItem, InventoryMovement, Recipe, badgeStyle(), formatter, getStatus(), InventarioView(), statusConfig

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

Cohesion: 0.11
Nodes (18): API Documentation — Juancho's Pizza / GastroPro, 📂 Categories, ⚠️ Códigos de Error, `GET /api/categories`, `GET /api/health`, `GET /api/menu`, `GET /api/payments/status`, `GET /api/recipes` (+10 more)

### Community 75 - "Contribuyendo a Juancho's Pizza / GastroPro"

Cohesion: 0.11
Nodes (17): Backend, Contribuyendo a Juancho's Pizza / GastroPro, 🔧 Convenciones de Código, 🚀 Despliegue, 🐳 Docker, Escribir Tests, 🏗️ Estructura del Proyecto, Frontend (+9 more)

### Community 76 - "🚀 Estado de Pre-Deploy — Juancho's Pizza / GastroPro v2.0.0"

Cohesion: 0.12
Nodes (15): 1.1 Dashboard Ejecutivo (`GastroProDashboard.tsx`), 1.2 Clientes CRM (`ClientesView.tsx`), 1.3 Inventario Avanzado (`InventarioView.tsx`), 1.4-1.17 (Ver docs/AUDIT_COMPLETO.md para el análisis completo de los 17 módulos), 🔷 1. ANÁLISIS MÓDULO POR MÓDULO, 🔷 2. SEGURIDAD — Verificación Final, 🔷 3. DOCUMENTACIÓN — Verificación Final, 🔷 4. PENDIENTES POST-DEPLOY (+7 more)

### Community 77 - "dependencies"

Cohesion: 0.12
Nodes (16): dependencies, cors, dotenv, express, framer-motion, helmet, nodemailer, pdf-lib (+8 more)

### Community 78 - "[2.0.0] — 2026-07-15"

Cohesion: 0.14
Nodes (13): [1.0.0] — 2026-06, [2.0.0] — 2026-07-15, Changelog — Juancho's Pizza / GastroPro, 🏗️ Infraestructura, 🚀 Lanzamiento Inicial, 📊 Leyenda, 🔧 Migraciones/Actualizaciones, 📦 Nuevos Módulos Backend (+5 more)

### Community 79 - "str"

Cohesion: 0.19
Nodes (9): createCategorySchema, updateCategorySchema, createClientSchema, ESTADOS, patchClientSchema, updateClientSchema, str(), strOpt() (+1 more)

### Community 80 - "🏷️ Menu Variants / Combos / Promotions"

Cohesion: 0.15
Nodes (13): `DELETE /api/menu/combos/:id`, `DELETE /api/menu/promotions/:id`, `DELETE /api/menu/variants/:id`, `GET /api/menu/combos`, `GET /api/menu/promotions`, `GET /api/menu/variants`, 🏷️ Menu Variants / Combos / Promotions, `POST /api/menu/combos` (+5 more)

### Community 81 - "✅ COMPLETADO"

Cohesion: 0.17
Nodes (11): 📁 ARCHIVOS CLAVE, ✅ COMPLETADO, Documentación (100%), Frontend, Infraestructura, Limpieza, 📊 MÉTRICAS, 🚀 PRÓXIMOS PASOS SUGERIDOS (+3 more)

### Community 82 - "orders.js"

Cohesion: 0.26
Nodes (8): createOrderSchema, itemsField, LOCATION_IDS, validOrder, updateOrderSchema, updateOrderStatusSchema, closeShiftSchema, openShiftSchema

### Community 83 - "📋 Comandas"

Cohesion: 0.18
Nodes (11): 📋 Comandas, `DELETE /api/comandas/items/:id`, `GET /api/comandas/:id`, `GET /api/comandas/:id/kitchen-ticket` — Ticket de cocina, `GET /api/comandas?status=open&locationId=nemocon`, `PATCH /api/comandas/:id/close` — Cerrar comanda y liberar mesa, `PATCH /api/comandas/items/:id`, `POST /api/comandas` — Abrir comanda en mesa (+3 more)

### Community 84 - "helpers.js"

Cohesion: 0.09
Nodes (21): Campaign, CartItem, CashFlow, CashRegisterEntry, Combo, Expense, InventoryItem, InventoryMovement (+13 more)

### Community 85 - "helpers.test.js"

Cohesion: 0.40
Nodes (4): clampedNumberDefaultOnUndef(), addPointsSchema, createRewardSchema, updateRewardSchema

### Community 86 - "websocket.js"

Cohesion: 0.06
Nodes (40): router, router, notifyInvoiceUpdate(), router, bulkAddItemsSchema, closeComandaSchema, createComandaItemSchema, createComandaSchema (+32 more)

### Community 87 - "menuExtras.js"

Cohesion: 0.33
Nodes (8): router, createComboSchema, createPromotionSchema, createVariantSchema, productosField, updateComboSchema, updatePromotionSchema, updateVariantSchema

### Community 88 - "boolOpt"

Cohesion: 0.20
Nodes (8): clampedNumber(), createPurchaseOrderSchema, createQrMenuConfigSchema, purchaseItemSchema, updatePurchaseOrderSchema, batchUpdateStatusSchema, createTableSchema, updateTableSchema

### Community 89 - "useWebSocket.ts"

Cohesion: 0.33
Nodes (8): connect(), disconnect(), globalListeners, reconnectWS(), scheduleReconnect(), subscribeWS(), WSEvent, WSEventCallback

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

Cohesion: 0.47
Nodes (4): CAMPAIGN_STATUSES, CAMPAIGN_TYPES, createCampaignSchema, updateCampaignSchema

### Community 104 - "EmpleadosView.tsx"

Cohesion: 0.33
Nodes (4): emptyForm, FormState, LOCATION_LABELS, ROLE_LABELS

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

Cohesion: 0.60
Nodes (3): createReviewSchema, reviewStatusSchema, base

### Community 113 - "💵 Cash Register"

Cohesion: 0.50
Nodes (4): 💵 Cash Register, `GET /api/cash-register?locationId=nemocon&status=open`, `POST /api/cash-register/:id/close`, `POST /api/cash-register/open`

### Community 114 - "💰 Tips"

Cohesion: 0.50
Nodes (4): `GET /api/tips?locationId=nemocon&desde=2026-01-01`, `GET /api/tips/summary`, `POST /api/tips`, 💰 Tips

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

Cohesion: 0.22
Nodes (7): strDefault(), createInventoryItemSchema, inventoryMovementSchema, updateInventoryItemSchema, createRecipeSchema, recipeIngredientInput, updateRecipeSchema

### Community 120 - "🔐 Auth"

Cohesion: 0.67
Nodes (3): 🔐 Auth, `POST /api/auth/login`, `POST /api/auth/refresh`

## Knowledge Gaps

- **567 isolated node(s):** `husky.sh script`, `husky.sh script`, `semi`, `singleQuote`, `trailingComma` (+562 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `AdminDashboard.tsx`, `package.json`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `@google/generative-ai` connect `AdminDashboard.tsx` to `dependencies`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **What connects `husky.sh script`, `husky.sh script`, `semi` to the rest of the system?**
  _567 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05217391304347826 - nodes in this community are weakly interconnected._
- **Should `MenuDigital.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07610993657505286 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0545790934320074 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
