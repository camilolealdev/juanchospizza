import express from 'express';
import crypto from 'crypto';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { sendPushToPhone } from '../push.js';
import { deliverWebhook } from '../services/webhooks.js';
import { validate } from '../middleware/validate.js';
import { createPaymentSchema } from '../schemas/payments.js';

const router = express.Router();

// Confirma (o rechaza) el pago de un pedido -- SOLO debe llamarse desde un
// webhook ya verificado/consultado de forma autoritativa contra el
// proveedor, nunca desde algo que el cliente reporte directamente.
async function confirmOrderPayment(pool, orderRow, newPaymentStatus) {
  await pool.query('UPDATE orders SET "paymentStatus" = $1 WHERE id = $2', [newPaymentStatus, orderRow.id]);

  if (newPaymentStatus === 'paid' && orderRow.customerPhone) {
    sendPushToPhone(pool, orderRow.customerPhone, {
      title: `Pedido ${orderRow.orderNumber}`,
      body: 'Confirmamos tu pago. ¡Ya estamos preparando tu pedido!',
      url: '/',
    }).catch((err) => console.error('Error sending payment-confirmed push:', err.message));
  }

  // ── Webhook de pago confirmado (no bloqueante) ──────────────
  if (newPaymentStatus === 'paid' || newPaymentStatus === 'failed') {
    notifyPaymentWebhook(orderRow, newPaymentStatus);
  }
}

// Envía webhook cuando se confirma/rechaza un pago
function notifyPaymentWebhook(order, status) {
  const url = process.env.PAYMENT_WEBHOOK_URL || process.env.WEBHOOK_URL;
  if (!url) return;

  deliverWebhook({
    url,
    payload: {
      event: 'payment.' + status,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
        paymentStatus: status,
        total: order.total,
      },
      timestamp: new Date().toISOString(),
    },
    retries: 2,
    timeout: 5000,
  }).catch((err) => console.warn('[Webhook] Error en webhook de pago:', err.message));
}

// Patrón documentado por MercadoPago ("Verificar el origen de la
// notificación"): el header x-signature trae "ts=...,v1=..."; el manifest
// firmado es "id:{dataId};request-id:{xRequestId};ts:{ts};" con HMAC-SHA256.
function verifyMercadoPagoSignature(xSignature, xRequestId, dataId, secret) {
  try {
    const parts = Object.fromEntries(
      xSignature.split(',').map((p) =>
        p
          .trim()
          .split('=')
          .map((s) => s.trim())
      )
    );
    if (!parts.ts || !parts.v1) return false;
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${parts.ts};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}

// Patrón documentado por Wompi (eventos con checksum): se concatenan los
// valores de "signature.properties" resueltos contra event.data, se agrega
// el timestamp del evento y el secreto de eventos, y se hashea con SHA256.
function verifyWompiChecksum(event, secret) {
  try {
    const { properties, checksum } = event.signature || {};
    if (!properties || !checksum) return false;
    const concatenated = properties
      .map((propPath) => propPath.split('.').reduce((obj, key) => obj?.[key], event.data))
      .join('');
    const toHash = `${concatenated}${event.timestamp}${secret}`;
    const expected = crypto.createHash('sha256').update(toHash).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(checksum));
  } catch {
    return false;
  }
}

// Estado de proveedores de pago para el panel admin -- solo booleanos de si
// la env var está presente, nunca el valor real del secreto.
router.get('/api/payments/status', authMiddleware, requireRole('ADMIN'), (req, res) => {
  res.json({
    bold: { configured: !!process.env.BOLD_API_KEY, webhookSecret: !!process.env.BOLD_WEBHOOK_SECRET },
    mercadopago: { configured: !!process.env.MP_ACCESS_TOKEN, webhookSecret: !!process.env.MP_WEBHOOK_SECRET },
    wompi: { configured: !!process.env.WOMPI_MERCHANT_ID, webhookSecret: !!process.env.WOMPI_EVENTS_SECRET },
    paypal: { configured: !!process.env.PAYPAL_CLIENT_ID, webhookSecret: null },
  });
});

