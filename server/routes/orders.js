import express from 'express';
import logger from '../services/logger.js';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { sendPushToPhone } from '../push.js';
import { sendTemplatedEmail, templates } from '../services/email.js';
import { deliverWebhook } from '../services/webhooks.js';
import { validate } from '../middleware/validate.js';
import { notifyNewOrder, notifyOrderUpdate } from '../websocket.js';
import { createOrderSchema, updateOrderSchema, updateOrderStatusSchema } from '../schemas/orders.js';
import { computeVerifiedTotal, OrderPricingError } from '../services/orderPricing.js';

const router = express.Router();

// ORDERS
router.get('/api/orders', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'REPARTIDOR'), async (req, res) => {
  try {
    const { status, paidOnly, locationId, page, pageSize } = req.query;
    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (locationId) {
      params.push(locationId);
      conditions.push(`"locationId" = $${params.length}`);
    }

    // Cocina/Operador/Repartidor deben usar esto para no ver pedidos con
    // pago online todavía sin confirmar por el webhook del proveedor.
    // Efectivo/tarjeta (pago contra-entrega) siempre pasan, sin importar
    // paymentStatus, porque nunca dependen de una confirmación externa.
    // 'whatsapp' se agrega acá por el mismo motivo: ese pedido se negocia
    // fuera de la app (el cliente paga contra-entrega o transferencia
    // coordinada por chat), no hay webhook de proveedor que vaya a marcarlo
    // paymentStatus='paid' -- antes de este fix quedaba paymentStatus='pending'
    // para siempre y este filtro lo escondía de cocina/ops indefinidamente,
    // aunque el pedido existiera en la DB.
    if (paidOnly === 'true') {
      conditions.push(`("paymentStatus" = 'paid' OR "paymentMethod" IN ('cash', 'card', 'whatsapp'))`);
    }

    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';

    // Paginación real opcional: ?page=1&pageSize=50 → { data, total, page,
    // pageSize, totalPages } (COUNT(*) + LIMIT/OFFSET). Sin page/pageSize →
    // array completo con el tope deliberado de 2000 de siempre (back-compat
    // con dashboard/reportes, que agregan client-side). El comentario
    // original aplica a ese camino: si el volumen crece, usar paginación
    // explícita o filtros de fecha reales, no subir el número.
    const hasPagination = page !== undefined || pageSize !== undefined;
    if (hasPagination) {
      const p = Math.max(parseInt(page, 10) || 1, 1);
      const ps = Math.min(Math.max(parseInt(pageSize, 10) || 50, 1), 500);
      const offset = (p - 1) * ps;

      const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM orders${where}`, params);
      const total = countResult.rows[0]?.total || 0;

      const result = await pool.query(
        `SELECT * FROM orders${where} ORDER BY "createdAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, ps, offset]
      );
      return res.json({ data: result.rows, total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) });
    }

    let query = 'SELECT * FROM orders';
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    // Tope de seguridad -- sin esto, cada carga de dashboard/reportes trae
    // la tabla completa y crece sin límite con el volumen de pedidos. 2000
    // es generoso a propósito (no queremos truncar en silencio el análisis
    // histórico de Reportes); si el negocio crece más que eso, lo correcto
    // es usar la paginación explícita de arriba o agregar filtros de fecha
    // reales a esta ruta, no subir el número.
    query += ' ORDER BY "createdAt" DESC LIMIT 2000';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (_e) {
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

// Tracking público para clientes invitados (sin cuenta): requiere el
// teléfono como verificación mínima ya que "orderNumber" es un número
// corto y adivinable. Solo expone campos sin PII sensible (nada de
// dirección/total/items) -- para eso está la ruta admin de arriba.
router.get('/api/orders/track/:orderNumber', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: 'Se requiere el teléfono del pedido' });
    }

    const result = await pool.query(
      `SELECT id, "orderNumber", status, "createdAt", "estimatedTime", "paymentStatus", "paymentMethod" FROM orders WHERE "orderNumber" = $1 AND "customerPhone" = $2`,
      [req.params.orderNumber, phone]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (_e) {
    res.status(500).json({ error: 'Error tracking order' });
  }
});

