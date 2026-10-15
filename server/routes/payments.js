import express from 'express';
import crypto from 'crypto';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { sendPushToPhone } from '../push.js';
import { deliverWebhook } from '../services/webhooks.js';
import { validate } from '../middleware/validate.js';
import { createPaymentSchema } from '../schemas/payments.js';
import logger from '../services/logger.js';

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

// ── Idempotencia de webhooks ─────────────────────────────────────
// INSERT atómico con ON CONFLICT DO NOTHING: dos handlers concurrentes
// con el mismo (provider, sourceId) no pueden procesar dos veces.
// Retorna true si es la primera vez (procesar), false si ya fue procesado.
async function ensureWebhookIdempotent(pool, provider, sourceId, orderId) {
  try {
    const result = await pool.query(
      'INSERT INTO processed_webhooks (provider, "sourceId", "orderId") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *',
      [provider, sourceId, orderId || null]
    );
    return result.rows.length > 0;
  } catch (err) {
    // ponytail: verificado el call site (line ~402, `if (!result) skip`) --
    // true acá SÍ procesa el pago, no lo pierde (auditoría ALTA #2 lo
    // etiquetó al revés). Fail-open es la opción correcta: el 200 a Bold ya
    // se mandó antes de esta función, así que fail-closed no dispara ningún
    // retry, solo deja el pago del cliente sin confirmar en nuestra DB.
    // Lo que sí faltaba era loguearlo estructurado para poder alertar.
    logger.error(
      { provider, sourceId, err: err.message },
      '[Idempotency] Error en check de webhook, procesando de todos modos'
    );
    return true;
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

// ── Pago online: SOLO Bold (decisión de negocio 2026-08-06) ───────
// MercadoPago, Wompi y PayPal quedaron fuera del alcance. El frontend solo
// ofrece Bold; el status del panel solo reporta Bold; los webhooks de otras
// pasarelas ya no existen (evita superficie de ataque y config huérfana).
// Si algún día se quiere reactivar una pasarela, el historial git tiene el
// código (create-transaction + webhook con verificación de firma).

// Estado de proveedores de pago para el panel admin -- solo booleanos de si
// la env var está presente, nunca el valor real del secreto.
router.get('/api/payments/status', authMiddleware, requireRole('ADMIN'), (req, res) => {
  res.json({
    bold: { configured: !!process.env.BOLD_API_KEY, webhookSecret: !!process.env.BOLD_WEBHOOK_SECRET },
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

    // Antes este endpoint solo LEÍA el estado, nunca lo persistía -- un pedido
    // huérfano (Bold falló a mitad de pago, o el cliente cerró la pestaña sin
    // completar) se quedaba paymentStatus='pending' para siempre, porque el
    // webhook de Bold no dispara para links nunca completados/expirados, y
    // este chequeo manual del ADMIN no arreglaba nada. Ahora, si el estado en
    // Bold ya es definitivo (paid/failed) y difiere del que tenemos, lo
    // persistimos acá mismo -- este endpoint se vuelve la vía de reconciliación
    // manual que antes no existía.
    if (paymentStatus !== 'pending') {
      try {
        const orderMatch = await pool.query('SELECT * FROM orders WHERE "paymentProviderRef" = $1', [paymentLink]);
        const orderRow = orderMatch.rows[0];
        if (orderRow && orderRow.paymentStatus !== paymentStatus) {
          await confirmOrderPayment(pool, orderRow, paymentStatus);
        }
      } catch (reconcileErr) {
        console.error('[Bold] Error reconciliando estado de pedido:', reconcileErr.message);
      }
    }

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

// Verificación de firma Bold (documentación oficial, 2026-08-18).
// Bold envía webhooks en formato CloudEvents v1.0 con firma HMAC-SHA256.
// `x-bold-signature` es el HMAC hexadecimal del body codificado en Base64,
// usando la Identity Key como secreto. El body debe conservarse RAW antes de
// parsearlo. `x-webhook-secret` se mantiene como fallback para Bold Simple.
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
      // Bold firma el Base64 del body RAW, no el JSON parseado ni el Buffer
      // directamente. Ver: https://developers.bold.co/products/webhook
      const encodedBody = Buffer.from(rawBodyBuffer.toString('utf8'), 'utf8').toString('base64');
      const expectedSig = crypto
        .createHmac('sha256', process.env.BOLD_WEBHOOK_SECRET)
        .update(encodedBody)
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

        // ── Idempotencia: usar event.id (CloudEvents ID único) ────
        // Cada webhook de Bold tiene un id único en el formato CloudEvents.
        // Si el evento no trae id, usar reference como fallback.
        const eventId = String(body.id || body.event_id || reference);
        const sourceId = `bold_${eventId}`;
        if (!(await ensureWebhookIdempotent(pool, 'bold', sourceId, reference))) {
          console.log(`[Bold Webhook] ${sourceId} ya procesado, saltando`);
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
