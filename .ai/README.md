# 🤖 Instrucciones para Asistentes de IA

Esta carpeta centraliza las reglas, contexto y prompts para cualquier asistente de IA que trabaje en este proyecto. **Una sola fuente de verdad.**

## Estructura

- `shared/` — Reglas y contexto compartidos por TODAS las IAs
- `claude/` — Instrucciones específicas para Claude / Claude Code
- `cursor/` — Reglas para Cursor
- `gemini/` — Instrucciones específicas para Gemini CLI

## Cómo usar

1. **Si eres una IA:** comienza por `shared/project-context.md`, luego el archivo específico de tu herramienta (`claude/CLAUDE.md`, `cursor/.cursorrules`, `gemini/GEMINI.md`).
2. **Si eres un dev:** añade reglas específicas de tu herramienta en su carpeta.
3. **Si modificas reglas:** edita el archivo en `shared/` para reglas comunes.

## Reglas inquebrantables

1. **NUNCA** commitear secretos o credenciales
2. **NUNCA** modificar lógica que funciona — añadir capas
3. **NUNCA** usar `// TODO`, stubs vacíos o placeholders
4. **SIEMPRE** preferir abstracción sobre código duplicado
5. **SIEMPRE** validar inputs con Zod
6. **SIEMPRE** eliminar referencias a herramientas de IA externa

## Stack del Proyecto

- **Frontend:** React + Vite + Tailwind
- **Backend:** Express.js, dividido en `server/routes/*.js` (uno por recurso) + `server/schemas/*.js` (validación Zod)
- **DB:** PostgreSQL
- **Auth:** JWT + PIN hasheado (PBKDF2, salts random) — lista de usuarios sigue hardcodeada en `server/auth.js`, mover a DB es deuda pendiente si se necesita gestión dinámica de staff
- **Roles:** CLIENT, ADMIN, OPERATOR, REPARTIDOR, MARKETING

## Convenciones

- **Naming:** camelCase (variables), PascalCase (componentes), kebab-case (archivos)
- **Imports:** rutas relativas (`../services/api`, etc.) -- hay un alias `@/*` configurado en `tsconfig.json`/`vite.config.ts` pero sin adoptar todavía, no asumir que está en uso
- **Tests:** `vitest` para unit (junto al código, `*.test.tsx`), Playwright para e2e (`e2e/`)
- **Commits:** mensajes descriptivos en inglés, no estrictamente Conventional Commits

Ver `shared/` para el detalle completo.