import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import type { DiningTable, FloorPlan, LocationId } from '../../types';

interface Props {
  locationId: LocationId;
}

const TABLE_STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  occupied: 'Ocupada',
  reserved: 'Reservada',
  cleaning: 'Limpieza',
  maintenance: 'Mantenimiento',
};

const TABLE_STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  occupied: 'bg-red-500/15 text-red-400 border-red-500/25',
  reserved: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  cleaning: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  maintenance: 'bg-stone-500/15 text-stone-400 border-stone-500/25',
};

const AREA_LABELS: Record<string, string> = {
  salon: 'Salón Principal',
  terraza: 'Terraza',
  privado: 'Privado',
  barra: 'Barra',
};

const MesasView: React.FC<Props> = ({ locationId }) => {
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [form, setForm] = useState({ name: '', capacity: 4, area: 'salon', notes: '' });
  const [editTable, setEditTable] = useState<DiningTable | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState('available');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [planData, tablesData] = await Promise.all([
        api.getFloorPlan(locationId),
        api.getTables({ locationId, includeInactive: 'true' }),
      ]);
      setFloorPlan(planData);
      setTables(tablesData);
    } catch (e) {
      console.error('Error loading tables:', e);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recargar mesas cuando llegan eventos WebSocket
  useWebSocket('table:update', () => {
    loadData();
  }, { locationId });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editTable) {
        await api.updateTable(editTable.id, form);
      } else {
        await api.createTable({ ...form, locationId });
      }
      setShowForm(false);
      setEditTable(null);
      setForm({ name: '', capacity: 4, area: 'salon', notes: '' });
      loadData();
    } catch (e) {
      alert('Error al guardar la mesa');
    }
  };

  const handleEdit = (table: DiningTable) => {
    setForm({ name: table.name, capacity: table.capacity, area: table.area, notes: table.notes || '' });
    setEditTable(table);
    setShowForm(true);
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updateTable(id, { status });
      loadData();
    } catch (e) {
      alert('Error al cambiar estado');
    }
  };

  const handleBatchUpdate = async () => {
    if (selectedIds.size === 0) return;
    try {
      await api.batchUpdateTableStatus(Array.from(selectedIds), batchStatus);
      setSelectedIds(new Set());
      setBatchMode(false);
      loadData();
    } catch (e) {
      alert('Error al actualizar mesas');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredAreas = selectedArea === 'all' ? ['salon', 'terraza', 'privado', 'barra'] : [selectedArea];

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="text-stone-500 text-sm font-bold uppercase tracking-widest animate-pulse">
          Cargando mesas...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Gestión de Mesas</h2>
          <p className="text-stone-500 text-sm mt-1">
            {floorPlan?.total || 0} mesas ·{' '}
            <span className="text-emerald-400">{floorPlan?.available || 0} disponibles</span>
            {' · '}
            <span className="text-red-400">{floorPlan?.occupied || 0} ocupadas</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setBatchMode(!batchMode);
              setSelectedIds(new Set());
            }}
            className={`crm-btn-primary ${batchMode ? 'bg-amber-600' : ''}`}
          >
            <i className={`fas ${batchMode ? 'fa-times' : 'fa-layer-group'} text-xs mr-2`}></i>
            {batchMode ? 'Salir' : 'Cambio Masivo'}
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setEditTable(null);
              setForm({ name: '', capacity: 4, area: 'salon', notes: '' });
            }}
            className="crm-btn-primary"
          >
            <i className="fas fa-plus text-xs mr-2"></i>Nueva Mesa
          </button>
        </div>
      </div>

      {/* Area Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'salon', 'terraza', 'privado', 'barra'].map((area) => (
          <button
            key={area}
            onClick={() => setSelectedArea(area)}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              selectedArea === area
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30'
                : 'bg-stone-900 text-stone-400 hover:text-white border border-white/5'
            }`}
          >
            {area === 'all' ? 'Todas' : AREA_LABELS[area] || area}
          </button>
        ))}
      </div>

      {/* Batch Control Bar */}
      {batchMode && (
        <div className="crm-card p-4 flex flex-wrap items-center gap-4">
          <span className="text-sm font-bold text-white">
            <i className="fas fa-check-square text-orange-500 mr-2"></i>
            {selectedIds.size} seleccionadas
          </span>
          <select
            value={batchStatus}
            onChange={(e) => setBatchStatus(e.target.value)}
            className="crm-input py-2 px-3 text-sm flex-1 min-w-[150px] max-w-[200px]"
          >
            {Object.entries(TABLE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={handleBatchUpdate}
            disabled={selectedIds.size === 0}
            className="crm-btn-primary text-xs py-2 px-4"
          >
            Aplicar Cambio
          </button>
        </div>
      )}

      {/* Tables Grid by Area */}
      <div className="space-y-8">
        {filteredAreas.map((area) => {
          const areaTables = tables.filter((t) => t.area === area);
          if (areaTables.length === 0) return null;
          return (
            <div key={area}>
              <h3 className="text-lg font-bold text-white/80 mb-4 flex items-center gap-3">
                <i
                  className={`fas fa-${area === 'salon' ? 'couch' : area === 'terraza' ? 'tree' : area === 'privado' ? 'door-closed' : 'counter'} text-orange-500`}
                ></i>
                {AREA_LABELS[area]}
                <span className="text-xs font-bold text-stone-500 bg-stone-900 px-3 py-1 rounded-full">
                  {areaTables.filter((t) => t.status === 'available').length}/{areaTables.length}
                </span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {areaTables.map((table) => (
                  <div
                    key={table.id}
                    className={`crm-card p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                      batchMode && selectedIds.has(table.id) ? 'ring-2 ring-orange-500' : ''
                    }`}
                    onClick={() => batchMode && toggleSelect(table.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-white text-sm">{table.name}</h4>
                        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mt-0.5">
                          <i className="fas fa-users text-[8px] mr-1"></i>
                          {table.capacity} pers.
                        </p>
                      </div>
                      {!batchMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(table);
                          }}
                          className="text-stone-500 hover:text-white transition-colors"
                        >
                          <i className="fas fa-edit text-xs"></i>
                        </button>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="mb-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${TABLE_STATUS_COLORS[table.status] || 'bg-stone-800 text-stone-400'}`}
                      >
                        {TABLE_STATUS_LABELS[table.status] || table.status}
                      </span>
                    </div>

                    {/* Quick Status Change */}
                    {!batchMode && (
                      <div className="flex flex-wrap gap-1">
                        {['available', 'occupied', 'reserved'].map(
                          (s) =>
                            s !== table.status && (
                              <button
                                key={s}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(table.id, s);
                                }}
                                className="text-[8px] px-2 py-1 rounded-full bg-stone-900 text-stone-500 hover:text-white hover:bg-stone-800 font-bold uppercase tracking-wider transition-colors"
                              >
                                {TABLE_STATUS_LABELS[s]}
                              </button>
                            )
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-stone-950 border border-white/10 rounded-[2rem] p-8 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-6">{editTable ? 'Editar Mesa' : 'Nueva Mesa'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block">
                  Nombre
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="crm-input w-full"
                  placeholder="Ej: Mesa 1, VIP, Terraza 3"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block">
                  Capacidad
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value) || 4 }))}
                  className="crm-input w-full"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block">
                  Área
                </label>
                <select
                  value={form.area}
                  onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                  className="crm-input w-full"
                >
                  <option value="salon">Salón Principal</option>
                  <option value="terraza">Terraza</option>
                  <option value="privado">Privado</option>
                  <option value="barra">Barra</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest mb-2 block">
                  Notas
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="crm-input w-full resize-none h-20"
                  placeholder="Opcional: ubicación exacta, detalles..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="crm-btn-primary flex-1">
                  {editTable ? 'Guardar Cambios' : 'Crear Mesa'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditTable(null);
                  }}
                  className="px-6 py-3 rounded-xl bg-stone-900 text-stone-400 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MesasView;
