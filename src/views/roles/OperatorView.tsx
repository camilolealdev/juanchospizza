
import React, { useState } from 'react';
import { OrderStatus } from '../../types';

const mockOrders = [
  { id: '1024', customer: 'Andrés G.', items: 'Pepperoni Large x1, Coca-Cola x2', status: OrderStatus.PREPARING, time: '12 min ago' },
  { id: '1025', customer: 'Camila R.', items: 'La Guido Especial x1', status: OrderStatus.PENDING, time: '3 min ago' },
  { id: '1023', customer: 'Jorge M.', items: 'Nutella Pizza x2', status: OrderStatus.READY, time: '25 min ago' },
];

const OperatorView: React.FC = () => {
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
  const [station, setStation] = useState('Preparación');

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
        <div className="mt-auto p-4 bg-red-950/30 border border-red-500/20 rounded-xl">
           <p className="text-xs text-red-400 font-bold">ALERTA COCINA</p>
           <p className="text-xs mt-1 text-stone-300">3 pedidos demorados ({'>'}40 min)</p>
        </div>
      </div>

      {/* Main Content - Kanban style */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 p-4 md:p-8 overflow-y-auto">
        {/* Pending */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold uppercase text-stone-500 text-xs">Pendientes ({mockOrders.filter(o => o.status === OrderStatus.PENDING).length})</h3>
            <i className="fas fa-circle text-stone-600 text-[6px]"></i>
          </div>
          {mockOrders.filter(o => o.status === OrderStatus.PENDING).map(order => (
            <div key={order.id} className="bg-stone-900 p-6 rounded-2xl border-l-4 border-l-stone-600 border border-stone-800 shadow-lg space-y-4">
              <div className="flex justify-between">
                <span className="font-black text-lg">#{order.id}</span>
                <span className="text-xs text-stone-500">{order.time}</span>
              </div>
              <p className="text-sm font-bold">{order.customer}</p>
              <p className="text-xs text-stone-400 italic">{order.items}</p>
              <button onClick={() => showToast(`Preparación iniciada para #${order.id}`)} className="w-full bg-stone-800 hover:bg-orange-600 py-3 rounded-lg text-xs font-bold transition-all">INICIAR PREPARACIÓN</button>
            </div>
          ))}
        </div>

        {/* Preparing */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold uppercase text-orange-500 text-xs">En Proceso ({mockOrders.filter(o => o.status === OrderStatus.PREPARING).length})</h3>
            <i className="fas fa-spinner fa-spin text-orange-500 text-[10px]"></i>
          </div>
          {mockOrders.filter(o => o.status === OrderStatus.PREPARING).map(order => (
            <div key={order.id} className="bg-stone-900 p-6 rounded-2xl border-l-4 border-l-orange-600 border border-stone-800 shadow-lg space-y-4">
              <div className="flex justify-between">
                <span className="font-black text-lg text-orange-500">#{order.id}</span>
                <span className="text-xs text-stone-500">{order.time}</span>
              </div>
              <p className="text-sm font-bold">{order.customer}</p>
              <p className="text-xs text-stone-400 italic">{order.items}</p>
              <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-600 w-2/3"></div>
              </div>
              <button onClick={() => showToast(`Pedido #${order.id} terminado`)} className="w-full bg-orange-600 hover:bg-orange-500 py-3 rounded-lg text-xs font-bold transition-all">TERMINAR</button>
            </div>
          ))}
        </div>

        {/* Ready */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="font-bold uppercase text-green-500 text-xs">Listos ({mockOrders.filter(o => o.status === OrderStatus.READY).length})</h3>
            <i className="fas fa-check-circle text-green-500 text-[10px]"></i>
          </div>
          {mockOrders.filter(o => o.status === OrderStatus.READY).map(order => (
            <div key={order.id} className="bg-stone-900 p-6 rounded-2xl border-l-4 border-l-green-600 border border-stone-800 shadow-lg space-y-4">
              <div className="flex justify-between">
                <span className="font-black text-lg text-green-500">#{order.id}</span>
                <span className="text-xs text-stone-500">{order.time}</span>
              </div>
              <p className="text-sm font-bold">{order.customer}</p>
              <p className="text-xs text-stone-400 italic">{order.items}</p>
              <div className="flex gap-2">
                <button onClick={() => showToast('Entrega local registrada')} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-lg text-[10px] font-black tracking-widest transition-all">ENTREGA LOCAL</button>
                <button onClick={() => showToast('Domicilio asignado a repartidor')} className="flex-1 bg-stone-800 hover:bg-blue-600 py-3 rounded-lg text-[10px] font-black tracking-widest transition-all">DOMICILIO</button>
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
