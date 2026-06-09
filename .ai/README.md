# 🤖 Instrucciones para Asistentes de IA

Esta carpeta centraliza las reglas, contexto y prompts para cualquier asistente de IA que trabaje en este proyecto. **Una sola fuente de verdad.**

## Estructura

- `shared/` — Reglas y contexto compartidos por TODAS las IAs
- `claude/` — Instrucciones específicas para Claude / Claude Code
- `cursor/` — Reglas para Cursor

## Cómo usar

1. **Si eres una IA:** comienza por `GEMINI.md` (en la raíz), luego `shared/project-context.md` y finalmente el archivo específico de tu herramienta.
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
- **Backend:** Express.js
- **DB:** Turso (libSQL)
- **Auth:** PIN hardcoded (pendiente: JWT)
- **Roles:** CLIENT, ADMIN, OPERATOR, REPARTIDOR, MARKETING

## Convenciones

- **Naming:** camelCase (variables), PascalCase (componentes), kebab-case (archivos)
- **Imports:** rutas relativas desde `@/`
- **Tests:** junto al código en `__tests__/`
- **Commits:** Conventional Commits

Ver `shared/` para el detalle completo.