router.get('/api/orders/:id', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'REPARTIDOR'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch (_e) {
    res.status(500).json({ error: 'Error fetching order' });
  }
});

router.post('/api/orders', validate(createOrderSchema), async (req, res) => {
  let client;
  try {
    const {
      orderNumber,
      customerName,
      customerPhone,
      address,
      items,
      // El `total` del cliente nunca se usa para el cobro real ni se persiste
      // tal cual -- POST /api/orders es checkout de invitado sin auth, así
      // que cualquiera podía mandar un total arbitrario que terminaba
      // cobrándose verbatim vía Bold/Wompi (ver docs/AUDIT_2026-07-30.md #2).
      // Se recalcula abajo desde el catálogo real (products/pizza_sizes)
      // dentro de la misma transacción del INSERT.
      estimatedTime,
      paymentMethod,
      locationId,
    } = req.body;

    // items es una columna JSON nativa: el pg driver serializa/parsea objetos
    // planos automáticamente, pero los arrays de nivel superior (como este)
    // los convierte a sintaxis de array de Postgres en vez de JSON si se
    // pasan tal cual, así que seguimos stringificando en la escritura; la
    // lectura ya no necesita JSON.parse porque la columna se auto-parsea.
    const itemsForDb = JSON.stringify(items);

    client = await pool.connect();
    await client.query('BEGIN');

    let verifiedTotal;
    try {
      verifiedTotal = await computeVerifiedTotal(client, items);
    } catch (pricingError) {
      await client.query('ROLLBACK');
      if (pricingError instanceof OrderPricingError) {
        return res.status(400).json({ error: pricingError.message });
      }
      throw pricingError;
    }

    // Sanitización básica
    const sanitized = {
      orderNumber,
      customerName,
      customerPhone: customerPhone || null,
      address,
      total: verifiedTotal,
      estimatedTime,
      paymentMethod,
      locationId,
    };

    // clientId nunca se confía del body: cualquiera podía mandar el id de otro
    // cliente y sus pedidos falsos le inflaban el gasto/puntos de fidelización
    // ajenos. Se resuelve server-side buscando por teléfono, que es el mismo
    // valor que ya usamos como verificador para tracking/reviews.
    let resolvedClientId = null;
    if (sanitized.customerPhone) {
      const clientMatch = await client.query('SELECT id FROM clients WHERE telefono = $1 LIMIT 1', [
        sanitized.customerPhone,
      ]);
      resolvedClientId = clientMatch.rows[0]?.id || null;
    }
    sanitized.clientId = resolvedClientId;

    const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const status = 'PENDING';
    const createdAt = new Date().toISOString();
    // Efectivo/tarjeta se cobran contra-entrega: no hay nada que un proveedor
    // externo deba confirmar, así que se marcan pagados de inmediato. Los
    // métodos online arrancan 'pending' -- solo el webhook del proveedor
    // correspondiente los mueve a 'paid'/'failed'.
    const paymentStatus = ['cash', 'card'].includes(sanitized.paymentMethod) ? 'paid' : 'pending';

    await client.query(
      `INSERT INTO orders (id, "orderNumber", "customerName", "customerPhone", address, items, total, status, "createdAt", "estimatedTime", "paymentMethod", "clientId", "paymentStatus", "locationId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        sanitized.orderNumber,
        sanitized.customerName,
        sanitized.customerPhone,
        sanitized.address,
        itemsForDb,
        sanitized.total,
        status,
        createdAt,
        sanitized.estimatedTime,
        sanitized.paymentMethod,
        sanitized.clientId,
        paymentStatus,
        sanitized.locationId,
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      id,
      orderNumber: sanitized.orderNumber,
      customerName: sanitized.customerName,
      customerPhone: sanitized.customerPhone,
      address: sanitized.address,
      items,
      total: sanitized.total,
      status,
      createdAt,
      estimatedTime: sanitized.estimatedTime,
      paymentMethod: sanitized.paymentMethod,
      clientId: sanitized.clientId,
      paymentStatus,
      locationId: sanitized.locationId,
    });

    // ── Notificaciones post-creación (no bloqueantes) ────────────
    setImmediate(() => {
      // notifyNewOrder (server/websocket.js) es síncrona, no retorna Promise —
      // no encadenar .catch() aquí (lanzaba TypeError no capturado en cada pedido).
      notifyNewOrder({
        id,
        orderNumber: sanitized.orderNumber,
        customerName: sanitized.customerName,
        total: sanitized.total,
        status,
        paymentMethod: sanitized.paymentMethod,
      });
    });
    notifyOrderConfirmation(
      sanitized.clientId,
      sanitized.customerName,
      sanitized.orderNumber,
      sanitized.total,
      sanitized.estimatedTime
    );
    notifyWebhook('order.created', {
      id,
      orderNumber: sanitized.orderNumber,
      total: sanitized.total,
      status,
      paymentMethod: sanitized.paymentMethod,
    });
  } catch (e) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* la conexión ya pudo haberse perdido -- no hay nada más que hacer */
      }
    }
    // orderNumber ahora es una idempotency key real (ver src/components/
    // CartSection.tsx y MenuDigital.tsx: se genera una sola vez por intento
    // de checkout, ya no en cada render). Un retry de red que reenvía el
    // mismo POST choca acá contra idx_orders_number (server/db.js) en vez
    // de crear un pedido duplicado -- devolvemos el pedido YA creado por el
    // intento anterior (200) en lugar de un 500 genérico que el cliente
    // interpretaría como "no se creó" y podría reintentar de nuevo.
    if (e.code === '23505') {
      try {
        const existing = await pool.query('SELECT * FROM orders WHERE "orderNumber" = $1', [req.body?.orderNumber]);
        if (existing.rows[0]) return res.status(200).json(existing.rows[0]);
      } catch {
        /* si ni siquiera esto funciona, cae al 500 genérico de abajo */
      }
    }
    res.status(500).json({ error: 'Error creating order' });
  } finally {
    if (client) client.release();
  }
});

// Tier cosmético según el total histórico gastado por el cliente (en la
// misma unidad monetaria que orders.total). Son umbrales de referencia,
// no un cálculo financiero: se documentan aquí para que sean fáciles de
// ajustar si el negocio cambia de criterio.
//   totalGastado < 100.000        -> 'bronce'
//   100.000 <= totalGastado < 300.000  -> 'plata'
//   300.000 <= totalGastado < 600.000  -> 'oro'
//   totalGastado >= 600.000       -> 'platino'
export function computeNivel(totalGastado) {
  if (totalGastado >= 600000) return 'platino';
  if (totalGastado >= 300000) return 'oro';
  if (totalGastado >= 100000) return 'plata';
  return 'bronce';
}

// Actualiza los agregados de gasto de un cliente cuando se completa un
// pedido asociado a él. Si el cliente no existe (id huérfano, borrado,
// etc.) no hace nada: el llamador decide si eso debe ser silencioso.
async function updateClientSpendAggregate(clientId, orderTotal) {
  const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [clientId]);
  if (!clientResult.rows.length) return;

  const client = clientResult.rows[0];
  const newTotalCompras = (client.totalCompras || 0) + 1;
  const newTotalGastado = (client.totalGastado || 0) + (Number(orderTotal) || 0);

  // Frecuencia de compra: compras por cada 30 días desde el alta del
  // cliente. Es una métrica cosmética para la UI (no financiera), así
  // que se mantiene deliberadamente simple.
  const creadoDate = client.creado ? new Date(client.creado) : new Date();
  const daysSinceCreated = Math.max(1, Math.floor((Date.now() - creadoDate.getTime()) / 86400000));
  const frecuenciaCompra = Math.max(1, Math.round((newTotalCompras / daysSinceCreated) * 30));

  const nivel = computeNivel(newTotalGastado);

  await pool.query(
    `UPDATE clients SET "totalCompras" = $1, "totalGastado" = $2, "ultimaCompra" = NOW(), "frecuenciaCompra" = $3, nivel = $4 WHERE id = $5`,
    [newTotalCompras, newTotalGastado, frecuenciaCompra, nivel, clientId]
  );
}

router.patch(
  '/api/orders/:id/status',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR', 'REPARTIDOR'),
  validate(updateOrderStatusSchema),
  async (req, res) => {
    try {
      const { status } = req.body;

      await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);

      const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = result.rows[0];

      if (status === 'COMPLETED' && order.clientId) {
        try {
          await updateClientSpendAggregate(order.clientId, order.total);
        } catch (aggError) {
          // No se debe fallar la actualización del pedido por un problema
          // al agregar las métricas del cliente.
          logger.error({ err: aggError }, 'Error updating client spend aggregate');
        }
      }

      // ── Notificaciones post-status (no bloqueantes) ────────────
      if (
        ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED', 'DELIVERING', 'COMPLETED', 'CANCELLED'].includes(
          status
        )
      ) {
        setImmediate(() => {
          // notifyOrderUpdate (server/websocket.js) es síncrona, no retorna Promise —
          // no encadenar .catch() aquí (lanzaba TypeError no capturado en cada cambio de estado).
          notifyOrderUpdate(order.id, status);
          notifyOrderStatusChange(order, status).catch((err) =>
            logger.error({ err }, '[Order] Error en notificación de cambio de estado')
          );
        });
        notifyWebhook('order.status_changed', {
          id: order.id,
          orderNumber: order.orderNumber,
          status,
          customerName: order.customerName,
          total: order.total,
        });
      }

      const pushMessages = {
        READY: 'Tu pedido está listo',
        ASSIGNED: 'Tu pedido fue asignado a un repartidor',
        DELIVERING: 'Tu pedido va en camino',
        COMPLETED: '¡Tu pedido fue entregado! Gracias por tu compra',
      };
      if (pushMessages[status] && order.customerPhone) {
        // El envío nunca debe fallar la actualización del pedido: sendPushToPhone
        // ya atrapa sus propios errores internamente, pero se envuelve igual
        // por si acaso (no bloqueante, no se espera con await bloqueante del response).
        sendPushToPhone(pool, order.customerPhone, {
          title: `Pedido ${order.orderNumber}`,
          body: pushMessages[status],
          url: '/',
        }).catch((err) => console.error('Error sending push notification:', err.message));
      }

      res.json(order);
    } catch (_e) {
      res.status(500).json({ error: 'Error updating order' });
    }
  }
);

router.put(
  '/api/orders/:id',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(updateOrderSchema),
  async (req, res) => {
    let client;
    try {
      // `total` NO se lee del body a propósito: updateOrderSchema ya lo
      // descarta (anti-tampering, hallazgo #13 de GAPS_08-05 / P0 de la
      // auditoría 08-06). Si cambian los items, el total se recalcula
      // server-side desde el catálogo real en la transacción de abajo --
      // nunca se persiste un monto enviado por el cliente.
      const { address, items, estimatedTime, paymentMethod } = req.body;

      const updates = [];
      const params = [];
      if (address !== undefined) {
        params.push(address);
        updates.push(`address = $${params.length}`);
      }
      if (items !== undefined) {
        // Cambiaron los items: abrir transacción, recalcular el total real
        // desde el catálogo (igual que el POST de checkout) y persistir
        // items + total juntos de forma consistente.
        client = await pool.connect();
        await client.query('BEGIN');

        let verifiedTotal;
        try {
          verifiedTotal = await computeVerifiedTotal(client, items);
        } catch (pricingError) {
          // OrderPricingError → 400 con ROLLBACK acá mismo (la transacción
          // queda descartada y el catch externo no debe volver a hacerlo).
          // Cualquier otro error se re-lanza sin ROLLBACK: lo descarta el
          // catch externo (evita un ROLLBACK doble sobre la transacción).
          if (pricingError instanceof OrderPricingError) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: pricingError.message });
          }
          throw pricingError;
        }

        params.push(JSON.stringify(items));
        updates.push(`items = $${params.length}`);
        params.push(verifiedTotal);
        updates.push(`total = $${params.length}`);
      }
      if (estimatedTime !== undefined) {
        params.push(estimatedTime);
        updates.push(`"estimatedTime" = $${params.length}`);
      }
      if (paymentMethod !== undefined) {
        params.push(paymentMethod);
        updates.push(`"paymentMethod" = $${params.length}`);
      }

      if (updates.length) {
        params.push(req.params.id);
        const executor = client || pool;
        await executor.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
        if (client) await client.query('COMMIT');
      }

      const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);

      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Order not found' });
      }
    } catch (_e) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch {
          /* conexión perdida -- nada más que hacer */
        }
      }
      res.status(500).json({ error: 'Error updating order' });
    } finally {
      if (client) client.release();
    }
  }
);

// ── Helpers de notificación (no bloqueantes) ─────────────────────

// Busca el email del cliente y envía confirmación de pedido
async function notifyOrderConfirmation(clientId, customerName, orderNumber, total, estimatedTime) {
  if (!clientId) return;
  try {
    const client = await pool.query('SELECT email, nombre FROM clients WHERE id = $1', [clientId]);
    if (!client.rows.length || !client.rows[0].email) return;

    await sendTemplatedEmail({
      to: client.rows[0].email,
      subject: `Pedido #${orderNumber} confirmado 🍕`,
      template: templates.orderConfirmation,
      data: {
        customerName: customerName || client.rows[0].nombre || 'Cliente',
        orderNumber,
        total: (total || 0).toLocaleString('es-CO'),
        estimatedTime: String(estimatedTime || 'N/A'),
      },
    });
  } catch (err) {
    logger.error({ err }, '[Email] Error enviando confirmación de pedido');
  }
}

