import React, { useState } from 'react';
import { LoyaltyLevel, LoyaltyReward, LoyaltyChallenge } from '../../types';

const NIVELES: LoyaltyLevel[] = [
  { id: 'bronce', nombre: 'Bronce', puntosMinimos: 0, descuento: 0, color: 'bronze', icono: 'fa-shield', beneficios: ['Acceso a promociones generales', 'Notificaciones de ofertas'] },
  { id: 'plata', nombre: 'Plata', puntosMinimos: 500, descuento: 3, color: 'silver', icono: 'fa-shield', beneficios: ['3% descuento en todas tus órdenes', 'Prioridad en pedidos', 'Acceso a menú exclusivo'] },
  { id: 'oro', nombre: 'Oro', puntosMinimos: 2000, descuento: 7, color: 'gold', icono: 'fa-crown', beneficios: ['7% descuento en todas tus órdenes', 'Envío gratis ilimitado', 'Postre sorpresa cada 5 pedidos', 'Soporte prioritario'] },
  { id: 'platino', nombre: 'Platino', puntosMinimos: 5000, descuento: 15, color: 'platinum', icono: 'fa-gem', beneficios: ['15% descuento en todas tus órdenes', 'Envío gratis ilimitado', 'Pizza Personal Gratis cada mes', 'Acceso a eventos VIP', 'Deduplicador de puntos'] },
];

const RECOMPENSAS: LoyaltyReward[] = [
  { id: 'r1', nombre: 'Pizza Personal Gratis', descripcion: 'Canjea por una pizza personal clásica', puntosCosto: 200, tipo: 'producto', valor: 0, vigente: true },
  { id: 'r2', nombre: '15% Off', descripcion: 'Descuento en tu próxima orden', puntosCosto: 150, tipo: 'descuento', valor: 15, vigente: true },
  { id: 'r3', nombre: 'Bebida Gratis', descripcion: 'Bebida de hasta $8,000', puntosCosto: 80, tipo: 'producto', valor: 0, vigente: true },
  { id: 'r4', nombre: 'Lasaña Gratis', descripcion: 'Lasaña clásica de la casa', puntosCosto: 300, tipo: 'producto', valor: 0, vigente: true },
  { id: 'r5', nombre: 'Envío Gratis', descripcion: 'Sin costo de domicilio', puntosCosto: 50, tipo: 'envio', valor: 0, vigente: true },
  { id: 'r6', nombre: 'Postre Sorpresa', descripcion: 'Postre dulce seleccionado por el chef', puntosCosto: 100, tipo: 'producto', valor: 0, vigente: true },
];

const RETOS: LoyaltyChallenge[] = [
  { id: 'ch1', nombre: 'Pizza Legend', descripcion: 'Pide 4 pizzas este mes', objetivo: 4, progreso: 3, recompensa: '500pts extra', inicia: '2026-06-01', termina: '2026-06-30', activo: true },
  { id: 'ch2', nombre: 'Family Feast', descripcion: '3 pedidos mayores a $50,000', objetivo: 3, progreso: 1, recompensa: 'Pizza Grande Gratis', inicia: '2026-06-01', termina: '2026-06-30', activo: true },
  { id: 'ch3', nombre: 'Weekend Warrior', descripcion: 'Pide viernes o sábado', objetivo: 2, progreso: 2, recompensa: '200pts extra', inicia: '2026-06-05', termina: '2026-06-07', activo: true },
];

interface CanjeRecord {
  cliente: string;
  recompensa: string;
  puntos: number;
  fecha: string;
}

