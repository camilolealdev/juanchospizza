# Pendientes de Proveedores Externos

> **Actualizado:** 2026-07-15  
> **Propósito:** Pasos exactos para completar la integración con cada proveedor externo cuando tengas las credenciales.  
> **Estado:** ⏸ Pausado hasta recibir credenciales.

---

## Índice

1. [Bold — Pasarela de Pagos](#1-bold--pasarela-de-pagos)
2. [DIAN — Facturación Electrónica](#2-dian--facturación-electrónica)
3. [Resumen de Variables de Entorno](#3-resumen-de-variables-de-entorno)

---

## 1. Bold — Pasarela de Pagos

### ✅ Lo que ya funciona sin credenciales

| Componente | Archivo | Estado |
|------------|---------|--------|
| Crear link de pago | `server/routes/payments.js` | Código listo, llama a `integrations.api.bold.co/online/link/v1` |
| Webhook de confirmación | `server/routes/payments.js` | Listo, verifica `x-bold-signature` o `x-webhook-secret` |
| Botón de checkout | `src/components/payments/BoldCheckoutButton.tsx` | Listo, abre link en nueva pestaña y redirige a `/confirmacion` |
| Servicio frontend | `src/services/payments/paymentService.ts` | Método `processBold()` listo |
| Panel de estado | `src/views/roles/PaymentSettingsView.tsx` | Muestra si `BOLD_API_KEY` está configurada |
| CSP | `server/index.js` | `https://checkout.bold.co` autorizado en `frame-src` y `connect-src` |

### ❌ Pasos pendientes (cuando tengas credenciales)

#### Paso 1: Obtener credenciales Bold

Registrate en [Bold Dashboard](https://app.bold.co) y obtené:

| Variable | Dónde obtenerla |
|----------|----------------|
| `BOLD_API_KEY` | Bold Dashboard → Configuración → API Keys |
| `BOLD_WEBHOOK_SECRET` | Bold Dashboard → Webhooks → Crear webhook → Copiar secreto |

> ⚠️ **Importante:** El webhook debe apuntar a:  
> `https://[TU-DOMINIO]/api/payments/bold/webhook`

#### Paso 2: Configurar variables de entorno

Agregar al archivo `.env` del backend:

```bash
# Bold — Pasarela de pagos
BOLD_API_KEY=tu_api_key_aqui
BOLD_WEBHOOK_SECRET=tu_webhook_secret_aqui
```

#### Paso 3: Verificar firma del webhook Bold

**⚠️ ADVERTENCIA:** La verificación actual del webhook de Bold tiene **menos confianza** que la de MercadoPago o Wompi. El motivo se documenta en el código de `server/routes/payments.js`:

```javascript
// NOTA IMPORTANTE: la verificación de firma de Bold se implementó con menos
// confianza que MercadoPago/Wompi -- no se tuvo acceso a documentación en
// vivo ni a credenciales de sandbox reales para confirmar el nombre exacto
// del header o el algoritmo que usa Bold.
```

**Antes de aceptar pagos reales, hay que:**

1. Revisar la documentación actual de Bold sobre webhooks:
   - Ir a: [https://docs.bold.co](https://docs.bold.co) → sección Webhooks
   - Confirmar el nombre exacto del header de firma (actual: `x-bold-signature` o `x-webhook-secret`)
   - Confirmar el algoritmo de verificación (actual: comparación directa del header con el secreto)
2. Probar con una notificación real del sandbox de Bold
3. Actualizar la función de verificación en `server/routes/payments.js` (buscar `bold/webhook`)

#### Paso 4: Probar flujo completo

1. Configurar ambiente de pruebas en Bold (`test` o `sandbox`)
2. Crear un pedido de prueba desde la UI
3. Hacer clic en "Pagar con Bold"
4. Verificar que:
   - Se abre el checkout de Bold en nueva pestaña
   - Se redirige a `/confirmacion` con el número de pedido
   - El webhook llega al backend y cambia `paymentStatus` a `paid`
   - Llega notificación push al cliente

---

## 2. DIAN — Facturación Electrónica

### ✅ Lo que ya funciona sin credenciales

| Componente | Archivo | Estado |
|------------|---------|--------|
| Generación XML (UBL 2.1 / DIAN 4.1) | `server/services/dianXml.js` | ✅ Completo con todos los campos |
| Plantilla de firma digital XAdES-EPES | `server/services/dianSigner.js` | ✅ Estructura completa, pendiente de certificado real |
| CRUD de facturas | `server/routes/invoices.js` | ✅ Crear, listar, actualizar, enviar, reenviar |
| Envío a DIAN (simulado) | `server/routes/invoices.js` | `POST /api/invoices/:id/send` — prepara payload |
| WebSocket | `server/routes/invoices.js` | Evento `invoice:update` en cambios |
| Frontend de facturación | `src/views/roles/InvoicesView.tsx` | ✅ Visor XML, enviar, reenviar, firma manual |
| Esquemas Zod | `server/schemas/invoices.js` | ✅ Validación completa |
| Base de datos | `server/db.js` | ✅ Tablas `invoices` y `credit_notes` con todos los campos DIAN |
| Documentación | `docs/DIAN_MODULE_STATUS.md` | ✅ Estado completo de integración |

### ❌ Pasos pendientes (cuando tengas credenciales)

#### ⚡ Pre-requisito: Elegir proveedor tecnológico (PSE)

Antes de empezar, elegí con qué proveedor vas a integrarte:

| Proveedor | Sitio Web | Tipo API | Ideal para |
|-----------|-----------|----------|------------|
| **Muisca** (DIAN oficial) | [cdian.dian.gov.co](https://cdian.dian.gov.co) | SOAP/XML | Negocios grandes, facturación propia |
| **Dataico** | [dataico.com](https://dataico.com) | REST | Pymes, fácil integración |
| **Novasoft** | [novasoft.com.co](https://novasoft.com.co) | REST | Pymes, facturación + nómina |
| **Siesa** | [siesa.com](https://siesa.com) | API propia | Si ya usás Siesa como ERP |
| **Alégrate** | [alegrate.co](https://alegrate.co) | REST | Startups, API moderna |

> Recomendación para Juancho's Pizza: **Dataico** o **Alégrate** por tener APIs REST modernas y estar diseñados para pymes colombianas.

#### Paso 1: Registrar el software en la DIAN

1. Ir a [dian.gov.co → Servicios → Facturación electrónica → Registro de software](https://www.dian.gov.co/)
2. Registrar el software con los datos de la pizzeria
3. La DIAN asignará:
   - **Software ID** (UUID)
   - **Software PIN** (alfanumérico)
4. Este PIN se usa para generar el CUFE en cada factura

#### Paso 2: Obtener certificado digital

Adquirir un certificado digital para firma de facturas electrónicas:

| Entidad | Producto | Precio aprox. | Vigencia |
|---------|----------|---------------|----------|
| **Andrés Díaz - SF** | Firma Electrónica | $150.000/año | 1 año |
| **Certicámara** | Firma Electrónica Facturación | $200.000/año | 1 año |
| **GSE** | Firma Electrónica | $180.000/año | 1 año |

Requisitos del certificado:
- Formato: `.pfx` o `.p12`
- Algoritmo: RSA 2048 bits
- Uso: Firma digital (no autenticación)
- Emitido por una entidad de certificación autorizada por la DIAN

#### Paso 3: Completar datos del emisor

Editar `server/services/dianXml.js`, objeto `DIAN_CONFIG.emisor`:

```javascript
emisor: {
  nit: '900000000',              // ← Completar con el NIT real
  digitoVerificacion: '0',       // ← Dígito de verificación del NIT
  razonSocial: 'JUANCHO PIZZA SAS', // ← Razón social exacta del RUT
  nombreComercial: "Juancho's Pizza", // ← Nombre comercial
  direccion: 'Cra 7 #12-34',    // ← Dirección del establecimiento principal
  ciudad: 'Nemocón',             // ← Ciudad
  codigoCiudad: '25489',         // ← Código Dane de la ciudad
  departamento: 'Cundinamarca',  // ← Departamento
  codigoDepartamento: '25',      // ← Código Dane del departamento
  telefono: '3117074843',        // ← Teléfono de contacto
  email: 'contacto@juanchospizza.com', // ← Email para notificaciones
  regimenFiscal: 'R-99-PJ',      // ← R-99-PN (Persona Natural) o R-99-PJ (Jurídica)
  responsabilidadFiscal: 'O-15', // ← O-15 (IVA) / O-13 (Gran contribuyente)
  codigoEstablecimiento: '00001', // ← Código de la sede
}
```

#### Paso 4: Configurar resolución DIAN

En el mismo archivo, `DIAN_CONFIG.facturacion.rangoNumeracion`:

```javascript
rangoNumeracion: {
  prefijo: 'FE',                    // ← Prefijo autorizado en la resolución
  desde: 1,                         // ← Desde número
  hasta: 100000,                    // ← Hasta número
  fechaAutorizacion: '2025-01-01',  // ← Fecha de la resolución
  numeroResolucion: '1876000000001', // ← Número de resolución DIAN
  claveTecnica: 'FCB48B9A-...',     // ← Clave técnica (para CUFE)
}
```

Y configurar el ambiente:

```javascript
ambiente: '2',  // '1' = Pruebas (Habilitación), '2' = Producción
```

#### Paso 5: Configurar software PSE

```javascript
software: {
  softwareId: 'uuid-asignado-por-dian',  // ← Software ID del paso 1
  softwarePin: 'pin-asignado-por-dian',  // ← Software PIN del paso 1
  proveedorTecnologico: 'DATAICO',       // ← 'MUISCA' | 'DATAICO' | 'NOVASOFT'
}
```

#### Paso 6: Colocar certificado digital

1. Copiar el archivo `.pfx` o `.p12` a `server/certificates/facturacion.pfx`
2. Editar `server/services/dianSigner.js`, objeto `CERTIFICADO_CONFIG`:

```javascript
export const CERTIFICADO_CONFIG = {
  archivo: 'certificates/facturacion.pfx',  // ← Ruta al certificado
  password: 'contraseña-del-certificado',    // ← Contraseña real
  alias: 'facturacion-electronica',          // ← Alias del certificado
  tipo: 'firmador',
  vigenciaDesde: '2025-01-01',               // ← Fecha de emisión
  vigenciaHasta: '2026-01-01',               // ← Fecha de vencimiento
  entidad: 'ANDRES DIAZ - SF',               // ← Entidad certificadora
}
```

#### Paso 7: Instalar dependencias criptográficas

Se necesita una biblioteca para firmar XML digitalmente. El proyecto usa ES modules (`"type": "module"` en package.json), así que la biblioteca debe ser compatible con ESM:

```bash
cd pizzeria-master
npm install xadesjs           # Firma XAdES-EPES (ESM-native)
npm install @noble/ciphers    # Criptografía ESM-native (alternativa)
```

**Si usás `node-forge`** (solo CJS), necesitás import dinámico:

```bash
npm install node-forge
```

Y en el código:
```javascript
const forge = await import('node-forge').then(m => m.default || m);
```

**Nota:** Crear el directorio `server/certificates/` para el archivo .pfx.

```bash
mkdir -p pizzeria-master/server/certificates
```

#### Paso 8: Implementar la firma digital

Editar `server/services/dianSigner.js`, función `signXml()`:

```javascript
export function signXml(rawXml, firmaData) {
  // 1. Parsear el XML original (usando node-forge o xml-crypto)
  // 2. Insertar la firma <ds:Signature> dentro de <ext:UBLExtensions>
  // 3. Aplicar canonicalización XML (C14N)
  // 4. Calcular SHA-256 del documento canónico
  // 5. Firmar con RSA usando el certificado
  // 6. Calcular CUFE usando SHA-384 (ver función calcularCUFE abajo)
  // 7. Insertar CUFE en <cbc:UUID>
  // 8. Retornar XML firmado completo
}
```

#### Paso 9: Conectar con el proveedor tecnológico

Crear `server/services/dianProvider.js` con la lógica de envío:

```javascript
// Ejemplo de estructura para Dataico (API REST):
export async function sendToDataico(xmlFirmado, invoice) {
  const response = await fetch('https://api.dataico.com/v1/invoices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/xml',
      'Authorization': `Bearer ${process.env.DATAICO_API_KEY}`,
    },
    body: xmlFirmado,
  });
  return response.json(); // Debe incluir CUFE + estado
}
```

Luego integrarlo en `server/routes/invoices.js`, endpoint `POST /api/invoices/:id/send`:

```javascript
// Reemplazar el bloque que actualiza status = 'sent' por:
const respuestaProveedor = await sendToDataico(xmlFirmado, invoice);
await pool.query(
  `UPDATE invoices SET status = 'accepted', cufe = $1, "dianResponse" = $2 WHERE id = $3`,
  [respuestaProveedor.cufe, JSON.stringify(respuestaProveedor), invoice.id]
);
```

#### Paso 10: Probar en ambiente de habilitación (pruebas)

1. Configurar `ambiente: '1'` en `DIAN_CONFIG.facturacion`
2. Usar el CUFE de pruebas (la DIAN tiene un CUFE especial para pruebas)
3. Crear una factura de prueba desde la UI
4. Hacer clic en "Enviar a DIAN"
5. Verificar que:
   - El XML se genera correctamente
   - La firma digital es válida
   - El proveedor responde con CUFE
   - La factura queda como `accepted`

#### Paso 11: Pasar a producción

1. Cambiar `ambiente: '2'`
2. Verificar que los datos del emisor son los reales
3. Verificar que el certificado está vigente
4. Probar con una factura real de bajo monto
5. Verificar en la página de la DIAN que la factura aparece como válida

---

## 3. Resumen de Variables de Entorno

Todas las variables que necesita el sistema, agrupadas por proveedor:

### Bold
```bash
# Obligatorias para activar Bold
BOLD_API_KEY=sk_live_xxx              # API Key de Bold (dashboard)
BOLD_WEBHOOK_SECRET=whsec_xxx         # Secreto del webhook Bold

# ⚠️ Actualmente la URL de Bold está hardcodeada en server/routes/payments.js
# como 'https://integrations.api.bold.co/online/link/v1' (producción).
# Si Bold tiene un endpoint de pruebas distinto, hay que agregar la lógica
# de ambiente y declarar la variable acá.
```

### DIAN / Facturación Electrónica
```bash
# Configuración del emisor (se edita en dianXml.js, no en .env)
# Ver server/services/dianXml.js → DIAN_CONFIG

# Proveedor tecnológico (según el que elijas)
DATAICO_API_KEY=xxx                   # Si elegís Dataico
DATAICO_API_URL=https://api.dataico.com/v1

# Alternativa: Muisca (SOAP/XML)
# MUISCA_USERNAME=xxx
# MUISCA_PASSWORD=xxx
# MUISCA_WSDL_URL=https://vpfe.dian.gov.co/...
```

### Correo (para enviar facturas por email a clientes)
```bash
# Opcional pero recomendado
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=facturacion@juanchospizza.com
SMTP_PASS=xxx
EMAIL_FROM=facturacion@juanchospizza.com
```

### Webhook general (opcional)
```bash
WEBHOOK_URL=https://tu-webhook.com/eventos   # Recibe eventos del sistema
```

---

## Checklist Rápido

### Bold — ¿Cuándo está listo?
- [ ] `BOLD_API_KEY` configurada en `.env`
- [ ] `BOLD_WEBHOOK_SECRET` configurado en `.env`
- [ ] Webhook de Bold apuntando a `[DOMINIO]/api/payments/bold/webhook`
- [ ] Verificada la firma del webhook contra docs de Bold
- [ ] Probado flujo completo en sandbox
- [ ] Cambiado a producción

### DIAN — ¿Cuándo está lista?
- [ ] Software registrado en la DIAN (Software ID + PIN)
- [ ] Certificado digital adquirido (.pfx/.p12)
- [ ] Datos del emisor completados en `dianXml.js`
- [ ] Resolución DIAN configurada
- [ ] `node-forge` instalado
- [ ] `signXml()` implementada en `dianSigner.js`
- [ ] Proveedor tecnológico elegido e integrado
- [ ] Probado en ambiente de habilitación (pruebas)
- [ ] Pasado a producción