// ── PAYMENTS — Bold (Colombia) ────────────────────────────────
//
// Referencia API: https://docs.bold.co/online/payment-link/create-link
//
// Crea un link de pago Bold que redirige al checkout de Bold para que el
// cliente pague con CREDIT_CARD, PSE, NEQUI o BOTON_BANCOLOMBIA.
//
// ⚠️ expiration_date: Bold espera timestamp UNIX en MILISEGUNDOS (no
// segundos, no nanosegundos). El bug original multiplicaba por 1_000_000
// produciendo nanosegundos (~año 49710). Fixed 2026-07-29.
//
// Idempotencia: Bold usa la referencia única (orderNumber) para detectar
// duplicados. Si se envía el mismo orderNumber, Bold responde HTTP 409
// (conflict) en vez de crear un link duplicado.
router.post('/api/payments/bold/create-link', validate(createPaymentSchema), async (req, res) => {
  try {
    if (!process.env.BOLD_API_KEY) {
      return res.status(503).json({ error: 'Bold no configurado' });
    }

    const { orderId } = req.body;

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
      return res.status(400).json({ error: `No se puede pagar un pedido ${order.status.toLowerCase()}` });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Este pedido ya está pagado' });
    }

    // Si ya existe paymentProviderRef, el link ya fue creado previamente.
    // Devolver el mismo link en vez de crear uno nuevo (evita links
    // huérfanos que Bold no puede cancelar desde nuestra API).
    if (order.paymentProviderRef) {
      const existingLink = await fetch(`https://integrations.api.bold.co/online/link/v1/${order.paymentProviderRef}`, {
        headers: { Authorization: `x-api-key ${process.env.BOLD_API_KEY}` },
      });
      const existingData = await existingLink.json();
      const existingStatus = existingData?.payload?.status;

      // Si el link existente sigue activo, reusarlo.
      if (existingStatus === 'ACTIVE' || existingStatus === 'PROCESSING') {
        console.log(`[Bold] Reusando link existente ${order.paymentProviderRef} para orden ${order.orderNumber}`);
        return res.json({
          url: existingData.payload.url,
          paymentLink: order.paymentProviderRef,
          reused: true,
        });
      }
      // Si expiró o fue pagado/rechazado, crear uno nuevo (el UPDATE
      // de paymentProviderRef reemplazará el anterior).
      console.log(`[Bold] Link anterior ${order.paymentProviderRef} tiene estado ${existingStatus}, creando nuevo`);
    }

    // Expiración: 24 horas desde ahora en MILISEGUNDOS (formato Bold)
    // Bold espera timestamp UNIX en ms, no segundos ni nanosegundos.
    const expirationDate = Date.now() + 24 * 60 * 60 * 1000;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Resolver email del cliente si tiene clientId asociado
    let payerEmail = undefined;
    if (order.clientId) {
      try {
        const clientResult = await pool.query('SELECT email FROM clients WHERE id = $1', [order.clientId]);
        if (clientResult.rows[0]?.email) {
          payerEmail = clientResult.rows[0].email;
        }
      } catch {
        // No crítico — el link funciona sin email
      }
    }

    // Construir payload para Bold
    const boldPayload = {
      amount_type: 'CLOSE',
      amount: {
        currency: 'COP',
        total_amount: Math.floor(order.total),
      },
      reference: order.orderNumber,
      description: `Pedido Juancho's Pizza #${order.orderNumber}`.slice(0, 100),
      payment_methods: ['CREDIT_CARD', 'PSE', 'NEQUI', 'BOTON_BANCOLOMBIA'],
      expiration_date: expirationDate,
      callback_url: `${frontendUrl}/confirmacion?orderNumber=${order.orderNumber}`,
    };

    // payer_email opcional: Bold lo usa para pre-rellenar el checkout
    // y mejorar la tasa de conversión.
    if (payerEmail) {
      boldPayload.payer_email = payerEmail;
    }

    // ── Llamada a Bold con reintento (1 retry, timeout 10s) ──
    let boldResponse = null;
    let data = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        boldResponse = await fetch('https://integrations.api.bold.co/online/link/v1', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `x-api-key ${process.env.BOLD_API_KEY}`,
          },
          body: JSON.stringify(boldPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        data = await boldResponse.json();
        break; // Éxito, salir del loop
      } catch (fetchErr) {
        if (attempt === 2) throw fetchErr;
        console.warn(`[Bold] Intento ${attempt} falló: ${fetchErr.message}. Reintentando...`);
        await new Promise((r) => setTimeout(r, 1000 * attempt)); // backoff: 1s, 2s
      }
    }

    if (!boldResponse.ok || (data.errors && data.errors.length > 0)) {
      const boldErrorCode = data.errors?.[0]?.code || 'unknown';
      const boldErrorMessage = data.errors?.[0]?.message || 'Error creando el link de pago Bold';
      console.error(`[Bold] Error creando link (${boldErrorCode}): ${boldErrorMessage}`, {
        orderNumber: order.orderNumber,
        total: order.total,
      });
      return res.status(502).json({
        error: boldErrorMessage,
        code: boldErrorCode,
      });
    }

    await pool.query('UPDATE orders SET "paymentProviderRef" = $1 WHERE id = $2', [
      data.payload.payment_link,
      order.id,
    ]);

    console.log(`[Bold] Link creado para orden ${order.orderNumber}: ${data.payload.payment_link}`);

    res.status(201).json({
      url: data.payload.url,
      paymentLink: data.payload.payment_link,
      reused: false,
    });
  } catch (e) {
    console.error('[Bold] Error creando link de pago:', {
      message: e instanceof Error ? e.message : String(e),
      cause: e instanceof Error ? e.cause : undefined,
      orderId: req.body?.orderId,
      name: e instanceof Error ? e.name : 'BoldError',
    });
    res.status(500).json({ error: 'Error de conexión con Bold' });
  }
});