const CANJES_RECIENTES: CanjeRecord[] = [
  { cliente: 'María López', recompensa: 'Pizza Personal Gratis', puntos: 200, fecha: '04 Jun 2026' },
  { cliente: 'Carlos Ruiz', recompensa: 'Bebida Gratis', puntos: 80, fecha: '03 Jun 2026' },
  { cliente: 'Ana Martínez', recompensa: 'Envío Gratis', puntos: 50, fecha: '02 Jun 2026' },
  { cliente: 'Pedro Gómez', recompensa: 'Postre Sorpresa', puntos: 100, fecha: '01 Jun 2026' },
  { cliente: 'Laura Jiménez', recompensa: '15% Off', puntos: 150, fecha: '31 May 2026' },
];

const LEVEL_BORDER: Record<string, string> = {
  bronze: 'border-amber-700/60 bg-gradient-to-br from-amber-900/10 to-stone-900',
  silver: 'border-stone-400/40 bg-gradient-to-br from-stone-400/10 to-stone-900',
  gold: 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-stone-900',
  platinum: 'border-sky-300/40 bg-gradient-to-br from-sky-300/10 to-stone-900',
};

const LEVEL_BADGE: Record<string, string> = {
  bronze: 'bg-amber-700/20 text-amber-400 border-amber-700/30',
  silver: 'bg-stone-400/20 text-stone-300 border-stone-400/30',
  gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  platinum: 'bg-sky-300/20 text-sky-300 border-sky-300/30',
};

const LEVEL_ACCENT: Record<string, string> = {
  bronze: 'text-amber-500',
  silver: 'text-stone-400',
  gold: 'text-yellow-500',
  platinum: 'text-sky-300',
};

const REWARD_TYPE_BADGE: Record<string, string> = {
  cupon: 'bg-purple-900/30 text-purple-400 border-purple-500/20',
  producto: 'bg-orange-900/30 text-orange-400 border-orange-500/20',
  descuento: 'bg-green-900/30 text-green-400 border-green-500/20',
  envio: 'bg-blue-900/30 text-blue-400 border-blue-500/20',
};

const REWARD_TYPE_LABEL: Record<string, string> = {
  cupon: 'Cupón',
  producto: 'Producto',
  descuento: 'Descuento',
  envio: 'Envío',
};

const CLIENTES = ['María López', 'Carlos Ruiz', 'Ana Martínez', 'Pedro Gómez', 'Laura Jiménez', 'Diego Ramírez', 'Sofía Torres'];

