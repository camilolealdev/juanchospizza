# QA Producción — 2026-08-14

> **Proyecto:** Juancho's Pizza / GastroPro (pizzeria-merge)
> **Dominio prod:** https://juanchospizza.com
> **Método:** equipo de 8 agentes de QA × 3 skills (24 skills) + pruebas de seguridad en vivo.

---

## Veredicto: ✅ APTO PARA PRODUCCIÓN (2 gaps operacionales pendientes)

La app está sana y desplegada. Se corrigieron 3 problemas reales encontrados por el equipo de QA y quedan 2 pendientes operacionales que requieren acceso al VPS (no bloquean la operación, pero se recomienda resolver).

| Área                       | Resultado                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------- |
| Typecheck (`tsc --noEmit`) | ✅ 0 errores                                                                        |
| Build (`vite build` + PWA) | ✅ OK                                                                               |
| Tests unit/integration     | ✅ **429/429** (40 archivos)                                                        |
| Lint                       | ✅ 0 errores (se corrigieron 10)                                                    |
| `npm audit` (prod)         | ✅ **0 vulnerabilidades**                                                           |
| E2E smoke vs producción    | ✅ **2/2** (config nuevo)                                                           |
| TLS/SSL                    | ✅ Certificado válido                                                               |
| Headers de seguridad       | ✅ CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy                             |
| Auth en endpoints          | ✅ 401 en /api/orders, /employees, /clients, /campaigns                             |
| Archivos sensibles         | ✅ Sin fuga (`.env`, `.git`, `nginx.conf` → index.html del SPA, nunca el contenido) |

---

## Equipo de QA (8 agentes × 3 skills)

| Agente | Área                      | Skills                                                               | Hallazgos                                                                                           |
| ------ | ------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1      | Frontend (React/Vite)     | react-best-practices, refactoring-ui, high-perf-browser              | ✅ Code-splitting OK, PWA precache 40 entries                                                       |
| 2      | Backend (Express)         | api-and-interface-design, backend-dev-guidelines, security-checklist | ✅ 401 en rutas protegidas, anti-tampering precios                                                  |
| 3      | Datos (PostgreSQL)        | postgres-pro, database-optimizer, sql-pro                            | 🔴 Backups rotos (ver gap 1)                                                                        |
| 4      | Infra (Docker/Nginx)      | docker-patterns, github-actions, deployment-guide                    | 🔴 deny blocks nginx inactivos en prod (ver gap 2)                                                  |
| 5      | Tests (Playwright/Vitest) | playwright-pro, vitest, test-master                                  | 🔴 E2E specs rotos con Playwright 1.61 → **FIXED**; 🔴 Smoke CI silenciosamente fallido → **FIXED** |
| 6      | Seguridad                 | owasp-security, env-secrets-manager, security-reviewer               | ✅ audit 0 vulns, headers OK; 🟠 `/api/metrics` público (ver gap 3)                                 |
| 7      | UX/Perf                   | optimize, image-processing, web-performance                          | ✅ assets 200, imágenes OK tras limpieza                                                            |
| 8      | Ops/CI                    | ci-cd-and-automation, monitoring, observability                      | ✅ Deploy pipeline 4/4 success; 🔴 backups (gap 1)                                                  |

---

## 🔴 Corregido en esta sesión

### 1. Smoke test de CI era un job verde falso

- **Síntoma:** `Error: Timed out waiting 90000ms from config.webServer` — el job arrancaba `dev:all` (vite+server) en el runner sin postgres → timeout; el `|| echo "⚠️ Smoke falló"` tragaba el fallo y el job salía "success".
- **Causa:** playwright.config.ts arranca webServer local SIEMPRE; `BASE_URL` env no se usaba (el config hardcodea `baseURL: localhost:3000`).
- **Fix:** nuevo `e2e/playwright.smoke.config.ts` (testDir `.`, `baseURL` = `PROD_URL`, sin webServer) + job actualizado en `deploy-prod.yml` para usarlo y **fallar de verdad** si el smoke no pasa.
- **Verificado:** `PROD_URL=https://juanchospizza.com npx playwright test --config=e2e/playwright.smoke.config.ts` → 2/2 passed.

### 2. E2E specs rotos con Playwright 1.61

- **Síntoma:** `full-audit.spec.ts` no cargaba: `describe.configure serial` repetido 3 veces + `afterEach(async (_fixtures, ...)` (Playwright 1.61 exige destructuring).
- **Causa:** `@playwright/test` en `^1.48.0` y node_modules con **1.61.1** (el caret saltó de versión).
- **Fix:** un solo `describe.configure`, firma `async ({}, testInfo)` con eslint-disable comentado.
- **Verificado:** full-audit 25 tests + api-smoke 5 tests cargan.

### 3. Lint: 10 errores → 0

- `server/routes/notifications.js` y `server/schemas/digiturno.js`: imports sin usar → removidos.
- `doc/*.js` (salida generada por JSDoc): agregados a `ignorePatterns` del `.eslintrc.cjs`.

---

## 🟠 Pendientes operacionales (requieren VPS — sin fuga de datos)

### Gap 1 — Backups de BD NO funcionan (desde al menos el 12-08)

- **Causa raíz A:** falta el secret `DATABASE_URL` en el repo (solo hay `PROD_*`).
- **Causa raíz B (de diseño):** el runner de GitHub está fuera del VPS y Postgres usa `expose: 5432` (red interna docker, no publicada) → el runner **nunca** puede conectarse, aun con secret.
- **Fix recomendado:** backup dentro del VPS (cron en el host o job SSH que corra `server/scripts/backup.sh` en el server). Requiere decisión + acceso VPS.

### Gap 2 — deny blocks de nginx inactivos en producción

- `location ~ /\.env { deny all; return 404; }` existe en el repo y el mount es correcto (`./nginx.conf:/etc/nginx/nginx.conf:ro`), pero en prod `/.env` → 200 (index.html del SPA, **no** el archivo: sin fuga de datos).
- **Causa probable:** nginx del VPS corriendo con config antigua en memoria (no se recarga al cambiar el archivo montado).
- **Fix:** en el VPS `docker compose exec nginx nginx -t && docker compose restart nginx` (o recrear el contenedor).

### Gap 3 — `/api/metrics` público (info disclosure menor)

- Prometheus metrics expuestas sin auth. Puede que n8n/monitoreo las consuma así (ver `docs/MONITOREO_N8N.md`).
- **Fix recomendado:** restringir por IP o token si el monitoreo lo permite; NO romper sin revisar el scraper.

---

## Checks de seguridad en vivo realizados

```
TLS: ssl_verify OK · https 200
Headers: CSP ✓ HSTS ✓ X-Frame-Options ✓ nosniff ✓ Referrer-Policy ✓ X-XSS-Protection ✓
Auth:  /api/orders|employees|clients|campaigns → 401 ✓
Sensibles: .env/.env.production/.git/config/nginx.conf/server/index.js/docker-compose.yml → index.html (SPA), NUNCA contenido real ✓
Exposición: /api/metrics → 200 (info disclosure, gap 3) · /api/health → 200 (estándar)
```
