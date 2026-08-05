// Tests del servidor WebSocket: server/websocket.js
// Cubre el handshake (rol real desde el JWT vs ?role= query), la
// degradación a 'public' sin identidad válida, broadcast a todos/rol/sede,
// notifyAuthorized (filtro de rol + sede) y la sanitización del ticket
// público del digiturno (sin PII).
// Ejecutar: npx vitest run server/tests/websocket.test.js
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// ── Mocks con vi.hoisted ───────────────────────────────────────
const { mockVerifyToken, mockReadAuthCookie, mockTrackWs } = vi.hoisted(() => ({
  mockVerifyToken: vi.fn(),
  mockReadAuthCookie: vi.fn(),
  mockTrackWs: vi.fn(),
}));

vi.mock('ws', () => ({
  WebSocketServer: class {
    constructor(config) {
      this.config = config;
    }
    on(event, handler) {
      this[`on${event}`] = handler;
    }
  },
}));

vi.mock('../auth.js', () => ({
  default: { verifyToken: mockVerifyToken },
  readAuthCookie: mockReadAuthCookie,
}));

vi.mock('../services/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), fatal: vi.fn(), debug: vi.fn() },
}));

vi.mock('../middleware/metrics.js', () => ({
  trackWsConnection: mockTrackWs,
}));

// ── Importar módulo bajo test después de mocks ──────────────────
import {
  initWebSocket,
  broadcast,
  broadcastToRole,
  broadcastToLocation,
  notifyAuthorized,
  notifyNewOrder,
  notifyTableUpdate,
  notifyComandaUpdate,
  notifyDigiturnoUpdate,
  notifyDigiturnoNew,
} from '../websocket.js';

// Fake ws: plain object con send() spy y on() que guarda los handlers.
function makeWs() {
  const handlers = {};
  const ws = {
    readyState: 1, // OPEN
    send: vi.fn(),
    on: vi.fn((event, cb) => {
      handlers[event] = cb;
    }),
    handlers,
  };
  return ws;
}

const makeReq = (query = '') => ({ url: `/ws${query}`, headers: { host: 'localhost:3001' } });

const lastMessage = (ws) => JSON.parse(ws.send.mock.calls[ws.send.mock.calls.length - 1][0]);

// ⚠️ ORDEN INTENCIONAL DE DESCRIBES: los guards deben correr ANTES de
// initWebSocket, porque wss/connections/allConnections son estado de módulo
// que persiste entre tests del archivo (no se resetea). Los asserts son
// por-ws (aislados), así que la acumulación de conexiones no afecta los
// resultados, pero reordenar/refactorizar estos bloques rompería los tests
// silenciosamente. Guards primero, luego initWebSocket y conexiones.
describe('guards sin servidor inicializado (wss null)', () => {
  it('broadcast no hace nada', () => {
    expect(() => broadcast('e', {})).not.toThrow();
  });
  it('broadcastToRole no hace nada', () => {
    expect(() => broadcastToRole('ADMIN', 'e', {})).not.toThrow();
  });
  it('broadcastToLocation no hace nada', () => {
    expect(() => broadcastToLocation('nemocon', 'e', {})).not.toThrow();
  });
  it('notifyAuthorized no hace nada', () => {
    expect(() => notifyAuthorized(['ADMIN'], {}, 'e', {})).not.toThrow();
  });
  it('notifyNewOrder no hace nada', () => {
    expect(() => notifyNewOrder({ id: 'o1' })).not.toThrow();
  });
});

describe('initWebSocket()', () => {
  let connectionHandler;

  beforeAll(() => {
    const server = {};
    const wss = initWebSocket(server);
    expect(wss.config).toEqual({ server, path: '/ws' });
    connectionHandler = wss.onconnection;
    expect(connectionHandler).toBeTypeOf('function');
  });

  beforeEach(() => {
    mockReadAuthCookie.mockReset();
    mockVerifyToken.mockReset();
    mockTrackWs.mockClear();
  });

  it('conecta como public y envía confirmación cuando no hay identidad', () => {
    mockReadAuthCookie.mockReturnValue(null);

    const ws = makeWs();
    connectionHandler(ws, makeReq('?role=OPERATOR'));

    expect(ws.role).toBe('public');
    expect(mockTrackWs).toHaveBeenCalledWith(1);
    expect(ws.send).toHaveBeenCalledTimes(1);
    const msg = lastMessage(ws);
    expect(msg.type).toBe('connected');
    expect(msg.role).toBe('public');
  });

  it('usa el rol real del JWT, no el ?role= pedido por el cliente', () => {
    // El cliente PIDE OPERATOR, pero el token dice MARKETING -> gana el JWT.
    // (La verificación del token solo ocurre si el rol pedido no es 'public'.)
    mockReadAuthCookie.mockReturnValue('jwt-valid');
    mockVerifyToken.mockReturnValue({ role: 'MARKETING' });

    const ws = makeWs();
    connectionHandler(ws, makeReq('?role=OPERATOR'));

    expect(ws.role).toBe('MARKETING');
    expect(lastMessage(ws).role).toBe('MARKETING');
  });

  it('si el cliente pide ?role=public, ni siquiera verifica el token (degradación directa)', () => {
    mockReadAuthCookie.mockReturnValue('jwt-valid');
    mockVerifyToken.mockReturnValue({ role: 'ADMIN' });

    const ws = makeWs();
    connectionHandler(ws, makeReq('?role=public'));

    expect(ws.role).toBe('public');
    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(lastMessage(ws).role).toBe('public');
  });

  it('degrade a public si el token es inválido (nunca confía en ?role=)', () => {
    mockReadAuthCookie.mockReturnValue('jwt-invalid');
    mockVerifyToken.mockReturnValue(null);

    const ws = makeWs();
    connectionHandler(ws, makeReq('?role=ADMIN'));

    expect(ws.role).toBe('public');
    expect(lastMessage(ws).role).toBe('public');
  });

  it('guarda locationId y al cerrar limpia la conexión y ajusta la métrica', () => {
    mockReadAuthCookie.mockReturnValue(null);

    const ws = makeWs();
    connectionHandler(ws, makeReq('?locationId=zipaquira'));

    expect(ws.locationId).toBe('zipaquira');
    expect(mockTrackWs).toHaveBeenCalledWith(1);

    ws.handlers.close();
    expect(mockTrackWs).toHaveBeenLastCalledWith(-1);

    // Tras el close ya no recibe broadcasts (solo tuvo el connected)
    broadcast('e', {});
    expect(ws.send).toHaveBeenCalledTimes(1);
  });
});

