# Project Context — Guido Pizza

## Qué es este proyecto
Sistema de pedidos de pizza en línea con gestión multi-rol para una pizzería en Bogotá.

## Stack
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Express.js + Node.js
- **DB:** Turso (libSQL edge SQLite)
- **AI:** Google Gemini (@google/generative-ai)
- **Hosting:** Vercel

## Arquitectura
- **Multi-rol:** CLIENT, ADMIN, OPERATOR, REPARTIDOR, MARKETING
- **Auth actual:** Pines hardcodeados (temporal)
- **Estados de orden:** PENDING → CONFIRMED → PREPARING → READY → ASSIGNED → DELIVERING → COMPLETED

## Estructura clave
- `src/` — Frontend React
- `src/views/roles/` — Vistas por rol
- `src/components/` — Componentes reutilizables
- `src/services/` — API client, payments, AI
- `server/` — Backend Express
- `server/index.js` — API routes y DB init

## Convenciones
- Naming: camelCase (variables), PascalCase (componentes), kebab-case (archivos)
- Tailwind: utility-first, clases responsive
- API client: servicios en `src/services/api.ts`
- Types: centralizados en `src/types/index.ts`

## Off-limits (no modificar)
- `.env` — contiene secretos
- `dist/` — build output
- `node_modules/` — dependencias

## Tech debt conocido
1. Pines hardcodeados en App.tsx (AUTH-001)
2. Sin ORM (DB-001)
3. SQL directo en controladores
4. Sin validación de inputs (SEC-004)