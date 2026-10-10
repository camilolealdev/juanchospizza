# Análisis de Seguridad — Agente 1: Autenticación y Autorización

## Resumen

- 1 hallazgo **ALTA**: las claves de servicio otorgan el rol `ADMIN` de forma indiscriminada, lo que convierte cualquier clave comprometida en control administrativo total.
- 3 hallazgos **MEDIA**: el mismo JWT de acceso se reutiliza como token de refresco sin rotación ni revocación; el handshake de WebSocket acepta el token en `query string`; y un token inválido degrada silenciosamente la conexión al rol `public`.
- 6 hallazgos **BAJA**: IDs de empleado predecibles, bypass de autenticación en desarrollo, fallback `Authorization: Bearer`, campo `expiresIn` que devuelve el epoch crudo, comparación de CSRF no constante y validación de sede condicionada.
- Los controles principales están correctamente implementados (PBKDF2-SHA512, bloqueo por intentos fallidos, cookies HttpOnly con Secure en producción, CSRF sobre `/api`, rate limiting por IP y por clave, verificación de rol y de sede en cada solicitud). La agenda prioritaria es endurecer el manejo de claves de servicio y el modelo de emisión/rotación de tokens.

---

## Hallazgos por severidad

### [ALTA] Las claves de servicio otorgan el rol ADMIN sin restricciones de alcance

- Archivo: server/middleware/serviceKey.js:19-20, 32-37, 55-61
- OWASP: A01
- Descripción:
  `validateServiceKey` autentica la clave y le asigna `role: 'ADMIN'` de forma directa, sin limitar por origen, IP, horario, tipo de operación ni rotación. Todos los patrones de clave conocidos (n8n, cron y genéricas) terminan en la misma `requestServiceKey` que fija `req.auth = { type: 'service', role: 'ADMIN', serviceName: ... }`.
  ```js
  requestServiceKey(req, serviceName) {
    req.auth = { type: 'service', role: 'ADMIN', serviceName, ... };
  }
  ```
  ```js
  if (!crypto.timingSafeEqual(Buffer.from(key), Buffer.from(hashedKey))) {
    return res.status(403).json({ message: 'Service key inválida' });
  }
  ```
- Impacto: El compromiso de una única clave de servicio expone todas las operaciones administrativas del sistema (gestión de empleados, pedidos, campañas, etc.) sin distinción entre integraciones y sin mecanismo de detección de uso anómalo.
- Recomendación: Asignar roles/alcanzas específicos por clave según la integración (p. ej., solo operaciones de pedidos), limitar el uso por origen o IP, almacenar únicamente hashes de las claves, imponer rotación periódica y registrar cada uso con alertas de comportamiento inusual.

---

### [MEDIA] El mismo JWT de acceso se reutiliza como token de refresco sin rotación ni revocación

- Archivo: server/auth.js:221-248
- OWASP: A07
- Descripción:
  `refreshToken` reutiliza el mismo `type: 'access'` emitido en el login para renovar la sesión. No existe un token de refresco independiente, ni rotación, ni revocación individual: la única invalidación posible es la alteración de `role`, `locationId` o `activo` del empleado en base de datos.
  ```js
  if (payload.type !== 'access' || payload.sub !== 'employee') {
    return res.status(401).json({ message: 'Token no válido para refrescar sesión' });
  }
  ```
  ```js
  const freshPayload = { ...refreshedClaims, iat: now, exp: now + parseInt(JWT_EXPIRES_SECONDS, 10) };
  ```
- Impacto: Si un token de acceso se filtra, permanece válido para obtener nuevos access tokens durante su vida útil (15 min + renovaciones continuas) y no puede revocarse de forma individual; cualquier robo de sesión queda activo hasta el cambio de estado del empleado en BD.
- Recomendación: Introducir tokens de refresco independientes y de larga duración con rotación en cada renovación, almacenar su referencia en BD/Redis para permitir revocación y re-emitir el access token solo contra un refresco vigente y no reutilizado.

---

### [MEDIA] El handshake de WebSocket acepta el token de autenticación en el query string

- Archivo: server/websocket.js:34
- OWASP: A07
- Descripción:
  El token JWT puede enviarse como parámetro de URL durante el handshake, además de la cookie.
  ```js
  const token = url.searchParams.get('token') || cookie;
  ```
- Impacto: Los tokens presentes en la URL quedan expuestos en logs de proxy/servidor, historial del navegador y cabeceras `Referer`, lo que facilita la filtración de credenciales de sesión.
- Recomendación: Autenticar el WebSocket exclusivamente mediante cookie HttpOnly (o cabecera dedicada) y rechazar las conexiones que incluyan `?token=`; sanitizar logs y evitar reflejar valores de query string.

---

### [MEDIA] Un token de WebSocket inválido degrada silenciosamente la conexión al rol `public`

- Archivo: server/websocket.js:36-39
- OWASP: A07
- Descripción:
  Cuando el token falta, expira o es inválido, en lugar de rechazar la conexión se asigna el rol `public` y se continúa el handshake, sin distinguir explícitamente entre conexiones autenticadas y no autenticadas.
  ```js
  req.auth = { role: 'public' };
  ```