const FidelizacionView: React.FC = () => {
  const [recompensas, setRecompensas] = useState<LoyaltyReward[]>(RECOMPENSAS);
  const [retos] = useState<LoyaltyChallenge[]>(RETOS);
  const [puntosActivos, setPuntosActivos] = useState(12450);
  const [clientesCount] = useState(218);
  const [cashbackTotal] = useState(1240000);
  const [canjes, setCanjes] = useState<CanjeRecord[]>(CANJES_RECIENTES);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '', puntosCosto: 0, tipo: 'producto', valor: 0 });
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const showToastMessage = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  };

  const handleCanjear = (r: LoyaltyReward) => {
    if (puntosActivos < r.puntosCosto) {
      showToastMessage('❌ No tienes suficientes puntos');
      return;
    }
    const cliente = CLIENTES[Math.floor(Math.random() * CLIENTES.length)];
    const newCanje: CanjeRecord = {
      cliente,
      recompensa: r.nombre,
      puntos: r.puntosCosto,
      fecha: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' '),
    };
    setPuntosActivos((p) => p - r.puntosCosto);
    setCanjes((prev) => [newCanje, ...prev]);
    showToastMessage(`✅ ${r.nombre} canjeado por ${cliente}`);
  };

  const handleCrearRecompensa = () => {
    if (!formData.nombre || !formData.descripcion || formData.puntosCosto <= 0) {
      showToastMessage('❌ Completa todos los campos requeridos');
      return;
    }
    const newReward: LoyaltyReward = {
      id: `r${Date.now()}`,
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      puntosCosto: formData.puntosCosto,
      tipo: formData.tipo as LoyaltyReward['tipo'],
      valor: formData.valor,
      vigente: true,
    };
    setRecompensas((prev) => [...prev, newReward]);
    setShowForm(false);
    setFormData({ nombre: '', descripcion: '', puntosCosto: 0, tipo: 'producto', valor: 0 });
    showToastMessage('✅ Recompensa creada exitosamente');
  };

  return (
    <div className="p-10 space-y-12 pb-40">
      {toast.visible && (
        <div className="fixed top-6 right-6 z-50 bg-stone-900 border border-stone-700 text-white px-8 py-4 rounded-2xl shadow-2xl text-sm font-bold">
          {toast.message}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-[3rem] p-10 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-white">Nueva Recompensa</h3>
              <button onClick={() => setShowForm(false)} className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Nombre</label>
                <input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-orange-500 transition-colors"
                  placeholder="Ej: Pizza Personal Gratis"
                />
              </div>
              <div>
                <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-orange-500 transition-colors resize-none h-24"
                  placeholder="Describe la recompensa"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Puntos Requeridos</label>
                  <input
                    type="number"
                    value={formData.puntosCosto}
                    onChange={(e) => setFormData({ ...formData, puntosCosto: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Valor</label>
                  <input
                    type="number"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: Number(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Tipo</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="cupon">Cupón</option>
                  <option value="producto">Producto</option>
                  <option value="descuento">Descuento</option>
                  <option value="envio">Envío</option>
                </select>
              </div>
              <button
                onClick={handleCrearRecompensa}
                className="w-full bg-orange-600 hover:bg-orange-500 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl text-white"
              >
                <i className="fas fa-plus-circle mr-3"></i> CREAR RECOMPENSA
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-brand">Fidelización</h1>
          <p className="text-stone-500 mt-4 max-w-xl">Programa de lealtad, puntos y recompensas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-orange-600 hover:bg-orange-500 px-10 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4 w-full md:w-auto justify-center"
        >
          <i className="fas fa-plus-circle"></i> CREAR RECOMPENSA
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
        {[
          { label: 'Puntos Activos', value: puntosActivos.toLocaleString(), icon: 'star', color: 'text-orange-500' },
          { label: 'Clientes en Programa', value: clientesCount.toLocaleString(), icon: 'users', color: 'text-blue-500' },
          { label: 'Cashback Entregado', value: `$${cashbackTotal.toLocaleString()}`, icon: 'wallet', color: 'text-green-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800/50 shadow-2xl group hover:border-orange-500/40 transition-all">
            <div className="flex justify-between items-start mb-6">
              <span className="text-stone-600 text-[11px] uppercase font-black tracking-[0.4em]">{stat.label}</span>
              <div className={`w-12 h-12 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 ${stat.color}`}>
                <i className={`fas fa-${stat.icon} text-xl`}></i>
              </div>
            </div>
            <p className="text-5xl font-black text-white tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-8">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand">Niveles VIP</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Más puntos, más beneficios</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {NIVELES.map((nivel) => (
            <div key={nivel.id} className={`${LEVEL_BORDER[nivel.color]} p-8 rounded-[3rem] border shadow-2xl relative overflow-hidden group transition-all hover:scale-[1.02]`}>
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-5 bg-white"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl ${LEVEL_BADGE[nivel.color]} flex items-center justify-center border text-2xl`}>
                  <i className={`fas ${nivel.icono}`}></i>
                </div>
                <div>
                  <h3 className={`text-2xl font-black ${LEVEL_ACCENT[nivel.color]}`}>{nivel.nombre}</h3>
                  <p className="text-stone-500 text-[10px] uppercase tracking-[0.2em] font-bold">{nivel.puntosMinimos.toLocaleString()} pts mínimo</p>
                </div>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black text-white">{nivel.descuento}%</span>
                <span className="text-stone-500 text-sm ml-2 font-bold">OFF</span>
              </div>
              <ul className="space-y-3">
                {nivel.beneficios.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-stone-400 text-sm">
                    <i className={`fas fa-check-circle mt-0.5 text-xs ${LEVEL_ACCENT[nivel.color]}`}></i>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand">Recompensas</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Canjea tus puntos</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {recompensas.map((r) => (
            <div key={r.id} className="bg-stone-900/40 p-8 rounded-[3.5rem] border border-stone-800 hover:border-orange-500/40 transition-all group shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-5 bg-orange-500 group-hover:opacity-10 transition-opacity"></div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 text-orange-500 text-2xl group-hover:scale-110 transition-transform">
                  <i className={`fas ${r.tipo === 'descuento' ? 'fa-percent' : r.tipo === 'envio' ? 'fa-truck' : 'fa-pizza-slice'}`}></i>
                </div>
                <span className={`text-[8px] font-black uppercase px-4 py-2 rounded-full border ${REWARD_TYPE_BADGE[r.tipo]}`}>
                  {REWARD_TYPE_LABEL[r.tipo]}
                </span>
              </div>
              <h4 className="font-black text-xl text-white mb-2">{r.nombre}</h4>
              <p className="text-stone-500 text-sm mb-8">{r.descripcion}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fas fa-coins text-yellow-500 text-lg"></i>
                  <span className="text-2xl font-black text-yellow-500">{r.puntosCosto}</span>
                  <span className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">pts</span>
                </div>
                <button
                  onClick={() => handleCanjear(r)}
                  disabled={puntosActivos < r.puntosCosto}
                  className="bg-orange-600 hover:bg-orange-500 px-6 py-3 rounded-[2rem] font-black text-[9px] uppercase tracking-widest transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  CANJEAR
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand">Retos Mensuales</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Completa retos y gana puntos extra</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {retos.map((reto) => {
            const pct = Math.min(Math.round((reto.progreso / reto.objetivo) * 100), 100);
            return (
              <div key={reto.id} className="bg-stone-900/40 p-8 rounded-[3.5rem] border border-stone-800 hover:border-orange-500/40 transition-all group shadow-2xl relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-40 h-40 blur-3xl opacity-5 bg-orange-500 rounded-full"></div>
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h4 className="font-black text-xl text-white mb-1">{reto.nombre}</h4>
                    <p className="text-stone-500 text-sm">{reto.descripcion}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 text-orange-500 text-lg shrink-0">
                    <i className="fas fa-fire"></i>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-stone-400 font-bold">{reto.progreso}/{reto.objetivo}</span>
                    <span className="text-stone-600 font-black text-[10px] uppercase tracking-wider">{pct}%</span>
                  </div>
                  <div className="h-3 bg-stone-950 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-orange-800 to-orange-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <i className="fas fa-gift text-yellow-500 text-sm"></i>
                  <span className="text-stone-300 text-sm font-bold">Reward: </span>
                  <span className="text-yellow-500 text-sm font-black">{reto.recompensa}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand">Últimos Canjes</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Actividad reciente del programa</p>
          </div>
        </div>
        <div className="bg-stone-900/40 rounded-[4rem] border border-stone-800 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] px-10 py-6">Cliente</th>
                  <th className="text-left text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] px-10 py-6">Recompensa</th>
                  <th className="text-left text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] px-10 py-6">Puntos</th>
                  <th className="text-left text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] px-10 py-6">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {canjes.map((canje, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-none hover:bg-stone-900/60 transition-colors">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-stone-950 flex items-center justify-center border border-white/5 text-stone-500">
                          <i className="fas fa-user text-sm"></i>
                        </div>
                        <span className="text-white font-bold text-sm">{canje.cliente}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-stone-300 text-sm font-medium">{canje.recompensa}</td>
                    <td className="px-10 py-6">
                      <span className="text-yellow-500 font-black">{canje.puntos} pts</span>
                    </td>
                    <td className="px-10 py-6 text-stone-500 text-sm">{canje.fecha}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FidelizacionView;
