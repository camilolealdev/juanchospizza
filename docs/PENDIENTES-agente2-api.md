# Análisis de Seguridad — Agente 2: API (Órdenes, Pagos, Facturación DIAN, Validación y Esquemas)

## Resumen
Se auditaron las rutas de órdenes y pagos, los servicios de facturación electrónica DIAN, la validación de entrada y los esquemas de validación del backend.

2 hallazgos **ALTA** / 1 hallazgo **MEDIA** / 3 hallazgos **BAJA** (2 de ellos informativos).

La capa de API está bien construida en sus flujos principales: los montos de pago nunca se confían al cliente (se recalculan contra el catálogo dentro de una transacción con `ROLLBACK`), la confirmación del webhook de Bold sigue una cadena HMAC-SHA256 con `timingSafeEqual` y fail-closed, y los endpoints de consulta están protegidos por autenticación o por datos verificables. La agenda prioritaria es: corregir la idempotencia fail-open del webhook (un error de base de datos puede perder confirmaciones de pago) y eliminar los valores `[MANUAL]`/placeholder de la cadena de firma DIAN antes de cualquier despliegue a producción.

---

## Hallazgos por severidad

### [ALTA] La idempotencia del webhook falla en modo abierto (`fail-open`): un error de base de datos puede perder confirmaciones de pago
- Archivo: `server/routes/payments.js:36-47, 402`
- OWASP: A07 — Fallos de identificación y autenticación (integridad de datos / disponibilidad)
- Descripción:

```js
// server/routes/payments.js
async function ensureWebhookIdempotent(client, payload) {
  try {
    const result = await client.query(
      `INSERT INTO webhook_events (event_id, ...) VALUES ($1, ...)
       ON CONFLICT (event_id) DO NOTHING`
    );
    return result.rows.length > 0;
  } catch (err) {
    console.warn('[Idempotency] Error en check para ...', err.message);
    return true; // <-- fail-open: se devuelve "procesado" aunque el INSERT falló
  }
}
```

El bloque `catch` devuelve `true` (interpretado como "este evento ya fue procesado") ante cualquier error de base de datos. Con eso, el webhook se responde con éxito, la entrega del evento termina y la confirmación de pago **nunca** se registra: el pedido no se marca como pagado, la factura no se genera y el flujo queda bloqueado sin reintentos.
- Impacto: Pérdida silenciosa de confirmaciones de pago (disponibilidad e integridad de datos). La idempotencia fail-open convierte un fallo transitorio de DB en pérdida permanente de negocio; el cliente paga y el pedido queda como no procesado.
- Recomendación: Invertir el comportamiento a `fail-closed` (devolver `false` o lanzar para que el webhook se reintente con backoff). Evaluar el uso de `SELECT` previo o un guard con reintentos, y registrar el error de forma estructurada para poder alertar en el monitoreo.

---

### [ALTA] Credenciales y configuraciones de la facturación DIAN en duro con valores `[MANUAL]` y placeholders
- Archivo: `server/services/dianXml.js:70-82`, `server/services/dianSigner.js:369`
- OWASP: A07 — Fallos de identificación y autenticación (gestión de secretos)
- Descripción:

```js
// server/services/dianXml.js
ambiente: '1', // 1 = Pruebas, 2 = Producción
software: {
  softwareId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  softwarePin: '00000000000000000000', // <-- placeholder [MANUAL]
  proveedorTecnologico: 'MUISCA',
},
```

```js
// server/services/dianSigner.js
const CERT_PASSWORD = 'changeme-on-first-deploy'; // <-- [MANUAL]
```

Además, la clave técnica del certificado (`claveTecnica: 'FCB48B9A-4C1A-4B1A-9E7F-3F9E8C7B6A5D'`) es un placeholder hardcodeado. Si el servicio se despliega a producción con `ambiente: '2'` sin reemplazar estos valores, la facturación electrónica operará con credenciales inválidas o predecibles y la firma fallará en el régimen productivo.
- Impacto: Riesgo de operar en producción con secretos de facturación inválidos, predecibles o de otra entidad; rechazo de documentos en la DIAN y exposición de la configuración en el repositorio.
- Recomendación: Mover `softwareId`, `softwarePin`, `claveTecnica` y la contraseña del certificado a variables de entorno (o a un gestor de secretos), fallar en arranque si faltan, y bloquear el arranque con `ambiente: '2'` cuando las credenciales sean placeholders.

---

### [MEDIA] Placeholders en la cadena de firma DIAN: certificado vencido y firma pendiente de implementación
- Archivo: `server/services/dianXml.js:174-176`
- OWASP: A02 — Fallos en la seguridad de la criptografía
- Descripción:

```js
// server/services/dianXml.js
firma: {
  cufe: null, // [MANUAL] se completa tras generar el CUFE en el pipeline
  // [MANUAL] FIRMA DIGITAL XAdES-EPES — placeholder hasta implementar
}
```

