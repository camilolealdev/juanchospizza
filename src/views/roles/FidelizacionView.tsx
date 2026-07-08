import React, { useCallback, useEffect, useState } from 'react';
import { Client, LoyaltyLevel, LoyaltyReward, LoyaltyChallenge } from '../../types';
import { api } from '../../services/api';

// Tier level definitions and monthly challenges have no backing table in the
// schema (no loyalty_levels / loyalty_challenges concept exists server-side),
// so these stay local presentational data per this pass's scope.
const NIVELES: LoyaltyLevel[] = [
  { id: 'bronce', nombre: 'Bronce', puntosMinimos: 0, descuento: 0, color: 'bronze', icono: 'fa-shield', beneficios: ['Acceso a promociones generales', 'Notificaciones de ofertas'] },
  { id: 'plata', nombre: 'Plata', puntosMinimos: 500, descuento: 3, color: 'silver', icono: 'fa-shield', beneficios: ['3% descuento en todas tus órdenes', 'Prioridad en pedidos', 'Acceso a menú exclusivo'] },
  { id: 'oro', nombre: 'Oro', puntosMinimos: 2000, descuento: 7, color: 'gold', icono: 'fa-crown', beneficios: ['7% descuento en todas tus órdenes', 'Envío gratis ilimitado', 'Postre sorpresa cada 5 pedidos', 'Soporte prioritario'] },
  { id: 'platino', nombre: 'Platino', puntosMinimos: 5000, descuento: 15, color: 'platinum', icono: 'fa-gem', beneficios: ['15% descuento en todas tus órdenes', 'Envío gratis ilimitado', 'Pizza Personal Gratis cada mes', 'Acceso a eventos VIP', 'Deduplicador de puntos'] },
];

const RETOS: LoyaltyChallenge[] = [
  { id: 'ch1', nombre: 'Pizza Legend', descripcion: 'Pide 4 pizzas este mes', objetivo: 4, progreso: 3, recompensa: '500pts extra', inicia: '2026-06-01', termina: '2026-06-30', activo: true },
  { id: 'ch2', nombre: 'Family Feast', descripcion: '3 pedidos mayores a $50,000', objetivo: 3, progreso: 1, recompensa: 'Pizza Grande Gratis', inicia: '2026-06-01', termina: '2026-06-30', activo: true },
  { id: 'ch3', nombre: 'Weekend Warrior', descripcion: 'Pide viernes o sábado', objetivo: 2, progreso: 2, recompensa: '200pts extra', inicia: '2026-06-05', termina: '2026-06-07', activo: true },
];

interface PointsHistoryRow {
  id: string;
  clientId: string;
  puntos: number;
  concepto: string | null;
  referencia: string | null;
  creado: string;
}

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

