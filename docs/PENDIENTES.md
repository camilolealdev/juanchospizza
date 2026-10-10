# Pendientes — Auditoría de Seguridad juanchospizza

Fecha: 2026-08-20 (actualizado)
Proyecto: `guido-pizza-bogota` v2.0.0 (ESM)
Ruta principal del código: `pizzeria-merge/`

## Estado general

- **Los 6 agentes de seguridad completaron sus informes** (`PENDIENTES-agente1-auth.md` … `PENDIENTES-agente6-calidad.md`). 52 hallazgos totales: 4 ALTA, 18 MEDIA, 22 BAJA, 8 INFORMATIVO.
- Cross-check con graphify (`graphify-out/graph.json`, root `.`): confirma `websocket.js` como god node / hub de comunidad — coincide con que agente1 y agente4 marcan ambos ese archivo (token en query string, downgrade silencioso a `public`, frontend sin auth en el handshake). Prioridad reforzada por centralidad estructural.
- Docker para equipo QA/debug: **pendiente de configurar** (Sección 3, sin empezar).
- ⚠️ **Advertencia**: existe un segundo set de hallazgos en `pizzeria-merge/PENDIENTES.md` + `pizzeria-merge/findings/` (agent1-3 parciales, agent4-6 son placeholders vacíos de 42 bytes) de una corrida anterior/abandonada. Contradice al set actual: afirma JWT sin `exp`, algoritmo `none` no bloqueado y cookie sin `HttpOnly` — el agente1 actual confirma que esos controles SÍ están implementados correctamente. También marca `orders.js`/`payments.js` sin auth como CRÍTICO, cuando el agente2 actual documenta que es diseño intencional (monto siempre revalidado server-side). Ese set está obsoleto — no usar como referencia; considerar archivarlo o borrarlo (decisión del usuario).

## Síntesis consolidada (Sección 2 — antes pendiente, ahora completa)

### ALTA (4) — acción inmediata antes de producción

| # | Hallazgo | Archivo | Agente |
|---|----------|---------|--------|
| 1 | Claves de servicio otorgan rol `ADMIN` sin restricción de alcance/origen/rotación | `server/middleware/serviceKey.js:19-61` | 1 |
| 2 | Idempotencia de webhook de pagos falla en modo abierto (`fail-open`): un error de DB pierde confirmaciones de pago silenciosamente | `server/routes/payments.js:36-47,402` | 2 |
| 3 | Credenciales/config de facturación DIAN con placeholders `[MANUAL]` hardcodeados (`softwarePin`, `CERT_PASSWORD`, `claveTecnica`) | `server/services/dianXml.js:70-82`, `dianSigner.js:369` | 2 |
| 4 | `rejectUnauthorized: false` en conexión a PostgreSQL — sin verificación de certificado, riesgo MitM | `server/db.js:14` | 3 |

### MEDIA (18) — agrupadas por tema

**Autenticación/sesión (6):** JWT de acceso reutilizado como refresh sin rotación/revocación (auth.js:221-248, ag.1) · WS acepta token por query string, se filtra en logs/Referer (websocket.js:34, ag.1) · WS con token inválido degrada a rol `public` en vez de rechazar (websocket.js:36-39, ag.1) · `JWT_SECRET` con default hardcodeado débil (config.js:11, ag.3) · frontend abre WS sin enviar token en el handshake (useWebSocket.ts, ag.4) · JWT guardado en `localStorage`, expuesto a XSS persistente (api.ts, ag.4).

**Datos/privacidad (4, Ley 1581/2012):** sin política de retención/eliminación de PII en pedidos/facturas/reseñas (ag.5) · datos de facturación DIAN sin anonimización (ag.5) · `clientId` de loyalty sin pseudonimizar (ag.5) · reseñas guardan nombre+teléfono sin opción anónima (ag.5).

**Frontend/config (2):** API key de Gemini expuesta en el bundle del cliente (geminiService.ts, ag.4) · falta `.dockerignore`/lockfile consistente, dependencias del frontend sin auditar (ag.6).

**Infra/calidad (6):** `add_header` en bloque `location` de nginx puede pisar headers heredados del `server` (ag.3) · `allowExitOnIdle: true` sin supervisor garantizado (db.js, ag.3) · cobertura de tests desigual, falta E2E del flujo orden→pago→DIAN (ag.6) · rate limiting ausente en endpoints públicos de catálogo (`/api/products`, `/api/menu`, ag.6) · sin endpoint `/health` real para Docker/PM2 (ag.6).

### BAJA (22) e INFORMATIVO (8)

Ver detalle completo en cada `PENDIENTES-agente{1..6}-*.md`. Puntos recurrentes de bajo riesgo: IDs predecibles (`emp_${Date.now()}...`), fallback `Authorization: Bearer` conviviendo con cookie, comparación CSRF no constante, sin CSP/X-Frame-Options explícitos en frontend, localStorage sin limpiar en logout, carrito sin validación de integridad (revalidado igual en backend), documentación de API/scripts ausente.

## Tareas pendientes restantes

### 3. Docker QA/debug (PENDIENTE — sin empezar)

- Configurar entorno Docker Compose aislado para el equipo de QA/debug.
- Aislar servicios (PostgreSQL, Redis, app) para pruebas sin afectar producción.

### 4. Remediación (nuevo, se desprende de la síntesis)

- Priorizar los 4 ALTA antes de cualquier despliegue a producción (especialmente DIAN `ambiente: '2'` y el webhook fail-open).
- Definir dueño y fecha por hallazgo MEDIA; los de autenticación/sesión son el bloque más grande (6).
- Decidir qué hacer con `pizzeria-merge/PENDIENTES.md` + `findings/` (set obsoleto, ver advertencia arriba).

## Notas

- Los 6 informes de agentes están completos y consistentes entre sí (mismo formato, sin contradicciones internas).
- Comunicación con el usuario en español.
