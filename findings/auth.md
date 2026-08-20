### [CRITICAL] JWT Algorithm Confusion vulnerability

File: server/auth.js:24
OWASP: A02:2021 Cryptographic Failures
Descripción: El algoritmo 'none' no está explícitamente desactivado en la firma JWT, permitiendo posible bypass de firma. El código usa `jwt.sign(payload, secretOrPrivateKey, { algorithm: 'HS256' })` pero no hay validación contra algoritmos seguros.
Impacto: Un atacante podría modificar el token sin firma y que el servidor lo acepte, logrando acceso no autorizado.
Recomendación: Explicitamente especificar `algorithm: 'HS256'` y agregar validación que rechace algoritmos inseguros. Considerar migración a algoritmos asimétricos (RS256) para mayor seguridad.

### [HIGH] JWT Secret Management weakness

File: server/auth.js:15
OWASP: A02:2021 Cryptographic Failures
Descripción: La clave secreta se obtiene mediante `getSecret()` sin validación de entorno y podría estar hardcodeada o expuesta en logs. No hay rotación de secrets definida.
Impacto: Compromiso de la clave secreta permite firma de tokens fraudulentos y acceso total a todas las rutas protegidas.
Recomendación: Mover secretos a variables de entorno con `process.env.JWT_SECRET`, implementar rotación de secrets y agregar validación `if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no configurado')`.

### [HIGH] Missing token expiry (exp claim)

File: server/auth.js:31
OWASP: A02:2021 Cryptographic Failures
Descripción: El payload del JWT no incluye el claim `exp` (expiración), lo que genera tokens que nunca caducan.
Impacto: Tokens válidos indefinidamente, riesgo de uso credential stuffing y sesiones hijacking a largo plazo.
Recomendación: Agregar `exp: Math.floor(Date.now() / 1000) + 86400` (1 día) al payload en `jwt.sign()`.

### [MEDIUM] Cookie-based token delivery without HttpOnly

File: server/routes/auth.js:45
OWASP: A03:021 Session Management
Descripción: El token JWT se entrega mediante cookies sin bandera HttpOnly, accesible via JavaScript del lado del cliente.
Impacto: XSS puede robar tokens JWT, comprometiendo todas las sesiones de usuarios.
Recomendación: Agregar `httpOnly: true` a las opciones de cookie en `res.cookie('token', ...)`.
