
import React, { useState, useMemo } from 'react';
import { Client } from '../../types';

const SAMPLE_CLIENTS: Client[] = [
  { id: '1', nombre: 'Carlos Andrés Martínez', telefono: '+57 310 555 0101', email: 'carlos.martinez@email.com', direccion: 'Cra 15 #88-42, Bogotá', totalCompras: 47, totalGastado: 12500000, frecuenciaCompra: 4, ultimaCompra: '2026-06-01', creado: '2024-01-15', vip: true, puntos: 4800, nivel: 'Platino', tags: ['frecuente', 'postres'], estado: 'activo' },
  { id: '2', nombre: 'María Fernanda López', telefono: '+57 300 555 0202', email: 'maria.lopez@email.com', direccion: 'Cl 72 #10-30, Bogotá', totalCompras: 32, totalGastado: 8900000, frecuenciaCompra: 3, ultimaCompra: '2026-05-28', creado: '2024-03-20', vip: true, puntos: 3200, nivel: 'Oro', tags: ['familia', 'domingos'], estado: 'activo' },
  { id: '3', nombre: 'Jorge Eliécer Ramírez', telefono: '+57 315 555 0303', email: 'jorge.ramirez@email.com', direccion: 'Av Suba #120-50, Bogotá', totalCompras: 18, totalGastado: 4200000, frecuenciaCompra: 2, ultimaCompra: '2026-04-15', creado: '2024-06-10', vip: false, puntos: 1100, nivel: 'Plata', tags: ['ejecutivo', 'almuerzo'], estado: 'activo' },
  { id: '4', nombre: 'Ana Milena Ochoa', telefono: '+57 320 555 0404', email: 'ana.ochoa@email.com', direccion: 'Cl 85 #19-60, Bogotá', totalCompras: 8, totalGastado: 1950000, frecuenciaCompra: 1, ultimaCompra: '2026-02-10', creado: '2025-01-05', vip: false, puntos: 400, nivel: 'Bronce', tags: ['nuevo', 'vegana'], estado: 'inactivo' },
  { id: '5', nombre: 'Ricardo Andrés Peña', telefono: '+57 301 555 0505', email: 'ricardo.pena@email.com', direccion: 'Cra 7 #55-20, Bogotá', totalCompras: 63, totalGastado: 18900000, frecuenciaCompra: 5, ultimaCompra: '2026-06-03', creado: '2023-09-01', vip: true, puntos: 6200, nivel: 'Platino', tags: ['frecuente', 'eventos', 'premium'], estado: 'activo' },
  { id: '6', nombre: 'Diana Patricia Rojas', telefono: '+57 311 555 0606', email: 'diana.rojas@email.com', direccion: 'Cl 127 #15-80, Bogotá', totalCompras: 12, totalGastado: 3100000, frecuenciaCompra: 1, ultimaCompra: '2026-01-20', creado: '2024-11-15', vip: false, puntos: 600, nivel: 'Bronce', tags: ['ocasional'], estado: 'inactivo' },
  { id: '7', nombre: 'Luis Fernando Gómez', telefono: '+57 314 555 0707', email: 'luis.gomez@email.com', direccion: 'Av 68 #45-12, Bogotá', totalCompras: 24, totalGastado: 6800000, frecuenciaCompra: 2, ultimaCompra: '2026-05-20', creado: '2024-04-10', vip: false, puntos: 1800, nivel: 'Plata', tags: ['comparte', 'pizzas'], estado: 'activo' },
  { id: '8', nombre: 'Carmen Helena Vargas', telefono: '+57 300 555 0808', email: 'carmen.vargas@email.com', direccion: 'Cl 53 #25-40, Bogotá', totalCompras: 41, totalGastado: 10500000, frecuenciaCompra: 3, ultimaCompra: '2026-05-30', creado: '2024-02-18', vip: true, puntos: 3900, nivel: 'Oro', tags: ['frecuente', 'postres', 'cumpleaños'], estado: 'activo' },
];

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

const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO');

const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

const stripPhone = (phone: string) => phone.replace(/[^\d]/g, '');

const getClientOrders = (clientId: string) => {
  const items = [
    { items: 'Pizza Margherita + Postre Tiramisú', total: 98000 },
    { items: 'Pizza Pepperoni + Bebida 2L', total: 85000 },
    { items: 'Combo Familiar + Postre 3 Leches', total: 156000 },
    { items: '2x Pizza Tradicional + Entrada', total: 132000 },
    { items: 'Pizza Premium D.O.P + Vino', total: 215000 },
  ];
  return items.map((item, i) => ({
    id: `ORD-${clientId}-${String(i + 1).padStart(3, '0')}`,
    fecha: new Date(Date.now() - i * 7 * 86400000).toISOString().split('T')[0],
    ...item,
  }));
};

