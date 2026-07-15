# Graph Report - pizzeria-master (2026-07-14)

## Corpus Check

- 135 files · ~526,055 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 648 nodes · 1049 edges · 74 communities (38 shown, 36 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `683430a9`
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

## God Nodes (most connected - your core abstractions)

1. `api` - 20 edges
2. `compilerOptions` - 19 edges
3. `pool` - 18 edges
4. `authMiddleware()` - 17 edges
5. `requireRole()` - 16 edges
6. `str()` - 16 edges
7. `validate()` - 15 edges
8. `strOpt()` - 15 edges
9. `scripts` - 13 edges
10. `PaymentService` - 13 edges

## Surprising Connections (you probably didn't know these)

- `initAI()` --references--> `@google/generative-ai` [EXTRACTED]
  src/services/geminiService.ts → package.json
- `AuthContextType` --references--> `UserRole` [EXTRACTED]
  src/App.tsx → src/types/index.ts
- `isKnownRole()` --indirect_call--> `UserRole` [INFERRED]
  src/App.tsx → src/types/index.ts
- `App()` --calls--> `clearAuthSession()` [EXTRACTED]
  src/App.tsx → src/services/api.ts
- `App()` --calls--> `getAuthToken()` [EXTRACTED]
  src/App.tsx → src/services/api.ts

## Import Cycles

- None detected.

## Communities (74 total, 36 thin omitted)

### Community 0 - "index.js"

Cohesion: 0.08
Nodes (45): authenticate(), authMiddleware(), devSecretCache, generateToken(), getSecret(), hashPin(), hashUserPin(), login() (+37 more)

### Community 1 - "helpers.js"

Cohesion: 0.06
Nodes (51): CAMPAIGN_STATUSES, CAMPAIGN_TYPES, createCampaignSchema, updateCampaignSchema, createCategorySchema, updateCategorySchema, createClientSchema, ESTADOS (+43 more)

### Community 2 - "MenuDigital.tsx"

Cohesion: 0.08
Nodes (26): CartSection(), BADGE_STYLES, CATEGORIES, CROSS_SELL, MenuDigital(), MenuProduct, PIZZA_SIZES, PRODUCTS (+18 more)

### Community 3 - "App.tsx"

Cohesion: 0.07
Nodes (27): App(), AuthContext, AuthContextType, ClientesView, FidelizacionView, FinanzasView, GastroProDashboard, InventarioView (+19 more)

### Community 4 - "dependencies"

Cohesion: 0.06
Nodes (33): dependencies, cors, dotenv, express, framer-motion, @google/generative-ai, pg, react (+25 more)

### Community 5 - "devDependencies"

Cohesion: 0.08
Nodes (26): devDependencies, autoprefixer, concurrently, eslint, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh, husky (+18 more)

### Community 6 - "MenuInteligente.tsx"

Cohesion: 0.13
Nodes (18): MenuCombo, MenuPromotion, MenuVariant, CATEGORY_COLORS, colorForCategory(), COMBO_GRADIENTS, formatDate(), formatPrice() (+10 more)

### Community 7 - "compilerOptions"

Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+12 more)

### Community 8 - "AdminDashboard.tsx"

Cohesion: 0.21
Nodes (15): CATEGORIES, INGREDIENTS, PRODUCTS, SIZE_FACTORS, generateIngredientImage(), generateProductImage(), getChatbotResponse(), getSmartRecommendations() (+7 more)

### Community 9 - "api.ts"

Cohesion: 0.14
Nodes (16): apiFetch(), authHeaders(), clearAuthSession(), ClientPayload, ExpensePayload, getAuthToken(), handleResponse(), InventoryItemPayload (+8 more)

### Community 10 - "Arquitectura — Juancho's Pizza / GastroPro"

Cohesion: 0.12
Nodes (15): Arquitectura — Juancho's Pizza / GastroPro, Autenticación, Backend: routers por recurso, Base de datos, Deuda estructural conocida, El patrón híbrido landing + CRM + portales, Frontend vs. backend: dos cosas separadas, un solo repo, Pagos (+7 more)

### Community 11 - "index.ts"

Cohesion: 0.12
Nodes (14): Campaign, CartItem, CashFlow, Combo, Expense, InventoryItem, InventoryMovement, LoyaltyChallenge (+6 more)

### Community 12 - "api"

Cohesion: 0.16
Nodes (7): STATUS_LABELS, TrackOrderModalProps, api, Review, subscribeToPushNotifications(), urlBase64ToUint8Array(), Tab

### Community 13 - "ClientesView.tsx"

Cohesion: 0.23
Nodes (13): capitalize(), ClientesView(), ClientOrderSummary, daysSince(), emptyNewClient, formatCurrency(), formatDate(), getInitial() (+5 more)

### Community 14 - "FidelizacionView.tsx"

Cohesion: 0.18
Nodes (12): LoyaltyLevel, emptyForm, FidelizacionView(), formatDate(), LEVEL_ACCENT, LEVEL_BADGE, LEVEL_BORDER, NIVELES (+4 more)

### Community 15 - "OperatorView.tsx"

Cohesion: 0.20
Nodes (8): OrderStatus, ApiOrder, ApiOrder, normalize(), OperatorView(), ApiOrder, normalize(), RepartidorView()

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
Nodes (7): InventoryItem, LoyaltyReward, ApiOrder, groupOptions, normalizeOrder(), ReportesView(), reportTypes

### Community 22 - "InventarioView.tsx"

Cohesion: 0.32
Nodes (7): InventoryMovement, Recipe, badgeStyle(), formatter, getStatus(), InventarioView(), statusConfig

### Community 23 - "GastroProDashboard.tsx"

Cohesion: 0.29
Nodes (6): Client, ApiOrder, DIA_LABELS, GastroProDashboard(), normalizeOrder(), WeeklyPoint

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

Cohesion: 0.40
Nodes (3): PAYMENT_LABELS, STATUS_LABELS, TrackedOrder

## Knowledge Gaps

- **256 isolated node(s):** `husky.sh script`, `husky.sh script`, `semi`, `singleQuote`, `trailingComma` (+251 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `initAI()` connect `AdminDashboard.tsx` to `dependencies`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `@google/generative-ai` connect `dependencies` to `AdminDashboard.tsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `husky.sh script`, `husky.sh script`, `semi` to the rest of the system?**
  _256 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0841046277665996 - nodes in this community are weakly interconnected._
- **Should `helpers.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06116700201207243 - nodes in this community are weakly interconnected._
- **Should `MenuDigital.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07610993657505286 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07394957983193277 - nodes in this community are weakly interconnected._
