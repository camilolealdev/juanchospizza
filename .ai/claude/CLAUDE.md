# Instrucciones para Claude

## Antes de cualquier cambio

1. Lee `.ai/shared/project-context.md`
2. Lee `.ai/shared/branding-cleanup.md`

## Reglas específicas

- Trabaja en fases: diagnóstico → plan → confirmación → ejecución
- Cero placeholders en el código
- Cada archivo creado debe estar funcional al 100%
- Si modificas un import, verifica que el archivo destino existe
- Respetar la estructura actual: frontend en `src/`, backend en `server/`

## Git workflow

**`origin` (`camilolealdev/juanchospizza`) es el único remoto activo.** Push normal, sin alias especiales:

```bash
git push origin <branch>
git push origin master
```

`jastigoga/pizzeria` existe como remoto de solo lectura (`git remote -v` lo lista) — es un repo anterior, abandonado desde 2026-07-27, sin colaboradores externos reales ni trabajo abierto. No se le pushea nada; se mantiene solo como referencia histórica. Si en algún momento se decide reactivarlo o eliminarlo del todo, actualizar esta sección.

## Reglas de seguridad

- **NUNCA** acceder a `.env` o escribir valores reales
- **NUNCA** hardcodear secretos, tokens, passwords
- **SIEMPRE** usar queries parametrizadas (evitar SQL injection)

## Para Claude Code (CLI)

- Antes de tocar archivos, ejecuta `git status`
- No hagas commits automáticos sin permiso explícito
- Si vas a modificar más de 5 archivos, presenta el plan primero
- Respeta el `.gitignore`

## Comandos útiles del proyecto

- `npm run dev` — Levantar frontend
- `npm run server` — Levantar backend
- `npm run dev:all` — Frontend + Backend
- `npm run build` — Build producción
- `npm run lint` — Linter

## Stack del proyecto

- React + Vite + Tailwind (frontend)
- Express.js (backend)
- Turso libSQL (DB)
