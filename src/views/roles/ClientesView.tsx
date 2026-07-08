
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Client } from '../../types';
import { api } from '../../services/api';

const NIVEL_COLORS: Record<string, string> = {
  Bronce: 'from-amber-700 to-amber-500',
  Plata: 'from-slate-400 to-slate-300',
  Oro: 'from-yellow-600 to-yellow-400',
  Platino: 'from-cyan-700 to-cyan-400',
};

const NIVEL_BG: Record<string, string> = {
  Bronce: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  Plata: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  Oro: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  Platino: 'bg-cyan-600/20 text-cyan-400 border-cyan-600/30',
};

const getInitial = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

const formatCurrency = (n: number) => '$' + (n || 0).toLocaleString('es-CO');

// The backend returns full ISO timestamps (TIMESTAMPTZ/DATE columns serialize
// through JSON.stringify as ISO strings), and some date fields (e.g.
// ultimaCompra for a client with no completed orders yet) can be null.
const formatDate = (d?: string | null) => {
  if (!d) return 'Sin registro';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return 'Sin registro';
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const daysSince = (d?: string | null) => {
  if (!d) return Infinity;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return Infinity;
  return (Date.now() - date.getTime()) / 86400000;
};

const stripPhone = (phone: string) => phone.replace(/[^\d]/g, '');

// nivel comes back from Postgres lowercase ('bronce', 'plata', 'oro',
// 'platino') per the tier thresholds computed on order completion; the
// existing badge/gradient lookups above are keyed by capitalized labels.
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeClient = (raw: any): Client => ({
  ...raw,
  tags: raw.tags || [],
  vip: !!raw.vip,
  nivel: capitalize(raw.nivel || 'bronce'),
});

interface ClientOrderSummary {
  id: string;
  fecha: string | null;
  items: string;
  total: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const summarizeOrder = (o: any): ClientOrderSummary => {
  let items = o.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  const itemsText = Array.isArray(items) && items.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? items.map((it: any) => `${it.quantity ?? 1}x ${it.name ?? 'Producto'}`).join(', ')
    : 'Sin detalle';
  return { id: o.orderNumber || o.id, fecha: o.createdAt ?? null, items: itemsText, total: o.total || 0 };
};

const emptyNewClient = { nombre: '', telefono: '', email: '', direccion: '' };

const ClientesView: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('nombre');
  const [segmentFilter, setSegmentFilter] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newClient, setNewClient] = useState(emptyNewClient);
  const [isSavingNewClient, setIsSavingNewClient] = useState(false);

  const [showEditForm, setShowEditForm] = useState(false);
  const [editClient, setEditClient] = useState(emptyNewClient);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [clientOrders, setClientOrders] = useState<ClientOrderSummary[]>([]);
  const [clientOrdersLoading, setClientOrdersLoading] = useState(false);
  const [clientOrdersError, setClientOrdersError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  };

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const rows = await api.getClients();
      setClients(rows.map(normalizeClient));
    } catch (e) {
      setLoadError('No se pudo cargar la lista de clientes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Fetch the real purchase history for whichever client is currently open in the modal.
  useEffect(() => {
    if (!selectedClient) {
      setClientOrders([]);
      setClientOrdersError(null);
      return;
    }
    let cancelled = false;
    setClientOrdersLoading(true);
    setClientOrdersError(null);
    api.getClientOrders(selectedClient.id)
      .then((rows) => { if (!cancelled) setClientOrders(rows.map(summarizeOrder)); })
      .catch(() => { if (!cancelled) setClientOrdersError('No se pudo cargar el historial de compras.'); })
      .finally(() => { if (!cancelled) setClientOrdersLoading(false); });
    return () => { cancelled = true; };
  }, [selectedClient?.id]);

  const kpis = useMemo(() => [
    { label: 'Total Clientes', value: String(clients.length), icon: 'users', color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-600/20' },
    { label: 'Clientes VIP', value: String(clients.filter(c => c.vip).length), icon: 'crown', color: 'text-yellow-400', bg: 'bg-yellow-600/10 border-yellow-600/20' },
    { label: 'Clientes Inactivos', value: String(clients.filter(c => c.estado === 'inactivo').length), icon: 'user-clock', color: 'text-red-400', bg: 'bg-red-600/10 border-red-600/20' },
    { label: 'LTV Promedio', value: formatCurrency(clients.length ? Math.round(clients.reduce((s, c) => s + c.totalGastado, 0) / clients.length) : 0), icon: 'chart-line', color: 'text-green-400', bg: 'bg-green-600/10 border-green-600/20' },
  ], [clients]);

  const segments = useMemo(() => [
    { id: 'alta-frecuencia', label: 'Alta Frecuencia', count: clients.filter(c => c.frecuenciaCompra >= 3).length, desc: '> 3 compras en el último mes', icon: 'rocket', color: 'text-emerald-400', border: 'border-emerald-500/30' },
    { id: 'alto-gasto', label: 'Alto Gasto', count: clients.filter(c => c.totalCompras > 0 && (c.totalGastado / c.totalCompras) > 150000).length, desc: 'Ticket promedio > $150,000', icon: 'gem', color: 'text-purple-400', border: 'border-purple-500/30' },
    { id: 'en-riesgo', label: 'En Riesgo', count: clients.filter(c => daysSince(c.ultimaCompra) >= 45).length, desc: 'Sin compras en 45+ días', icon: 'exclamation-triangle', color: 'text-orange-400', border: 'border-orange-500/30' },
    { id: 'nuevos', label: 'Nuevos', count: clients.filter(c => daysSince(c.creado) <= 30).length, desc: 'Primera compra < 30 días', icon: 'star', color: 'text-sky-400', border: 'border-sky-500/30' },
  ], [clients]);

  const filteredClients = useMemo(() => {
    let result = [...clients];

    if (segmentFilter === 'alta-frecuencia') result = result.filter(c => c.frecuenciaCompra >= 3);
    if (segmentFilter === 'alto-gasto') result = result.filter(c => c.totalCompras > 0 && (c.totalGastado / c.totalCompras) > 150000);
    if (segmentFilter === 'en-riesgo') result = result.filter(c => daysSince(c.ultimaCompra) >= 45);
    if (segmentFilter === 'nuevos') result = result.filter(c => daysSince(c.creado) <= 30);

    if (estadoFilter !== 'todos') {
      result = result.filter(c => c.estado === estadoFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.nombre.toLowerCase().includes(q) ||
        c.telefono.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
      if (sortBy === 'compras') return b.totalCompras - a.totalCompras;
      if (sortBy === 'gasto') return b.totalGastado - a.totalGastado;
      return 0;
    });

    return result;
  }, [search, estadoFilter, sortBy, segmentFilter, clients]);

  const renderKPIs = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {kpis.map(k => (
        <div key={k.label} className={`${k.bg} backdrop-blur-xl rounded-[2rem] border p-6 md:p-8 flex items-center gap-5`}>
          <div className={`w-14 h-14 rounded-2xl ${k.bg} flex items-center justify-center shrink-0`}>
            <i className={`fas fa-${k.icon} ${k.color} text-xl`}></i>
          </div>
          <div>
            <p className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em] mb-1">{k.label}</p>
            <p className={`text-3xl md:text-4xl font-black ${k.color}`}>{k.value}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSearchBar = () => (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 flex items-center bg-stone-900/60 backdrop-blur-xl rounded-[2rem] border border-white/5 px-6 py-4 focus-within:border-orange-600/50 transition-all">
        <i className="fas fa-search text-stone-600 mr-4"></i>
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-stone-700 text-sm"
        />
        {search && <button onClick={() => setSearch('')} className="text-stone-600 hover:text-white ml-2"><i className="fas fa-times"></i></button>}
      </div>
      <div className="flex gap-3">
        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          className="bg-stone-900/60 backdrop-blur-xl border border-white/5 rounded-[1.5rem] px-5 py-4 text-white text-xs font-bold appearance-none cursor-pointer focus:border-orange-600/50 transition-all"
        >
          <option value="todos">Estado: Todos</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-stone-900/60 backdrop-blur-xl border border-white/5 rounded-[1.5rem] px-5 py-4 text-white text-xs font-bold appearance-none cursor-pointer focus:border-orange-600/50 transition-all"
        >
          <option value="nombre">Ordenar: Nombre</option>
          <option value="compras">Compras</option>
          <option value="gasto">Gasto</option>
        </select>
      </div>
    </div>
  );

  const renderSegmentCard = (seg: typeof segments[0]) => (
    <button
      key={seg.id}
      onClick={() => setSegmentFilter(segmentFilter === seg.id ? null : seg.id)}
      className={`bg-stone-900/40 backdrop-blur-xl rounded-[2rem] border p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group ${
        segmentFilter === seg.id ? `${seg.border} shadow-xl` : 'border-white/5 hover:border-white/10'
      }`}
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-stone-800 flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <i className={`fas fa-${seg.icon} ${seg.color} text-lg`}></i>
        </div>
        <div>
          <p className="font-black text-white text-sm">{seg.label}</p>
          <p className="text-3xl font-black text-white mt-1">{seg.count}</p>
        </div>
      </div>
      <p className="text-stone-500 text-xs">{seg.desc}</p>
    </button>
  );

  const renderClientCard = (client: Client) => (
    <button
      key={client.id}
      onClick={() => setSelectedClient(client)}
      className="group bg-stone-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-6 md:p-8 text-left transition-all duration-500 hover:bg-stone-900/70 hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-900/10 w-full"
    >
      <div className="flex items-start gap-5 mb-6">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${NIVEL_COLORS[client.nivel] || 'from-stone-600 to-stone-400'} flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg`}>
          {getInitial(client.nombre)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h3 className="text-white font-black text-lg truncate">{client.nombre}</h3>
            {client.vip && <span className="bg-yellow-600/20 text-yellow-400 text-[8px] font-black px-3 py-1.5 rounded-full border border-yellow-500/30 uppercase tracking-wider"><i className="fas fa-crown mr-1"></i>VIP</span>}
          </div>
          <p className="text-stone-500 text-xs mb-1"><i className="fas fa-phone-alt mr-2 text-stone-600"></i>{client.telefono}</p>
          {client.email && <p className="text-stone-500 text-xs truncate"><i className="fas fa-envelope mr-2 text-stone-600"></i>{client.email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-stone-950/60 rounded-2xl p-3 text-center">
          <p className="text-[8px] font-black text-stone-600 uppercase tracking-widest mb-1">Compras</p>
          <p className="text-white font-black text-lg">{client.totalCompras}</p>
        </div>
        <div className="bg-stone-950/60 rounded-2xl p-3 text-center">
          <p className="text-[8px] font-black text-stone-600 uppercase tracking-widest mb-1">Gastado</p>
          <p className="text-orange-500 font-black text-sm truncate">{formatCurrency(client.totalGastado)}</p>
        </div>
        <div className="bg-stone-950/60 rounded-2xl p-3 text-center">
          <p className="text-[8px] font-black text-stone-600 uppercase tracking-widest mb-1">Última</p>
          <p className="text-white font-black text-xs">{formatDate(client.ultimaCompra)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <span className={`text-[8px] font-black uppercase px-4 py-2 rounded-full border ${NIVEL_BG[client.nivel] || NIVEL_BG.Bronce}`}>
          {client.nivel}
        </span>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${client.estado === 'activo' ? 'bg-green-500' : 'bg-red-500'} shadow-lg`}></span>
          <span className="text-[9px] font-bold text-stone-500 uppercase">{client.estado}</span>
        </div>
      </div>
    </button>
  );

  const handleToggleVip = async (clientId: string) => {
    const current = clients.find(c => c.id === clientId);
    if (!current) return;
    const nextVip = !current.vip;
    // Optimistic update, reverted below if the request fails.
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, vip: nextVip } : c));
    setSelectedClient(prev => prev && prev.id === clientId ? { ...prev, vip: nextVip } : prev);
    try {
      await api.updateClientStatus(clientId, { vip: nextVip });
    } catch (e) {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, vip: !nextVip } : c));
      setSelectedClient(prev => prev && prev.id === clientId ? { ...prev, vip: !nextVip } : prev);
      showToast('No se pudo actualizar el estado VIP.');
    }
  };

  const handleNewClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNewClient(true);
    try {
      await api.createClient(newClient);
      await fetchClients();
      setNewClient(emptyNewClient);
      setShowNewForm(false);
      showToast(`Cliente ${newClient.nombre} registrado.`);
    } catch (e) {
      showToast('No se pudo registrar el cliente.');
    } finally {
      setIsSavingNewClient(false);
    }
  };

  const renderNewClientModal = () => {
    if (!showNewForm) return null;
    const isValid = newClient.nombre.trim().length > 0 && newClient.telefono.trim().length > 0;
    return (
      <div className="fixed inset-0 z-[200] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowNewForm(false)}>
        <div className="bg-stone-900/95 backdrop-blur-2xl rounded-[3rem] border border-white/10 max-w-lg w-full p-8 shadow-2xl shadow-black/50" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white">Nuevo Cliente</h2>
            <button onClick={() => setShowNewForm(false)} className="w-12 h-12 rounded-2xl bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white transition-all">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <form onSubmit={handleNewClientSubmit} className="space-y-5">
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em] block mb-2">Nombre *</label>
              <input type="text" value={newClient.nombre} onChange={e => setNewClient(p => ({ ...p, nombre: e.target.value }))} className="w-full bg-stone-800/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-orange-600/50 transition-all outline-none" placeholder="Nombre completo" />
            </div>
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em] block mb-2">Teléfono *</label>
              <input type="text" value={newClient.telefono} onChange={e => setNewClient(p => ({ ...p, telefono: e.target.value }))} className="w-full bg-stone-800/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-orange-600/50 transition-all outline-none" placeholder="+57 300 000 0000" />
            </div>
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em] block mb-2">Email</label>
              <input type="email" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} className="w-full bg-stone-800/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-orange-600/50 transition-all outline-none" placeholder="cliente@email.com" />
            </div>
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em] block mb-2">Dirección</label>
              <input type="text" value={newClient.direccion} onChange={e => setNewClient(p => ({ ...p, direccion: e.target.value }))} className="w-full bg-stone-800/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-orange-600/50 transition-all outline-none" placeholder="Dirección" />
            </div>
            <button type="submit" disabled={!isValid || isSavingNewClient} className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg">
              <i className="fas fa-plus mr-2"></i>{isSavingNewClient ? 'Guardando...' : 'Registrar Cliente'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const openEditForm = (client: Client) => {
    setEditClient({
      nombre: client.nombre || '',
      telefono: client.telefono || '',
      email: client.email || '',
      direccion: client.direccion || '',
    });
    setShowEditForm(true);
  };

  const handleEditClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    setIsSavingEdit(true);
    try {
      const updated = await api.updateClientProfile(selectedClient.id, editClient);
      const normalized = normalizeClient(updated);
      setClients(prev => prev.map(c => c.id === normalized.id ? normalized : c));
      setSelectedClient(normalized);
      setShowEditForm(false);
      showToast('Datos del cliente actualizados.');
    } catch (e) {
      showToast('No se pudieron guardar los cambios.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const renderEditClientModal = () => {
    if (!showEditForm) return null;
    const isValid = editClient.nombre.trim().length > 0 && editClient.telefono.trim().length > 0;
    return (
      <div className="fixed inset-0 z-[210] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowEditForm(false)}>
        <div className="bg-stone-900/95 backdrop-blur-2xl rounded-[3rem] border border-white/10 max-w-lg w-full p-8 shadow-2xl shadow-black/50" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white">Editar Cliente</h2>
            <button onClick={() => setShowEditForm(false)} className="w-12 h-12 rounded-2xl bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white transition-all">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <form onSubmit={handleEditClientSubmit} className="space-y-5">
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em] block mb-2">Nombre *</label>
              <input type="text" value={editClient.nombre} onChange={e => setEditClient(p => ({ ...p, nombre: e.target.value }))} className="w-full bg-stone-800/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-orange-600/50 transition-all outline-none" placeholder="Nombre completo" />
            </div>
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em] block mb-2">Teléfono *</label>
              <input type="text" value={editClient.telefono} onChange={e => setEditClient(p => ({ ...p, telefono: e.target.value }))} className="w-full bg-stone-800/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-orange-600/50 transition-all outline-none" placeholder="+57 300 000 0000" />
            </div>
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em] block mb-2">Email</label>
              <input type="email" value={editClient.email} onChange={e => setEditClient(p => ({ ...p, email: e.target.value }))} className="w-full bg-stone-800/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-orange-600/50 transition-all outline-none" placeholder="cliente@email.com" />
            </div>
            <div>
              <label className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em] block mb-2">Dirección</label>
              <input type="text" value={editClient.direccion} onChange={e => setEditClient(p => ({ ...p, direccion: e.target.value }))} className="w-full bg-stone-800/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-orange-600/50 transition-all outline-none" placeholder="Dirección" />
            </div>
            <button type="submit" disabled={!isValid || isSavingEdit} className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg">
              <i className="fas fa-save mr-2"></i>{isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!selectedClient) return null;
    const c = selectedClient;

    return (
      <div className="fixed inset-0 z-[200] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedClient(null)}>
        <div className="bg-stone-900/95 backdrop-blur-2xl rounded-[3rem] border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-stone-900/95 backdrop-blur-xl z-10 flex items-center justify-between p-6 md:p-8 border-b border-white/5 rounded-t-[3rem]">
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${NIVEL_COLORS[c.nivel] || 'from-stone-600 to-stone-400'} flex items-center justify-center text-white font-black text-xl shadow-lg`}>
                {getInitial(c.nombre)}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-black text-white">{c.nombre}</h2>
                  {c.vip && <span className="bg-yellow-600/20 text-yellow-400 text-[8px] font-black px-3 py-1.5 rounded-full border border-yellow-500/30 uppercase tracking-wider"><i className="fas fa-crown mr-1"></i>VIP</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[8px] font-black px-3 py-1.5 rounded-full border ${NIVEL_BG[c.nivel] || NIVEL_BG.Bronce}`}>{c.nivel}</span>
                  <span className={`w-2 h-2 rounded-full ${c.estado === 'activo' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedClient(null)} className="w-12 h-12 rounded-2xl bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-700 transition-all">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-stone-800/50 rounded-2xl p-4 text-center">
                <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest mb-2">Compras</p>
                <p className="text-2xl font-black text-white">{c.totalCompras}</p>
              </div>
              <div className="bg-stone-800/50 rounded-2xl p-4 text-center">
                <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest mb-2">Total Gastado</p>
                <p className="text-2xl font-black text-orange-500">{formatCurrency(c.totalGastado)}</p>
              </div>
              <div className="bg-stone-800/50 rounded-2xl p-4 text-center">
                <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest mb-2">Frecuencia</p>
                <p className="text-2xl font-black text-white">{c.frecuenciaCompra}/mes</p>
              </div>
              <div className="bg-stone-800/50 rounded-2xl p-4 text-center">
                <p className="text-[8px] font-black text-stone-500 uppercase tracking-widest mb-2">Puntos</p>
                <p className="text-2xl font-black text-cyan-400">{c.puntos.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em]">Información de Contacto</h4>
                <div className="bg-stone-800/30 rounded-2xl p-5 space-y-3 border border-white/5">
                  <p className="text-white text-sm"><i className="fas fa-phone-alt mr-3 text-stone-600 w-4"></i>{c.telefono}</p>
                  {c.email && <p className="text-white text-sm"><i className="fas fa-envelope mr-3 text-stone-600 w-4"></i>{c.email}</p>}
                  {c.direccion && <p className="text-white text-sm"><i className="fas fa-map-marker-alt mr-3 text-stone-600 w-4"></i>{c.direccion}</p>}
                  <p className="text-white text-sm"><i className="fas fa-calendar mr-3 text-stone-600 w-4"></i>Cliente desde {formatDate(c.creado)}</p>
                  {c.cumpleanos && <p className="text-white text-sm"><i className="fas fa-birthday-cake mr-3 text-stone-600 w-4"></i>{formatDate(c.cumpleanos)}</p>}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em]">Tags</h4>
                <div className="bg-stone-800/30 rounded-2xl p-5 border border-white/5 min-h-[100px]">
                  {c.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {c.tags.map(tag => (
                        <span key={tag} className="bg-orange-600/15 text-orange-400 text-[9px] font-black px-4 py-2 rounded-full border border-orange-500/20 uppercase tracking-wider">
                          <i className="fas fa-tag mr-1.5 opacity-60"></i>{tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-stone-600 text-sm">Sin etiquetas</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em]">Historial de Compras</h4>
              <div className="bg-stone-800/30 rounded-2xl border border-white/5 overflow-hidden">
                {clientOrdersLoading && (
                  <div className="p-8 text-center text-stone-500 text-sm">
                    <i className="fas fa-circle-notch fa-spin mr-2"></i>Cargando historial...
                  </div>
                )}
                {!clientOrdersLoading && clientOrdersError && (
                  <div className="p-8 text-center text-red-400 text-sm">{clientOrdersError}</div>
                )}
                {!clientOrdersLoading && !clientOrdersError && clientOrders.length === 0 && (
                  <div className="p-8 text-center text-stone-600 text-sm">Sin compras registradas todavía.</div>
                )}
                {!clientOrdersLoading && !clientOrdersError && clientOrders.map((o, i) => (
                  <div key={o.id} className={`flex items-center justify-between p-4 md:p-5 ${i < clientOrders.length - 1 ? 'border-b border-white/5' : ''} hover:bg-stone-800/50 transition-colors`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center text-stone-500">
                        <i className="fas fa-receipt"></i>
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{o.id}</p>
                        <p className="text-stone-500 text-[10px]">{formatDate(o.fecha)}</p>
                        <p className="text-stone-400 text-xs mt-0.5">{o.items}</p>
                      </div>
                    </div>
                    <p className="text-white font-black text-sm">{formatCurrency(o.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            {c.notas && (
              <div className="space-y-3">
                <h4 className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em]">Notas</h4>
                <div className="bg-stone-800/30 rounded-2xl p-5 border border-white/5">
                  <p className="text-stone-300 text-sm italic">&ldquo;{c.notas}&rdquo;</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <button
                onClick={() => window.open(`https://wa.me/${stripPhone(c.telefono)}`, '_blank')}
                className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg"
              >
                <i className="fab fa-whatsapp text-lg"></i>WhatsApp
              </button>
              <button
                onClick={() => showToast(`Cupón asignado a ${c.nombre} (simulado, sin backend)`)}
                className="flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-500 text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg"
              >
                <i className="fas fa-ticket-alt text-lg"></i>Cupón
              </button>
              <button
                onClick={() => openEditForm(c)}
                className="flex items-center justify-center gap-3 bg-stone-800 text-stone-300 hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-500/30 border border-white/5 font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg"
              >
                <i className="fas fa-pen text-lg"></i>Editar
              </button>
              <button
                onClick={() => handleToggleVip(c.id)}
                className={`flex items-center justify-center gap-3 font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg ${c.vip ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-600/30' : 'bg-stone-800 text-stone-300 hover:bg-yellow-600/20 hover:text-yellow-400 hover:border-yellow-500/30 border border-white/5'}`}
              >
                <i className="fas fa-crown text-lg"></i>{c.vip ? 'Quitar VIP' : 'Marcar VIP'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 md:p-10 space-y-8 pb-40">
      {toast.visible && (
        <div className="fixed top-6 right-6 z-[300] bg-stone-900 border border-stone-700 text-white px-8 py-4 rounded-2xl shadow-2xl text-sm font-bold">
          {toast.message}
        </div>
      )}
      {renderModal()}
      {renderNewClientModal()}
      {renderEditClientModal()}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-brand tracking-tight text-white">CRM de Clientes</h1>
          <p className="text-stone-500 mt-3 max-w-xl">Gestión inteligente de la base de clientes GastroPro. Segmenta, analiza y fideliza.</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="bg-orange-600 hover:bg-orange-500 px-8 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4 w-full md:w-auto justify-center"
        >
          <i className="fas fa-plus"></i>+ NUEVO CLIENTE
        </button>
      </div>

      {loadError && (
        <div className="bg-red-950/40 border border-red-500/20 rounded-[2rem] p-6 flex items-center justify-between gap-4">
          <p className="text-red-400 text-sm font-bold"><i className="fas fa-triangle-exclamation mr-3"></i>{loadError}</p>
          <button onClick={fetchClients} className="text-[9px] font-black uppercase tracking-widest text-red-300 hover:text-white px-4 py-2 rounded-xl border border-red-500/30">
            Reintentar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="p-16 text-center text-stone-500">
          <i className="fas fa-circle-notch fa-spin text-3xl mb-4"></i>
          <p className="text-sm font-bold uppercase tracking-widest">Cargando clientes...</p>
        </div>
      ) : (
        <>
          {renderKPIs()}
          {renderSearchBar()}

          <div>
            <h3 className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em] mb-5">Segmentación Rápida</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {segments.map(renderSegmentCard)}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[9px] font-black text-stone-500 uppercase tracking-[0.2em]">
                Clientes {segmentFilter ? `· ${segments.find(s => s.id === segmentFilter)?.label}` : ''}
                <span className="ml-3 text-stone-700">({filteredClients.length})</span>
              </h3>
              {segmentFilter && (
                <button onClick={() => setSegmentFilter(null)} className="text-[9px] font-black text-orange-500 uppercase tracking-widest hover:text-orange-400 transition-colors">
                  <i className="fas fa-times mr-1"></i>Limpiar filtro
                </button>
              )}
            </div>
            {filteredClients.length === 0 ? (
              <div className="p-16 text-center text-stone-600 bg-stone-900/30 rounded-[2rem] border border-white/5">
                <i className="fas fa-users-slash text-3xl mb-4"></i>
                <p className="text-sm font-bold uppercase tracking-widest">No hay clientes que coincidan con estos filtros</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {filteredClients.map(renderClientCard)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ClientesView;
