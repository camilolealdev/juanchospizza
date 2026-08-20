# PENDIENTES - Security Audit Findings - Pizzeria Merge

## Resumen Ejecutivo

Auditoría de seguridad completada con 6 agentes. Hallazgos de los Agentes 1-3 consolidados. Agentes 4-6 requieren atención (archivos faltantes en `findings/`). Reporte de brechas y vacíos a continuación.

---

## Hallazgos Agente 1 (auth.md)

### CRÍTICO

- Ningún hallazgo CRÍTICO reportado

### ALTO

- Ningún hallazgo ALTO reportado

### MEDIO

1. **Rutas sin autenticación en `server/routes/orders.js`** - Endpoints de órdenes accesibles sin validación de sesión
2. **Rutas sin autenticación en `server/routes/payments.js`** - Endpoints de pagos accesibles sin validación de sesión
3. **Falta validación de token en middlewares** - Middlewares de autenticación no aplicados consistentemente

### BAJO

1. **Contraseñas débiles en configuración** - Contraseñas que no cumplen políticas de complejidad
2. **Falta logging de eventos de seguridad** - Ausencia de logs para intentos de acceso fallidos
3. **Headers de seguridad ausentes** - Missing `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`

---

## Hallazgos Agente 2 (agent2.md)

### CRÍTICO

1. **Rutas de órdenes sin protección** (`server/routes/orders.js`) - CRITICAL: Endpoints accesibles sin auth
2. **Rutas de pagos sin protección** (`server/routes/payments.js`) - CRITICAL: Endpoints accesibles sin auth

### ALTO

1. **Hardcoded defaults en `dianSigner.js`** - `dianSigner.DEFAULT_KEY` y `dianSigner.DEFAULT_IV` con valores por defecto inseguros
2. **Rutas adicionales sin protección** - Múltiples endpoints sin validación de sesión

### MEDIO

1. **Falta rate limiting** - No hay límite de requests por IP/usuario
2. **Error messages informativos** - Mensajes de error que revelan información del sistema

### BAJO

1. **Falta headers de CORS** - Configuración de CORS demasiado permisiva
2. **Falta input validation** - Validación básica faltante en algunos endpoints

---

## Hallazgos Agente 3 (agent3.md)

### CRÍTICO

1. **Contraseña hardcoded en docker-compose.yml** - `POSTGRES_PASSWORD=secret` en archivo de despliegue
2. **Dockerfile ejecuta como root** - `USER root` en Dockerfile, riesgo de seguridad por contenedor como root

### ALTO

1. **Falta USER directive en Dockerfile** - No hay directiva `USER` para ejecutar como usuario no-root

### MEDIO

1. **Falta .dockerignore** - Archivos innecesarios podrían filtrarse al contexto de build
2. **Etiquetas de versión latest** - Uso de `latest` en imágenes base

### BAJO

1. **Falta healthcheck** - No hay healthcheck definido en Dockerfile
2. **Falta .env example** - No hay ejemplo de variables de entorno seguro

---

## Agentes 4-6: ESTADO ACTUAL

**ARCHIVOS FALTANTES**: Los archivos `findings/agent4.md`, `findings/agent5.md`, `findings/agent6.md` no existen en el directorio `findings/`.

**Acción requerida**:

- Verificar si los agentes 4-6 se ejecutaron o si los archivos deben generarse
- Si es necesario, crear hallazgos placeholder o solicitar aclaración al usuario

---

## Reporte de Brechas y Vacíos Identificados

### CRÍTICO - Acceso sin Autenticación

1. **Rutas `orders.js` sin protección** - Cualquier usuario puede acceder a endpoints de órdenes
2. **Rutas `payments.js` sin protección** - Cualquier usuario puede acceder a endpoints de pagos
3. **Contraseña de base de datos expuesta** - `POSTGRES_PASSWORD=secret` en docker-compose.yml visible en repo

### ALTO - Configuración Insegura

1. **dianSigner defaults inseguros** - Keys e IVs por defecto sin rotación
2. **Dockerfile como root** - Contenedor con privilegios elevados
3. **Falta USER directive** - No hay usuario no-root definido

### MEDIO - Prácticas Deficientes

1. **Rate limiting ausente** - Sin protección contra abuso de endpoints
2. **Falta logging de seguridad** - Sin registro de eventos críticos
3. **Headers de seguridad faltantes** - X-Content-Type-Options, X-Frame-Options, Referrer-Policy
4. **CORS demasiado permisivo** - Configuración sin restricciones de origen

### BAJO - Mejora Continua

1. **Input validation básica** - Validación insuficiente en algunos endpoints
2. **Error messages informativos** - Riesgo de información de sistema
3. **Falta healthcheck** - Sin verificación de salud del contenedor
4. **Falta .dockerignore** - Contexto de build potencialmente amplio

---

## Próximos Pasos Recomendados

1. **Correcciones inmediatas CRÍTICO**:
   - Proteger rutas `orders.js` y `payments.js` con autenticación JWT/ sesión
   - Rotar y mover la contraseña de PostgreSQL a secret manager/Variables de entorno seguras

2. **Correcciones ALTO**:
   - Agregar `USER nonroot` en Dockerfile
   - Rotar keys e IVs del dianSigner, remover defaults hardcodeados
   - Implementar rate limiting en endpoints críticos

3. **Abordar Agentes 4-6**:
   - Verificar ejecución de agentes faltantes
   - Generar archivos `findings/agent*.md` si es necesario

4. **Mejoras MEDIO/BAJO**:
   - Agregar headers de seguridad (helmet.js)
   - Implementar rate limiting
   - Agregar .dockerignore y healthcheck
   - Mejorar validación de inputs
   - Configurar CORS apropiadamente

---

## Estado del Repositorio Git

- **Remote**: `origin` → `https://github.com/Juancho-pizza/pizzeria-merge.git`
- **Branch actual**: `main`
- **Próximo paso**: `git add . && git commit -m "security-audit-findings" && git push origin main`
