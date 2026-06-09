
import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';

const RepartidorView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'assigned' | 'history'>('assigned');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const mockAssigned: Order[] = [
    {
      id: 'r1', orderNumber: 'GUIDO-2024-099', userId: 'u1', customerName: 'Juan Valdez',
      address: 'Carrera 54A #167A-50, San Cipriano, Suba',
      items: [], total: 54900, status: OrderStatus.READY, createdAt: '12:30 PM',
      estimatedTime: 20, paymentMethod: 'card'
    }
  ];

  if (activeOrder) {
    return (
      <div className="min-h-screen bg-stone-950 p-6 flex flex-col gap-6">
        <button onClick={() => setActiveOrder(null)} className="text-stone-400 flex items-center gap-2">
          <i className="fas fa-arrow-left"></i> Volver
        </button>
        <div className="bg-stone-900 rounded-3xl p-6 border border-stone-800 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-brand">{activeOrder.orderNumber}</h2>
              <p className="text-orange-500 font-bold">Estado: {activeOrder.status}</p>
            </div>
            <div className="bg-stone-800 px-3 py-1 rounded-full text-[10px] font-bold">PAGO: {activeOrder.paymentMethod.toUpperCase()}</div>
          </div>

          <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
              <i className="fas fa-map-marker-alt text-white"></i>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase font-black">Destino</p>
              <p className="text-sm font-bold">{activeOrder.address}</p>
            </div>
          </div>

          <div className="h-64 bg-stone-800 rounded-3xl relative overflow-hidden flex items-center justify-center">
            <p className="text-stone-500 text-xs italic">Simulación de Mapbox Directions API...</p>
            <div className="absolute top-4 right-4 bg-orange-600 text-white p-2 rounded-lg shadow-xl">
              <i className="fas fa-location-arrow"></i>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => showToast('Llamando al cliente...')} className="bg-stone-800 py-4 rounded-2xl font-black text-xs">LLAMAR CLIENTE</button>
            <button onClick={() => window.open('https://waze.com/ul?ll=4.7115,-74.0720&navigate=yes', '_blank')} className="bg-blue-600 py-4 rounded-2xl font-black text-xs">ABRIR WAZE</button>
          </div>

          <button onClick={() => showToast('Entrega marcada como exitosa ✓')} className="w-full bg-green-600 hover:bg-green-500 py-5 rounded-2xl font-black text-white shadow-2xl transition-all">
            ENTREGA EXITOSA (Firma Digital)
          </button>
        </div>
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 border border-stone-700 px-6 py-3 rounded-2xl shadow-2xl z-50 text-sm font-bold">
            {toast}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 p-6 flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-brand">Mis Entregas</h1>
          <p className="text-stone-500 text-sm">Sede San Cipriano, Suba</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-orange-500">
          <i className="fas fa-motorcycle"></i>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-stone-900 rounded-2xl border border-stone-800">
        <button 
          onClick={() => setActiveTab('assigned')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'assigned' ? 'bg-orange-600 text-white' : 'text-stone-500'}`}
        >
          POR RECOGER
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-orange-600 text-white' : 'text-stone-500'}`}
        >
          HISTORIAL
        </button>
      </div>

      <div className="space-y-4">
        {mockAssigned.map(order => (
          <div 
            key={order.id} 
            onClick={() => setActiveOrder(order)}
            className="bg-stone-900 p-6 rounded-3xl border border-stone-800 flex justify-between items-center group cursor-pointer active:scale-95 transition-all"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-black text-stone-500 uppercase">{order.orderNumber}</span>
              <h4 className="font-bold text-lg">{order.customerName}</h4>
              <p className="text-xs text-stone-500 flex items-center gap-1">
                <i className="fas fa-map-marker-alt text-orange-600"></i> {order.address.split(',')[0]}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-orange-500">${order.total.toLocaleString()}</p>
              <span className="text-[10px] bg-green-900/30 text-green-500 px-2 py-0.5 rounded-full font-bold">LISTO</span>
            </div>
          </div>
        ))}
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 border border-stone-700 px-6 py-3 rounded-2xl shadow-2xl z-50 text-sm font-bold">
          {toast}
        </div>
      )}
    </div>
  );
};

export default RepartidorView;
