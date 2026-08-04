# Pendientes — Sesión de Deploy 2026-07-26

> **Actualizado:** 2026-07-26
> **Propósito:** Todo lo que quedó abierto en la sesión de revisión + fixes pre-deploy de hoy — para no perderlo entre sesiones.
> **Contexto completo:** [ISO27001_AUDIT_2026-07-26.md](ISO27001_AUDIT_2026-07-26.md), [PREDEPLOY_AUDIT_2026-07-26.md](PREDEPLOY_AUDIT_2026-07-26.md) (de la otra sesión concurrente), [READINESS_FINAL.md](READINESS_FINAL.md), [ISSUES_2026-07-21.md](ISSUES_2026-07-21.md).

---

## 🔴 Bloqueante inmediato — coordinación con la otra sesión

Hubo **otra sesión de Claude Code trabajando en este mismo repo en paralelo** hoy (commit `bb330a8`). Quedaron sin commitear cuando terminó esta sesión:

- `vite.config.ts` — modificado, no se tocó (podría estar a mitad de un cambio)
- `docs/PREDEPLOY_AUDIT_2026-07-26.md` — modificado
- `.github/dependabot.yml` — nuevo, sin trackear

**Acción:** revisar el estado de esos 3 archivos antes de asumir que el repo está "completo" — puede que falte terminar y commitear ese trabajo.

---

## 🔴 Sin probar en vivo — Docker Desktop no estaba corriendo

Ninguna de las dos auditorías de hoy (ni esta ni la de la otra sesión) pudo levantar el stack real — el daemon de Docker no estaba corriendo. Todo lo de abajo está verificado por lectura de código + `docker compose config`, **no por un `docker compose up` real**.

**Acción:** levantar Docker Desktop y correr:

```bash
cp .env.production.example .env.production   # completar con valores reales
docker compose up -d
docker compose ps                              # todos "healthy"
curl http://localhost/api/health               # vía nginx, puerto 80
docker compose logs app | grep -i "ssl\|postgres"   # confirmar que app conectó a postgres sin error de SSL
```

Esto valida de una sola vez: el fix de la red `edge`, el fix de SSL de Postgres, y que `nginx.conf` sirve tráfico real.

---

## 🟡 Reconciliación de git — decidida a medias

- `jastigoga/pizzeria` (repo que `CONTRIBUTING.md` documenta como canónico, con 3 PRs reales) y `origin` = `camilolealdev/juanchospizza` (donde vive este working copy) tienen **`master` sin ancestro común**.
- Se agregó `jastigoga` como remoto local de solo lectura/inspección (`git remote -v` lo muestra).
- Se pusheó el `master` actual como rama nueva `v2-camilolealdev` en `jastigoga/pizzeria` — **sin PR abierto, sin tocar el `master` real de jastigoga**.
- **Pendiente real:** decidir si esto se fusiona alguna vez, se abre un PR, o `jastigoga/pizzeria` se abandona formalmente (y entonces limpiar `CONTRIBUTING.md`, que sigue describiendo un flujo dual-remote que hoy no está activo en este clon).

---

## 🟡 Hallazgos de seguridad/calidad NO corregidos hoy (quedaron solo documentados)

De la auditoría ISO 27001 y la revisión de 6 especialistas, esto se identificó pero **no se tocó código**:

| Ítem                                                                                                                    | Dónde                                    | Prioridad                                        |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| `npm audit`: 10 vulnerabilidades high (mayormente build-time)                                                           | `package.json`                           | Media                                            |
| `vite-plugin-pwa` mal puesto en `dependencies` en vez de `devDependencies`                                              | `package.json`                           | Baja                                             |
| Node 22 (Dockerfile) vs Node 20 (CI, ya deprecado por GitHub)                                                           | `Dockerfile`, `.github/workflows/ci.yml` | Media                                            |
| Docs mencionan `GEMINI_API_KEY`, el código ya requiere `VITE_GEMINI_API_KEY`                                            | `DEPLOY.md`, `README.md`, `.env.example` | Media                                            |
| `server/config.js` no deja bootear el backend si falta `GEMINI_API_KEY`, aunque se documenta como "opcional"            | `server/config.js`                       | Media                                            |
| Nada monitorea `/api/metrics` ni `/api/health` en producción                                                            | —                                        | Media (proponer workflow n8n)                    |
| Sin plan de espacio en disco para volúmenes/backups/imágenes                                                            | VPS                                      | Baja hasta que haya datos reales                 |
| Migración de z-index a tokens Tailwind solo parcial (7+ archivos con valores raw, algunos más altos que el nuevo techo) | `tailwind.config.js` y varios `.tsx`     | Baja (riesgo visual, no funcional)               |
| WhatsApp checkout hace `await` antes de `window.open` — riesgo de popup blocker en iOS Safari                           | `CartSection.tsx`, `MenuDigital.tsx`     | Media                                            |
| Interfaz admin para procesar solicitudes ARCO (Habeas Data) no existe                                                   | Frontend CRM                             | Media (riesgo legal si llega una solicitud real) |
| `docker/postgres/schema.sql` desactualizado vs. `initDB()` (no rompe nada, pero engaña en inspección manual)            | `docker/postgres/schema.sql`             | Baja                                             |

## 🟡 De la auditoría de la otra sesión (91/100), aún abiertos

- Backend nunca desplegado en un servidor real — sigue sin probarse end-to-end.
- Vercel bloqueado por verificación de cuenta (`pizzeria-fawn.vercel.app`) — re-vincular GitHub con cuenta verificada.
- Sin proveedor de pago configurado con credenciales reales (Bold recomendado).
- DIAN: estructura completa, pero sin certificado digital real ni alta ante DIAN (dependencia externa, ver [PENDIENTES_PROVEEDORES.md](PENDIENTES_PROVEEDORES.md)).

---

## ✅ Ya resuelto hoy (para no reabrir)

- `nginx.conf` trackeado en git, red `edge` separada para exponer 80/443.
- SSL de Postgres ya no se fuerza solo por `NODE_ENV=production`.
- `deploy.yml` (PM2) deshabilitado como auto-trigger; `deploy:staging/prod` corregidos.
- `DEPLOY.md`: URL de clone real, flujo de certbot correcto para nginx containerizado, checklist con rotación de PINs.
- `docs/DR_RUNBOOK.md`: sintaxis `docker compose` v2 en todos los comandos.
- 4 commits pusheados a `origin/master` (`eac028c`..`62826eb`).

---

## Seguimiento posterior (actualizado 2026-08-04)

Este documento quedó congelado en 2026-07-26; ver `docs/AUDIT_2026-07-30.md`
(sección 0, agregada 2026-08-04) para el estado real más reciente. Resumen
de lo que cambió desde acá:

- El bind-mount de `./dist` en `docker-compose.yml` (mencionado como riesgo
  de deploy en este doc) se corrigió en `73e08da` (2026-07-30).
- El armador "Crea tu Pizza" se unificó en un solo componente React
  (`470a48a`, 2026-08-03) con su propio piso de precio server-side
  corregido (`orderPricing.js`) y su e2e reconectado (`6057ac6`,
  2026-08-04).
- **Sigue sin resolverse**: el bloqueante de "Docker Desktop no estaba
  corriendo" de este mismo doc (línea 21) — se intentó de nuevo el
  2026-08-04 y el daemon no terminó de levantar (WSL backend `docker-desktop`
  atascado en "Stopped"). El `docker compose up -d` real contra este stack
  sigue sin ejecutarse de punta a punta en ninguna sesión hasta la fecha.
