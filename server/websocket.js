// WebSocket server para notificaciones en tiempo real.
// Reemplaza el polling de 10s del frontend con eventos push.
import { WebSocketServer } from 'ws';

let wss = null;

// Map de conexiones activas por rol/tipo
const connections = new Map(); // role -> Set<ws>
const allConnections = new Set();

export function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    allConnections.add(ws);

    // Identificar tipo de conexión vía query param
    const url = new URL(req.url, `http://${req.headers.host}`);
    const role = url.searchParams.get('role') || 'public';
    const locationId = url.searchParams.get('locationId') || null;

    ws.role = role;
    ws.locationId = locationId;

    if (!connections.has(role)) connections.set(role, new Set());
    connections.get(role).add(ws);

    // Enviar confirmación de conexión
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