// PAYMENTS — MercadoPago
// ⚠️ NOTA 2026-07-29: Este endpoint está DESHABILITADO en el frontend
// (paymentService.ts no lo ofrece en getPaymentMethods()) porque:
//   1. payment_method_id='pix' es un método BRASILEÑO que no funciona en
//      cuentas MercadoPago Colombianas.
//   2. Para activarlo, consultar GET /v1/payment_methods con el access token
//      del comercio para obtener los métodos válidos en Colombia (PSE, NEQUI,
//      CARD, etc.) y reemplazar el hardcode.
//   3. Usar el SDK de MercadoPago (mercadopago.js) en vez de fetch directo
//      para manejo correcto de idempotencia y errores.
router.post('/api/payments/mercadopago/create-payment', validate(createPaymentSchema), async (req, res) => {
  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(503).json({ error: 'MercadoPago no configurado' });
    }

    // customerEmail solo se usa dentro del bloque comentado de abajo
    // (implementación real pendiente de reactivar para Colombia).
    const { orderId, customerEmail: _customerEmail } = req.body;

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Este pedido ya está pagado' });
    }

    // NOTA: Para Colombia usar métodos como 'pse', 'nequi', o 'master'/'visa'
    // El método actual 'pix' es de Brasil y no funciona.
    // Descomentar y reemplazar cuando se implemente correctamente:
    /*
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': order.id,
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        transaction_amount: order.total,
        description: `Pedido Juancho's Pizza #${order.orderNumber}`.slice(0, 100),
        payment_method_id: 'pse',
        payer: { email: String(customerEmail || '').slice(0, 100) },
        external_reference: order.id,
      }),
    });
    */

    return res
      .status(503)
      .json({ error: 'MercadoPago requiere configuración adicional para Colombia. Usar Bold o Wompi.' });
  } catch (_e) {
    res.status(500).json({ error: 'Error de conexión con MercadoPago' });
  }
});

