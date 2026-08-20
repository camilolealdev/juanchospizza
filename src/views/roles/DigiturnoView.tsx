import React, { useState, useEffect, useCallback } from 'react';
import type { LocationId, DigiturnoTicket, DiningTable } from '../../types';
import api from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';

interface Props {
  locationId: LocationId;
}

type FilterTab = 'all' | 'waiting' | 'preparing' | 'ready';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  message: string;
  type: ToastType;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  waiting: { label: 'Esperando', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-600/30', icon: 'fa-clock' },
  preparing: { label: 'Preparando', color: 'bg-blue-500/20 text-blue-400 border-blue-600/30', icon: 'fa-fire' },
  ready: { label: 'Listo', color: 'bg-green-500/20 text-green-400 border-green-600/30', icon: 'fa-check-circle' },
  served: { label: 'Servido', color: 'bg-stone-500/10 text-stone-500 border-stone-600/20', icon: 'fa-check-double' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400 border-red-600/20', icon: 'fa-ban' },
};

const SOURCE_LABELS: Record<string, string> = {
  mesa: 'Mesa',
  local: 'Local',
  pickup: 'Para llevar',
};

const SOURCE_ICONS: Record<string, string> = {
  mesa: 'fa-table',
  local: 'fa-store',
  pickup: 'fa-bag-shopping',
};

// Reproducir sonido vía Web Audio API
function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880; // Nota A5
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);

    // Segundo tono más agudo
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100; // Nota C#6
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.45);
  } catch {
    // Audio no disponible, ignorar silenciosamente
  }
}

