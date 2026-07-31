// WebSocket server para notificaciones en tiempo real.
// Reemplaza el polling de 10s del frontend con eventos push.
import { WebSocketServer } from 'ws';
import auth, { readAuthCookie } from './auth.js';
import logger from './services/logger.js';
import { trackWsConnection } from './middleware/metrics.js';

let wss = null;

// Map de conexiones activas por rol/tipo
const connections = new Map(); // role -> Set<ws>
const allConnections = new Set();

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    allConnections.add(ws);
    trackWsConnection(1); // +1 conexión activa

    // El cliente puede pedir un rol privilegiado por query param, pero ese
    // valor no es de fiar por sí solo (cualquiera podría conectar con
    // ?role=OPERATOR y escuchar el feed de pedidos). El rol real sale del
    // JWT -- la cookie HttpOnly es la fuente primaria (viaja sola en el
    // handshake del WS porque es same-origin, sin que el cliente tenga que
    // leerla ni mandarla a mano); ?token= query param queda solo como
    // fallback por si algún día hace falta un cliente sin cookie (ej. un
    // script externo). Si no hay identidad válida, la conexión se degrada a
    // 'public' en vez de rechazarse, porque la pantalla pública del
    // digiturno también usa este socket sin autenticarse a propósito.
    const url = new URL(req.url, `http://${req.headers.host}`);
    const requestedRole = url.searchParams.get('role') || 'public';
    const locationId = url.searchParams.get('locationId') || null;
    const token = readAuthCookie(req) || url.searchParams.get('token');

    let role = 'public';
    if (requestedRole !== 'public') {
      const payload = token ? auth.verifyToken(token) : null;
      role = payload?.role || 'public';
    }

    ws.role = role;
    ws.locationId = locationId;

    if (!connections.has(role)) connections.set(role, new Set());
    connections.get(role).add(ws);

    // Enviar confirmación de conexión (el rol confirmado, no el pedido)
    ws.send(JSON.stringify({ type: 'connected', role, locationId, timestamp: new Date().toISOString() }));

    const cleanup = () => {
      allConnections.delete(ws);
      if (connections.has(role)) connections.get(role).delete(ws);
      trackWsConnection(-1); // -1 conexión activa
    };

    ws.on('close', cleanup);
    ws.on('error', cleanup);
  });

  logger.info('WebSocket server initialized at /ws');
  return wss;
}

// Broadcast a todos los clientes conectados
export function broadcast(event, data) {
  if (!wss) return;
  const message = JSON.stringify({ type: event, ...data, timestamp: new Date().toISOString() });
  for (const ws of allConnections) {
    if (ws.readyState === 1) ws.send(message); // 1 = OPEN
  }
}

// Enviar a un rol específico
export function broadcastToRole(role, event, data) {
  if (!wss) return;
  const targets = connections.get(role);
  if (!targets) return;
  const message = JSON.stringify({ type: event, ...data, timestamp: new Date().toISOString() });
  for (const ws of targets) {
    if (ws.readyState === 1) ws.send(message);
  }
}

// Enviar a una sede específica
export function broadcastToLocation(locationId, event, data) {
  if (!wss) return;
  const message = JSON.stringify({ type: event, ...data, timestamp: new Date().toISOString() });
  for (const ws of allConnections) {
    if (ws.readyState === 1 && (ws.locationId === locationId || !ws.locationId)) {
      ws.send(message);
    }
  }
}

/**
 * Enviar un evento SOLO a conexiones que estén en uno de los `allowedRoles`
 * y, opcionalmente, limitadas a una sede. Diseñado para payloads que NO
 * deben filtrarse a clientes anónimos (digiturno público) ni entre roles
 * no relacionados.
 *
 * Reglas de filtrado (en orden):
 *   1. La conexión debe estar OPEN (ws.readyState === 1).
 *   2. Su rol debe estar en allowedRoles (string o array).
 *   3. Si `options.locationId` está definido Y la conexión tiene
 *      `ws.locationId`, deben coincidir. Si la conexión no tiene
 *      locationId (ADMIN global), recibe el evento aunque esté filtrado
 *      por sede — así no le "ciegan" la operación a un admin multi-sede.
 *   4. Si `options.locationId` es null/undefined, no se filtra por sede
 *      (la restricción solo aplica al rol).
 *
 * Caso típico: `notifyAuthorized(['ADMIN'], { locationId }, 'invoice:update', …)`
 * impide que el socket público del digiturno reciba señales de facturación.
 */
export function notifyAuthorized(allowedRoles, options, event, data) {
  if (!wss) return;
  const roleList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const targetLocationId = options?.locationId ?? null;
  const message = JSON.stringify({
    type: event,
    ...data,
    timestamp: new Date().toISOString(),
  });
  for (const ws of allConnections) {
    if (ws.readyState !== 1) continue;
    if (!roleList.includes(ws.role)) continue;
    if (targetLocationId && ws.locationId && ws.locationId !== targetLocationId) continue;
    ws.send(message);
  }
}

// Extrae de un ticket de digiturno solo los campos seguros para la pantalla
// pública (sin autenticar) de la sede: nunca customerName, notes, items ni
// total -- esos campos solo van al staff vía notifyAuthorized. El set de
// campos espeja lo que ya expone GET /api/digiturno/queue (routes/digiturno.js)
// menos customerName, que ese endpoint sí filtra pero que aquí excluimos
// explícitamente para no reabrir la fuga por el WS.
function toPublicDigiturnoTicket(ticket) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    guestCount: ticket.guestCount,
    source: ticket.source,
    tableName: ticket.tableName,
    createdAt: ticket.createdAt,
  };
}

// Funciones helper para eventos comunes
export function notifyNewOrder(order) {
  // El payload trae customerName, total y paymentMethod -- PII y datos de
  // facturación que no deben llegar a la pantalla pública del digiturno ni
  // a roles sin acceso a pedidos. Restringido a los mismos roles que
  // GET/PATCH /api/orders (ver requireRole en routes/orders.js).
  notifyAuthorized(['ADMIN', 'OPERATOR', 'REPARTIDOR'], {}, 'order:new', { order });
}

export function notifyOrderUpdate(orderId, status) {
  broadcast('order:update', { orderId, status });
}

export function notifyTableUpdate(tableId, status) {
  // Mismos roles que GET/PATCH /api/tables (routes/tables.js).
  notifyAuthorized(['ADMIN', 'OPERATOR'], {}, 'table:update', { tableId, status });
}

export function notifyComandaUpdate(comandaId, action) {
  // Mismos roles que /api/comandas (routes/comandas.js).
  notifyAuthorized(['ADMIN', 'OPERATOR'], {}, 'comanda:update', { comandaId, action });
}

export function notifyDigiturnoUpdate(ticket) {
  // Staff: ticket completo (mismos roles que PATCH /api/digiturno/:id/status).
  notifyAuthorized(['ADMIN', 'OPERATOR'], {}, 'digiturno:update', { ticket });
  // Pantalla pública de la sede: solo campos no sensibles, filtrado por sede.
  notifyAuthorized(['public'], { locationId: ticket.locationId }, 'digiturno:update', {
    ticket: toPublicDigiturnoTicket(ticket),
  });
}

export function notifyDigiturnoNew(ticket) {
  notifyAuthorized(['ADMIN', 'OPERATOR'], {}, 'digiturno:new', { ticket });
  notifyAuthorized(['public'], { locationId: ticket.locationId }, 'digiturno:new', {
    ticket: toPublicDigiturnoTicket(ticket),
  });
}
