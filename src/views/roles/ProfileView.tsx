
import React from 'react';
import { UserRole, OrderStatus } from '../../types';

interface ProfileProps {
  role: UserRole;
  onClose: () => void;
}

const ProfileView: React.FC<ProfileProps> = ({ role, onClose }) => {
  const renderRoleSpecificData = () => {
    switch (role) {
      case UserRole.CLIENT:
        return (
          <div className="space-y-10">
            {/* Loyalty & Rewards Card */}
            <div className="bg-gradient-to-br from-stone-900 to-black p-8 rounded-[3rem] border border-orange-500/20 shadow-2xl relative overflow-hidden group">
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-600/10 rounded-full blur-3xl group-hover:bg-orange-600/20 transition-all"></div>
               <div className="flex justify-between items-center mb-6 relative z-10">
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em]">Club Guido Platinum</span>
                  <i className="fas fa-crown text-orange-500 text-lg"></i>
               </div>
               <div className="flex items-end gap-3 mb-6 relative z-10">
                  <span className="text-6xl font-black text-white tracking-tighter">4,520</span>
                  <span className="text-stone-500 font-bold mb-2 uppercase text-[10px]">Puntos Acumulados</span>
               </div>
               <div className="space-y-3 relative z-10">
                  <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                     <div className="h-full bg-orange-600 w-3/4 shadow-[0_0_15px_rgba(234,88,12,0.5)]"></div>
                  </div>
                  <div className="flex justify-between text-[8px] font-black text-stone-600 uppercase tracking-widest">
                     <span>Nivel Plata</span>
                     <span className="text-orange-400">480 puntos para Nivel Oro</span>
                  </div>
               </div>
            </div>

            {/* Quick Coupons */}
            <div className="space-y-6">
               <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] px-2">Cupones Disponibles</h4>
               <div className="grid grid-cols-1 gap-4">
                  <div className="bg-stone-900/50 p-6 rounded-[2rem] border-2 border-dashed border-stone-800 flex justify-between items-center hover:border-orange-500/30 transition-all group">
                     <div>
                        <p className="text-lg font-black text-white">15% OFF</p>
                        <p className="text-[9px] text-stone-500 font-bold uppercase">En Pizzas Dulces • Vence hoy</p>
                     </div>
                     <button className="bg-stone-800 group-hover:bg-orange-600 px-6 py-2 rounded-full text-[8px] font-black uppercase transition-all">Aplicar</button>
                  </div>
               </div>
            </div>

            {/* Recent Orders */}
            <div className="space-y-6">
               <div className="flex justify-between items-center px-2">
                  <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">Últimos Pedidos</h4>
                  <button className="text-[9px] font-bold text-orange-500 uppercase">Ver historial</button>
               </div>
               <div className="space-y-3">
                  {[
                    { id: '1024', date: 'Ayer, 8:30 PM', total: 54900, status: 'Completado' },
                    { id: '1021', date: '12 May, 7:15 PM', total: 42900, status: 'Completado' }
                  ].map(order => (
                    <div key={order.id} className="flex justify-between items-center p-6 bg-stone-900/40 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-all cursor-pointer">
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-stone-800 flex items-center justify-center text-orange-600 border border-white/5">
                             <i className="fas fa-pizza-slice"></i>
                          </div>
                          <div>
                             <p className="text-sm font-bold text-white">Pedido #{order.id}</p>
                             <p className="text-[9px] text-stone-600 font-bold uppercase">{order.date}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-black text-white">${order.total.toLocaleString()}</p>
                          <p className="text-[8px] text-green-500 font-black uppercase">{order.status}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        );

      case UserRole.ADMIN:
        return (
          <div className="space-y-10">
            {/* Executive KPIs */}
            <div className="grid grid-cols-2 gap-6">
               <div className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-stone-800">
                  <p className="text-[9px] font-black text-stone-600 uppercase mb-4 tracking-widest">Ventas Hoy</p>
                  <p className="text-4xl font-black text-green-500">$4.2M</p>
                  <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-green-600 uppercase">
                     <i className="fas fa-caret-up"></i> 12.5% vs ayer
                  </div>
               </div>
               <div className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-stone-800">
                  <p className="text-[9px] font-black text-stone-600 uppercase mb-4 tracking-widest">Repartidores</p>
                  <p className="text-4xl font-black text-white">8/12</p>
                  <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-blue-500 uppercase">
                     <i className="fas fa-circle animate-pulse"></i> 4 Disponibles
                  </div>
               </div>
            </div>

            {/* System Monitor */}
            <div className="bg-stone-950 p-8 rounded-[3rem] border border-white/5 space-y-6">
               <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em] px-2">Estado Crítico de Sede Suba</h4>
               <div className="space-y-4">
                  {[
                    { label: 'Cocina (Hornos)', value: 'Normal', color: 'text-green-500' },
                    { label: 'Pedidos en Cola', value: '14 Pedidos', color: 'text-orange-500' },
                    { label: 'Tiempo de Entrega', value: '34 min prom.', color: 'text-yellow-500' }
                  ].map((stat, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                       <span className="text-xs text-stone-400 font-bold">{stat.label}</span>
                       <span className={`text-xs font-black uppercase ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
               </div>
            </div>

            {/* Management Quick Actions */}
            <div className="grid grid-cols-1 gap-4">
               <button className="w-full bg-orange-600 py-6 rounded-[2.5rem] text-xs font-black uppercase tracking-widest shadow-2xl transition-all hover:bg-orange-500">
                  Panel de Personal (Turnos)
               </button>
               <button className="w-full bg-stone-800 py-6 rounded-[2.5rem] text-xs font-black uppercase tracking-widest transition-all hover:bg-stone-700">
                  Ajustes de Precios Globales
               </button>
            </div>
          </div>
        );

      case UserRole.OPERATOR:
        return (
          <div className="space-y-10">
            {/* Active Shift Card */}
            <div className="bg-green-950/20 p-10 rounded-[3.5rem] border border-green-500/20 flex justify-between items-center">
               <div>
                  <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2">Turno Actual</p>
                  <p className="text-3xl font-black text-white">En Preparación</p>
                  <p className="text-xs text-stone-500 mt-1 font-bold">Desde las 08:00 AM • Sede Suba Alta</p>
               </div>
               <div className="w-20 h-20 rounded-full bg-green-500/10 flex flex-col items-center justify-center border border-green-500/30">
                  <span className="text-2xl font-black text-green-500">32</span>
                  <span className="text-[7px] font-black text-green-600 uppercase">Pedidos</span>
               </div>
            </div>

            {/* Kitchen Checklist */}
            <div className="space-y-6">
               <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em] px-2">Protocolo de Turno</h4>
               <div className="space-y-3">
                  {[
                    { task: 'Verificación de Masa (48h fermentación)', done: true },
                    { task: 'Control de Temperatura de Hornos', done: true },
                    { task: 'Inventario de Ingredientes D.O.P', done: false },
                    { task: 'Limpieza de Estación de Empaque', done: false }
                  ].map((t, i) => (
                    <div key={i} className={`p-6 rounded-[2rem] border transition-all flex items-center gap-6 ${t.done ? 'bg-stone-900/60 border-stone-800 text-stone-500' : 'bg-stone-900 border-orange-500/30 text-white shadow-xl'}`}>
                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${t.done ? 'border-green-500/50 bg-green-500/10 text-green-500' : 'border-stone-700 bg-stone-950'}`}>
                          {t.done && <i className="fas fa-check text-[10px]"></i>}
                       </div>
                       <span className="text-xs font-bold uppercase tracking-tight">{t.task}</span>
                    </div>
                  ))}
               </div>
            </div>

            <button className="w-full bg-red-600/10 border border-red-500/20 py-6 rounded-[2.5rem] text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all">
               Reportar Incidencia en Cocina
            </button>
          </div>
        );

      case UserRole.REPARTIDOR:
        return (
          <div className="space-y-10">
            {/* Wallet & Ratings */}
            <div className="grid grid-cols-2 gap-6">
               <div className="bg-blue-900/10 p-8 rounded-[2.5rem] border border-blue-500/20 flex flex-col items-center">
                  <i className="fas fa-wallet text-blue-500 text-xl mb-4"></i>
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Billetera Hoy</p>
                  <p className="text-3xl font-black text-white">$145k</p>
               </div>
               <div className="bg-yellow-900/10 p-8 rounded-[2.5rem] border border-yellow-500/20 flex flex-col items-center">
                  <i className="fas fa-star text-yellow-500 text-xl mb-4"></i>
                  <p className="text-[9px] font-black text-yellow-400 uppercase tracking-widest mb-1">Tu Rating</p>
                  <p className="text-3xl font-black text-white">4.92</p>
               </div>
            </div>

            {/* Vehicle & Tools */}
            <div className="bg-stone-900/40 p-8 rounded-[3rem] border border-stone-800 space-y-6">
               <h4 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.4em] px-2">Estado Logístico</h4>
               <div className="flex items-center gap-6 p-6 bg-stone-950 rounded-3xl border border-white/5">
                  <div className="w-14 h-14 bg-stone-900 rounded-2xl flex items-center justify-center">
                     <i className="fas fa-motorcycle text-stone-600 text-xl"></i>
                  </div>
                  <div>
                     <p className="text-xs font-bold text-white">Yamaha NMAX - BOG-123</p>
                     <p className="text-[9px] text-green-500 font-black uppercase">Documentos al día (SOAT v2025)</p>
                  </div>
               </div>
               <button className="w-full bg-blue-600 py-6 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-blue-500 transition-all">
                  Iniciar Ruta de Entregas IA
               </button>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-stone-950/80 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
       <div className="bg-stone-950 w-full max-w-2xl rounded-[5rem] border border-white/5 shadow-[0_50px_150px_rgba(0,0,0,0.95)] overflow-hidden relative flex flex-col max-h-[90vh]">
          {/* Decorative Top Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-600"></div>
          
          {/* Header Profile Section */}
          <div className="relative shrink-0 h-72 bg-gradient-to-br from-stone-900 to-stone-950 flex flex-col items-center justify-end pb-10">
             <button 
               onClick={onClose} 
               className="absolute top-10 right-10 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all z-20"
             >
               <i className="fas fa-times"></i>
             </button>
             
             <div className="relative mb-6">
                <div className="w-32 h-32 rounded-[3.5rem] bg-stone-950 border-8 border-stone-950 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden relative">
                   <img 
                     src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`} 
                     className="w-full h-full object-cover" 
                     alt="User avatar"
                   />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 border-4 border-stone-950 rounded-full flex items-center justify-center shadow-lg">
                   <i className="fas fa-check text-stone-950 text-[10px]"></i>
                </div>
             </div>
             
             <div className="text-center space-y-1">
                <h2 className="text-3xl font-brand text-white tracking-tight">
                  {role === UserRole.CLIENT ? 'Andrés García' : `Equipo Guido ${role.charAt(0) + role.slice(1).toLowerCase()}`}
                </h2>
                <div className="flex justify-center gap-3">
                   <span className="text-[8px] font-black bg-white/5 text-stone-500 px-6 py-1.5 rounded-full border border-white/5 uppercase tracking-[0.4em]">{role}</span>
                   <span className="text-[8px] font-black bg-orange-600/20 text-orange-500 px-6 py-1.5 rounded-full border border-orange-500/20 uppercase tracking-[0.4em]">Sede Suba</span>
                </div>
             </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-10 md:p-16 pt-6 custom-scrollbar">
             {renderRoleSpecificData()}
             
             {/* Shared Actions Footer */}
             <div className="mt-20 pt-10 border-t border-white/5 flex flex-col items-center gap-8">
                <div className="flex gap-10">
                   <button className="text-stone-700 hover:text-orange-500 transition-colors flex flex-col items-center gap-2 group">
                      <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fas fa-cog"></i></div>
                      <span className="text-[7px] font-black uppercase tracking-widest">Ajustes</span>
                   </button>
                   <button className="text-stone-700 hover:text-blue-500 transition-colors flex flex-col items-center gap-2 group">
                      <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fas fa-shield-halved"></i></div>
                      <span className="text-[7px] font-black uppercase tracking-widest">Seguridad</span>
                   </button>
                   <button className="text-stone-700 hover:text-red-500 transition-colors flex flex-col items-center gap-2 group">
                      <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fas fa-power-off"></i></div>
                      <span className="text-[7px] font-black uppercase tracking-widest">Salir</span>
                   </button>
                </div>
                <p className="text-[8px] font-black text-stone-800 uppercase tracking-[0.6em]">Guido Mastery v2.4.1 - 2024</p>
             </div>
          </div>
       </div>
    </div>
  );
};

export default ProfileView;
