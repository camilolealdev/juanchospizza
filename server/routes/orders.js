import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { sendPushToPhone } from '../push.js';

const router = express.Router();

// ORDERS
router.get('/api/orders', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'REPARTIDOR'), async (req, res) => {
  try {
    const { status, paidOnly } = req.query;
    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    // Cocina/Operador/Repartidor deben usar esto para no ver pedidos con
    // pago online todavía sin confirmar por el webhook del proveedor.
    // Efectivo/tarjeta (pago contra-entrega) siempre pasan, sin importar
    // paymentStatus, porque nunca dependen de una confirmación externa.
    if (paidOnly === 'true') {
      conditions.push(`("paymentStatus" = 'paid' OR "paymentMethod" IN ('cash', 'card'))`);
    }

    let query = 'SELECT * FROM orders';
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY "createdAt" DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
    res.status(500).json({ error: 'Error fetching order' });
  }
});

router.post('/api/orders', async (req, res) => {
  try {
    const { orderNumber, customerName, customerPhone, address, items, total, estimatedTime, paymentMethod } = req.body;

    // Validación de inputs
    if (!orderNumber || !customerName || !address || !items || !total) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // items es una columna JSON nativa: el pg driver serializa/parsea objetos
    // planos automáticamente, pero los arrays de nivel superior (como este)
    // los convierte a sintaxis de array de Postgres en vez de JSON si se
    // pasan tal cual, así que seguimos stringificando en la escritura; la
    // lectura ya no necesita JSON.parse porque la columna se auto-parsea.
    const itemsForDb = JSON.stringify(items);
    if (itemsForDb.length > 5000) {
      return res.status(400).json({ error: 'Items demasiado grandes' });
    }

    // Sanitización básica
    const sanitized = {
      orderNumber: String(orderNumber).slice(0, 50),
      customerName: String(customerName).slice(0, 100),
      customerPhone: customerPhone ? String(customerPhone).slice(0, 30) : null,
      address: String(address).slice(0, 200),
      total: Math.max(0, Math.min(Number(total), 999999999)),
      estimatedTime: Math.max(0, Math.min(Number(estimatedTime || 30), 180)),
      paymentMethod: String(paymentMethod || 'cash').slice(0, 20)
    };

    // clientId nunca se confía del body: cualquiera podía mandar el id de otro
    // cliente y sus pedidos falsos le inflaban el gasto/puntos de fidelización
    // ajenos. Se resuelve server-side buscando por teléfono, que es el mismo
    // valor que ya usamos como verificador para tracking/reviews.
    let resolvedClientId = null;
    if (sanitized.customerPhone) {
      const clientMatch = await pool.query('SELECT id FROM clients WHERE telefono = $1 LIMIT 1', [sanitized.customerPhone]);
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

    await pool.query(
      `INSERT INTO orders (id, "orderNumber", "customerName", "customerPhone", address, items, total, status, "createdAt", "estimatedTime", "paymentMethod", "clientId", "paymentStatus") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, sanitized.orderNumber, sanitized.customerName, sanitized.customerPhone, sanitized.address, itemsForDb, sanitized.total, status, createdAt, sanitized.estimatedTime, sanitized.paymentMethod, sanitized.clientId, paymentStatus]
    );

    res.status(201).json({ id, orderNumber: sanitized.orderNumber, customerName: sanitized.customerName, customerPhone: sanitized.customerPhone, address: sanitized.address, items, total: sanitized.total, status, createdAt, estimatedTime: sanitized.estimatedTime, paymentMethod: sanitized.paymentMethod, clientId: sanitized.clientId, paymentStatus });
  } catch (e) {
    res.status(500).json({ error: 'Error creating order' });
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
function computeNivel(totalGastado) {
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

router.patch('/api/orders/:id/status', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'REPARTIDOR'), async (req, res) => {
  try {
    const { status } = req.body;

    // Validar status permitido
    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED', 'DELIVERING', 'COMPLETED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

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
        console.error('Error updating client spend aggregate:', aggError.message);
      }
    }

    const pushMessages = {
      READY: 'Tu pedido está listo',
      ASSIGNED: 'Tu pedido fue asignado a un repartidor',
      DELIVERING: 'Tu pedido va en camino',
      COMPLETED: '¡Tu pedido fue entregado! Gracias por tu compra'
    };
    if (pushMessages[status] && order.customerPhone) {
      // El envío nunca debe fallar la actualización del pedido: sendPushToPhone
      // ya atrapa sus propios errores internamente, pero se envuelve igual
      // por si acaso (no bloqueante, no se espera con await bloqueante del response).
      sendPushToPhone(pool, order.customerPhone, {
        title: `Pedido ${order.orderNumber}`,
        body: pushMessages[status],
        url: '/'
      }).catch(err => console.error('Error sending push notification:', err.message));
    }

    res.json(order);
  } catch (e) {
    res.status(500).json({ error: 'Error updating order' });
  }
});

router.put('/api/orders/:id', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { address, items, total, estimatedTime, paymentMethod } = req.body;

    const updates = [];
    const params = [];
    if (address !== undefined) { params.push(String(address).slice(0, 200)); updates.push(`address = $${params.length}`); }
    if (items !== undefined) {
      const itemsForDb = JSON.stringify(items);
      if (itemsForDb.length > 5000) {
        return res.status(400).json({ error: 'Items demasiado grandes' });
      }
      params.push(itemsForDb); updates.push(`items = $${params.length}`);
    }
    if (total !== undefined) { params.push(Math.max(0, Math.min(Number(total), 999999999))); updates.push(`total = $${params.length}`); }
    if (estimatedTime !== undefined) { params.push(Math.max(0, Math.min(Number(estimatedTime), 180))); updates.push(`"estimatedTime" = $${params.length}`); }
    if (paymentMethod !== undefined) { params.push(String(paymentMethod).slice(0, 20)); updates.push(`"paymentMethod" = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Error updating order' });
  }
});

export default router;
