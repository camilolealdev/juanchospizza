
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
      address: 'Cra 6 No. 5-40, Nemocón — Vía Principal',
      items: [], total: 54900, status: OrderStatus.READY, createdAt: '12:30 PM',
      estimatedTime: 20, paymentMethod: 'card'
    }
  ];

  if (activeOrder) {
    return (
      <div className="min-h-screen bg-stone-950 p-4 sm:p-6 flex flex-col gap-4 sm:gap-6">
        <button onClick={() => setActiveOrder(null)} className="text-stone-400 flex items-center gap-2 text-sm sm:text-base">
          <i className="fas fa-arrow-left"></i> Volver
        </button>
        <div className="bg-stone-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-stone-800 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-brand break-all sm:break-normal">{activeOrder.orderNumber}</h2>
              <p className="text-orange-500 font-bold text-sm sm:text-base">Estado: {activeOrder.status}</p>
            </div>
            <div className="bg-stone-800 px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold whitespace-nowrap">PAGO: {activeOrder.paymentMethod.toUpperCase()}</div>
          </div>

          <div className="p-3 sm:p-4 bg-stone-950 rounded-xl sm:rounded-2xl border border-stone-800 flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
              <i className="fas fa-map-marker-alt text-white text-sm sm:text-base"></i>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-stone-500 uppercase font-black">Destino</p>
              <p className="text-xs sm:text-sm font-bold break-words">{activeOrder.address}</p>
            </div>
          </div>

          <div className="h-48 sm:h-56 md:h-64 bg-stone-800 rounded-2xl sm:rounded-3xl relative overflow-hidden flex items-center justify-center">
            <p className="text-stone-500 text-[10px] sm:text-xs italic px-4 text-center">Simulación de Mapbox Directions API...</p>
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-orange-600 text-white p-1.5 sm:p-2 rounded-lg shadow-xl">
              <i className="fas fa-location-arrow text-sm sm:text-base"></i>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button onClick={() => showToast('Llamando al cliente...')} className="bg-stone-800 py-3 sm:py-4 rounded-2xl font-black text-[10px] sm:text-xs">LLAMAR CLIENTE</button>
            <button onClick={() => window.open('https://waze.com/ul?ll=4.7115,-74.0720&navigate=yes', '_blank')} className="bg-blue-600 py-3 sm:py-4 rounded-2xl font-black text-[10px] sm:text-xs">ABRIR WAZE</button>
          </div>

          <button onClick={() => showToast('Entrega marcada como exitosa ✓')} className="w-full bg-green-600 hover:bg-green-500 py-4 sm:py-5 rounded-2xl font-black text-white shadow-2xl transition-all text-xs sm:text-sm">
            ENTREGA EXITOSA (Firma Digital)
          </button>
        </div>
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 border border-stone-700 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-2xl z-50 text-xs sm:text-sm font-bold whitespace-nowrap">
            {toast}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 p-4 sm:p-6 flex flex-col gap-6 sm:gap-8">
      <div className="flex justify-between items-center gap-4">
          <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-brand truncate">Mis Entregas</h1>
          <p className="text-stone-500 text-xs sm:text-sm">Sede Nemocón — Vía Principal</p>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-orange-500 flex-shrink-0">
          <i className="fas fa-motorcycle text-sm sm:text-base"></i>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-stone-900 rounded-2xl border border-stone-800">
        <button 
          onClick={() => setActiveTab('assigned')}
          className={`flex-1 py-2.5 sm:py-3 rounded-xl text-[9px] sm:text-xs font-bold transition-all ${activeTab === 'assigned' ? 'bg-orange-600 text-white' : 'text-stone-500'}`}
        >
          POR RECOGER
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 sm:py-3 rounded-xl text-[9px] sm:text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-orange-600 text-white' : 'text-stone-500'}`}
        >
          HISTORIAL
        </button>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {mockAssigned.map(order => (
          <div 
            key={order.id} 
            onClick={() => setActiveOrder(order)}
            className="bg-stone-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-stone-800 flex justify-between items-center gap-3 group cursor-pointer active:scale-95 transition-all"
          >
            <div className="min-w-0 space-y-1">
              <span className="text-[9px] sm:text-[10px] font-black text-stone-500 uppercase truncate block">{order.orderNumber}</span>
              <h4 className="font-bold text-base sm:text-lg truncate">{order.customerName}</h4>
              <p className="text-[10px] sm:text-xs text-stone-500 flex items-center gap-1 truncate">
                <i className="fas fa-map-marker-alt text-orange-600 flex-shrink-0"></i> {order.address.split(',')[0]}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg sm:text-xl font-black text-orange-500">${order.total.toLocaleString()}</p>
              <span className="text-[9px] sm:text-[10px] bg-green-900/30 text-green-500 px-2 py-0.5 rounded-full font-bold">LISTO</span>
            </div>
          </div>
        ))}
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 border border-stone-700 px-4 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-2xl z-50 text-xs sm:text-sm font-bold whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
};

export default RepartidorView;