// PAYMENTS — Wompi
router.post('/api/payments/wompi/create-transaction', validate(createPaymentSchema), async (req, res) => {
  try {
    if (!process.env.WOMPI_MERCHANT_ID) {
      return res.status(503).json({ error: 'Wompi no configurado' });
    }

    const { orderId, customerEmail } = req.body;

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Este pedido ya está pagado' });
    }

    // S0 — Usa la URL del frontend desde env var en vez de req.get('origin').
    // Mantener esto acá evita Host Header Injection donde un atacante forja
    // Origin y logra que el cliente sea redirigido a una web de phishing tras
    // pagar. Cierra el hallazgo S2 del AUDIT_COMPLETO 2026-07-15.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    // Producción vs Sandbox
    const wompiBase =
      process.env.NODE_ENV === 'production' ? 'https://production.wompi.co' : 'https://sandbox.wompi.co';

    const wompiResponse = await fetch(`${wompiBase}/v1/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_in_cents: Math.round(order.total * 100),
        currency: 'COP',
        customer_email: String(customerEmail || '').slice(0, 100),
        payment_method: { type: 'CARD', installments: 1 },
        reference: order.orderNumber,
        redirect_url: `${frontendUrl}/confirmacion?orderNumber=${order.orderNumber}`,
      }),
    });

    const data = await wompiResponse.json();

    if (data.id) {
      await pool
        .query('UPDATE orders SET "paymentProviderRef" = $1 WHERE id = $2', [String(data.id), order.id])
        .catch(() => {});
    }

    // NOTA: "approved" acá es solo informativo para la UI -- el estado de
    // pago real de la orden SOLO lo confirma el webhook de Wompi (ver
    // POST /api/payments/wompi/webhook), nunca esta respuesta síncrona.
    if (data.status === 'APPROVED') {
      return res.status(201).json({ transactionId: data.id, approved: true });
    }

    if (data.status === 'PENDING' && data.redirect_url) {
      return res.status(201).json({ paymentUrl: data.redirect_url, approved: false });
    }

    res.status(201).json({ paymentUrl: data.redirect_url || null, approved: false });
  } catch (_e) {
    res.status(500).json({ error: 'Error de conexión con Wompi' });
  }
});

// PAYMENTS — PayPal
router.post('/api/payments/paypal/create-order', validate(createPaymentSchema), async (req, res) => {
  try {
    if (!process.env.PAYPAL_CLIENT_ID) {
      return res.status(503).json({ error: 'PayPal no configurado' });
    }

    const { orderId } = req.body;

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Este pedido ya está pagado' });
    }

    // S0 — PayPal también: nunca confiar en req.get('origin'). Usar FRONTEND_URL
    // del env (mismo fix que arriba). Cierra S2 del audit.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.status(201).json({
      paymentUrl: `https://www.paypal.com/checkoutnow?token=${order.id}&return=${encodeURIComponent(`${frontendUrl}/payment/success`)}&cancel=${encodeURIComponent(`${frontendUrl}/payment/cancel`)}`,
    });
  } catch (_e) {
    res.status(500).json({ error: 'Error de conexión con PayPal' });
  }
});

// PAYMENTS — Webhooks (confirmación server-side, reemplaza el flujo
// optimista anterior donde el cliente decidía si "el pago fue exitoso").
// Todas responden 200 incluso ante datos que no reconocen o errores propios,
// para evitar que el proveedor reintente indefinidamente una notificación
// que de todas formas no vamos a poder procesar.

