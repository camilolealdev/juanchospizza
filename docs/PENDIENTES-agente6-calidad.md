# Análisis de Calidad y Arquitectura — Agente 6

## Resumen
- **Arquitectura general**: Sistema bien estructurado Express + Vite + PM2; separate frontend/backend con DIAN integration
- **Testing**: Suite de 21+ archivos de test (unit/integration/e2e); cobertura presente pero inconsistente
- **Calidad del código**: Buenas prácticas en general; algunos módulos necesitan refactorización
- **CI/CD y deployment**: Docker multi-stage funcional; PM2 ecosystem configurado
- **Mantenibilidad**: Dependencias actualizadas en su mayoría; documentación parcial

## Hallazgos por severidad

### [MEDIA] Cobertura de tests desigual entre módulos
- **Archivo**: `server/tests/`
- **OWASP ref**: N/A (Calidad/Testing)
- **Descripción**: Hay 21+ archivos de test pero la cobertura varía significativamente. Módulos críticos como `payments.js` (4 proveedores: Wompi, Nequi, dLocal, PayU) tienen tests básicos, mientras módulos como `websocket.js` y `tables.js` tienen cobertura más robusta. Tests de integración para el flujo completo de pedidos (orden → pago → DIAN → despacho) no están completamente cubiertos.
- **Recomendación**: Implementar tests de integración E2E para el flujo principal: crear orden → procesar pago → generar factura DIAN → asignar mesa/despacho. Priorizar cobertura en módulos de pagos y facturación electrónica.

### [MEDIA] Middleware de Rate Limiting configuración poco restrictiva
- **Archivo**: `server/middleware/rateLimit.js`
- **OWASP ref**: API10 — Consumo ilimitado de recursos
- **Descripción**: El rate limiting está implementado pero la configuración por defecto es permisiva. Endpoints públicos como `/api/products` y `/api/menu` no tienen rate limiting específico, lo que permite scraping masivo o denegación de servicio por abuso de consultas.
- **Recomendación**: Aplicar rate limits diferenciados: estrictos para autenticación (5 req/min), moderados para consultas públicas (60 req/min), y permisivos para endpoints internos del POS. Considerar rate limiting por IP y por usuario autenticado.

### [MEDIA] Dependencias potencialmente obsoletas en frontend
- **Archivo**: `pizzeria-merge/frontend/package.json`
- **OWASP ref**: N/A (Technical Debt)
- **Descripción**: El frontend usa Vite 5.x con React 19.x, que es actual, pero algunas dependencias auxiliares pueden tener versiones desactualizadas. No hay lockfile visible (package-lock.json o pnpm-lock.yaml) en el repositorio, lo que puede causar inconsistencias en builds reproducibles.
- **Recomendación**: Ejecutar `npm audit` o `pnpm audit` para identificar vulnerabilidades en dependencias. Generar y commitear el lockfile para garantizar builds deterministas. Implementar dependabot o Renovate para actualizaciones automáticas.

### [MEDIA] Ausencia de Health Check endpoint para Docker/PM2
- **Archivo**: `server/index.js`, `ecosystem.config.cjs`
- **OWASP ref**: N/A (Operations)
- **Descripción**: El servidor Express no expone un endpoint `/health` o `/readyz` para verificación de estado. Docker está configurado con `HEALTHCHECK` en Dockerfile pero apunta a un endpoint que podría no existir. PM2 no tiene configuración de health check.
- **Recomendación**: Agregar `GET /health` que verifique conexión a Redis, PostgreSQL (si aplica), y estado de servicios internos. Actualizar Dockerfile HEALTHCHECK para apuntar al endpoint correcto. Agregar `health_check_grace_period` en PM2 ecosystem.

### [BAJA] Tests co-localizados en directorio de schemas
- **Archivo**: `server/schemas/*.test.js`
- **OWASP ref**: N/A (Code Organization)
- **Descripción**: Algunos archivos de test están co-localizados con los schemas (`ingredients.test.js`, `inventory.test.js`, `loyalty.test.js`, etc.) en lugar de estar todos en `server/tests/`. Esto dificulta la organización y ejecución de tests.
- **Recomendación**: Mover todos los archivos `.test.js` a `server/tests/` manteniendo la convención de naming. Esto mejora la claridad del proyecto y facilita la configuración de cobertura de código.

### [BAJA] Falta documentación de API (OpenAPI/Swagger)
- **Archivo**: `server/routes/`
- **OWASP ref**: N/A (Documentation)
- **Descripción**: No existe especificación OpenAPI o documentación Swagger para las 32 rutas de la API. Esto dificulta la integración con clientes externos, el testing automatizado, y el mantenimiento a largo plazo.
- **Recomendación**: Implementar `swagger-jsdoc` y `swagger-ui-express` para generar documentación auto-descrita de la API. Priorizar documentación de endpoints públicos (menú, pedidos) y de integración DIAN.

### [BAJA] Scripts de deployment no documentados
- **Archivo**: `package.json` (scripts), `ecosystem.config.cjs`
- **OWASP ref**: N/A (Operations)
- **Descripción**: Los scripts de npm (`start`, `build`, `pm2:start`, etc.) no están documentados con su propósito. El `ecosystem.config.cij` de PM2 tiene configuración pero falta documentación de los diferentes modos (desarrollo vs producción).
- **Recomendación**: Agregar sección de scripts en README.md o crear docs/DEPLOYMENT.md que documente cada script, variables de entorno requeridas, y flujo de deployment para diferentes entornos (local, staging, producción).

### [INFORMATIVO] Stack tecnológico coherente
- **Archivo**: `package.json`, `pizzeria-merge/frontend/package.json`
- **OWASP ref**: N/A
- **Descripción**: El proyecto usa un stack coherente: Express 5.x, React 19.x, Vite 5.x, PostgreSQL (via Drizzle), Redis, WebSocket nativo, PM2 para clustering. Las versiones son recientes y compatibles entre sí. No hay frameworks redundantes o conflictivos.
- **Recomendación**: Mantener esta coherencia. Al actualizar dependencias mayores (ej: Express 6.x cuando sea estable), revisar compatibilidad con middlewares existentes.

### [INFORMATIVO] Separación clara frontend/backend
- **Archivo**: `pizzeria-merge/`
- **OWASP ref**: N/A
- **Descripción**: La arquitectura mantiene una separación clara entre el backend Express (`server/`) y el frontend React (`frontend/`). El backend sirve la API REST + WebSocket, el frontend consume estos servicios. Vite maneja el bundling del frontend en desarrollo, y el build se sirve desde Express en producción.
- **Recomendación**: Mantener esta separación. Considerar mover el frontend a un subdominio separado (ej: `app.juanchospizza.com` vs `api.juanchospizza.com`) si el tráfico lo justifica en el futuro.

### [INFORMATIVO] Uso de ESM consistente
- **Archivo**: `package.json` ("type": "module"), `ecosystem.config.cjs`
- **OWASP ref**: N/A
- **Descripción**: El proyecto usa ESM (ES Modules) de forma consistente en el backend, con `import/export` en lugar de `require`. El `ecosystem.config.cjs` usa extensión `.cjs` para CommonJS requerido por PM2. Esto es una buena práctica moderna.
- **Recomendación**: Mantener ESM. Si se agregan scripts de tooling que requieran CommonJS, usar extensión `.cjs` explícita como ya se hace con PM2.
