import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Order, OrderStatus, UserRole } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';

interface PedidosViewProps {
  role: UserRole;
  locationId?: string;
}

// Módulo Pedidos (2026-08-27) -- antes cocina no tenía ninguna vista de
// pedidos con estado (solo Comandas, que es mesas/dine-in, un concepto
// distinto), y repartidor no tenía absolutamente nada asignado en
// ROLE_PERMISSIONS. Ambos roles comparten este componente pero ven cosas
// distintas: cocina avanza PENDING->CONFIRMED->PREPARING->READY; repartidor
// reclama pedidos READY (auto-reclamo, primero que llega se lo lleva) y los
// avanza ASSIGNED->DELIVERING->COMPLETED. La transición READY->ASSIGNED y el
// ownership de ahí en adelante los valida el backend (server/routes/orders.js),
// no confiar solo en lo que se oculta acá en la UI.

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  bold: 'Bold (online)',
  whatsapp: 'Coordinado por WhatsApp',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  pse: 'PSE',
  mercadopago: 'MercadoPago',
  paypal: 'PayPal',
  wompi: 'Wompi',
};

// Aviso sonoro de pedido nuevo (Web Audio, sin assets). Puede quedar bloqueado
// por el navegador hasta que el usuario interactúe con la página.
function playNewOrderSound() {
  try {
    const ctx = new AudioContext();
    [880, 1100, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.2);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* sin audio disponible */
  }
}