router.post('/api/payments/mercadopago/webhook', async (req, res) => {
  try {
    const paymentId = req.body?.data?.id || req.query['data.id'] || req.query.id;
    const topic = req.body?.type || req.query.topic || req.query.type;

    if (!paymentId || (topic && topic !== 'payment')) {
      return res.sendStatus(200);
    }

    if (!process.env.MP_WEBHOOK_SECRET) {
      console.error('MercadoPago webhook: MP_WEBHOOK_SECRET no configurado -- rechazado (fail-closed)');
      return res.sendStatus(503);
    }
    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    if (
      !xSignature ||
      !xRequestId ||
      !verifyMercadoPagoSignature(xSignature, xRequestId, paymentId, process.env.MP_WEBHOOK_SECRET)
    ) {
      console.error('MercadoPago webhook: firma inválida, ignorado');
      return res.sendStatus(200);
    }

    // Nunca confiar en el status del body del webhook: se consulta la API
    // de MercadoPago de forma autoritativa con el access token del server.
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN || ''}` },
    });
    const payment = await mpRes.json();

    const orderId = payment.external_reference;
    if (!orderId) return res.sendStatus(200);

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const order = orderResult.rows[0];
    if (!order) return res.sendStatus(200);

    if (payment.status === 'approved') {
      await confirmOrderPayment(pool, order, 'paid');
    } else if (['rejected', 'cancelled'].includes(payment.status)) {
      await confirmOrderPayment(pool, order, 'failed');
    }

    res.sendStatus(200);
  } catch (e) {
    console.error('Error procesando webhook de MercadoPago:', e.message);
    res.sendStatus(200);
  }
});

router.post('/api/payments/wompi/webhook', async (req, res) => {
  try {
    const event = req.body;
    const transaction = event?.data?.transaction;
    if (!transaction) return res.sendStatus(200);

    if (!process.env.WOMPI_EVENTS_SECRET) {
      console.error('Wompi webhook: WOMPI_EVENTS_SECRET no configurado -- rechazado (fail-closed)');
      return res.sendStatus(503);
    }
    if (!verifyWompiChecksum(event, process.env.WOMPI_EVENTS_SECRET)) {
      console.error('Wompi webhook: checksum inválido, ignorado');
      return res.sendStatus(200);
    }

    const orderResult = await pool.query('SELECT * FROM orders WHERE "orderNumber" = $1', [transaction.reference]);
    const order = orderResult.rows[0];
    if (!order) return res.sendStatus(200);

    if (transaction.status === 'APPROVED') {
      await confirmOrderPayment(pool, order, 'paid');
    } else if (['DECLINED', 'ERROR', 'VOIDED'].includes(transaction.status)) {
      await confirmOrderPayment(pool, order, 'failed');
    }

    res.sendStatus(200);
  } catch (e) {
    console.error('Error procesando webhook de Wompi:', e.message);
    res.sendStatus(200);
  }
});

// ── Bold: Consultar estado de un link de pago ──────────────────
// Útil para polling cuando el webhook no ha llegado aún (timeout de red,
// reintentos pendientes de Bold, etc.). El cliente está en la página de
// confirmación y puede mostrar "Verificando pago..." mientras tanto.
//
// Endpoint Bold: GET https://integrations.api.bold.co/online/link/v1/{paymentLink}
// Headers: Authorization: x-api-key <key>
// Response: { payload: { status: "ACTIVE"|"PROCESSING"|"PAID"|"REJECTED"|"CANCELLED"|"EXPIRED", ... }, errors: [] }
router.get('/api/payments/bold/status/:paymentLink', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    if (!process.env.BOLD_API_KEY) {
      return res.status(503).json({ error: 'Bold no configurado' });
    }

    const { paymentLink } = req.params;
    if (!paymentLink || !paymentLink.startsWith('LNK_')) {
      return res.status(400).json({ error: 'paymentLink inválido' });
    }

    const boldResponse = await fetch(`https://integrations.api.bold.co/online/link/v1/${paymentLink}`, {
      method: 'GET',
      headers: {
        Authorization: `x-api-key ${process.env.BOLD_API_KEY}`,
      },
    });

    const data = await boldResponse.json();

    if (!boldResponse.ok) {
      return res.status(502).json({ error: data.errors?.[0]?.message || 'Error consultando link Bold' });
    }

    // Mapear estado Bold a nuestro paymentStatus
    const boldStatus = data.payload?.status;
    let paymentStatus = 'pending';
    if (boldStatus === 'PAID') paymentStatus = 'paid';
    else if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(boldStatus)) paymentStatus = 'failed';

    res.json({
      boldStatus,
      paymentStatus,
      paymentLink: data.payload?.payment_link,
      amount: data.payload?.amount,
    });
  } catch (e) {
    console.error('[Bold] Error consultando estado:', e.message);
    res.status(500).json({ error: 'Error de conexión con Bold' });
  }
});

