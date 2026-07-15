import React, { useState, useEffect, useCallback } from 'react';
import type { LocationId, DiningTable, Comanda, ComandaItem } from '../../types';
import api from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';

interface Props {
  locationId: LocationId;
}

type TabType = 'activas' | 'cerradas';

const ComandasView: React.FC<Props> = ({ locationId }) => {
  const [comandas, setComandas] = useState<(Comanda & { tableName?: string })[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('activas');
  const [selectedComanda, setSelectedComanda] = useState<
    (Comanda & { items: ComandaItem[]; tableName?: string }) | null
  >(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showAddItems, setShowAddItems] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [newComanda, setNewComanda] = useState({ tableId: '', guestCount: 1, waiterName: '' });
  const [closeData, setCloseData] = useState({ total: 0, paymentMethod: 'cash', notes: '' });
  const [batchItems, setBatchItems] = useState<{ productName: string; quantity: number; unitPrice: number }[]>([
    { productName: '', quantity: 1, unitPrice: 0 },
  ]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [comandasData, tablesData] = await Promise.all([
        api.getComandas({ status: tab === 'activas' ? undefined : 'closed', locationId }),
        api.getTables({ locationId }),
      ]);
      // Enriquecer con nombre de mesa
      const enriched = comandasData.map((c: Comanda) => ({
        ...c,
        tableName: tablesData.find((t: DiningTable) => t.id === c.tableId)?.name || '—',
      }));
      setComandas(enriched);
      setTables(tablesData);
    } catch (e) {
      setError('Error al cargar comandas');
    } finally {
      setLoading(false);
    }
  }, [locationId, tab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recargar comandas cuando llegan eventos WebSocket
  useWebSocket('comanda:update', () => {
    loadData();
  }, { locationId });

  const openComanda = async () => {
    if (!newComanda.tableId) return;
    try {
      await api.createComanda({ ...newComanda, locationId });
      setShowCreateModal(false);
      setNewComanda({ tableId: '', guestCount: 1, waiterName: '' });
      loadData();
    } catch (e) {
      setError('Error al crear comanda');
    }
  };

  const addItems = async () => {
    if (!selectedComanda) return;
    const validItems = batchItems.filter((i) => i.productName && i.quantity > 0);
    if (!validItems.length) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await api.bulkAddComandaItems(selectedComanda.id, validItems as any);
      setShowAddItems(false);
      setBatchItems([{ productName: '', quantity: 1, unitPrice: 0 }]);
      const updated = await api.getComanda(selectedComanda.id);
      setSelectedComanda(updated);
    } catch (e) {
      setError('Error al agregar productos');
    }
  };

  const closeComanda = async () => {
    if (!selectedComanda) return;
    try {
      await api.closeComanda(selectedComanda.id, closeData);
      setShowCloseModal(false);
      setSelectedComanda(null);
      loadData();
    } catch (e) {
      setError('Error al cerrar comanda');
    }
  };

  const printKitchenTicket = (comandaId: string) => {
    window.open(api.getPrintKitchenTicketUrl(comandaId), '_blank', 'width=400,height=600');
  };

  const printReceipt = (comandaId: string) => {
    window.open(api.getPrintComandaReceiptUrl(comandaId), '_blank', 'width=400,height=600');
  };

  const openDetail = async (id: string) => {
    try {
      const data = await api.getComanda(id);
      const table = tables.find((t) => t.id === data.tableId);
      setSelectedComanda({ ...data, tableName: table?.name });
    } catch (e) {
      setError('Error al cargar detalle');
    }
  };

  // Agrupar mesas ocupadas para el grid
  const occupiedTables = new Set(comandas.filter((c) => c.status === 'open').map((c) => c.tableId));

  const addBatchItemRow = () => {
    setBatchItems([...batchItems, { productName: '', quantity: 1, unitPrice: 0 }]);
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-stone-500 text-sm font-bold">Cargando comandas...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Comandas</h2>
          <p className="text-stone-500 text-sm">Gestión de pedidos de mesa</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-orange-900/30 active:scale-[0.98]"
        >
          <i className="fas fa-plus mr-2" />
          Nueva Comanda
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800/30 rounded-xl text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['activas', 'cerradas'] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === t
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30'
                : 'bg-stone-900 text-stone-400 hover:text-white'
            }`}
          >
            {t === 'activas' ? '🟢 Activas' : '🔴 Cerradas'}
            {t === 'activas' && comandas.filter((c) => c.status === 'open').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-[10px] rounded-full">
                {comandas.filter((c) => c.status === 'open').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Floor plan grid (active tab only) */}
      {tab === 'activas' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {tables
            .filter((t) => t.active)
            .map((table) => {
              const isOccupied = occupiedTables.has(table.id);
              const comandaOnTable = comandas.find((c) => c.tableId === table.id && c.status === 'open');
              return (
                <button
                  key={table.id}
                  onClick={() => comandaOnTable && openDetail(comandaOnTable.id)}
                  className={`relative p-4 rounded-xl border text-left transition-all ${
                    isOccupied
                      ? 'bg-orange-900/20 border-orange-700/40 hover:border-orange-500/60'
                      : 'bg-stone-900/50 border-stone-800/40 hover:border-stone-600/40'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full mb-2 ${isOccupied ? 'bg-orange-500' : 'bg-green-500'}`} />
                  <p className="text-white font-bold text-lg">{table.name}</p>
                  <p className="text-stone-500 text-[10px] uppercase">
                    {table.area} · {table.capacity} pax
                  </p>
                  {comandaOnTable && (
                    <p className="text-orange-400 text-xs mt-1 font-bold">{comandaOnTable.guestCount} comensales</p>
                  )}
                </button>
              );
            })}
        </div>
      )}

      {/* Comandas list */}
      <div className="space-y-3">
        {comandas.filter((c) => (tab === 'activas' ? c.status === 'open' : c.status === 'closed')).length === 0 && (
          <div className="text-center py-10 text-stone-600">
            <i className="fas fa-receipt text-4xl mb-3 opacity-30" />
            <p className="font-bold">No hay comandas {tab === 'activas' ? 'activas' : 'cerradas'}</p>
          </div>
        )}
        {comandas
          .filter((c) => (tab === 'activas' ? c.status === 'open' : c.status === 'closed'))
          .map((comanda) => (
            <div
              key={comanda.id}
              className="bg-stone-900/50 border border-stone-800/30 rounded-xl p-5 hover:border-stone-700/30 transition-all cursor-pointer"
              onClick={() => openDetail(comanda.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${comanda.status === 'open' ? 'bg-green-500' : 'bg-stone-500'}`}
                  />
                  <span className="font-bold text-white">Mesa {comanda.tableName || '—'}</span>
                  {comanda.waiterName && (
                    <span className="text-xs text-stone-500">
                      <i className="fas fa-user mr-1" />
                      {comanda.waiterName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">{comanda.guestCount} pax</span>
                  {comanda.status === 'open' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          printKitchenTicket(comanda.id);
                        }}
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-[10px] font-bold text-stone-300 transition-all"
                      >
                        <i className="fas fa-print mr-1" />
                        Cocina
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          printReceipt(comanda.id);
                        }}
                        className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-[10px] font-bold text-stone-300 transition-all"
                      >
                        <i className="fas fa-receipt mr-1" />
                        Cuenta
                      </button>
                    </>
                  )}
                  {comanda.status === 'closed' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        printReceipt(comanda.id);
                      }}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-[10px] font-bold text-stone-300 transition-all"
                    >
                      <i className="fas fa-print mr-1" />
                      Reimprimir
                    </button>
                  )}
                </div>
              </div>
              {comanda.status === 'open' && (
                <p className="text-xs text-stone-500">Abierta: {new Date(comanda.openedAt).toLocaleString('es-CO')}</p>
              )}
              {comanda.status === 'closed' && (
                <p className="text-xs text-stone-500">
                  Cerrada: {comanda.closedAt ? new Date(comanda.closedAt).toLocaleString('es-CO') : '—'}
                </p>
              )}
            </div>
          ))}
      </div>

      {/* Detail Modal */}
      {selectedComanda && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedComanda(null)}
        >
          <div
            className="w-full max-w-lg bg-stone-950 border border-white/10 rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-black text-white">Mesa {selectedComanda.tableName || '—'}</h3>
                <p className="text-stone-500 text-xs">
                  {selectedComanda.waiterName && (
                    <>
                      <i className="fas fa-user mr-1" />
                      {selectedComanda.waiterName} ·{' '}
                    </>
                  )}
                  {selectedComanda.guestCount} comensales
                </p>
              </div>
              <div className="flex gap-2">
                {selectedComanda.status === 'open' && (
                  <>
                    <button
                      onClick={() => {
                        setShowAddItems(true);
                      }}
                      className="px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl text-xs font-bold text-white transition-all"
                    >
                      <i className="fas fa-plus mr-1" />
                      Items
                    </button>
                    <button
                      onClick={() => {
                        window.open(
                          api.getPrintComandaReceiptUrl(selectedComanda.id),
                          '_blank',
                          'width=400,height=600'
                        );
                      }}
                      className="px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl text-xs font-bold text-white transition-all"
                    >
                      <i className="fas fa-print mr-1" />
                      Imprimir
                    </button>
                    <button
                      onClick={() => {
                        setShowCloseModal(true);
                        setCloseData({ ...closeData, total: selectedComanda.total });
                      }}
                      className="px-3 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-xs font-bold text-white transition-all"
                    >
                      <i className="fas fa-check mr-1" />
                      Cerrar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-5">
              {(!selectedComanda.items || selectedComanda.items.length === 0) && (
                <p className="text-stone-600 text-sm text-center py-4">Sin productos aún</p>
              )}
              {selectedComanda.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-stone-900/50 rounded-xl border border-stone-800/20"
                >
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{item.productName}</p>
                    <p className="text-[10px] text-stone-500">
                      {item.quantity}x ${(item.unitPrice || 0).toLocaleString('es-CO')} c/u
                      {item.notes && <span className="ml-2">· Nota: {item.notes}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-400">${(item.subtotal || 0).toLocaleString('es-CO')}</p>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        item.status === 'pending'
                          ? 'bg-yellow-900/30 text-yellow-500'
                          : item.status === 'ready'
                            ? 'bg-green-900/30 text-green-500'
                            : item.status === 'served'
                              ? 'bg-blue-900/30 text-blue-500'
                              : 'bg-stone-800 text-stone-500'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-stone-800/30">
              <span className="text-stone-500 text-xs">{selectedComanda.items?.length || 0} productos</span>
              <span className="text-xl font-black text-white">
                ${(selectedComanda.total || 0).toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Create Comanda Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md bg-stone-950 border border-white/10 rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-5">Nueva Comanda</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">
                  Mesa
                </label>
                <select
                  value={newComanda.tableId}
                  onChange={(e) => setNewComanda({ ...newComanda, tableId: e.target.value })}
                  className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white font-bold"
                >
                  <option value="">Seleccionar mesa</option>
                  {tables
                    .filter((t) => t.active && t.status === 'available')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.area} ({t.capacity} pax)
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">
                  Mesero
                </label>
                <input
                  value={newComanda.waiterName}
                  onChange={(e) => setNewComanda({ ...newComanda, waiterName: e.target.value })}
                  placeholder="Nombre del mesero"
                  className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">
                  Comensales
                </label>
                <input
                  type="number"
                  value={newComanda.guestCount}
                  onChange={(e) => setNewComanda({ ...newComanda, guestCount: Number(e.target.value) })}
                  min={1}
                  max={99}
                  className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 rounded-xl text-sm font-bold text-stone-400 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={openComanda}
                  disabled={!newComanda.tableId}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                >
                  Abrir Comanda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Items Modal */}
      {showAddItems && selectedComanda && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddItems(false)}
        >
          <div
            className="w-full max-w-md bg-stone-950 border border-white/10 rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-5">Agregar Productos</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {batchItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-stone-900/50 rounded-xl border border-stone-800/20 space-y-2">
                  <input
                    value={item.productName}
                    onChange={(e) => {
                      const items = [...batchItems];
                      items[idx].productName = e.target.value;
                      setBatchItems(items);
                    }}
                    placeholder="Nombre del producto"
                    className="w-full bg-stone-900 border border-white/10 rounded-lg p-2 text-sm text-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const items = [...batchItems];
                        items[idx].quantity = Number(e.target.value);
                        setBatchItems(items);
                      }}
                      placeholder="Cant"
                      min={1}
                      className="w-20 bg-stone-900 border border-white/10 rounded-lg p-2 text-sm text-white text-center"
                    />
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const items = [...batchItems];
                        items[idx].unitPrice = Number(e.target.value);
                        setBatchItems(items);
                      }}
                      placeholder="Precio"
                      min={0}
                      className="flex-1 bg-stone-900 border border-white/10 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addBatchItemRow}
                className="w-full py-2 bg-stone-800 hover:bg-stone-700 rounded-xl text-xs font-bold text-stone-400 transition-all"
              >
                <i className="fas fa-plus mr-1" />
                Agregar otro producto
              </button>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowAddItems(false)}
                className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 rounded-xl text-sm font-bold text-stone-400 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={addItems}
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold text-white transition-all"
              >
                Agregar {batchItems.filter((i) => i.productName).length} producto(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Comanda Modal */}
      {showCloseModal && selectedComanda && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCloseModal(false)}
        >
          <div
            className="w-full max-w-md bg-stone-950 border border-white/10 rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-2">Cerrar Comanda</h3>
            <p className="text-stone-500 text-sm mb-5">Mesa {selectedComanda.tableName || '—'}</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">
                  Total
                </label>
                <input
                  type="number"
                  value={closeData.total}
                  onChange={(e) => setCloseData({ ...closeData, total: Number(e.target.value) })}
                  className="w-full bg-stone-900 border border-white/10 rounded-xl p-4 text-2xl text-white font-black text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">
                  Método de pago
                </label>
                <select
                  value={closeData.paymentMethod}
                  onChange={(e) => setCloseData({ ...closeData, paymentMethod: e.target.value })}
                  className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white font-bold"
                >
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="nequi">Nequi</option>
                  <option value="daviplata">Daviplata</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-1">
                  Notas (opcional)
                </label>
                <input
                  value={closeData.notes}
                  onChange={(e) => setCloseData({ ...closeData, notes: e.target.value })}
                  placeholder="Nota de cierre"
                  className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 rounded-xl text-sm font-bold text-stone-400 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={closeComanda}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold text-white transition-all"
                >
                  Cerrar Comanda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComandasView;
