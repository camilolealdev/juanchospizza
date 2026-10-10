# Plan de remediación — seguimiento auditoría 2026-08-19/20

Fecha de esta revisión: 2026-09-30. Verificado línea por línea contra `HEAD`
(commit `de89db4`, antes de los fixes de este mismo día) — no repetido de
cero. Los 6 informes originales están en `docs/PENDIENTES-agente{1..6}-*.md`
(no trackeados en git — ver nota de confidencialidad al final).

## Resumen ejecutivo

- **4 ALTA**: 3 resueltas, 1 basada en una lectura incorrecta del código
  original (no era un bug real).
- **18 MEDIA**: ~9 resueltas o mitigadas, ~2 no eran problemas reales,
  ~7 siguen abiertas.
- **22 BAJA**: 4 arregladas hoy (commit `765d3f3`), resto sin verificar a
  fondo o pendiente.
- Dos hallazgos del reporte original estaban **equivocados** sobre el
  comportamiento real del código (idempotencia de pagos, y el reporte de
  "MongoDB" en agente5 cuando el proyecto usa PostgreSQL) — anotado para
  que no se repita el error en la próxima auditoría.

---

## Ya resuelto (no requiere acción)

| Hallazgo | Archivo | Cómo se resolvió |
|---|---|---|
| ALTA: `rejectUnauthorized:false` en Postgres | `server/db.js` | SSL condicional, default `true`, documentado |
| ALTA: credenciales DIAN hardcodeadas | `server/services/dianXml.js`, `dianSigner.js` | Todo por env var + `validateDianConfig()` bloquea boot en producción con placeholders |
| ALTA: webhook de pagos "fail-open" | `server/routes/payments.js` | No era un bug — verificado el call site, `true` en catch SÍ procesa el pago |
| MEDIA: headers nginx no heredados en `location` | `nginx.conf` | Cada location re-declara el set completo |
| MEDIA: sin endpoint `/health` | `server/index.js` | `/api/health` real, verifica Postgres, antes del rate limiter |
| MEDIA: JWT en localStorage | `src/services/api.ts`, `server/auth.js` | Migró a cookie HttpOnly + SameSite=Lax; localStorage solo guarda rol/username |
| MEDIA: WebSocket sin auth visible | `src/hooks/useWebSocket.ts` | No era problema real — la cookie viaja sola en el handshake |
| MEDIA: "sin lockfile" | — | Era falso, `package-lock.json` existe y está trackeado |
| BAJA: `requireSameLocation` se saltaba sin locationId | `server/auth.js` | Ahora defaultea a la sede del propio token |
| BAJA: localStorage sin limpiar al logout | `src/services/api.ts` | `clearAuthSession()` + cookie limpiada server-side |
| BAJA: cookies sin SameSite | `server/auth.js`, `server/middleware/csrf.js` | `SameSite=Lax` (auth) y `Strict` (CSRF), explícitos |
| BAJA: Dockerfile sin HEALTHCHECK | `Dockerfile` | Presente, apunta a `/api/health` |
| BAJA: comparación CSRF no constante | `server/middleware/csrf.js` | **Arreglado hoy** (`crypto.timingSafeEqual`) |
| BAJA: IDs de empleado predecibles | `server/routes/employees.js` | **Arreglado hoy** (`crypto.randomUUID()`) |
| BAJA: `expiresIn` epoch crudo | `server/auth.js` | **Arreglado hoy** (segundos reales restantes) |
| BAJA: consentimiento sin timestamp | `server/routes/consent.js` | `created_at` vía default de tabla, confirmado |

## Parcial / mitigado (funciona mejor, no 100% cerrado)

| Hallazgo | Estado actual | Qué falta |
|---|---|---|
| ALTA: claves de servicio → ADMIN | Configurable por `SERVICE_ROLE_N8N`/`_CRON`, con logging por uso | Default sigue siendo ADMIN si no se setea la variable — **acción operativa**: setear `SERVICE_ROLE_N8N` a un rol acotado en el `.env` del VPS, no requiere código nuevo |
| MEDIA: JWT reutilizado como refresh | Tope de 30 días (`MAX_SESSION_SECONDS`) + revalida `activo` en cada refresh | Sin refresh token independiente con rotación/revocación en DB — rediseño de arquitectura, no un parche |
| MEDIA: WS token en query string | Cookie es la fuente primaria; `?token=` es fallback documentado | Eliminar el fallback por completo rompería clientes hipotéticos sin cookie — bajo riesgo real, dejar como está salvo que surja un caso de uso que lo necesite |
| MEDIA: `JWT_SECRET` default débil | Default inseguro eliminado | **Arreglado hoy** — ahora falla el boot si falta |
| MEDIA: rate limiting en endpoints públicos | `generalRateLimit` ya cubre `/api/menu` y `/api/products` (antes no tenían nada) | Falta diferenciar por tipo de endpoint (auth más estricto que catálogo) |

