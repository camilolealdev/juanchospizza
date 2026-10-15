# PENDIENTES - Agente 3: Infraestructura y Seguridad

**Fecha:** 2026-08-19
**Estado:** COMPLETADO
**Alcance:** Infraestructura, despliegue, configuración, base de datos, red.

## Resumen Ejecutivo

El análisis de infraestructura revela una configuración robusta y profesional, con buenas prácticas de seguridad implementadas (Docker multi-stage, Helmet, CORS, rate limiting). Se identificaron puntos de mejora en la verificación de certificados SSL y la gestión de secretos por defecto.

## Hallazgos por Severidad

### ALTA (1)

**INFRA-01: Deshabilitación de verificación SSL en conexiones a BD**
- **Archivo:** `server/db.js:14`
- **Detalle:** `rejectUnauthorized: false` desactiva la verificación del certificado del servidor PostgreSQL, facilitando ataques Man-in-the-Middle (MitM).
- **Impacto:** Un atacante podría interceptar tráfico entre la aplicación y la base de datos.
- **Recomendación:** Habilitar `rejectUnauthorized: true` y proporcionar un certificado CA válido via `PGSSLCERT` o `NODE_EXTRA_CA_CERTS`, o usar variables de entorno para controlar esto explícitamente.

### MEDIA (3)

**INFRA-02: Secreto JWT con valor por defecto débil**
- **Archivo:** `server/config.js:11`
- **Detalle:** `JWT_SECRET` tiene un valor por defecto hardcodeado (`jwt-secret-change-in-production`).
- **Impacto:** Si la variable de entorno no está configurada, cualquier persona puede forjar tokens JWT.
- **Recomendación:** Lanzar un error fatal si `JWT_SECRET` no está definido en producción, similar a `DATABASE_URL`.

**INFRA-03: Potential herencia incompleta de headers de seguridad en Nginx**
- **Archivo:** `nginx.conf` (bloques `location`)
- **Detalle:** El uso de `add_header` dentro de un bloque `location` reemplaza todos los `add_header` heredados del bloque `server`. Actualmente se observa `add_header X-Frame-Options ""` en `/ws`, lo cual es seguro, pero debe evitarse en otras ubicaciones.
- **Impacto:** Pods de seguridad podrían eliminarse accidentalmente en nuevas ubicaciones.
- **Recomendación:** Documentar esta advertencia claramente o usar el módulo `ngx_headers_more` para manipular headers de forma segura.

**INFRA-04: Configuración de pool de conexiones**
- **Archivo:** `server/db.js`
- **Detalle:** `allowExitOnIdle: true` permite que el proceso termine si el pool queda idle.
- **Impacto:** Podría causar reinicios inesperados si no hay un gestor de procesos adecuado.
- **Recomendación:** Asegurar que Docker `restart: unless-stopped` o un supervisor (PM2) esté activo. Considerar `allowExitOnIdle: false` en entornos de alta disponibilidad.

### BAJA (3)

**INFRA-05: Falta HEALTHCHECK en Dockerfile**
- **Archivo:** `Dockerfile`
- **Detalle:** No hay instrucción `HEALTHCHECK` (aunque `docker-compose.yml` sí lo define).
- **Recomendación:** Agregar `HEALTHCHECK` al Dockerfile para mayor portabilidad.

**INFRA-06: Uso de `network: host` durante build**
- **Archivo:** `docker-compose.yml`
- **Detalle:** Se usa para resolver problemas de DNS IPv6, pero reduce el aislamiento durante la construcción.
- **Recomendación:** Es aceptable dado el contexto, pero documentar por qué es necesario.

**INFRA-07: worker_connections moderado**
- **Archivo:** `nginx.conf`
- **Detalle:** `worker_connections 1024` es estándar pero podría ser un cuello de botella bajo carga extrema.
- **Recomendación:** Monitorizar y aumentar si es necesario (ej. 2048 o 4096).

## Buenas Prácticas Detectadas

✅ **Docker Multi-Stage Build**: Reduce tamaño de imagen final y ataque superficial.
✅ **Helmet Habilitado**: Protege contra vulnerabilidades HTTP comunes.
✅ **Rate Limiting**: Implementado en Express y Nginx.
✅ **CORS Configurado**: Origen específico y credenciales habilitadas.
✅ **WebSocket Seguro**: Headers correctos para upgrade.
✅ **Gzip Habilitado**: Compresión de respuestas.
✅ **SSL/TLS Fuerte**: Protocolos y cifradores actualizados en Nginx.

## Configuración Requerida para Producción

| Variable | Estado | Acción |
|----------|--------|--------|
| `DATABASE_URL` | Requerida | Configurar con SSL |
| `JWT_SECRET` | Requerida | Generar secret fuerte (32+ chars) |
| `FRONTEND_URL` | Requerida (prod) | Definir dominio exacto |
| `REDIS_URL` | Opcional | Configurar si se usa caché |
| `GEMINI_API_KEY` | Opcional | Para funcionalidades IA |

## Próximos Pasos (Infra)

1. Resolver INFRA-01 (certificados SSL)
2. Fortalecer INFRA-02 (JWT_SECRET obligatorio)
3. Validar configuración en entorno QA