describe('broadcast*', () => {
  let connectionHandler;

  beforeAll(() => {
    const wss = initWebSocket({});
    connectionHandler = wss.onconnection;
  });

  beforeEach(() => {
    mockReadAuthCookie.mockReset();
    mockVerifyToken.mockReset();
  });

  it('broadcast envía a todas las conexiones abiertas, salta las cerradas', () => {
    const open = makeWs();
    const closed = makeWs();
    closed.readyState = 3; // CLOSING/CLOSED
    connectionHandler(open, makeReq());
    connectionHandler(closed, makeReq());

    broadcast('order:update', { orderId: 'o1', status: 'READY' });

    const msg = lastMessage(open);
    expect(msg.type).toBe('order:update');
    expect(msg.orderId).toBe('o1');
    expect(msg.status).toBe('READY');
    expect(closed.send).toHaveBeenCalledTimes(1); // solo el connected
  });

  it('broadcastToRole solo llega a conexiones de ese rol', () => {
    const admin = makeWs();
    const pub = makeWs();
    mockVerifyToken.mockReturnValue({ role: 'ADMIN' });
    mockReadAuthCookie.mockReturnValue('jwt');
    connectionHandler(admin, makeReq('?role=ADMIN'));
    mockReadAuthCookie.mockReturnValue(null);
    connectionHandler(pub, makeReq());

    broadcastToRole('ADMIN', 'invoice:update', { id: 'inv1' });

    expect(lastMessage(admin).type).toBe('invoice:update');
    expect(pub.send).toHaveBeenCalledTimes(1); // solo connected
  });

  it('broadcastToLocation filtra por sede y deja pasar a conexiones sin sede (admins globales)', () => {
    const nemocon = makeWs();
    const zipa = makeWs();
    const global = makeWs();
    mockReadAuthCookie.mockReturnValue(null);
    connectionHandler(nemocon, makeReq('?locationId=nemocon'));
    connectionHandler(zipa, makeReq('?locationId=zipaquira'));
    connectionHandler(global, makeReq());

    broadcastToLocation('nemocon', 'digiturno:update', { n: 1 });

    expect(lastMessage(nemocon).type).toBe('digiturno:update');
    expect(zipa.send).toHaveBeenCalledTimes(1); // otra sede
    expect(global.send).toHaveBeenCalledTimes(2); // connected + broadcast
  });
});