## Sigue abierto — requiere diseño, no es un parche de una línea

Priorizado por impacto real, no por severidad nominal del reporte original:

1. ~~**API key de Gemini expuesta en el bundle**~~ — **RESUELTO** (commit `faba24d`, 2026-09-30). `server/routes/gemini.js` nuevo con 4 rutas (`/api/gemini/recommend|chat|product-image|ingredient-image`) que hacen de proxy; `src/services/geminiService.ts` reescrito para llamarlas en vez del SDK directo. Dato curioso: `git grep` confirmó que ningún componente del frontend importaba `geminiService.ts` — no había explotación activa hoy, pero quedó seguro por diseño para cuando se conecte.

2. **Datos de privacidad sin anonimización/retención** (agente5, 4 hallazgos MEDIA)
   **Decisión del negocio (2026-10-01)**: retención = lo que permita la ley (no un plazo fijo propio); si un cliente pide borrar sus datos, se borra según lo que exija la ley (no un borrado automático sin más); la idea del negocio es poder identificar a las personas, así que **no** se van a anonimizar reseñas ni pseudonimizar `clientId` en loyalty — eso queda descartado, no pendiente.
   - ~~Reseñas sin opción anónima~~ — **cerrado, decisión de negocio**: se quiere poder identificar a quién dejó la reseña.
   - ~~`clientId` sin pseudonimizar~~ — **cerrado, decisión de negocio**: mismo criterio, se quiere poder identificar al cliente.
   - ~~Mecanismo real de supresión de PII~~ — **RESUELTO** (commit `ba31b44`, 2026-10-01). Plazo legal confirmado por el negocio: 10 años (estándar más seguro, combina Art. 632 Estatuto Tributario = 5 años DIAN + Art. 60 Código de Comercio = 10 años régimen comercial/contable). `server/services/dataRetention.js` (nuevo) ejecuta la supresión real al aprobar una solicitud (`PATCH /api/derechos/:id` con `estado:'respondida'` y `tipo:'supresion'`): suprime PII en `orders`/`reviews`/`clients`, salvo pedidos con factura dentro de los últimos 10 años (candado fiscal, Art. 13 excepción legal) — esos quedan retenidos y el resumen de qué se suprimió vs qué quedó retenido (y por qué) se agrega automáticamente a `respuesta` como evidencia ante la SIC.
   - DIAN `emisorInfo`/`receptorInfo` sin anonimización — sigue sin tocar: son datos del pedido vinculado a la factura, y mientras esa factura esté dentro de los 10 años de retención fiscal, no deben anonimizarse (sería contradecir la obligación de conservarlos íntegros). Una vez vencido el plazo, el mecanismo de arriba ya los suprime junto con el resto del pedido.
   - Nota sobre WeTransfer (sugerido por el negocio para backups): **no recomendado** — los links expiran y no tiene control de acceso apropiado para PII/documentos fiscales. Si se quiere backup externo, usar Drive con permisos restringidos o un bucket privado (S3, ya hay `AWS_*` en `.env.example`).

3. **Rotación de refresh tokens** — mover a un modelo de refresh token independiente con revocación en DB/Redis. Arquitectura, no parche.

## Sin verificar en esta pasada (necesitan herramientas que no corrí)

- Cobertura de tests real por módulo (necesita `npm run test -- --coverage`, no solo leer código).
- Documentación OpenAPI/Swagger — confirmado que no existe (agente6 tenía razón), no evalué prioridad.
- Canonicalización C14N manual en `dianSigner.js` — bajo impacto mientras `ambiente:'1'` (pruebas).
- Observabilidad de webhooks descartados por firma inválida.
- `docker-compose.yml network:host` y `worker_connections` — informativos, no acción requerida según el propio reporte original.

---

## Nota de confidencialidad

`docs/PENDIENTES*.md`, `docs/progress-report.md` y este mismo archivo
**no están trackeados en git** — el repo (`github.com/camilolealdev/juanchospizza`)
es público, y publicar un mapa de vulnerabilidades vigentes (aunque la
mayoría ya estén resueltas) sería exponer las que siguen abiertas a
cualquiera. Si en algún momento el repo pasa a privado, o se decide
llevar esto a un tracker separado (Jira/Linear privado), avisar para
subirlo.