La vigencia del `certificadoDigital` configurado llega hasta el 2026-01-01, fecha anterior a la auditoría (2026-08-18): el certificado está vencido. Mientras `ambiente: '1'` (Pruebas) el impacto productivo queda diferido, pero un cambio a producción sin renovar el certificado ni implementar la firma XAdES-EPES romperá la facturación en el régimen oficial.
- Impacto: La facturación electrónica no puede completarse en producción hasta renovar el certificado e implementar la firma; riesgo de rechazo masivo de documentos.
- Recomendación: Agrupar la renovación del certificado y la implementación de la firma XAdES-EPES (con el CUFE ya calculado) como un único paquete de trabajo de cara a producción, y añadir una comprobación de vigencia del certificado que falle en arranque (patrón ya presente en `dianSigner.js:81-96`).

---

### [BAJA] Canonicalización C14N implementada a mano en lugar de usar una biblioteca estándar
- Archivo: `server/services/dianSigner.js:127-135`
- OWASP: A02 — Fallos en la seguridad de la criptografía
- Descripción:

```js
// server/services/dianSigner.js
function canonicalizeSimple(node) {
  // Implementación manual de canonicalización XML C14N
  // ...recorrido propio del árbol XML...
}
```

La canonicalización XML es la fase donde dos implementaciones divergen con más facilidad; una versión manual puede generar un digest distinto al esperado por la DIAN y provocar rechazos de firma difíciles de diagnosticar.
- Impacto: Bajo en producción mientras no se active la firma; alto costo de depuración si la firma rechaza documentos por diferencias de canonicalización.
- Recomendación: Sustituir por una implementación C14N probada (p. ej. `xml-c14n` u otra biblioteca mantenida) al implementar la firma XAdES-EPES, y validar el digest contra casos de referencia de la DIAN.

---

### [BAJA] Firma de webhook inválida se ignora respondiendo 200 (solo log)
- Archivo: `server/routes/payments.js:346-374`
- OWASP: A07 — Fallos de identificación y autenticación (monitoreo)
- Descripción:

```js
// server/routes/payments.js
const valid = verifyWebhookSignature(req, ...);
if (!valid) {
  console.warn('Webhook con firma inválida recibido:', ...);
  return res.sendStatus(200); // se descarta sin afectar el flujo
}
```

Es un descarte deliberado (evita reintentos agresivos contra remitentes inválidos), pero el evento descartado no deja trazabilidad más allá de `console.warn`; ante un ataque de spam de webhooks o errores de configuración, no hay alerta ni métrica.
- Impacto: Bajo; sin monitoreo sobre eventos descartados no se detectan intentos inválidos ni errores de configuración del secreto.
- Recomendación: Mantener el comportamiento (nota de diseño) pero emitir una métrica/evento de observabilidad con `event_id` y origen, para detectar patrones anómalos.

---

### [BAJA] Entrega de webhook con reintentos fijos y registro no estructurado
- Archivo: `server/routes/payments.js:376-436`
- OWASP: A07 — Fallos de identificación y autenticación (monitoreo)
- Descripción:

```js
// server/routes/payments.js
deliverWebhook({ retries: 2 }); // reintentos fijos
// ... console.warn / console.error en los fallos de entrega ...
```

El mecanismo de reintentos es fijo y los fallos se registran con `console.*` no estructurado; no hay cola de persistencia ni alerta configurada si el destino del webhook (la tienda) está caído más allá de los reintentos.
- Impacto: Bajo; eventos de pago confirmados podrían no llegar al destino final sin señal de alerta.
- Recomendación: Informativo. Considerar registro estructurado y un mecanismo de reintento con backoff exponencial o cola, alineado con la alerta del hallazgo de observabilidad del webhook.

---

## Notas de diseño
- **Endpoints públicos sin autenticación** (`server/routes/orders.js:127` POST crear orden y `server/routes/payments.js:101` POST crear link de pago) son flujos de cliente **intencionales** y no constituyen hallazgos: el registro de una orden nueva no requiere identidad, y la trazabilidad del pago se apoya en el idempotency key `orderNumber` y en datos verificables del lado del cliente (teléfono) para el rastreo público.
- **`GET /api/orders/:id` y `GET /api/payments/status`** están protegidos (autenticación o variable de entorno ADMIN en `payments.js:81-85`); el endpoint público de seguimiento exige el teléfono y usa consultas parametrizadas (`orders.js:87-111`).
- **El monto (`total`) enviado por el cliente nunca se confía**: se recalcula contra el catálogo dentro de la transacción y ante discrepancias se hace `ROLLBACK` y se responde 400 (`orders.js:154-176, 442-455`).
- **Descarte 200 de firma de webhook inválida** (hallazgo BAJA) es una decisión de diseño deliberada para evitar reintentos agresivos; se documenta aquí para que el hallazgo BAJA se lea solo como observabilidad.
- **Confirmación de pago en segundo plano**: el webhook responde 200 antes de tocar la base de datos y procesa el CloudEvent en `setImmediate` (`payments.js:376-436`), lo que mantiene baja la latencia del remitente; el push por WebSocket sustituye al polling del frontend (`websocket.js:2`).