const DigiturnoView: React.FC<Props> = ({ locationId }) => {
  const [tickets, setTickets] = useState<DigiturnoTicket[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Create form state
  const [formCustomer, setFormCustomer] = useState('');
  const [formGuests, setFormGuests] = useState(2);
  const [formSource, setFormSource] = useState<'local' | 'mesa' | 'pickup'>('local');
  const [formTable, setFormTable] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [ticketData, tableData] = await Promise.all([
        api.getDigiturnoTickets({ locationId }),
        api.getTables({ locationId, includeInactive: 'false' }),
      ]);
      setTickets(ticketData);
      setTables(tableData);
    } catch {
      showToast('Error al cargar tickets', 'error');
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket: recargar cuando hay cambios
  useWebSocket('digiturno:new', () => {
    loadData();
    showToast('¡Nuevo ticket recibido!', 'info');
  }, { locationId });

  useWebSocket('digiturno:update', (data: unknown) => {
    // Si el ticket pasó a "ready", reproducir sonido
    const payload = data as { ticket?: DigiturnoTicket };
    if (payload?.ticket?.status === 'ready') {
      playNotificationSound();
    }
    loadData();
  }, { locationId });

  useWebSocket('digiturno:deleted', () => loadData(), { locationId });

  const updateStatus = async (id: string, status: string) => {
    try {
      const result = await api.updateDigiturnoTicketStatus(id, status);
      if (status === 'ready') playNotificationSound();
      const label = STATUS_CONFIG[status]?.label || status;
      showToast(`Ticket #${String(result?.ticketNumber || '').padStart(2, '0')} → ${label}`, 'success');
      loadData();
    } catch {
      showToast('Error al actualizar ticket', 'error');
    }
  };

  const createTicket = async () => {
    try {
      const payload: Record<string, unknown> = {
        locationId,
        orderType: 'dine-in',
        source: formSource,
        guestCount: formGuests,
        customerName: formCustomer || undefined,
        notes: formNotes || undefined,
      };

      if (formSource === 'mesa' && formTable) {
        const selectedTable = tables.find((t) => t.id === formTable);
        payload.tableId = formTable;
        payload.tableName = selectedTable?.name || formTable;
      }

      const result = await api.createDigiturnoTicket(payload);

      setShowCreateModal(false);
      resetForm();
      const ticketNum = String(result?.ticketNumber || '').padStart(2, '0');
      showToast(`Ticket #${ticketNum} creado ✓`, 'success');
      loadData();
    } catch {
      showToast('Error al crear ticket', 'error');
    }
  };

  const resetForm = () => {
    setFormCustomer('');
    setFormGuests(2);
    setFormSource('local');
    setFormTable('');
    setFormNotes('');
  };

  const filteredTickets = filter === 'all'
    ? tickets.filter((t) => t.status !== 'served' && t.status !== 'cancelled')
    : tickets.filter((t) => t.status === filter);

  const counts = {
    waiting: tickets.filter((t) => t.status === 'waiting').length,
    preparing: tickets.filter((t) => t.status === 'preparing').length,
    ready: tickets.filter((t) => t.status === 'ready').length,
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-stone-500 text-sm font-bold">Cargando digiturno...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <i className="fas fa-ticket text-orange-500" />
            Digiturno
          </h2>
          <p className="text-stone-500 text-sm">Gestión de turnos para pedidos en local</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Contadores rápidos */}
          <div className="flex gap-2">
            {counts.waiting > 0 && (
              <span className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-600/20 rounded-lg text-[11px] font-bold text-yellow-400">
                <i className="fas fa-clock mr-1" />{counts.waiting} espera
              </span>
            )}
            {counts.preparing > 0 && (
              <span className="px-3 py-1.5 bg-blue-500/10 border border-blue-600/20 rounded-lg text-[11px] font-bold text-blue-400">
                <i className="fas fa-fire mr-1" />{counts.preparing} prep.
              </span>
            )}
            {counts.ready > 0 && (
              <span className="px-3 py-1.5 bg-green-500/10 border border-green-600/20 rounded-lg text-[11px] font-bold text-green-400">
                <i className="fas fa-check-circle mr-1" />{counts.ready} listo
              </span>
            )}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-900/30 active:scale-[0.98]"
          >
            <i className="fas fa-plus mr-2" />Nuevo Ticket
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {([
          { key: 'all', label: 'Activos', count: counts.waiting + counts.preparing + counts.ready },
          { key: 'waiting', label: 'Esperando', count: counts.waiting },
          { key: 'preparing', label: 'Preparando', count: counts.preparing },
          { key: 'ready', label: 'Listos', count: counts.ready },
        ] as { key: FilterTab; label: string; count: number }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              filter === tab.key
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30'
                : 'bg-stone-900 text-stone-400 hover:text-white border border-white/5'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] ${
                filter === tab.key ? 'bg-white/20' : 'bg-stone-800'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid de tickets */}
      {filteredTickets.length === 0 && (
        <div className="text-center py-16 text-stone-600">
          <i className="fas fa-ticket-alt text-5xl mb-4 opacity-20" />
          <p className="font-bold text-lg">No hay tickets activos</p>
          <p className="text-sm mt-1">Crea un nuevo ticket para empezar</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTickets.map((ticket) => {
          const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.waiting;
          const isActionable = ticket.status === 'waiting' || ticket.status === 'preparing' || ticket.status === 'ready';

          return (
            <div
              key={ticket.id}
              className={`relative bg-stone-900/50 border rounded-2xl p-5 transition-all hover:border-stone-700/50 ${
                ticket.status === 'ready'
                  ? 'border-green-700/40 ring-1 ring-green-600/20 animate-pulse'
                  : ticket.status === 'preparing'
                    ? 'border-blue-700/40'
                    : 'border-stone-800/40'
              }`}
            >
              {/* Número de ticket grande */}
              <div className="text-center mb-4">
                <div className="text-5xl font-black text-white tracking-tight">
                  #{String(ticket.ticketNumber).padStart(2, '0')}
                </div>
                <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.color}`}>
                  <i className={`fas ${cfg.icon} text-xs`} />
                  {cfg.label}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">
                    <i className={`fas ${SOURCE_ICONS[ticket.source] || 'fa-store'} mr-1.5 text-orange-500`} />
                    {SOURCE_LABELS[ticket.source] || ticket.source}
                  </span>
                  <span className="text-stone-400">
                    <i className="fas fa-users mr-1.5 text-orange-500" />
                    {ticket.guestCount} pax
                  </span>
                </div>
                {ticket.tableName && (
                  <div className="text-stone-400">
                    <i className="fas fa-table mr-1.5 text-orange-500" />
                    {ticket.tableName}
                  </div>
                )}
                {ticket.customerName && (
                  <div className="text-stone-300 font-bold text-base">{ticket.customerName}</div>
                )}
                <div className="text-[10px] text-stone-600 flex items-center gap-2">
                  <i className="fas fa-clock" />
                  {new Date(ticket.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  {ticket.calledAt && (
                    <>
                      <span className="text-stone-700">·</span>
                      <i className="fas fa-bell" />
                      {new Date(ticket.calledAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </>
                  )}
                </div>
              </div>

              {/* Acciones */}
              {isActionable && (
                <div className="flex gap-2">
                  {ticket.status === 'waiting' && (
                    <button
                      onClick={() => updateStatus(ticket.id, 'preparing')}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all active:scale-[0.97]"
                    >
                      <i className="fas fa-fire mr-1" />Iniciar
                    </button>
                  )}
                  {ticket.status === 'preparing' && (
                    <button
                      onClick={() => updateStatus(ticket.id, 'ready')}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-xs transition-all active:scale-[0.97]"
                    >
                      <i className="fas fa-check mr-1" />Listo
                    </button>
                  )}
                  {ticket.status === 'ready' && (
                    <button
                      onClick={() => updateStatus(ticket.id, 'served')}
                      className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition-all active:scale-[0.97]"
                    >
                      <i className="fas fa-check-double mr-1" />Servir
                    </button>
                  )}
                  <button
                    onClick={() => updateStatus(ticket.id, 'cancelled')}
                    className="py-2.5 px-3 bg-stone-800 hover:bg-red-900/50 text-stone-400 hover:text-red-400 rounded-xl text-xs transition-all"
                    title="Cancelar"
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              )}

              {/* Items si tiene */}
              {Array.isArray(ticket.items) && ticket.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-800/30">
                  <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-1">Productos:</div>
                  {(ticket.items as string[]).slice(0, 4).map((item, i) => (
                    <div key={i} className="text-xs text-stone-400 truncate">
                      • {item}
                    </div>
                  ))}
                  {ticket.items.length > 4 && (
                    <div className="text-[10px] text-stone-600">+{ticket.items.length - 4} más</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setShowCreateModal(false); resetForm(); }}
        >
          <div
            className="w-full max-w-md bg-stone-950 border border-white/10 rounded-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-black text-white">Nuevo Ticket</h3>
              <p className="text-stone-500 text-sm">Crear turno para pedido en local</p>
            </div>

            {/* Tipo de origen */}
            <div>
              <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-2">
                Origen del pedido
              </label>
              <div className="flex gap-2">
                {(['local', 'mesa', 'pickup'] as const).map((src) => (
                  <button
                    key={src}
                    onClick={() => { setFormSource(src); setFormTable(''); }}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border ${
                      formSource === src
                        ? 'bg-orange-600/20 border-orange-500/40 text-orange-400'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    <i className={`fas ${SOURCE_ICONS[src]} block text-lg mb-1`} />
                    {SOURCE_LABELS[src]}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector de mesa (solo si origen = mesa) */}
            {formSource === 'mesa' && (
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-2">
                  Mesa
                </label>
                <select
                  value={formTable}
                  onChange={(e) => setFormTable(e.target.value)}
                  className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white font-bold focus:border-orange-600/50 outline-none"
                >
                  <option value="">Seleccionar mesa</option>
                  {tables
                    .filter((t) => t.status === 'available' || t.status === 'occupied')
                    .map((t) => (
                      <option key={t.id} value={t.id} className="bg-stone-900">
                        {t.name} ({t.area}) - Cap. {t.capacity}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Nombre del cliente */}
            <div>
              <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-2">
                Nombre del cliente <span className="text-stone-700">(opcional)</span>
              </label>
              <input
                value={formCustomer}
                onChange={(e) => setFormCustomer(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-orange-600/50 outline-none"
              />
            </div>

            {/* Comensales */}
            <div>
              <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-2">
                Comensales
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFormGuests(Math.max(1, formGuests - 1))}
                  className="w-10 h-10 rounded-xl bg-stone-900 border border-white/10 flex items-center justify-center text-white hover:bg-stone-800 transition-all"
                >
                  <i className="fas fa-minus text-xs" />
                </button>
                <span className="text-2xl font-black text-white w-8 text-center">{formGuests}</span>
                <button
                  onClick={() => setFormGuests(Math.min(20, formGuests + 1))}
                  className="w-10 h-10 rounded-xl bg-stone-900 border border-white/10 flex items-center justify-center text-white hover:bg-stone-800 transition-all"
                >
                  <i className="fas fa-plus text-xs" />
                </button>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-2">
                Notas <span className="text-stone-700">(opcional)</span>
              </label>
              <input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Alergias, preferencias, etc."
                className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-orange-600/50 outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 rounded-xl text-sm font-bold text-stone-400 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={createTicket}
                disabled={formSource === 'mesa' && !formTable}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 shadow-lg shadow-orange-900/30"
              >
                <i className="fas fa-ticket mr-2" />
                Crear Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={[
            'fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in flex items-center gap-3',
            toast.type === 'success' ? 'bg-green-600 text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' :
            'bg-blue-600 text-white',
          ].join(' ')}
        >
          <i className={`fas ${
            toast.type === 'success' ? 'fa-check-circle' :
            toast.type === 'error' ? 'fa-exclamation-circle' :
            'fa-info-circle'
          }`} />
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default DigiturnoView;
