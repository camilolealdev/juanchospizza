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

// PAYMENTS — Bold (Colombia)
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

    const boldResponse = await fetch('https://integrations.api.bold.co/online/link/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `x-api-key ${process.env.BOLD_API_KEY}`,
      },
      body: JSON.stringify({
        amount_type: 'CLOSE',
        amount: { currency: 'COP', total_amount: order.total },
        reference: order.orderNumber,
        description: `Pedido Juancho's Pizza #${order.orderNumber}`.slice(0, 100),
        payment_methods: ['CREDIT_CARD', 'PSE', 'NEQUI', 'BOTON_BANCOLOMBIA'],
      }),
    });

    const data = await boldResponse.json();

    if (!boldResponse.ok || (data.errors && data.errors.length > 0)) {
      return res.status(502).json({ error: data.errors?.[0]?.message || 'Error creando el link de pago Bold' });
    }

    await pool.query('UPDATE orders SET "paymentProviderRef" = $1 WHERE id = $2', [
      data.payload.payment_link,
      order.id,
    ]);

    res.status(201).json({ url: data.payload.url, paymentLink: data.payload.payment_link });
  } catch (_e) {
    res.status(500).json({ error: 'Error de conexión con Bold' });
  }
});

// PAYMENTS — MercadoPago
router.post('/api/payments/mercadopago/create-payment', validate(createPaymentSchema), async (req, res) => {
  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(503).json({ error: 'MercadoPago no configurado' });
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

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      // payment_method_id hardcodeado a 'pix' -- Brasil, inválido pa una
      // cuenta MercadoPago colombiana. El método real depende de qué tenga
      // habilitado la cuenta del comercio (GET /v1/payment_methods), no es
      // un valor fijo -- oculto de la lista de métodos hasta armar eso bien
      // (ver services/payments/paymentService.ts).
      body: JSON.stringify({
        transaction_amount: order.total,
        description: `Pedido Juancho's Pizza #${order.orderNumber}`.slice(0, 100),
        payment_method_id: 'pix',
        payer: { email: String(customerEmail || '').slice(0, 100) },
        external_reference: order.id,
      }),
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      return res.status(502).json({ error: data.message || 'Error creando pago MercadoPago' });
    }

    await pool.query('UPDATE orders SET "paymentProviderRef" = $1 WHERE id = $2', [String(data.id), order.id]);

    res.status(201).json({
      transactionId: data.id,
      qrCode: data.point_of_interaction?.transaction_data?.qr_code,
    });
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

    const wompiResponse = await fetch('https://sandbox.wompi.co/v1/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_in_cents: Math.round(order.total * 100),
        currency: 'COP',
        customer_email: String(customerEmail || '').slice(0, 100),
        payment_method: { type: 'CARD' },
        reference: order.orderNumber,
        redirect_url: `${frontendUrl}/payment/return`,
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
    if (data.status === 'approved') {
      return res.status(201).json({ transactionId: data.id, approved: true });
    }

    res.status(201).json({ paymentUrl: data.redirect_url, approved: false });
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

// NOTA IMPORTANTE: la verificación de firma de Bold se implementó con menos
// confianza que MercadoPago/Wompi -- no se tuvo acceso a documentación en
// vivo ni a credenciales de sandbox reales para confirmar el nombre exacto
// del header o el algoritmo que usa Bold. Antes de aceptar pagos reales por
// Bold, verificar esto contra la documentación actual de Bold y probar con
// una notificación real de su sandbox.
router.post('/api/payments/bold/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (!process.env.BOLD_WEBHOOK_SECRET) {
      console.error('Bold webhook: BOLD_WEBHOOK_SECRET no configurado -- rechazado (fail-closed)');
      return res.sendStatus(503);
    }
    const providedSecret = String(req.headers['x-bold-signature'] || req.headers['x-webhook-secret'] || '');
    const expectedSecret = process.env.BOLD_WEBHOOK_SECRET;
    const providedBuf = Buffer.from(providedSecret);
    const expectedBuf = Buffer.from(expectedSecret);
    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      console.error('Bold webhook: secreto inválido, ignorado');
      return res.sendStatus(200);
    }

    const reference = body?.data?.reference || body?.reference || body?.payload?.reference;
    const status = String(body?.data?.status || body?.status || '').toUpperCase();

    if (!reference) {
      console.warn('Bold webhook: no se encontró referencia reconocible en el payload');
      return res.sendStatus(200);
    }

    const orderResult = await pool.query('SELECT * FROM orders WHERE "orderNumber" = $1 OR "paymentProviderRef" = $1', [
      reference,
    ]);
    const order = orderResult.rows[0];
    if (!order) return res.sendStatus(200);

    if (['APPROVED', 'PAID', 'SUCCESS'].includes(status)) {
      await confirmOrderPayment(pool, order, 'paid');
    } else if (['REJECTED', 'FAILED', 'VOIDED'].includes(status)) {
      await confirmOrderPayment(pool, order, 'failed');
    }

    res.sendStatus(200);
  } catch (e) {
    console.error('Error procesando webhook de Bold:', e.message);
    res.sendStatus(200);
  }
});

export default router;