// NOTA IMPORTANTE 2026-07-29: Verificación de firma Bold actualizada.
// Bold envía webhooks en formato CloudEvents v1.0 con firma HMAC-SHA256.
// El header `x-bold-signature` contiene el HMAC del body (como string plano)
// usando el secreto configurado en el panel de Bold (Integrations > Webhooks).
// También se acepta el header `x-webhook-secret` como fallback para integraciones
// más simples (comparación directa del secreto).
//
// express.raw() en server/index.js transforma req.body a Buffer para ESTA ruta.
// Por eso el handler parsea manualmente: rawBodyBuffer para HMAC, body para datos.
//
// Referencia: https://docs.bold.co/online/payment-link/webhooks
//
// ⚠️ Bold espera respuesta HTTP 200 en ≤2 segundos. Si el handler hace
// consultas DB síncronas antes de responder, Bold reintenta el webhook
// por hasta 24h. La solución: responder 200 inmediatamente y procesar
// la lógica de base de datos en setImmediate (no bloqueante).
router.post('/api/payments/bold/webhook', async (req, res) => {
  try {
    if (!process.env.BOLD_WEBHOOK_SECRET) {
      console.error('Bold webhook: BOLD_WEBHOOK_SECRET no configurado -- rechazado (fail-closed)');
      return res.sendStatus(503);
    }

    // express.raw() en index.js deja req.body como Buffer.
    // Lo parseamos para obtener el objeto JSON para acceso a datos.
    const rawBodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;

    // Verificación HMAC-SHA256 contra el body RAW (no parseado)
    const signatureHeader = String(req.headers['x-bold-signature'] || '');
    let signatureValid = false;

    if (signatureHeader) {
      // HMAC sobre el buffer crudo, no sobre JSON.stringify del objeto parseado
      const expectedSig = crypto
        .createHmac('sha256', process.env.BOLD_WEBHOOK_SECRET)
        .update(rawBodyBuffer)
        .digest('hex');
      const providedBuf = Buffer.from(signatureHeader, 'hex');
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      signatureValid = providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
    }

    // Fallback: x-webhook-secret como comparación directa (Bold Simple)
    if (!signatureHeader) {
      const providedSecret = String(req.headers['x-webhook-secret'] || '');
      const expectedSecret = process.env.BOLD_WEBHOOK_SECRET;
      const providedBuf = Buffer.from(providedSecret);
      const expectedBuf = Buffer.from(expectedSecret);
      signatureValid = providedBuf.length === expectedBuf.length && crypto.timingSafeEqual(providedBuf, expectedBuf);
    }

    if (!signatureValid) {
      console.error('Bold webhook: firma inválida, ignorado');
      return res.sendStatus(200);
    }

    // ⚠️ Responder 200 INMEDIATAMENTE antes de tocar DB
    // Bold timeouta en 2s. La lógica pesada va en setImmediate abajo.
    res.sendStatus(200);

    // ── Procesamiento asíncrono (no bloquea el 200) ────────────
    setImmediate(async () => {
      try {
        // Bold CloudEvents: type contiene el evento, data.metadata.reference
        // contiene el payment_link (LNK_*) que enviamos como reference al crear.
        const eventType = String(body.type || '').toUpperCase();
        // Bold devuelve en data.metadata.reference el valor que enviamos
        // como "reference" al crear el link (que es nuestro orderNumber).
        // Si no está, probar data.metadata.payment_link u otros formatos.
        const reference =
          body?.data?.metadata?.reference || body?.data?.reference || body?.reference || body?.payload?.reference;

        if (!reference) {
          console.warn('[Bold Webhook] No se encontró referencia en el payload');
          return;
        }

        const orderResult = await pool.query(
          'SELECT * FROM orders WHERE "orderNumber" = $1 OR "paymentProviderRef" = $1',
          [String(reference)]
        );
        const order = orderResult.rows[0];
        if (!order) {
          console.warn(`[Bold Webhook] Orden no encontrada para referencia: ${reference}`);
          return;
        }

        // Bold event types: SALE_APPROVED, SALE_REJECTED, VOID_APPROVED, VOID_REJECTED
        if (eventType === 'SALE_APPROVED' || ['APPROVED', 'PAID', 'SUCCESS'].includes(eventType)) {
          await confirmOrderPayment(pool, order, 'paid');
          console.log(`[Bold Webhook] Pago confirmado para orden ${order.orderNumber}`);
        } else if (
          eventType === 'SALE_REJECTED' ||
          ['REJECTED', 'FAILED', 'VOIDED', 'VOID_REJECTED'].includes(eventType)
        ) {
          await confirmOrderPayment(pool, order, 'failed');
          console.log(`[Bold Webhook] Pago rechazado para orden ${order.orderNumber}`);
        }
      } catch (asyncErr) {
        console.error('[Bold Webhook] Error en procesamiento asíncrono:', asyncErr.message);
      }
    });
  } catch (e) {
    console.error('[Bold Webhook] Error en handler:', e.message);
    // Ya respondimos 200, no hay que responder otra vez
  }
});

export default router;
