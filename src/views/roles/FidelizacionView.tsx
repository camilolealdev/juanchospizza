import React, { useState } from 'react';
import { LoyaltyLevel, LoyaltyReward, LoyaltyChallenge } from '../../types';

const NIVELES: LoyaltyLevel[] = [
  { id: 'bronce', nombre: 'Bronce', puntosMinimos: 0, descuento: 0, color: 'bronze', icono: 'fa-shield', beneficios: ['Acceso a promociones generales', 'Notificaciones de ofertas'] },
  { id: 'plata', nombre: 'Plata', puntosMinimos: 500, descuento: 3, color: 'silver', icono: 'fa-shield', beneficios: ['3% descuento en todas tus órdenes', 'Prioridad en pedidos', 'Acceso a menú exclusivo'] },
  { id: 'oro', nombre: 'Oro', puntosMinimos: 2000, descuento: 7, color: 'gold', icono: 'fa-crown', beneficios: ['7% descuento en todas tus órdenes', 'Envío gratis ilimitado', 'Postre sorpresa cada 5 pedidos', 'Soporte prioritario'] },
  { id: 'platino', nombre: 'Platino', puntosMinimos: 5000, descuento: 15, color: 'platinum', icono: 'fa-gem', beneficios: ['15% descuento en todas tus órdenes', 'Envío gratis ilimitado', 'Pizza Personal Gratis cada mes', 'Acceso a eventos VIP', 'Deduplicador de puntos'] },
];

