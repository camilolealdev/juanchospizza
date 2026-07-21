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

## Git workflow — dual-upstream

**Propósito:** `origin` (jastigoga/pizzeria) es el repo canónico con PRs y `master` oficial. `camilo` (camilolealdev/juanchospizza) es fork personal / mirror. Las ramas de feature se sincronizan a ambos; `master` solo va a `origin` (deliberadamente).

**OBLIGATORIO** usar `git pushall <ref>` (alias configurado en `.git/config`). **NUNCA** usar `git push` plano: solo subiría a `origin` y los commits divergen entre los 2 remotos.

Setup (idempotente; ya aplicado, pero documentado para réplicas del repo):

```bash
git remote -v                                                            # debe listar origin + camilo
git config alias.pushall '!f() { git push origin "$@" && git push camilo "$@"; }; f'
git branch --set-upstream-to=origin/<branch> <branch>                    # tracking para git pull
```

Usos comunes:

- `git pushall feat/foo` — nueva rama de feature (ambos remotos).
- `git pushall --tags` — tags sincronizados.
- `git pushall -f` — solo si reescribís historia. `--force-with-lease` no está expuesto vía alias; correr `git push origin <ref> --force-with-lease && git push camilo <ref> --force-with-lease` manualmente.

**Caveat — `master`:** la rama `master` SOLO va a `origin`. NO usar `git pushall master`:

```bash
git push origin master                # solo a origin, deliberadamente no a camilo
```

Diagnóstico rápido cuando los remotos se desincronizan:

```bash
git ls-remote --heads origin <branch>  # SHA en origin
git ls-remote --heads camilo <branch>  # SHA en camilo
# Ambos deben coincidir. Para master, camilo debe NO existir (es branch-only-en-origin por diseño).
# Si difieren: `git push camilo <branch> --force-with-lease` para resync manual.
```

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