const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const OrderCard: React.FC<{
  order: Order;
  primaryLabel: string;
  onPrimary?: () => void;
  busy?: boolean;
  showClaimHint?: boolean;
  // Sin acción disponible (ej. "Listo, esperando repartidor" en la vista de
  // cocina) -- distinto de `busy` (en proceso), que muestra "Procesando...".
  static?: boolean;
}> = ({ order, primaryLabel, onPrimary, busy, showClaimHint, static: isStatic }) => (
  <div className="bg-stone-900 border border-stone-700 rounded-2xl p-5">
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className="text-white font-black text-lg">
          #{order.orderNumber}
          {/^TEST-/i.test(order.orderNumber) && (
            <span className="ml-2 align-middle bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded">PRUEBA</span>
          )}
        </p>
        <p className="text-stone-400 text-sm">{order.customerName}</p>
        <p className="text-stone-500 text-xs">
          {new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          {order.estimatedTime ? ` · est. ${order.estimatedTime} min` : ''}
        </p>
      </div>
      <span className="text-orange-400 font-black text-sm">{formatter.format(order.total)}</span>
    </div>
    <div className="space-y-1 mb-4 text-xs text-stone-400">
      <p className="flex items-center gap-2">
        <i className="fas fa-location-dot w-3" aria-hidden="true" />
        {order.address || 'Sin dirección (recoge en local)'}
      </p>
      {order.customerPhone && (
        <p className="flex items-center gap-2">
          <i className="fas fa-phone w-3" aria-hidden="true" />
          <a href={`tel:${order.customerPhone}`} className="hover:text-orange-400">
            {order.customerPhone}
          </a>
        </p>
      )}
      <p className="flex items-center gap-2">
        <i className="fas fa-money-bill w-3" aria-hidden="true" />
        {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
      </p>
    </div>
    <ul className="text-[11px] text-stone-500 mb-4 space-y-0.5">
      {order.items.map((item, i) => (
        <li key={i}>
          {item.quantity}x {item.name}
          {item.size ? ` (${item.size})` : ''}
          {item.details ? <span className="text-yellow-500"> — {item.details}</span> : null}
        </li>
      ))}
    </ul>
    <button
      onClick={onPrimary}
      disabled={busy || isStatic}
      className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-[10px] uppercase tracking-[0.2em] transition-all"
    >
      {busy ? 'Procesando...' : primaryLabel}
    </button>
    {showClaimHint && <p className="text-center text-[10px] text-stone-600 mt-2">El primero que lo tome se lo lleva</p>}
  </div>
);

const EmptyColumn: React.FC<{ label: string }> = ({ label }) => (
  <p className="text-stone-600 text-xs text-center py-8">{label}</p>
);

const PedidosView: React.FC<PedidosViewProps> = ({ role, locationId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const isRepartidor = role === UserRole.REPARTIDOR;
  // ADMIN recibe todas las sedes de la API; respetar el selector de sede.
  const inLoc = useCallback((o: Order) => !locationId || o.locationId === locationId, [locationId]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      if (isRepartidor) {
        const [available, mine] = await Promise.all([
          api.getOrders('READY', { paidOnly: true }),
          api.getOrders(undefined, { paidOnly: true, mine: true }),
        ]);
        setOrders(available.filter(inLoc));
        setMyDeliveries(mine.filter((o: Order) => inLoc(o) && o.status === 'ASSIGNED' || o.status === 'DELIVERING'));
      } else {
        const all = await api.getOrders(undefined, { paidOnly: true });
        setOrders(all.filter((o: Order) => inLoc(o) && ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(o.status)));
      }
    } catch (e) {
      showToast(`Error cargando pedidos: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }, [isRepartidor, inLoc]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Recarga silenciosa (sin el spinner de pantalla completa) para WS/polling.
  const refresh = useCallback(async () => {
    try {
      if (isRepartidor) {
        const [available, mine] = await Promise.all([
          api.getOrders('READY', { paidOnly: true }),
          api.getOrders(undefined, { paidOnly: true, mine: true }),
        ]);
        setOrders(available.filter(inLoc));
        setMyDeliveries(mine.filter((o: Order) => inLoc(o) && o.status === 'ASSIGNED' || o.status === 'DELIVERING'));
      } else {
        const all = await api.getOrders(undefined, { paidOnly: true });
        setOrders(all.filter((o: Order) => inLoc(o) && ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(o.status)));
      }
    } catch {
      /* el próximo ciclo reintenta */
    }
  }, [isRepartidor, inLoc]);

  useWebSocket('order:new', () => {
    playNewOrderSound();
    refresh();
  });
  useWebSocket('order:update', () => refresh());

  // Respaldo si el WS se cae o el navegador lo suspende: sin esto un pedido
  // nuevo quedaba invisible hasta recargar a mano.
  useEffect(() => {
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const advance = async (order: Order, nextStatus: OrderStatus) => {
    setBusyId(order.id);
    try {
      await api.updateOrderStatus(order.id, nextStatus);
      await loadAll();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error desconocido';
      // 409 = otro repartidor ya lo tomó (self-claim); 403 = no es tuyo.
      showToast(msg.includes('tomado') || msg.includes('asignada') ? msg : `Error: ${msg}`);
      await loadAll();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="p-10 text-stone-500 text-sm font-bold uppercase tracking-widest">Cargando pedidos...</div>;
  }

  if (isRepartidor) {
    return (
      <div className="p-6 md:p-10 space-y-10">
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-stone-800 border border-stone-700 text-white px-5 py-3 rounded-xl text-sm shadow-2xl">
            {toast}
          </div>
        )}
        <div>
          <h2 className="text-white font-black text-xl uppercase tracking-wider mb-1">Mis entregas</h2>
          <p className="text-stone-500 text-sm mb-5">Pedidos que ya tomaste, en orden de asignación.</p>
          {myDeliveries.length === 0 ? (
            <EmptyColumn label="No tenés entregas activas" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myDeliveries.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  busy={busyId === o.id}
                  primaryLabel={o.status === 'ASSIGNED' ? 'Salir a entregar' : 'Marcar entregado'}
                  onPrimary={() => advance(o, o.status === 'ASSIGNED' ? OrderStatus.DELIVERING : OrderStatus.COMPLETED)}
                />
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-white font-black text-xl uppercase tracking-wider mb-1">Disponibles</h2>
          <p className="text-stone-500 text-sm mb-5">Pedidos listos esperando repartidor.</p>
          {orders.length === 0 ? (
            <EmptyColumn label="No hay pedidos disponibles ahora mismo" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  busy={busyId === o.id}
                  primaryLabel="Tomar pedido"
                  showClaimHint
                  onPrimary={() => advance(o, OrderStatus.ASSIGNED)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Cocina (OPERATOR/ADMIN): kanban PENDING -> CONFIRMED -> PREPARING -> READY.
  const COLUMNS: { status: OrderStatus; label: string; next?: OrderStatus; nextLabel?: string }[] = [
    { status: OrderStatus.PENDING, label: 'Nuevos', next: OrderStatus.CONFIRMED, nextLabel: 'Confirmar' },
    {
      status: OrderStatus.CONFIRMED,
      label: 'Confirmados',
      next: OrderStatus.PREPARING,
      nextLabel: 'Empezar a preparar',
    },
    { status: OrderStatus.PREPARING, label: 'Preparando', next: OrderStatus.READY, nextLabel: 'Marcar listo' },
    { status: OrderStatus.READY, label: 'Listos (esperando repartidor)' },
  ];

  return (
    <div className="p-6 md:p-10">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-stone-800 border border-stone-700 text-white px-5 py-3 rounded-xl text-sm shadow-2xl">
          {toast}
        </div>
      )}
      <h2 className="text-white font-black text-xl uppercase tracking-wider mb-1">Pedidos</h2>
      <p className="text-stone-500 text-sm mb-6">
        {locationId ? `Sede: ${locationId}` : 'Todas las sedes'} — pasan de estado según se van preparando.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {COLUMNS.map((col) => {
          const items = orders.filter((o) => o.status === col.status);
          return (
            <div key={col.status}>
              <h3 className="text-stone-300 font-black text-xs uppercase tracking-widest mb-3 pb-2 border-b border-stone-800">
                {col.label} <span className="text-stone-600">({items.length})</span>
              </h3>
              <div className="space-y-4">
                {items.length === 0 ? (
                  <EmptyColumn label="Sin pedidos" />
                ) : (
                  items.map((o) =>
                    col.next ? (
                      <OrderCard
                        key={o.id}
                        order={o}
                        busy={busyId === o.id}
                        primaryLabel={col.nextLabel!}
                        onPrimary={() => advance(o, col.next!)}
                      />
                    ) : (
                      <OrderCard key={o.id} order={o} static primaryLabel="Esperando repartidor" />
                    )
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PedidosView;
