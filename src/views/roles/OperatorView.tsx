
import React, { useEffect, useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { api } from '../../services/api';

type ApiOrder = Omit<Order, 'items'> & { items: string | Order['items'] };

const normalize = (order: ApiOrder): Order => ({
  ...order,
  items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
});

const OperatorView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [toast, setToast] = useState('');
  const [station, setStation] = useState('Preparación');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const loadOrders = async () => {
    try {
      const apiOrders = await api.getOrders(undefined, { paidOnly: true });
      setOrders(apiOrders.map(normalize));
    } catch (e) {
      showToast(`Error cargando pedidos: ${e instanceof Error ? e.message : 'error desconocido'}`);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: string, status: OrderStatus, successMsg: string) => {
    try {
      await api.updateOrderStatus(id, status);
      showToast(successMsg);
      loadOrders();
    } catch (e) {
      showToast(`Error actualizando pedido: ${e instanceof Error ? e.message : 'error desconocido'}`);
    }
  };

  const pending = orders.filter(o => o.status === OrderStatus.PENDING);
  const preparing = orders.filter(o => o.status === OrderStatus.PREPARING);
  const ready = orders.filter(o => o.status === OrderStatus.READY);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar - Stations */}
      <div className="w-full md:w-64 bg-stone-900 border-b md:border-r border-stone-800 p-4 md:p-6 flex flex-col shrink-0">
        <h2 className="text-xs font-black uppercase text-stone-500 mb-8 tracking-widest">Estaciones</h2>
        <div className="space-y-4">
          {['Preparación', 'Horno', 'Empaque', 'Reparto'].map((s, i) => (
            <button key={i} onClick={() => { setStation(s); showToast(`Estación: ${s}`); }} className={`w-full text-left p-4 rounded-xl transition-all ${station === s ? 'bg-orange-600 font-bold text-white' : 'hover:bg-stone-800 text-stone-400'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="mt-auto p-4 bg-stone-950 border border-stone-800 rounded-xl">
          <p className="text-xs text-stone-500 font-bold">PEDIDOS ACTIVOS</p>
          <p className="text-xs mt-1 text-stone-300">{pending.length + preparing.length + ready.length} en curso</p>
        </div>
      </div>

      {/* Main Content - Kanban style */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 p-4 md:p-8 overflow-y-auto">
        {/* Pending */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold uppercase text-stone-500 text-xs">Pendientes ({pending.length})</h3>
            <i className="fas fa-circle text-stone-600 text-[6px]"></i>
          </div>
          {pending.map(order => (
            <div key={order.id} className="bg-stone-900 p-6 rounded-2xl border-l-4 border-l-stone-600 border border-stone-800 shadow-lg space-y-4">
              <div className="flex justify-between">
                <span className="font-black text-lg">{order.orderNumber}</span>
                <span className="text-xs text-stone-500">{new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm font-bold">{order.customerName}</p>
              <p className="text-xs text-stone-400 italic">{order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
              <button onClick={() => updateStatus(order.id, OrderStatus.PREPARING, `Preparación iniciada para ${order.orderNumber}`)} className="w-full bg-stone-800 hover:bg-orange-600 py-3 rounded-lg text-xs font-bold transition-all">INICIAR PREPARACIÓN</button>
            </div>
          ))}
        </div>

        {/* Preparing */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold uppercase text-orange-500 text-xs">En Proceso ({preparing.length})</h3>
            <i className="fas fa-spinner fa-spin text-orange-500 text-[10px]"></i>
          </div>
          {preparing.map(order => (
            <div key={order.id} className="bg-stone-900 p-6 rounded-2xl border-l-4 border-l-orange-600 border border-stone-800 shadow-lg space-y-4">
              <div className="flex justify-between">
                <span className="font-black text-lg text-orange-500">{order.orderNumber}</span>
                <span className="text-xs text-stone-500">{new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm font-bold">{order.customerName}</p>
              <p className="text-xs text-stone-400 italic">{order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
              <button onClick={() => updateStatus(order.id, OrderStatus.READY, `Pedido ${order.orderNumber} terminado`)} className="w-full bg-orange-600 hover:bg-orange-500 py-3 rounded-lg text-xs font-bold transition-all">TERMINAR</button>
            </div>
          ))}
        </div>

        {/* Ready */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold uppercase text-green-500 text-xs">Listos ({ready.length})</h3>
            <i className="fas fa-check-circle text-green-500 text-[10px]"></i>
          </div>
          {ready.map(order => (
            <div key={order.id} className="bg-stone-900 p-6 rounded-2xl border-l-4 border-l-green-600 border border-stone-800 shadow-lg space-y-4">
              <div className="flex justify-between">
                <span className="font-black text-lg text-green-500">{order.orderNumber}</span>
                <span className="text-xs text-stone-500">{new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm font-bold">{order.customerName}</p>
              <p className="text-xs text-stone-400 italic">{order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</p>
              <div className="flex gap-2">
                <button onClick={() => updateStatus(order.id, OrderStatus.COMPLETED, 'Entrega local registrada')} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-lg text-[10px] font-black tracking-widest transition-all">ENTREGA LOCAL</button>
                <button onClick={() => updateStatus(order.id, OrderStatus.ASSIGNED, 'Domicilio asignado a repartidor')} className="flex-1 bg-stone-800 hover:bg-blue-600 py-3 rounded-lg text-[10px] font-black tracking-widest transition-all">DOMICILIO</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 border border-stone-700 px-6 py-3 rounded-2xl shadow-2xl z-50 text-sm font-bold animate-bounceIn">
          {toast}
        </div>
      )}
    </div>
  );
};

export default OperatorView;
