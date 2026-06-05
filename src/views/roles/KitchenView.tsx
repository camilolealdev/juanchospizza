
import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../../types';
import { api } from '../../services/api';

const KitchenView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [useApi, setUseApi] = useState(false);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const apiOrders = await api.getOrders();
        setOrders(apiOrders.map((o: any) => ({
          ...o,
          items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items
        })));
        setUseApi(true);
      } catch (e) {
        const saved = localStorage.getItem('guido_live_orders');
        if (saved) {
          setOrders(JSON.parse(saved));
        }
      }
    };
    loadOrders();
    
    const interval = setInterval(loadOrders, 10000);
    
    window.addEventListener('storage', loadOrders);
    window.addEventListener('new-order-submitted', loadOrders);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', loadOrders);
      window.removeEventListener('new-order-submitted', loadOrders);
    };
  }, []);

  const updateStatus = async (id: string, newStatus: OrderStatus) => {
    if (useApi) {
      try {
        await api.updateOrderStatus(id, newStatus);
      } catch (e) {
        console.error('API update failed');
      }
    }
    
    const updated = orders.map(o => o.id === id ? { ...o, status: newStatus } : o);
    setOrders(updated);
    localStorage.setItem('guido_live_orders', JSON.stringify(updated));
  };

  const clearCompleted = async () => {
    if (useApi) {
      try {
        const completed = orders.filter(o => o.status === OrderStatus.COMPLETED || o.status === OrderStatus.CANCELLED);
        for (const o of completed) {
          await api.updateOrderStatus(o.id, OrderStatus.COMPLETED);
        }
      } catch (e) {
        console.error('API clear failed');
      }
    }
    
    const active = orders.filter(o => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELLED);
    setOrders(active);
    localStorage.setItem('guido_live_orders', JSON.stringify(active));
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'border-stone-600 bg-stone-900/30';
      case OrderStatus.CONFIRMED: return 'border-blue-600 bg-blue-900/10';
      case OrderStatus.PREPARING: return 'border-orange-600 bg-orange-900/10';
      case OrderStatus.READY: return 'border-green-600 bg-green-900/10';
      default: return 'border-stone-800';
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-stone-950 text-white overflow-hidden">
      <div className="w-full md:w-72 bg-stone-900 border-b md:border-r border-stone-800 p-4 md:p-8 flex flex-col shrink-0">
        <h2 className="text-xl font-brand mb-8">Comanda Digital</h2>
        <div className="space-y-6 flex-1">
          <div className="bg-stone-800/50 p-4 rounded-2xl border border-stone-700">
            <p className="text-xs text-stone-500 uppercase font-bold mb-1">Pedidos Activos</p>
            <p className="text-2xl font-black">{orders.filter(o => o.status !== OrderStatus.COMPLETED).length}</p>
          </div>
          <button onClick={clearCompleted} className="w-full py-3 bg-stone-950 border border-white/10 rounded-xl text-[10px] font-black uppercase hover:bg-stone-800 transition-all">Limpiar Finalizados</button>
        </div>
        <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 mt-auto">
           <div className="flex items-center gap-3">
             <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
             <p className="text-xs font-bold uppercase tracking-tighter">Sede Suba: ONLINE</p>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto flex flex-col md:flex-row gap-6 p-4 md:p-8 bg-[#0a0a0a]">
        {/* Columna: Pendientes */}
        <div className="w-full md:w-[380px] flex-shrink-0 flex flex-col gap-6">
          <h3 className="text-xs font-black text-stone-500 uppercase tracking-widest px-4">Pendientes / Nuevos ({orders.filter(o => o.status === OrderStatus.PENDING).length})</h3>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
            {orders.filter(o => o.status === OrderStatus.PENDING).map(o => (
              <div key={o.id} className={`p-8 rounded-[2.5rem] border-2 shadow-2xl transition-all hover:scale-[1.02] ${getStatusColor(o.status)}`}>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-black text-stone-500 tracking-widest">{o.orderNumber}</span>
                  <span className="text-[10px] bg-stone-800 px-3 py-1 rounded-full font-black uppercase">{o.paymentMethod}</span>
                </div>
                <h4 className="text-xl font-black mb-4">{o.customerName}</h4>
                <div className="space-y-4 py-6 border-y border-white/5 my-4">
                  {o.items.map(item => (
                    <div key={item.id} className="flex flex-col text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-orange-500 uppercase tracking-tighter">{item.quantity}x {item.name}</span>
                        <span className="text-[10px] text-stone-600">${item.price.toLocaleString()}</span>
                      </div>
                      {/* DETALLE CRÍTICO DE PERSONALIZACIÓN */}
                      {item.productId === 'custom-pizza' && (
                        <div className="mt-3 p-4 bg-stone-950/50 rounded-2xl border border-orange-500/10">
                          <p className="text-[10px] text-stone-400 leading-relaxed font-medium">
                            <i className="fas fa-info-circle mr-2 text-orange-600"></i>
                            {item.id.includes('custom') || true ? (
                              // Mostramos el detalle que viene en el item
                              (o as any).items[0].details || "Ver detalle en tablet de preparación"
                            ) : "Pizza Artesanal Personalizada"}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => updateStatus(o.id, OrderStatus.PREPARING)} className="flex-1 bg-orange-600 hover:bg-orange-500 py-4 rounded-2xl font-black transition-all text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-orange-900/20">PREPARAR</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna: En Preparación */}
        <div className="w-full md:w-[380px] flex-shrink-0 flex flex-col gap-6">
          <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest px-4">En Preparación ({orders.filter(o => o.status === OrderStatus.PREPARING).length})</h3>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
            {orders.filter(o => o.status === OrderStatus.PREPARING).map(o => (
              <div key={o.id} className={`p-8 rounded-[2.5rem] border-2 shadow-2xl transition-all ${getStatusColor(o.status)}`}>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-black text-orange-500">{o.orderNumber}</span>
                  <i className="fas fa-fire-alt text-orange-600 animate-pulse"></i>
                </div>
                <h4 className="text-xl font-black mb-1">{o.customerName}</h4>
                <div className="space-y-3 py-6 border-y border-white/5 my-4">
                  {o.items.map(item => (
                    <div key={item.id} className="flex flex-col text-sm">
                      <span className="font-bold text-stone-200">{item.quantity}x {item.name}</span>
                      <span className="text-[10px] text-stone-500 italic">{(o as any).items[0].details?.substring(0, 60)}...</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => updateStatus(o.id, OrderStatus.READY)} className="w-full bg-orange-600 hover:bg-orange-500 py-4 rounded-2xl font-black transition-all text-[10px] uppercase tracking-[0.2em]">MARCAR LISTO</button>
              </div>
            ))}
          </div>
        </div>

        {/* Columna: Listos */}
        <div className="w-full md:w-[380px] flex-shrink-0 flex flex-col gap-6">
          <h3 className="text-xs font-black text-green-500 uppercase tracking-widest px-4">Listos / Despacho ({orders.filter(o => o.status === OrderStatus.READY).length})</h3>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
            {orders.filter(o => o.status === OrderStatus.READY).map(o => (
              <div key={o.id} className={`p-8 rounded-[2.5rem] border-2 shadow-2xl transition-all ${getStatusColor(o.status)}`}>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-black text-green-500">{o.orderNumber}</span>
                  <i className="fas fa-check-double text-green-500"></i>
                </div>
                <h4 className="text-xl font-black mb-4">{o.customerName}</h4>
                <div className="flex gap-3">
                  <button onClick={() => updateStatus(o.id, OrderStatus.COMPLETED)} className="flex-1 bg-green-600 hover:bg-green-500 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">ENTREGADO</button>
                  <button onClick={() => updateStatus(o.id, OrderStatus.DELIVERING)} className="flex-1 bg-stone-800 hover:bg-stone-700 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-stone-700">REPARTO</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenView;