// Envía email y push cuando cambia el estado del pedido
async function notifyOrderStatusChange(order, status) {
  try {
    // Email si el cliente tiene correo
    let clientEmail = null;
    if (order.clientId) {
      const client = await pool.query('SELECT email FROM clients WHERE id = $1', [order.clientId]);
      clientEmail = client.rows[0]?.email || null;
    }

    if (status === 'READY' && clientEmail) {
      await sendTemplatedEmail({
        to: clientEmail,
        subject: `Pedido #${order.orderNumber} — ¡Listo para recoger! 🎉`,
        template: templates.orderReady,
        data: {
          customerName: order.customerName || 'Cliente',
          orderNumber: order.orderNumber,
          deliveryType: order.address ? 'domicilio' : 'recoger en tienda',
        },
      });
    }

    if (status === 'COMPLETED' && clientEmail) {
      await sendTemplatedEmail({
        to: clientEmail,
        subject: `Pedido #${order.orderNumber} entregado — ¡Gracias! 🍕`,
        template: templates.orderReady,
        data: {
          customerName: order.customerName || 'Cliente',
          orderNumber: order.orderNumber,
          deliveryType: 'disfrutar',
        },
      });
    }
  } catch (err) {
    logger.error({ err }, '[Email] Error en notificación de estado');
  }
}

// Envía webhook a URL externa si está configurada
function notifyWebhook(event, data) {
  const url = process.env.ORDER_WEBHOOK_URL || process.env.WEBHOOK_URL;
  if (!url) return;

  deliverWebhook({
    url,
    payload: { event, data, timestamp: new Date().toISOString() },
    retries: 2,
    timeout: 5000,
  }).catch((err) => console.warn('[Webhook] Error enviando webhook:', err.message));
}

export default router;