- Impacto: Los canales privados y públicos comparten el mismo handshake, de modo que una falla de autenticación puede pasar desapercibida y permitir suscripciones a canales que el cliente asume restringidos; se dificulta la detección de accesos indebidos.
- Recomendación: Rechazar la conexión (p. ej., código de cierre 4401) cuando el endpoint requiere autenticación, y exigir token válido de forma explícita para los canales privados.

---

### [BAJA] Los IDs de empleados son predecibles

- Archivo: server/routes/employees.js:40
- OWASP: A02
- Descripción:
  El ID se genera a partir de la marca de tiempo en milisegundos y 4 caracteres alfanuméricos.
  ```js
  const employeeId = `emp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  ```
- Impacto: El espacio de IDs es reducido y adivinable; si estos IDs se usan en referencias externas o en decisiones de autorización, permiten enumeración o acceso no autorizado a recursos de otros empleados.
- Recomendación: Usar UUID v4 o ULID para los identificadores y garantizar que la autorización se valide por recurso y propiedad, no por un ID adivinable.

---

### [BAJA] Bypass de autenticación disponible en entorno de desarrollo

- Archivo: server/auth.js:284-287
- OWASP: A07
- Descripción:
  Con `NODE_ENV === 'development'` y `ALLOW_DEV_AUTH_BYPASS === 'true'`, cualquier solicitud se autentica automáticamente con el rol `DEVELOPMENT`, omitiendo la verificación de credenciales. No confiere `ADMIN` de forma implícita (`requireRole` solo acepta roles listados), pero deja el sistema sin autenticación real.
  ```js
  if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_AUTH_BYPASS === 'true') {
    req.auth = { role: 'DEVELOPMENT' };
    return next();
  }
  ```
- Impacto: Si esa combinación de variables llega a un despliegue productivo o a un entorno accesible desde la red, cualquier persona obtiene una sesión autenticada sin credenciales.
- Recomendación: Eliminar el bypass o impedir el arranque (`validateConfig`) cuando `ALLOW_DEV_AUTH_BYPASS` esté habilitado fuera de entornos locales aislados; restringir el flag a desarrollo local únicamente.

---

### [BAJA] Se sigue aceptando `Authorization: Bearer` además de la cookie

- Archivo: server/auth.js:276-278
- OWASP: A07
- Descripción:
  El middleware acepta el JWT vía cabecera `Authorization` como alternativa a la cookie.
  ```js
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  ```
- Impacto: Amplía la superficie de exposición del token: las cabeceras de autorización pueden quedar registradas en logs de clientes, proxies o herramientas de depuración.
- Recomendación: Completar la migración a cookie HttpOnly y eliminar el fallback por cabecera `Bearer`.

---

### [BAJA] El campo `expiresIn` devuelve el timestamp de expiración en lugar de la duración

- Archivo: server/auth.js:260
- OWASP: A07
- Descripción:
  La respuesta de login entrega el valor crudo `payload.exp` (epoch Unix) con el nombre `expiresIn`, que sugiere segundos restantes.
  ```js
  return res.json({ token, employee, expiresIn: payload.exp });
  ```
- Impacto: Los clientes que interpreten `expiresIn` como duración calcularán mal el fin de la sesión, provocando expiraciones prematuras o ventanas de sesión más largas de lo previsto.
- Recomendación: Devolver los segundos restantes reales: `payload.exp - Math.floor(Date.now() / 1000)`, o renombrar el campo a `expiresAt`.

---

### [BAJA] La comparación del token CSRF no se realiza en tiempo constante

- Archivo: server/middleware/csrf.js:101
- OWASP: A07
- Descripción:
  La validación compara directamente las cadenas con el operador de desigualdad.
  ```js
  if (cookieToken !== headerToken) {
    return res.status(403).json({ message: 'CSRF token inválido' });
  }
  ```
- Impacto: Riesgo teórico de ataques de tiempo (timing attack) para adivinar el token; el impacto real es bajo por la aleatoriedad y longitud del token, pero la práctica no sigue el estándar recomendado.
- Recomendación: Comparar mediante `crypto.timingSafeEqual` previa comprobación de igual longitud de los buffers.

---

### [BAJA] `requireSameLocation` omite la validación de sede si `targetLocationId` es nulo

- Archivo: server/auth.js:373-382
- OWASP: A01
- Descripción:
  El middleware solo comprueba la sede cuando el llamador envía `targetLocationId`; si no se envía (falsy), se permite el acceso sin ninguna verificación de sede.
  ```js
  if (targetLocationId && targetLocationId !== req.auth.locationId) {
    return res.status(403).json({ message: 'No autorizado para operar en esta sede' });
  }
  ```
- Impacto: La aplicación del control depende de que el llamador proporcione el campo; las rutas o clientes que no propagan `locationId` quedan sin la restricción de sede prevista.
- Recomendación: Derivar la sede del token (`req.auth.locationId`) en lugar del cuerpo de la solicitud, o exigir `targetLocationId` explícitamente y rechazar la operación cuando falte.