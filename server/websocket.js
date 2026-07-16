// WebSocket server para notificaciones en tiempo real.
// Reemplaza el polling de 10s del frontend con eventos push.
import { WebSocketServer } from 'ws';
import auth from './auth.js';

let wss = null;

// Map de conexiones activas por rol/tipo
const connections = new Map(); // role -> Set<ws>
const allConnections = new Set();

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    allConnections.add(ws);

    // El cliente puede pedir un rol privilegiado por query param, pero ese
    // valor no es de fiar por sí solo (cualquiera podría conectar con
    // ?role=OPERATOR y escuchar el feed de pedidos). El rol real sale del
    // JWT (mismo que usan las rutas HTTP vía auth.js) -- si no viene un
    // token válido, la conexión se degrada a 'public' en vez de rechazarse,
    // porque la pantalla pública del digiturno también usa este socket sin
    // autenticarse a propósito.
    const url = new URL(req.url, `http://${req.headers.host}`);
    const requestedRole = url.searchParams.get('role') || 'public';
    const locationId = url.searchParams.get('locationId') || null;
    const token = url.searchParams.get('token');

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

    ws.on('close', () => {
      allConnections.delete(ws);
      if (connections.has(role)) connections.get(role).delete(ws);
    });

    ws.on('error', () => {
      allConnections.delete(ws);
      if (connections.has(role)) connections.get(role).delete(ws);
    });
  });

  console.log('🔌 WebSocket server initialized at /ws');
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

// Funciones helper para eventos comunes
export function notifyNewOrder(order) {
  broadcast('order:new', { order });
  broadcastToRole('OPERATOR', 'order:new', { order });
  broadcastToRole('REPARTIDOR', 'order:new', { order });
}

export function notifyOrderUpdate(orderId, status) {
  broadcast('order:update', { orderId, status });
}

export function notifyTableUpdate(tableId, status) {
  broadcast('table:update', { tableId, status });
  broadcastToRole('OPERATOR', 'table:update', { tableId, status });
}

export function notifyComandaUpdate(comandaId, action) {
  broadcast('comanda:update', { comandaId, action });
  broadcastToRole('OPERATOR', 'comanda:update', { comandaId, action });
}

export function notifyDigiturnoUpdate(ticket) {
  broadcast('digiturno:update', { ticket });
  broadcastToRole('OPERATOR', 'digiturno:update', { ticket });
}

export function notifyDigiturnoNew(ticket) {
  broadcast('digiturno:new', { ticket });
  broadcastToRole('OPERATOR', 'digiturno:new', { ticket });
}