const formatDate = (d?: string | null) => {
  if (!d) return '—';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeReward = (raw: any): LoyaltyReward => ({
  ...raw,
  vigente: !!raw.vigente && raw.vigente !== 0,
});

const emptyForm: { nombre: string; descripcion: string; puntosCosto: number; tipo: LoyaltyReward['tipo']; valor: number } =
  { nombre: '', descripcion: '', puntosCosto: 0, tipo: 'producto', valor: 0 };

const FidelizacionView: React.FC = () => {
  const [recompensas, setRecompensas] = useState<LoyaltyReward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [rewardsError, setRewardsError] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryRow[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSavingReward, setIsSavingReward] = useState(false);

  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const showToastMessage = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  };

  const fetchRewards = useCallback(async () => {
    setRewardsLoading(true);
    setRewardsError(null);
    try {
      const rows = await api.getLoyaltyRewards();
      setRecompensas(rows.map(normalizeReward));
    } catch (e) {
      setRewardsError('No se pudieron cargar las recompensas.');
    } finally {
      setRewardsLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const rows = await api.getClients();
      setClients(rows);
    } catch (e) {
      // Non-fatal: the rewards catalog still works without the client picker.
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRewards(); fetchClients(); }, [fetchRewards, fetchClients]);

  useEffect(() => {
    if (!selectedClientId) {
      setPointsHistory([]);
      setPointsError(null);
      return;
    }
    let cancelled = false;
    setPointsLoading(true);
    setPointsError(null);
    api.getLoyaltyPoints(selectedClientId)
      .then((rows) => { if (!cancelled) setPointsHistory(rows); })
      .catch(() => { if (!cancelled) setPointsError('No se pudo cargar el historial de puntos.'); })
      .finally(() => { if (!cancelled) setPointsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedClientId]);

  const puntosActivos = clients.reduce((sum, c) => sum + (c.puntos || 0), 0);
  const cashbackTotal = 1240000; // Cosmetic placeholder: no cashback ledger exists in the schema.
  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  const handleCanjear = async (r: LoyaltyReward) => {
    if (!selectedClientId || !selectedClient) {
      showToastMessage('❌ Selecciona un cliente en "Historial de Puntos" para canjear');
      return;
    }
    if (selectedClient.puntos < r.puntosCosto) {
      showToastMessage('❌ El cliente no tiene suficientes puntos');
      return;
    }
    try {
      await api.addLoyaltyPoints({
        clientId: selectedClientId,
        puntos: -r.puntosCosto,
        concepto: `Canje: ${r.nombre}`,
        referencia: r.id,
      });
      await fetchClients();
      const rows = await api.getLoyaltyPoints(selectedClientId);
      setPointsHistory(rows);
      showToastMessage(`✅ ${r.nombre} canjeado por ${selectedClient.nombre}`);
    } catch (e) {
      showToastMessage('❌ No se pudo procesar el canje');
    }
  };

  const openCreateForm = () => {
    setEditingRewardId(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (r: LoyaltyReward) => {
    setEditingRewardId(r.id);
    setFormData({ nombre: r.nombre, descripcion: r.descripcion, puntosCosto: r.puntosCosto, tipo: r.tipo, valor: r.valor });
    setShowForm(true);
  };

  const handleGuardarRecompensa = async () => {
    if (!formData.nombre || !formData.descripcion || formData.puntosCosto <= 0) {
      showToastMessage('❌ Completa todos los campos requeridos');
      return;
    }
    setIsSavingReward(true);
    try {
      if (editingRewardId) {
        const updated = await api.updateLoyaltyReward(editingRewardId, formData);
        setRecompensas((prev) => prev.map((r) => (r.id === editingRewardId ? normalizeReward(updated) : r)));
        showToastMessage('✅ Recompensa actualizada');
      } else {
        const created = await api.createLoyaltyReward(formData);
        setRecompensas((prev) => [...prev, normalizeReward(created)]);
        showToastMessage('✅ Recompensa creada exitosamente');
      }
      setShowForm(false);
      setEditingRewardId(null);
      setFormData(emptyForm);
    } catch (e) {
      showToastMessage('❌ No se pudo guardar la recompensa');
    } finally {
      setIsSavingReward(false);
    }
  };

  const handleEliminarRecompensa = async (r: LoyaltyReward) => {
    if (!window.confirm(`¿Eliminar la recompensa "${r.nombre}"?`)) return;
    try {
      await api.deleteLoyaltyReward(r.id);
      setRecompensas((prev) => prev.filter((x) => x.id !== r.id));
      showToastMessage('✅ Recompensa eliminada');
    } catch (e) {
      showToastMessage('❌ No se pudo eliminar la recompensa');
    }
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
              <h3 className="text-2xl font-black text-white">{editingRewardId ? 'Editar Recompensa' : 'Nueva Recompensa'}</h3>
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
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as LoyaltyReward['tipo'] })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="cupon">Cupón</option>
                  <option value="producto">Producto</option>
                  <option value="descuento">Descuento</option>
                  <option value="envio">Envío</option>
                </select>
              </div>
              <button
                onClick={handleGuardarRecompensa}
                disabled={isSavingReward}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl text-white"
              >
                <i className="fas fa-plus-circle mr-3"></i>
                {isSavingReward ? 'Guardando...' : editingRewardId ? 'GUARDAR CAMBIOS' : 'CREAR RECOMPENSA'}
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
          onClick={openCreateForm}
          className="bg-orange-600 hover:bg-orange-500 px-10 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4 w-full md:w-auto justify-center"
        >
          <i className="fas fa-plus-circle"></i> CREAR RECOMPENSA
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
        {[
          { label: 'Puntos Activos', value: clientsLoading ? '—' : puntosActivos.toLocaleString(), icon: 'star', color: 'text-orange-500' },
          { label: 'Clientes en Programa', value: clientsLoading ? '—' : clients.length.toLocaleString(), icon: 'users', color: 'text-blue-500' },
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

        {rewardsError && (
          <div className="bg-red-950/40 border border-red-500/20 rounded-[2rem] p-6 flex items-center justify-between gap-4">
            <p className="text-red-400 text-sm font-bold"><i className="fas fa-triangle-exclamation mr-3"></i>{rewardsError}</p>
            <button onClick={fetchRewards} className="text-[9px] font-black uppercase tracking-widest text-red-300 hover:text-white px-4 py-2 rounded-xl border border-red-500/30">
              Reintentar
            </button>
          </div>
        )}

        {rewardsLoading ? (
          <div className="p-16 text-center text-stone-500">
            <i className="fas fa-circle-notch fa-spin text-3xl mb-4"></i>
            <p className="text-sm font-bold uppercase tracking-widest">Cargando recompensas...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {recompensas.map((r) => (
              <div key={r.id} className="bg-stone-900/40 p-8 rounded-[3.5rem] border border-stone-800 hover:border-orange-500/40 transition-all group shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-5 bg-orange-500 group-hover:opacity-10 transition-opacity"></div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 text-orange-500 text-2xl group-hover:scale-110 transition-transform">
                    <i className={`fas ${r.tipo === 'descuento' ? 'fa-percent' : r.tipo === 'envio' ? 'fa-truck' : 'fa-pizza-slice'}`}></i>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black uppercase px-4 py-2 rounded-full border ${REWARD_TYPE_BADGE[r.tipo]}`}>
                      {REWARD_TYPE_LABEL[r.tipo]}
                    </span>
                    <button onClick={() => openEditForm(r)} title="Editar" className="w-8 h-8 rounded-lg bg-stone-950 border border-white/5 flex items-center justify-center text-stone-500 hover:text-white transition-colors">
                      <i className="fas fa-pen text-[10px]"></i>
                    </button>
                    <button onClick={() => handleEliminarRecompensa(r)} title="Eliminar" className="w-8 h-8 rounded-lg bg-stone-950 border border-white/5 flex items-center justify-center text-stone-500 hover:text-red-400 transition-colors">
                      <i className="fas fa-trash text-[10px]"></i>
                    </button>
                  </div>
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
                    disabled={!selectedClientId || (selectedClient ? selectedClient.puntos < r.puntosCosto : true)}
                    title={!selectedClientId ? 'Selecciona un cliente en Historial de Puntos' : undefined}
                    className="bg-orange-600 hover:bg-orange-500 px-6 py-3 rounded-[2rem] font-black text-[9px] uppercase tracking-widest transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    CANJEAR
                  </button>
                </div>
              </div>
            ))}
            {recompensas.length === 0 && (
              <div className="col-span-full p-16 text-center text-stone-600 bg-stone-900/30 rounded-[3rem] border border-white/5">
                <i className="fas fa-gift text-3xl mb-4"></i>
                <p className="text-sm font-bold uppercase tracking-widest">Aún no hay recompensas configuradas</p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-8">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand">Retos Mensuales</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Completa retos y gana puntos extra</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {RETOS.map((reto) => {
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand">Historial de Puntos</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Movimientos de puntos por cliente (acumulación y canjes)</p>
          </div>
          <div className="w-full md:w-80">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-6 py-4 text-white text-sm font-bold outline-none focus:border-orange-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="">{clientsLoading ? 'Cargando clientes...' : 'Selecciona un cliente...'}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} ({(c.puntos || 0).toLocaleString()} pts)</option>
              ))}
            </select>
          </div>
        </div>
        <div className="bg-stone-900/40 rounded-[4rem] border border-stone-800 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] px-10 py-6">Concepto</th>
                  <th className="text-left text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] px-10 py-6">Puntos</th>
                  <th className="text-left text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] px-10 py-6">Referencia</th>
                  <th className="text-left text-[10px] font-black text-stone-600 uppercase tracking-[0.4em] px-10 py-6">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {!selectedClientId && (
                  <tr><td colSpan={4} className="px-10 py-10 text-center text-stone-600 text-sm">Selecciona un cliente para ver su historial de puntos.</td></tr>
                )}
                {selectedClientId && pointsLoading && (
                  <tr><td colSpan={4} className="px-10 py-10 text-center text-stone-500 text-sm"><i className="fas fa-circle-notch fa-spin mr-2"></i>Cargando historial...</td></tr>
                )}
                {selectedClientId && !pointsLoading && pointsError && (
                  <tr><td colSpan={4} className="px-10 py-10 text-center text-red-400 text-sm">{pointsError}</td></tr>
                )}
                {selectedClientId && !pointsLoading && !pointsError && pointsHistory.length === 0 && (
                  <tr><td colSpan={4} className="px-10 py-10 text-center text-stone-600 text-sm">Este cliente aún no tiene movimientos de puntos.</td></tr>
                )}
                {selectedClientId && !pointsLoading && !pointsError && pointsHistory.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-none hover:bg-stone-900/60 transition-colors">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-stone-950 flex items-center justify-center border border-white/5 text-stone-500">
                          <i className={`fas ${p.puntos < 0 ? 'fa-arrow-down' : 'fa-arrow-up'} text-sm`}></i>
                        </div>
                        <span className="text-white font-bold text-sm">{p.concepto || 'Movimiento de puntos'}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`font-black ${p.puntos < 0 ? 'text-red-400' : 'text-green-500'}`}>
                        {p.puntos > 0 ? '+' : ''}{p.puntos.toLocaleString()} pts
                      </span>
                    </td>
                    <td className="px-10 py-6 text-stone-500 text-sm">{p.referencia || '—'}</td>
                    <td className="px-10 py-6 text-stone-500 text-sm">{formatDate(p.creado)}</td>
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