const ClientesView: React.FC = () => {
  const [clients, setClients] = useState<Client[]>(SAMPLE_CLIENTS);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('nombre');
  const [segmentFilter, setSegmentFilter] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newClient, setNewClient] = useState({ nombre: '', telefono: '', email: '', direccion: '' });

  const kpis = useMemo(() => [
    { label: 'Total Clientes', value: String(clients.length), icon: 'users', color: 'text-blue-400', bg: 'bg-blue-600/10 border-blue-600/20' },
    { label: 'Clientes VIP', value: String(clients.filter(c => c.vip).length), icon: 'crown', color: 'text-yellow-400', bg: 'bg-yellow-600/10 border-yellow-600/20' },
    { label: 'Clientes Inactivos', value: String(clients.filter(c => c.estado === 'inactivo').length), icon: 'user-clock', color: 'text-red-400', bg: 'bg-red-600/10 border-red-600/20' },
    { label: 'LTV Promedio', value: formatCurrency(Math.round(clients.reduce((s, c) => s + c.totalGastado, 0) / clients.length)), icon: 'chart-line', color: 'text-green-400', bg: 'bg-green-600/10 border-green-600/20' },
  ], [clients]);

  const segments = useMemo(() => [
    { id: 'alta-frecuencia', label: 'Alta Frecuencia', count: clients.filter(c => c.frecuenciaCompra >= 3).length, desc: '> 3 compras en el último mes', icon: 'rocket', color: 'text-emerald-400', border: 'border-emerald-500/30' },
    { id: 'alto-gasto', label: 'Alto Gasto', count: clients.filter(c => (c.totalGastado / c.totalCompras) > 150000).length, desc: 'Ticket promedio > $150,000', icon: 'gem', color: 'text-purple-400', border: 'border-purple-500/30' },
    { id: 'en-riesgo', label: 'En Riesgo', count: clients.filter(c => (Date.now() - new Date(c.ultimaCompra + 'T00:00:00').getTime()) / 86400000 >= 45).length, desc: 'Sin compras en 45+ días', icon: 'exclamation-triangle', color: 'text-orange-400', border: 'border-orange-500/30' },
    { id: 'nuevos', label: 'Nuevos', count: clients.filter(c => (Date.now() - new Date(c.creado + 'T00:00:00').getTime()) / 86400000 <= 30).length, desc: 'Primera compra < 30 días', icon: 'star', color: 'text-sky-400', border: 'border-sky-500/30' },
  ], [clients]);

  const filteredClients = useMemo(() => {
    let result = [...clients];

    if (segmentFilter === 'alta-frecuencia') result = result.filter(c => c.frecuenciaCompra >= 3);
    if (segmentFilter === 'alto-gasto') result = result.filter(c => (c.totalGastado / c.totalCompras) > 150000);
    if (segmentFilter === 'en-riesgo') result = result.filter(c => {
      const days = (Date.now() - new Date(c.ultimaCompra + 'T00:00:00').getTime()) / 86400000;
      return days >= 45;
    });
    if (segmentFilter === 'nuevos') result = result.filter(c => {
      const days = (Date.now() - new Date(c.creado + 'T00:00:00').getTime()) / 86400000;
      return days <= 30;
    });

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

  const handleToggleVip = (clientId: string) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, vip: !c.vip } : c));
    setSelectedClient(prev => prev && prev.id === clientId ? { ...prev, vip: !prev.vip } : prev);
  };

  const handleNewClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = String(Date.now());
    const entry: Client = {
      id,
      nombre: newClient.nombre,
      telefono: newClient.telefono,
      email: newClient.email,
      direccion: newClient.direccion,
      totalCompras: 0,
      totalGastado: 0,
      frecuenciaCompra: 0,
      ultimaCompra: new Date().toISOString().split('T')[0],
      creado: new Date().toISOString().split('T')[0],
      vip: false,
      puntos: 0,
      nivel: 'Bronce',
      tags: [],
      estado: 'activo',
    };
    setClients(prev => [...prev, entry]);
    setNewClient({ nombre: '', telefono: '', email: '', direccion: '' });
    setShowNewForm(false);
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
            <button type="submit" disabled={!isValid} className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg">
              <i className="fas fa-plus mr-2"></i>Registrar Cliente
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!selectedClient) return null;
    const c = selectedClient;
    const clientOrders = getClientOrders(c.id);

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
                  {c.cumpleanos && <p className="text-white text-sm"><i className="fas fa-birthday-cake mr-3 text-stone-600 w-4"></i>{c.cumpleanos}</p>}
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
                {clientOrders.map((o, i) => (
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <button
                onClick={() => window.open(`https://wa.me/${stripPhone(c.telefono)}`, '_blank')}
                className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg"
              >
                <i className="fab fa-whatsapp text-lg"></i>Enviar WhatsApp
              </button>
              <button
                onClick={() => alert(`Cupón asignado a ${c.nombre}`)}
                className="flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-500 text-white font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg"
              >
                <i className="fas fa-ticket-alt text-lg"></i>Asignar Cupón
              </button>
              <button
                onClick={() => handleToggleVip(c.id)}
                className={`flex items-center justify-center gap-3 font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest transition-all shadow-lg ${c.vip ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-600/30' : 'bg-stone-800 text-stone-300 hover:bg-yellow-600/20 hover:text-yellow-400 hover:border-yellow-500/30 border border-white/5'}`}
              >
                <i className="fas fa-crown text-lg"></i>{c.vip ? 'Quitar VIP' : 'Marcar como VIP'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 md:p-10 space-y-8 pb-40">
      {renderModal()}
      {renderNewClientModal()}

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredClients.map(renderClientCard)}
        </div>
      </div>
    </div>
  );
};

export default ClientesView;
