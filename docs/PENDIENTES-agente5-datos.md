# Análisis de Seguridad — Agente 5: Datos y Privacidad

## Resumen

- **Total hallazgos**: 9
- **ALTA**: 0
- **MEDIA**: 4
- **BAJA**: 3
- **INFORMATIVO**: 2

El proyecto cumple parcialmente con la Ley 1581/2012 (Habeas Data Colombia) mediante endpoints de consentimiento y política de privacidad. No se detectaron fugas de PII directas, pero existen gaps en retención, minimización y trazabilidad de datos personales.

---

## Hallazgos por severidad

### MEDIA

**[MEDIA-01] Sin política de retención/eliminación de datos personales**
- **Archivo**: `server/schemas/orders.js`, `server/schemas/invoices.js`, `server/schemas/reviews.js`
- **OWASP ref**: A01:2021 (Broken Access Control) / Ley 1581/2012 Art. 15-16
- **Descripción**: No existe mecanismo de eliminación de datos personales por solicitud del titular. Los pedidos, facturas y reseñas se acumulan indefinidamente en MongoDB. La Ley 1581/2012 Art. 15 garantiza el derecho de supresión cuando no exista obligación legal de conservar.
- **Código relevante**:
  ```javascript
  // schemas/orders.js — campos PII sin TTL ni lógica de eliminación
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  address: { type: String, required: true },
  ```

**[MEDIA-02] Datos de facturación DIAN sin mecanismo de anonimización**
- **Archivo**: `server/schemas/invoices.js`
- **OWASP ref**: A04:2021 (Insecure Design)
- **Descripción**: La tabla `emisorInfo` y `receptorInfo` almacena NIT, razón social, dirección, email y número de identificación sin opción de anonimización o eliminación parcial. Obligaciones fiscales pueden justificar retención, pero no se documenta política de conservación.
- **Código relevante**:
  ```javascript
  emisorInfo: {
    nit: String,
    razonSocial: String,
    telefono: String,
    email: String
  },
  receptorInfo: {
    numeroIdentificacion: String,
    razonSocial: String,
    direccion: String
  }
  ```

**[MEDIA-03] ClientId en loyalty.js no pseudonimizado**
- **Archivo**: `server/schemas/loyalty.js`
- **OWASP ref**: A04:2021 (Insecure Design)
- **Descripción**: El campo `clientId` en el esquema de fidelidad vincula directamente al titular sin pseudonimización. Si la colección es comprometida, se expone el historial completo de compras y puntos acumulados de cada cliente.

**[MEDIA-04] Reseñas almacenan nombre y teléfono sin anonimización**
- **Archivo**: `server/schemas/reviews.js`
- **OWASP ref**: A04:2021 (Insecure Design)
- **Descripción**: `clientPhone` y `clientName` se almacenan junto con opiniones públicas. No existe opción de reseña anónima ni pseudonimización, exponiendo identidad de clientes que dejan opiniones.

---

### BAJA

**[BAJA-01] Consentimiento de contactos no registra timestamp**
- **Archivo**: `server/routes/consent.js`
- **OWASP ref**: A04:2021 (Insecure Design)
- **Descripción**: El endpoint `POST /api/consent/contact` acepta o rechaza consentimiento pero no almacena marca temporal de cuándo se otorgó o revocó, dificultando auditorías de cumplimiento.

**[BAJA-02] Cookies sin SameSite explícito**
- **Archivo**: `server/index.js`
- **OWASP ref**: A05:2021 (Security Misconfiguration)
- **Descripción**: `cookie-parser` se configura sin opciones explícitas de `sameSite`. Dependiendo del navegador, esto puede resultar en envío cruzado de cookies.
- **Código relevante**:
  ```javascript
  app.use(cookieParser());
  ```

**[BAJA-03] No se valida existencia de variable FRONTEND_URL en desarrollo**
- **Archivo**: `server/config.js`
- **OWASP ref**: A05:2021 (Security Misconfiguration)
- **Descripción**: La validación de `FRONTEND_URL` solo aplica en producción. En desarrollo, la ausencia de esta variable no genera advertencia, lo que puede causar problemas de CORS silenciosos.

---

### INFORMATIVO

**[INFORMATIVO-01] Consentimiento de contactos vs. marketing**
- **Archivo**: `server/routes/consent.js`
- **Descripción**: El sistema distingue entre `contact` y `marketing` para consentimiento, lo cual es correcto bajo Ley 1581/2012. No se detectaron issues, solo documentación del comportamiento actual.

**[INFORMATIVO-02] No hay endpoint de portabilidad de datos**
- **Archivo**: N/A
- **Descripción**: La Ley 1581/2012 Art. 14 garantiza el derecho de portabilidad. Actualmente no existe endpoint para exportar datos personales de un titular en formato estructurado. No es crítico pero应 implementarse para cumplimiento completo.
