import React, { useState, useEffect } from 'react';
import type { LocationId, PurchaseOrder } from '../../types';
import api from '../../services/api';

interface Props {
  locationId: LocationId;
}

const ComprasView: React.FC<Props> = ({ locationId }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const [form, setForm] = useState({
    proveedor: '',
    fechaEntrega: '',
    notas: '',
    items: [{ itemId: '', nombre: '', cantidad: 1, unidad: 'unidad', precioUnitario: 0 }],
  });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getPurchaseOrders({ status: statusFilter || undefined, locationId });
      setOrders(data);
    } catch (e) {
      setError('Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [locationId, statusFilter]);

  const createOrder = async () => {
    if (!form.proveedor || !form.items.length) return;
    try {
      await api.createPurchaseOrder({ ...form, locationId });
      setShowCreate(false);
      setForm({
        proveedor: '',
        fechaEntrega: '',
        notas: '',
        items: [{ itemId: '', nombre: '', cantidad: 1, unidad: 'unidad', precioUnitario: 0 }],
      });
      loadOrders();
    } catch (e) {
      setError('Error al crear orden');
    }
  };

  const receiveOrder = async (id: string) => {
    try {
      await api.receivePurchaseOrder(id);
      loadOrders();
    } catch (e) {
      setError('Error al recibir orden');
    }
  };

  const addItemRow = () => {
    setForm({
      ...form,
      items: [...form.items, { itemId: '', nombre: '', cantidad: 1, unidad: 'unidad', precioUnitario: 0 }],
    });
  };

  const statusColors: Record<string, string> = {
    pendiente: 'bg-yellow-900/30 text-yellow-500',
    aprobada: 'bg-blue-900/30 text-blue-500',
    enviada: 'bg-purple-900/30 text-purple-500',
    recibida: 'bg-green-900/30 text-green-500',
    cancelada: 'bg-red-900/30 text-red-500',
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-stone-500 text-sm font-bold">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Órdenes de Compra</h2>
          <p className="text-stone-500 text-sm">Compras a proveedores</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all"
        >
          <i className="fas fa-plus mr-2" />
          Nueva Orden
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800/30 rounded-xl text-red-400 text-sm font-bold">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pendiente', 'aprobada', 'enviada', 'recibida', 'cancelada'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              statusFilter === s ? 'bg-orange-600 text-white' : 'bg-stone-900 text-stone-400 hover:text-white'
            }`}
          >
            {s || 'Todas'}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {orders.length === 0 && (
          <div className="text-center py-10 text-stone-600">
            <i className="fas fa-truck text-4xl mb-3 opacity-30" />
            <p className="font-bold">No hay órdenes de compra</p>
          </div>
        )}
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-stone-900/50 border border-stone-800/30 rounded-xl p-5 hover:border-stone-700/30 transition-all cursor-pointer"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white">{order.orderNumber}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusColors[order.status] || 'bg-stone-800 text-stone-500'}`}
                >
                  {order.status}
                </span>
              </div>
              <span className="text-orange-400 font-bold">${(order.total || 0).toLocaleString('es-CO')}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-stone-500">
              <span>
                <i className="fas fa-building mr-1" />
                {order.proveedor}
              </span>
              <span>
                <i className="fas fa-calendar mr-1" />
                {new Date(order.fechaSolicitud).toLocaleDateString('es-CO')}
              </span>
              <span>{order.items?.length || 0} productos</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-lg bg-stone-950 border border-white/10 rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white mb-5">Nueva Orden de Compra</h3>
            <div className="space-y-4">
              <input
                value={form.proveedor}
                onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                placeholder="Nombre del proveedor"
                className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white"
              />
              <input
                type="date"
                value={form.fechaEntrega}
                onChange={(e) => setForm({ ...form, fechaEntrega: e.target.value })}
                className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white"
              />
              <input
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Notas"
                className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-sm text-white"
              />

              <div>
                <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest block mb-2">
                  Productos
                </label>
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      value={item.nombre}
                      onChange={(e) => {
                        const items = [...form.items];
                        items[idx].nombre = e.target.value;
                        setForm({ ...form, items });
                      }}
                      placeholder="Producto"
                      className="flex-1 bg-stone-900 border border-white/10 rounded-lg p-2 text-sm text-white"
                    />
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => {
                        const items = [...form.items];
                        items[idx].cantidad = Number(e.target.value);
                        setForm({ ...form, items });
                      }}
                      placeholder="Cant"
                      min={1}
                      className="w-16 bg-stone-900 border border-white/10 rounded-lg p-2 text-sm text-white text-center"
                    />
                    <input
                      type="number"
                      value={item.precioUnitario}
                      onChange={(e) => {
                        const items = [...form.items];
                        items[idx].precioUnitario = Number(e.target.value);
                        setForm({ ...form, items });
                      }}
                      placeholder="Precio"
                      min={0}
                      className="w-24 bg-stone-900 border border-white/10 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                ))}
                <button onClick={addItemRow} className="text-xs text-orange-500 font-bold hover:text-orange-400">
                  <i className="fas fa-plus mr-1" />
                  Agregar producto
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 rounded-xl text-sm font-bold text-stone-400 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={createOrder}
                  disabled={!form.proveedor}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                >
                  Crear Orden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="w-full max-w-lg bg-stone-950 border border-white/10 rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">{selectedOrder.orderNumber}</h3>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusColors[selectedOrder.status]}`}>
                {selectedOrder.status}
              </span>
            </div>
            <div className="space-y-2 text-sm text-stone-400 mb-4">
              <p>
                <strong className="text-white">Proveedor:</strong> {selectedOrder.proveedor}
              </p>
              <p>
                <strong className="text-white">Solicitada:</strong>{' '}
                {new Date(selectedOrder.fechaSolicitud).toLocaleDateString('es-CO')}
              </p>
              {selectedOrder.fechaEntrega && (
                <p>
                  <strong className="text-white">Entrega:</strong>{' '}
                  {new Date(selectedOrder.fechaEntrega).toLocaleDateString('es-CO')}
                </p>
              )}
              {selectedOrder.notas && (
                <p>
                  <strong className="text-white">Notas:</strong> {selectedOrder.notas}
                </p>
              )}
            </div>
            <div className="border-t border-stone-800/30 pt-4">
              {(selectedOrder.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 text-sm">
                  <span className="text-white">
                    {item.nombre} <span className="text-stone-500">x{item.cantidad}</span>
                  </span>
                  <span className="text-orange-400 font-bold">
                    ${((item.cantidad || 0) * (item.precioUnitario || 0)).toLocaleString('es-CO')}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t border-stone-800/30 mt-3">
                <span className="text-white font-bold">Total</span>
                <span className="text-orange-400 font-bold text-lg">
                  ${(selectedOrder.total || 0).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
            {selectedOrder.status !== 'recibida' && selectedOrder.status !== 'cancelada' && (
              <button
                onClick={() => {
                  receiveOrder(selectedOrder.id);
                  setSelectedOrder(null);
                }}
                className="w-full mt-4 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-bold text-white transition-all"
              >
                <i className="fas fa-check mr-2" />
                Marcar como Recibida
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprasView;