const RECOMPENSAS_INICIALES: LoyaltyReward[] = [
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

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

const CLIENTES_DISPONIBLES = [
  'María López', 'Carlos Ruiz', 'Ana Martínez', 'Pedro Gómez', 'Laura Jiménez',
  'Diego Ramírez', 'Valentina Ortiz', 'Santiago Castro', 'Camila Torres', 'Felipe Herrera',
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

const FidelizacionView: React.FC = () => {
  const [puntosActivos, setPuntosActivos] = useState(12450);
  const [clientesPrograma, setClientesPrograma] = useState(218);
  const [cashbackEntregado, setCashbackEntregado] = useState(1240000);
  const [recompensas, setRecompensas] = useState<LoyaltyReward[]>(RECOMPENSAS_INICIALES);
  const [retos, setRetos] = useState<LoyaltyChallenge[]>(RETOS);
  const [canjes, setCanjes] = useState<CanjeRecord[]>([
    { cliente: 'María López', recompensa: 'Pizza Personal Gratis', puntos: 200, fecha: '04 Jun 2026' },
    { cliente: 'Carlos Ruiz', recompensa: 'Bebida Gratis', puntos: 80, fecha: '03 Jun 2026' },
    { cliente: 'Ana Martínez', recompensa: 'Envío Gratis', puntos: 50, fecha: '02 Jun 2026' },
    { cliente: 'Pedro Gómez', recompensa: 'Postre Sorpresa', puntos: 100, fecha: '01 Jun 2026' },
    { cliente: 'Laura Jiménez', recompensa: '15% Off', puntos: 150, fecha: '31 May 2026' },
  ]);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [challengeModal, setChallengeModal] = useState<LoyaltyChallenge | null>(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '', puntosCosto: '', tipo: 'producto' as LoyaltyReward['tipo'], valor: '' });
  const [canjeandoId, setCanjeandoId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleCanjear = (reward: LoyaltyReward) => {
    if (puntosActivos < reward.puntosCosto) {
      showToast(`No tienes suficientes puntos. Necesitas ${reward.puntosCosto} pts.`, 'error');
      return;
    }
    setCanjeandoId(reward.id);
    setTimeout(() => {
      const cliente = CLIENTES_DISPONIBLES[Math.floor(Math.random() * CLIENTES_DISPONIBLES.length)];
      const hoy = new Date();
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const fecha = `${hoy.getDate()} ${meses[hoy.getMonth()]} ${hoy.getFullYear()}`;
      const cashbackPct = 0.15;
      const cashbackGanado = Math.round(reward.puntosCosto * cashbackPct * 100);
      setPuntosActivos(prev => prev - reward.puntosCosto);
      setCashbackEntregado(prev => prev + cashbackGanado);
      setClientesPrograma(prev => {
        const existe = canjes.some(c => c.cliente === cliente);
        if (!existe && Math.random() > 0.5) return prev + 1;
        return prev;
      });
      setCanjes(prev => [{ cliente, recompensa: reward.nombre, puntos: reward.puntosCosto, fecha }, ...prev]);
      setCanjeandoId(null);
      showToast(`¡${reward.nombre} canjeado por ${cliente}! ${cashbackGanado.toLocaleString()} COP en cashback generado.`, 'success');
    }, 600);
  };

  const handleCreateReward = () => {
    const { nombre, descripcion, puntosCosto, tipo, valor } = formData;
    if (!nombre || !descripcion || !puntosCosto) {
      showToast('Completa todos los campos obligatorios.', 'error');
      return;
    }
    const nueva: LoyaltyReward = {
      id: `r${Date.now()}`,
      nombre,
      descripcion,
      puntosCosto: parseInt(puntosCosto, 10),
      tipo,
      valor: parseFloat(valor) || 0,
      vigente: true,
    };
    setRecompensas(prev => [...prev, nueva]);
    setFormData({ nombre: '', descripcion: '', puntosCosto: '', tipo: 'producto', valor: '' });
    setShowCreateModal(false);
    showToast(`Recompensa "${nombre}" creada con éxito.`, 'success');
  };

  const formatCurrency = (val: number) => {
    return '$' + val.toLocaleString('es-CO');
  };

  return (
    <div className="p-10 space-y-12 pb-40 relative">
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(234, 88, 12, 0.1); }
          50% { box-shadow: 0 0 40px rgba(234, 88, 12, 0.3); }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .toast-success { animation: slideDown 0.3s ease-out; }
        .card-canjeado {
          animation: pulse-glow 1s ease-out;
        }
      `}</style>

      {toast.show && (
        <div className={`fixed top-8 right-8 z-50 ${toast.type === 'success' ? 'toast-success' : 'animate-slideDown'}`}>
          <div className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] shadow-2xl border ${
            toast.type === 'success'
              ? 'bg-green-900/90 border-green-500/30 text-green-300'
              : 'bg-red-900/90 border-red-500/30 text-red-300'
          } backdrop-blur-xl`}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle text-green-400' : 'fa-exclamation-circle text-red-400'} text-xl`}></i>
            <span className="font-bold text-sm">{toast.message}</span>
            <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="ml-4 opacity-60 hover:opacity-100 transition-opacity">
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={() => setShowCreateModal(false)}>
          <div className="bg-stone-900/95 border border-stone-700/50 p-10 rounded-[3rem] shadow-2xl max-w-lg w-full mx-6 animate-slideDown" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black text-white">Crear Recompensa</h3>
              <button onClick={() => setShowCreateModal(false)} className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-700 transition-all">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] uppercase font-black tracking-[0.3em] text-stone-500 block mb-2">Nombre</label>
                <input
                  type="text" value={formData.nombre}
                  onChange={e => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full bg-stone-950 border border-stone-700/50 rounded-[1.5rem] px-5 py-4 text-white text-sm font-medium focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-stone-600"
                  placeholder="Ej: Pizza Mediana Gratis"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-black tracking-[0.3em] text-stone-500 block mb-2">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={e => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                  className="w-full bg-stone-950 border border-stone-700/50 rounded-[1.5rem] px-5 py-4 text-white text-sm font-medium focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-stone-600 resize-none h-24"
                  placeholder="Describe la recompensa"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-black tracking-[0.3em] text-stone-500 block mb-2">Puntos Requeridos</label>
                  <input
                    type="number" value={formData.puntosCosto}
                    onChange={e => setFormData(prev => ({ ...prev, puntosCosto: e.target.value }))}
                    className="w-full bg-stone-950 border border-stone-700/50 rounded-[1.5rem] px-5 py-4 text-white text-sm font-medium focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-stone-600"
                    placeholder="200"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black tracking-[0.3em] text-stone-500 block mb-2">Valor (COP)</label>
                  <input
                    type="number" value={formData.valor}
                    onChange={e => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                    className="w-full bg-stone-950 border border-stone-700/50 rounded-[1.5rem] px-5 py-4 text-white text-sm font-medium focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-stone-600"
                    placeholder="25000"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-black tracking-[0.3em] text-stone-500 block mb-2">Tipo</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['cupon', 'producto', 'descuento', 'envio'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setFormData(prev => ({ ...prev, tipo: t }))}
                      className={`px-4 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-wider border transition-all ${
                        formData.tipo === t
                          ? 'bg-orange-600 border-orange-500 text-white'
                          : 'bg-stone-950 border-stone-700/50 text-stone-400 hover:border-stone-500'
                      }`}
                    >
                      <i className={`fas ${t === 'cupon' ? 'fa-ticket-alt' : t === 'producto' ? 'fa-pizza-slice' : t === 'descuento' ? 'fa-percent' : 'fa-truck'} block text-lg mb-1`}></i>
                      {REWARD_TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 bg-stone-800 hover:bg-stone-700 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-stone-400 transition-all">
                Cancelar
              </button>
              <button onClick={handleCreateReward} className="flex-1 bg-orange-600 hover:bg-orange-500 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-white transition-all shadow-xl">
                <i className="fas fa-plus-circle mr-2"></i> Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {challengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn" onClick={() => setChallengeModal(null)}>
          <div className="bg-stone-900/95 border border-stone-700/50 p-10 rounded-[3rem] shadow-2xl max-w-md w-full mx-6 animate-slideDown" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-white">{challengeModal.nombre}</h3>
              <button onClick={() => setChallengeModal(null)} className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-700 transition-all">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <p className="text-stone-400 text-sm mb-6">{challengeModal.descripcion}</p>
            <div className="bg-stone-950 rounded-[2rem] p-6 border border-stone-800 mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-stone-500 text-[10px] uppercase font-black tracking-[0.3em]">Progreso</span>
                <span className="text-white font-black">{challengeModal.progreso}/{challengeModal.objetivo}</span>
              </div>
              <div className="h-4 bg-stone-900 rounded-full overflow-hidden border border-white/5 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-orange-800 to-orange-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(Math.round((challengeModal.progreso / challengeModal.objetivo) * 100), 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-stone-600 text-xs font-bold">0</span>
                <span className="text-stone-600 text-xs font-bold">{challengeModal.objetivo}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-stone-950 rounded-[2rem] p-5 border border-stone-800 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <i className="fas fa-gift text-xl"></i>
              </div>
              <div>
                <p className="text-[9px] uppercase font-black tracking-[0.3em] text-stone-500">Recompensa</p>
                <p className="text-yellow-500 font-black text-lg">{challengeModal.recompensa}</p>
              </div>
            </div>
            <div className="flex gap-2 text-xs text-stone-500">
              <span className="bg-stone-950 px-3 py-2 rounded-xl border border-stone-800">
                <i className="far fa-calendar-alt mr-1"></i> {challengeModal.inicia}
              </span>
              <span className="bg-stone-950 px-3 py-2 rounded-xl border border-stone-800">
                <i className="far fa-calendar-alt mr-1"></i> {challengeModal.termina}
              </span>
              {challengeModal.progreso >= challengeModal.objetivo && (
                <span className="bg-green-900/30 px-3 py-2 rounded-xl border border-green-500/20 text-green-400">
                  <i className="fas fa-check-circle mr-1"></i> Completado
                </span>
              )}
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
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-600 hover:bg-orange-500 px-10 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4 w-full md:w-auto justify-center active:scale-95"
        >
          <i className="fas fa-plus-circle"></i> CREAR RECOMPENSA
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
        {[
          { label: 'Puntos Activos', value: puntosActivos.toLocaleString(), icon: 'star', color: 'text-orange-500', suffix: '' },
          { label: 'Clientes en Programa', value: clientesPrograma.toLocaleString(), icon: 'users', color: 'text-blue-500', suffix: '' },
          { label: 'Cashback Entregado', value: formatCurrency(cashbackEntregado), icon: 'wallet', color: 'text-green-500', suffix: '' },
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
          {recompensas.map((r) => {
            const isCanjeando = canjeandoId === r.id;
            const noPoints = puntosActivos < r.puntosCosto;
            return (
              <div
                key={r.id}
                className={`bg-stone-900/40 p-8 rounded-[3.5rem] border transition-all group shadow-2xl relative overflow-hidden ${
                  isCanjeando ? 'card-canjeado border-orange-500/60' : 'border-stone-800 hover:border-orange-500/40'
                }`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-5 bg-orange-500 group-hover:opacity-10 transition-opacity"></div>
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 text-orange-500 text-2xl ${
                    isCanjeando ? 'scale-110' : 'group-hover:scale-110'
                  } transition-transform`}>
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
                    disabled={isCanjeando || noPoints}
                    className={`bg-orange-600 hover:bg-orange-500 px-6 py-3 rounded-[2rem] font-black text-[9px] uppercase tracking-widest transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 flex items-center gap-2 ${
                      isCanjeando ? 'animate-pulse-glow' : ''
                    }`}
                  >
                    {isCanjeando ? (
                      <><i className="fas fa-spinner fa-spin"></i> CANJEANDO</>
                    ) : (
                      <>{noPoints ? <><i className="fas fa-lock"></i> SIN PUNTOS</> : 'CANJEAR'}</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
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
            const completado = reto.progreso >= reto.objetivo;
            return (
              <div key={reto.id} className="bg-stone-900/40 p-8 rounded-[3.5rem] border border-stone-800 hover:border-orange-500/40 transition-all group shadow-2xl relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-40 h-40 blur-3xl opacity-5 bg-orange-500 rounded-full"></div>
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h4 className="font-black text-xl text-white mb-1">{reto.nombre}</h4>
                    <p className="text-stone-500 text-sm">{reto.descripcion}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl bg-stone-950 flex items-center justify-center border shrink-0 ${
                    completado ? 'text-green-500 border-green-500/20' : 'text-orange-500 border-white/5'
                  }`}>
                    <i className={`fas ${completado ? 'fa-trophy' : 'fa-fire'}`}></i>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-stone-400 font-bold">{reto.progreso}/{reto.objetivo}</span>
                    <span className="text-stone-600 font-black text-[10px] uppercase tracking-wider">{pct}%</span>
                  </div>
                  <div className="h-3 bg-stone-950 rounded-full overflow-hidden border border-white/5 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        completado ? 'bg-gradient-to-r from-green-800 to-green-500' : 'bg-gradient-to-r from-orange-800 to-orange-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <i className="fas fa-gift text-yellow-500 text-sm"></i>
                  <span className="text-stone-300 text-sm font-bold">Reward: </span>
                  <span className="text-yellow-500 text-sm font-black">{reto.recompensa}</span>
                </div>
                <button
                  onClick={() => setChallengeModal(reto)}
                  className="w-full mt-4 bg-stone-950 hover:bg-stone-800 px-6 py-3 rounded-[2rem] font-black text-[9px] uppercase tracking-widest transition-all border border-stone-700/30 text-stone-400 hover:text-white active:scale-95 flex items-center justify-center gap-2"
                >
                  <i className="fas fa-search"></i> VER PROGRESO
                </button>
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
                {canjes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-16">
                      <div className="text-stone-600">
                        <i className="fas fa-inbox text-4xl mb-4 block"></i>
                        <p className="text-sm font-bold">No hay canjes registrados</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  canjes.map((canje, i) => (
                    <tr key={i} className={`${i === 0 && canjes.length > 5 ? 'animate-slideUp' : ''} border-b border-white/5 last:border-none hover:bg-stone-900/60 transition-colors`}>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FidelizacionView;
