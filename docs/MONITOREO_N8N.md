# Monitoreo con n8n — `/api/health` y `/api/metrics`

> Backlog deploy 2026-07-30 · Propuesta de workflow para vigilar el stack
> sin infraestructura adicional. n8n ya está disponible en el entorno del
> negocio (se usa para otras automatizaciones), así que el monitoreo se
> implementa como un workflow más, no como un servicio nuevo.

## Endpoints disponibles

| Endpoint       | Método | Formato         | Protegido                             | Uso                                       |
| -------------- | ------ | --------------- | ------------------------------------- | ----------------------------------------- |
| `/api/health`  | GET    | JSON            | No (loopback excluido del rate limit) | Healthcheck de Docker + monitoreo externo |
| `/api/metrics` | GET    | Prometheus text | No (fuera de CSRF, solo lectura)      | Scraping por Prometheus / n8n             |

### `/api/health` — respuesta

```json
{
  "status": "healthy", // "healthy" | "degraded"
  "uptime": 3600, // segundos
  "timestamp": "2026-07-30T12:00:00.000Z",
  "services": {
    "database": "connected", // "connected" | "error"
    "redis": "connected" // "connected" | "memory_fallback"
  }
}
```

- Se monta **antes** del rate limiter general en `server/index.js`.
- El workflow n8n propuesto arriba debe chequear `status`/`services.database`,
  no campos top-level `db`/`redis` (forma real de la respuesta, ver
  `server/index.js`).
- Tráfico autenticado con `x-service-key` (n8n/cron) usa su propio
  rate-limit (`serviceRateLimit`, `server/middleware/rateLimit.js`) en vez
  del límite general por IP, así que un workflow de monitoreo no compite
  por cuota con tráfico de navegador.
- La métrica `pizza_http_requests_total` (de `metricsMiddleware`) cubre
  también este endpoint.

### `/api/metrics` — contenido

Formato Prometheus (`prom-client`, default registry). Incluye:

- `pizza_http_requests_total{method,route,status}`
- `pizza_http_request_duration_seconds` (histogram)
- `pizza_redis_*` / `pizza_db_*` (según se instrumenten)
- Métricas estándar de Node (`process_*`, `nodejs_*`)

## Workflow n8n propuesto (nivel 1: alertas por polling)

Objetivo: detectar caída o degradación del backend sin depender de
Prometheus/Grafana. Un solo workflow con dos ramas.

### Nodos

1. **Schedule Trigger** — cada 2 minutos (`*/2 * * * *`).
2. **HTTP Request** — `GET <URL_BASE>/api/health`
   - Timeout: 10 s
   - Retry on fail: 2 reintentos con backoff de 30 s
3. **IF** — condición `status != "healthy"` **o** `services.database != "connected"`
4. **Rama true (alerta)**:
   - **HTTP Request → Webhook** (o **Gmail** / **Telegram** según
     preferencia): mensaje con `timestamp`, `status`, `services.database`,
     `services.redis`.
   - Opcional **Wait** de 10 min antes de volver a alertar para evitar
     spam (o usar el campo de deduplicación de n8n).
5. **Rama false (ok)**:
   - No-op (o registro en log). Se puede enlazar a un segundo workflow
     de "recuperación" si se quiere un mensaje de "volvió a estar sano".

### Workflow nivel 2 (opcional): métricas a Google Sheets / Webhook

1. **Schedule Trigger** — cada 5 minutos.
2. **HTTP Request** — `GET <URL_BASE>/api/metrics`
3. **Function (n8n)** — parsear el texto Prometheus y extraer
   `pizza_http_requests_total` del último minuto y el percentil p95 de
   `pizza_http_request_duration_seconds`.
4. **Google Sheets** — append de una fila por ejecución
   (`timestamp`, `rps`, `p95_ms`, `error_rate`).

## Variables de entorno necesarias en n8n

| Variable              | Ejemplo                      | Descripción                  |
| --------------------- | ---------------------------- | ---------------------------- |
| `PIZZA_API_BASE`      | `https://api.guidopizza.com` | Base URL del backend         |
| `PIZZA_ALERT_EMAIL`   | `ops@guidopizza.com`         | Destino de alertas           |
| `PIZZA_ALERT_WEBHOOK` | (opcional)                   | Webhook Slack/Teams/Telegram |

## Prueba rápida

```bash
# Health
curl -s http://localhost:PORT/api/health | jq

# Métricas (primeras líneas)
curl -s http://localhost:PORT/api/metrics | head -20

# Simular degradación (DB caída) para ver la alerta
docker compose stop db && sleep 5 && curl -s http://localhost:PORT/api/health | jq
docker compose start db
```

## Notas

- `/api/metrics` no expone datos sensibles (no hay `Authorization` ni
  cookies en la respuesta), pero se recomienda restringirlo por red/firewall
  en producción (solo IPs de monitoreo).
- El `HEALTHCHECK` de Docker ya usa `/api/health`; n8n es el segundo nivel
  de vigilancia (externo al contenedor).
- Si más adelante se adopta Prometheus real, n8n deja de hacer polling y
  Prometheus scrapea `/api/metrics` directamente — el endpoint no cambia.