describe('notifyAuthorized + eventos de dominio', () => {
  let connectionHandler;

  beforeAll(() => {
    const wss = initWebSocket({});
    connectionHandler = wss.onconnection;
  });

  beforeEach(() => {
    mockReadAuthCookie.mockReset();
    mockVerifyToken.mockReset();
  });

  it('filtra por rol: el público no recibe eventos restringidos', () => {
    const admin = makeWs();
    const pub = makeWs();
    mockVerifyToken.mockReturnValue({ role: 'ADMIN' });
    mockReadAuthCookie.mockReturnValue('jwt');
    connectionHandler(admin, makeReq('?role=ADMIN'));
    mockReadAuthCookie.mockReturnValue(null);
    connectionHandler(pub, makeReq());

    notifyAuthorized(['ADMIN'], {}, 'secret:event', { data: 1 });

    expect(lastMessage(admin).type).toBe('secret:event');
    expect(pub.send).toHaveBeenCalledTimes(1);
  });

  it('respeta el filtro de sede y deja pasar a admins sin sede (no se les ciega la operación)', () => {
    const adminNemocon = makeWs();
    const adminGlobal = makeWs();
    const operatorZipa = makeWs();
    mockVerifyToken.mockReturnValue({ role: 'ADMIN' });
    mockReadAuthCookie.mockReturnValue('jwt');
    connectionHandler(adminNemocon, makeReq('?role=ADMIN&locationId=nemocon'));
    connectionHandler(adminGlobal, makeReq('?role=ADMIN'));
    mockVerifyToken.mockReturnValue({ role: 'OPERATOR' });
    connectionHandler(operatorZipa, makeReq('?role=OPERATOR&locationId=zipaquira'));

    notifyAuthorized(['ADMIN', 'OPERATOR'], { locationId: 'zipaquira' }, 'table:update', {
      tableId: 't1',
      status: 'occupied',
    });

    expect(adminGlobal.send).toHaveBeenCalledTimes(2); // connected + event
    expect(operatorZipa.send).toHaveBeenCalledTimes(2);
    expect(adminNemocon.send).toHaveBeenCalledTimes(1); // otra sede, no recibe
  });

  it('notifyNewOrder llega solo a roles de staff (nunca al público)', () => {
    const op = makeWs();
    const pub = makeWs();
    mockVerifyToken.mockReturnValue({ role: 'OPERATOR' });
    mockReadAuthCookie.mockReturnValue('jwt');
    connectionHandler(op, makeReq('?role=OPERATOR'));
    mockReadAuthCookie.mockReturnValue(null);
    connectionHandler(pub, makeReq());

    notifyNewOrder({ id: 'o1', customerName: 'Ana', total: 90000 });

    expect(lastMessage(op).type).toBe('order:new');
    expect(pub.send).toHaveBeenCalledTimes(1);
  });

  it('notifyTableUpdate y notifyComandaUpdate son eventos restringidos', () => {
    const admin = makeWs();
    const pub = makeWs();
    mockVerifyToken.mockReturnValue({ role: 'ADMIN' });
    mockReadAuthCookie.mockReturnValue('jwt');
    connectionHandler(admin, makeReq('?role=ADMIN'));
    mockReadAuthCookie.mockReturnValue(null);
    connectionHandler(pub, makeReq());

    notifyTableUpdate('t1', 'occupied');
    notifyComandaUpdate('c1', 'item:add');

    expect(lastMessage(admin).type).toBe('comanda:update');
    expect(pub.send).toHaveBeenCalledTimes(1);
  });

  it('notifyDigiturnoUpdate: staff recibe el ticket completo, el público solo campos seguros', () => {
    const staff = makeWs();
    const pub = makeWs();
    mockVerifyToken.mockReturnValue({ role: 'OPERATOR' });
    mockReadAuthCookie.mockReturnValue('jwt');
    connectionHandler(staff, makeReq('?role=OPERATOR&locationId=nemocon'));
    mockReadAuthCookie.mockReturnValue(null);
    connectionHandler(pub, makeReq('?locationId=nemocon'));

    const ticket = {
      id: 'dt1',
      ticketNumber: 12,
      status: 'waiting',
      guestCount: 3,
      source: 'local',
      tableName: 'Mesa 4',
      createdAt: '2026-08-04T12:00:00Z',
      customerName: 'Ana',
      notes: 'sin cebolla',
      items: [{ name: 'Margherita' }],
      total: 90000,
    };
    notifyDigiturnoUpdate(ticket);

    const staffMsg = JSON.parse(staff.send.mock.calls[1][0]);
    expect(staffMsg.type).toBe('digiturno:update');
    expect(staffMsg.ticket.customerName).toBe('Ana');
    expect(staffMsg.ticket.total).toBe(90000);

    // Público: ticket sanitizado, sin PII ni datos de facturación
    const pubMsg = JSON.parse(pub.send.mock.calls[1][0]);
    expect(pubMsg.ticket.ticketNumber).toBe(12);
    expect(pubMsg.ticket.status).toBe('waiting');
    expect(pubMsg.ticket.customerName).toBeUndefined();
    expect(pubMsg.ticket.notes).toBeUndefined();
    expect(pubMsg.ticket.items).toBeUndefined();
    expect(pubMsg.ticket.total).toBeUndefined();
  });

  it('notifyDigiturnoNew: staff completo + público sanitizado', () => {
    const staff = makeWs();
    const pub = makeWs();
    mockVerifyToken.mockReturnValue({ role: 'ADMIN' });
    mockReadAuthCookie.mockReturnValue('jwt');
    connectionHandler(staff, makeReq('?role=ADMIN'));
    mockReadAuthCookie.mockReturnValue(null);
    connectionHandler(pub, makeReq('?locationId=zipaquira'));

    notifyDigiturnoNew({
      id: 'dt9',
      ticketNumber: 99,
      status: 'waiting',
      guestCount: 2,
      source: 'local',
      tableName: 'Mesa 1',
      createdAt: 'x',
      customerName: 'PII',
      notes: 'privado',
      items: [],
      total: 1,
      locationId: 'zipaquira',
    });

    const pubMsg = JSON.parse(pub.send.mock.calls[1][0]);
    expect(pubMsg.ticket.customerName).toBeUndefined();
    expect(pubMsg.ticket.total).toBeUndefined();
    expect(pubMsg.ticket.ticketNumber).toBe(99);
  });
});
