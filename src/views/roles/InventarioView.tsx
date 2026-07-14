import React, { useEffect, useState } from 'react';
import { api, InventoryItem, InventoryMovement, Recipe } from '../../services/api';

const statusConfig = {
  OK: { color: 'bg-green-500', text: 'OK', textColor: 'text-green-400' },
  ALERTA: { color: 'bg-yellow-500', text: 'ALERTA', textColor: 'text-yellow-400' },
  CRITICO: { color: 'bg-red-500', text: 'CRÍTICO', textColor: 'text-red-400' },
};

const getStatus = (item: InventoryItem): 'OK' | 'ALERTA' | 'CRITICO' => {
  const ratio = item.stockMinimo > 0 ? item.stockActual / item.stockMinimo : 1;
  if (ratio >= 1) return 'OK';
  if (ratio >= 0.5) return 'ALERTA';
  return 'CRITICO';
};

const badgeStyle = (tipo: string) => {
  const t = tipo.toLowerCase();
  if (t === 'entrada') return 'bg-green-900/40 text-green-400 border-green-700/50';
  if (t === 'salida') return 'bg-blue-900/40 text-blue-400 border-blue-700/50';
  return 'bg-purple-900/40 text-purple-400 border-purple-700/50';
};

const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const InventarioView: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTarget, setMoveTarget] = useState<InventoryItem | null>(null);

  const [addForm, setAddForm] = useState({
    nombre: '',
    categoria: '',
    stockActual: '',
    stockMinimo: '',
    unidad: '',
    costoUnitario: '',
    lote: '',
    fechaVencimiento: '',
  });

  const [moveForm, setMoveForm] = useState<{ tipo: 'entrada' | 'salida'; cantidad: string; motivo: string }>({
    tipo: 'entrada',
    cantidad: '',
    motivo: '',
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [inv, movs, recs] = await Promise.all([api.getInventory(), api.getInventoryMovements(), api.getRecipes()]);
      setInventory(inv);
      setMovements(movs);
      setRecipes(recs);
    } catch (e) {
      showToast(`Error cargando inventario: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // loadAll is redefined every render (not memoized) -- including it would
  // refire this on every render instead of once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadAll();
  }, []);

  const alertasCount = inventory.filter((i) => i.stockActual < i.stockMinimo).length;
  const totalValor = inventory.reduce((acc, i) => acc + i.stockActual * i.costoUnitario, 0);

  const openMoveModal = (item: InventoryItem) => {
    setMoveTarget(item);
    setMoveForm({ tipo: 'entrada', cantidad: '', motivo: '' });
    setShowMoveModal(true);
  };

  const resetAddForm = () => {
    setEditingId(null);
    setAddForm({
      nombre: '',
      categoria: '',
      stockActual: '',
      stockMinimo: '',
      unidad: '',
      costoUnitario: '',
      lote: '',
      fechaVencimiento: '',
    });
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setAddForm({
      nombre: item.nombre,
      categoria: item.categoria,
      stockActual: String(item.stockActual),
      stockMinimo: String(item.stockMinimo),
      unidad: item.unidad,
      costoUnitario: String(item.costoUnitario),
      lote: item.lote || '',
      fechaVencimiento: item.fechaVencimiento ? item.fechaVencimiento.slice(0, 10) : '',
    });
    setShowAddModal(true);
  };

  const handleAddSubmit = async () => {
    if (!addForm.nombre.trim()) {
      showToast('Completa el nombre');
      return;
    }
    try {
      if (editingId) {
        // stockActual no se toca acá a propósito -- solo /movement lo cambia,
        // dejando rastro. Editar acá solo actualiza los datos descriptivos.
        await api.updateInventoryItem(editingId, {
          nombre: addForm.nombre,
          categoria: addForm.categoria,
          stockMinimo: Number(addForm.stockMinimo) || 0,
          unidad: addForm.unidad,
          costoUnitario: Number(addForm.costoUnitario) || 0,
          lote: addForm.lote,
          fechaVencimiento: addForm.fechaVencimiento || undefined,
        });
        showToast('Insumo actualizado');
      } else {
        await api.createInventoryItem({
          nombre: addForm.nombre,
          categoria: addForm.categoria,
          stockActual: Number(addForm.stockActual) || 0,
          stockMinimo: Number(addForm.stockMinimo) || 0,
          unidad: addForm.unidad,
          costoUnitario: Number(addForm.costoUnitario) || 0,
          lote: addForm.lote,
          fechaVencimiento: addForm.fechaVencimiento || undefined,
        });
        showToast('Insumo agregado');
      }
      setShowAddModal(false);
      resetAddForm();
      loadAll();
    } catch (e) {
      showToast(`Error guardando insumo: ${e instanceof Error ? e.message : 'error desconocido'}`);
    }
  };

  const handleDeactivate = async (item: InventoryItem) => {
    if (
      !window.confirm(
        `¿Dar de baja "${item.nombre}"? Dejará de aparecer en el listado (no se borra el historial de movimientos).`
      )
    )
      return;
    try {
      await api.updateInventoryItem(item.id, { activo: false });
      showToast('Insumo dado de baja');
      loadAll();
    } catch (e) {
      showToast(`Error dando de baja: ${e instanceof Error ? e.message : 'error desconocido'}`);
    }
  };

  const handleMoveSubmit = async () => {
    if (!moveTarget || !moveForm.cantidad || !moveForm.motivo.trim()) {
      showToast('Completa cantidad y motivo');
      return;
    }
    try {
      await api.createInventoryMovement({
        itemId: moveTarget.id,
        tipo: moveForm.tipo,
        cantidad: Number(moveForm.cantidad),
        motivo: moveForm.motivo,
      });
      setShowMoveModal(false);
      showToast('Movimiento registrado');
      loadAll();
    } catch (e) {
      showToast(`Error registrando movimiento: ${e instanceof Error ? e.message : 'error desconocido'}`);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[50vh] text-stone-500">
        <i className="fas fa-spinner fa-spin text-3xl mr-4"></i>
        <span className="font-bold uppercase tracking-widest text-sm">Cargando inventario...</span>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12 space-y-16 pb-40 animate-fade-in">
      <div className="space-y-4">
        <h1 className="text-6xl md:text-7xl font-brand">Inventario Avanzado</h1>
        <p className="text-stone-500 max-w-xl text-lg italic opacity-80">Kardex, lotes, alertas y costeo automático</p>
      </div>

      {alertasCount > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-[2.5rem] p-8 flex items-center gap-6 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <i className="fas fa-exclamation-triangle text-red-400 text-2xl"></i>
          </div>
          <div>
            <p className="text-red-400 font-black text-sm uppercase tracking-widest">Alerta de Inventario</p>
            <p className="text-white text-lg font-bold mt-1">
              {alertasCount} {alertasCount === 1 ? 'insumo está por debajo' : 'insumos están por debajo'} del stock
              mínimo
            </p>
          </div>
          <span className="ml-auto text-5xl font-black text-red-400/60">{alertasCount}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {[
          {
            label: 'Total SKUs',
            value: `${inventory.length}`,
            icon: 'boxes-stacked',
            color: 'text-blue-500',
            trend: 'registrados',
          },
          {
            label: 'Alertas de Stock',
            value: `${alertasCount}`,
            icon: 'bell',
            color: 'text-orange-500',
            trend: 'requieren acción',
          },
          {
            label: 'Valor Inventario',
            value: formatter.format(totalValor),
            icon: 'dollar-sign',
            color: 'text-green-500',
            trend: 'costo total',
          },
          {
            label: 'Movimientos',
            value: `${movements.length}`,
            icon: 'right-left',
            color: 'text-purple-500',
            trend: 'últimos 50',
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800/50 shadow-2xl group hover:border-orange-500/40 transition-all"
          >
            <div className="flex justify-between items-start mb-6">
              <span className="text-stone-600 text-[11px] uppercase font-black tracking-[0.4em]">{stat.label}</span>
              <div
                className={`w-12 h-12 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 ${stat.color}`}
              >
                <i className={`fas fa-${stat.icon} text-xl`}></i>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-black text-white tracking-tighter">{stat.value}</p>
              <span className="text-[10px] font-black uppercase mb-1.5 bg-stone-800/30 px-3 py-1 rounded-full border border-white/5 text-stone-500">
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-8">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand">Inventario General</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">
              Kardex de insumos y materias primas
            </p>
          </div>
          <span className="text-[10px] font-black text-stone-700 uppercase tracking-widest">
            {inventory.length} Registros
          </span>
        </div>

        <div className="bg-stone-900/30 rounded-[2.5rem] border border-stone-800/50 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-800/80 text-[10px] uppercase tracking-[0.3em] text-stone-500 font-black">
                  <th className="text-left p-6 pl-8">Nombre</th>
                  <th className="text-left p-6">Categoría</th>
                  <th className="text-right p-6">Stock Actual</th>
                  <th className="text-right p-6">Stock Mínimo</th>
                  <th className="text-center p-6">Unidad</th>
                  <th className="text-right p-6">Costo Unitario</th>
                  <th className="text-left p-6">Lote</th>
                  <th className="text-left p-6">Vencimiento</th>
                  <th className="text-center p-6">Estado</th>
                  <th className="text-center p-6 pr-8">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-10 text-center text-stone-600 font-bold text-xs uppercase tracking-widest"
                    >
                      Sin insumos registrados
                    </td>
                  </tr>
                )}
                {inventory.map((item, idx) => {
                  const status = getStatus(item);
                  const cfg = statusConfig[status];
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-stone-800/40 transition-all hover:bg-stone-800/20 ${idx % 2 === 0 ? 'bg-stone-900/10' : ''}`}
                    >
                      <td className="p-6 pl-8 font-bold text-white">{item.nombre}</td>
                      <td className="p-6 text-stone-400 text-[11px] uppercase tracking-wider">{item.categoria}</td>
                      <td
                        className={`p-6 text-right font-black text-lg ${status === 'CRITICO' ? 'text-red-400' : status === 'ALERTA' ? 'text-yellow-400' : 'text-white'}`}
                      >
                        {item.stockActual}
                      </td>
                      <td className="p-6 text-right text-stone-500">{item.stockMinimo}</td>
                      <td className="p-6 text-center text-stone-500 uppercase text-[11px]">{item.unidad}</td>
                      <td className="p-6 text-right text-stone-300 font-mono">
                        {formatter.format(item.costoUnitario)}
                      </td>
                      <td className="p-6 text-stone-400 text-[11px] font-mono">{item.lote || '—'}</td>
                      <td className="p-6 text-stone-400 text-[11px]">
                        {item.fechaVencimiento ? new Date(item.fechaVencimiento).toLocaleDateString('es-CO') : '—'}
                      </td>
                      <td className="p-6 text-center">
                        <span
                          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.textColor} border-white/10 bg-stone-950/60`}
                        >
                          <span className={`w-2 h-2 rounded-full ${cfg.color}`}></span>
                          {cfg.text}
                        </span>
                      </td>
                      <td className="p-6 pr-8 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openMoveModal(item)}
                            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-orange-600 text-stone-400 hover:text-white text-[10px] font-black uppercase tracking-wider border border-stone-700 hover:border-orange-500 transition-all"
                          >
                            Movimiento
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            title="Editar"
                            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-blue-600/20 hover:text-blue-400 text-stone-500 border border-stone-700 transition-all"
                          >
                            <i className="fas fa-pen text-xs"></i>
                          </button>
                          <button
                            onClick={() => handleDeactivate(item)}
                            title="Dar de baja"
                            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-red-600/20 hover:text-red-400 text-stone-500 border border-stone-700 transition-all"
                          >
                            <i className="fas fa-ban text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="border-b border-white/5 pb-8">
          <h2 className="text-4xl font-brand">Movimientos Recientes</h2>
          <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">
            Entradas, salidas y ajustes
          </p>
        </div>

        <div className="bg-stone-900/30 rounded-[2.5rem] border border-stone-800/50 divide-y divide-stone-800/40 shadow-2xl">
          {movements.length === 0 && (
            <p className="p-10 text-center text-stone-600 font-bold text-xs uppercase tracking-widest">
              Sin movimientos registrados
            </p>
          )}
          {movements.map((mov) => {
            const item = inventory.find((i) => i.id === mov.itemId);
            return (
              <div key={mov.id} className="flex items-center gap-6 p-6 px-8 hover:bg-stone-800/20 transition-all">
                <span
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeStyle(mov.tipo)}`}
                >
                  {mov.tipo}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{item?.nombre || mov.itemId}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">{mov.motivo}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-black text-lg ${mov.tipo.toLowerCase() === 'entrada' ? 'text-green-400' : 'text-stone-200'}`}
                  >
                    {mov.tipo.toLowerCase() === 'entrada' ? '+' : '-'}
                    {mov.cantidad}
                  </p>
                </div>
                <div className="text-right w-40">
                  <p className="text-[11px] text-stone-400 font-medium">
                    {new Date(mov.creado).toLocaleString('es-CO')}
                  </p>
                  <p className="text-[10px] text-stone-600 uppercase tracking-wider">{mov.usuario}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-8">
        <div className="border-b border-white/5 pb-8">
          <h2 className="text-4xl font-brand">Recetas</h2>
          <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">
            Composición y costeo automático
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {recipes.length === 0 && (
            <p className="col-span-full text-center text-stone-600 font-bold text-xs uppercase tracking-widest py-12">
              Sin recetas registradas
            </p>
          )}
          {recipes.map((receta) => (
            <div
              key={receta.id}
              className="bg-stone-900/40 rounded-[2.5rem] border border-stone-800/50 shadow-2xl overflow-hidden group hover:border-orange-500/40 transition-all"
            >
              <div className="p-8 pb-6 border-b border-stone-800/40">
                <h3 className="text-xl font-black text-white">{receta.nombre}</h3>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Costo Total</span>
                  <span className="text-2xl font-black text-white">{formatter.format(receta.costoTotal)}</span>
                </div>
              </div>
              <div className="p-8 space-y-4">
                {receta.ingredientes.map((ing) => (
                  <div key={ing.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500/60"></div>
                      <span className="text-sm text-stone-300 font-medium">{ing.nombre}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-stone-500 font-mono">
                        {ing.cantidad} {ing.unidad}
                      </span>
                      <span className="text-[11px] text-stone-600 ml-3 font-mono">{formatter.format(ing.costo)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-center pt-8">
        <button
          onClick={() => {
            resetAddForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-4 px-14 py-6 bg-orange-600 hover:bg-orange-500 text-white rounded-[3rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-orange-900/40 active:scale-95"
        >
          <i className="fas fa-plus-circle text-lg"></i>
          Añadir al Inventario
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowAddModal(false);
              resetAddForm();
            }}
          ></div>
          <div className="relative bg-stone-900 border border-stone-700 rounded-[2rem] p-10 w-full max-w-lg mx-4 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-white mb-8">
              {editingId ? 'Editar Insumo' : 'Añadir al Inventario'}
            </h3>
            <div className="space-y-5">
              {[
                { label: 'Nombre', key: 'nombre', type: 'text' },
                { label: 'Categoría', key: 'categoria', type: 'text' },
                { label: 'Stock Actual', key: 'stockActual', type: 'number', disabled: !!editingId },
                { label: 'Stock Mínimo', key: 'stockMinimo', type: 'number' },
                { label: 'Unidad', key: 'unidad', type: 'text' },
                { label: 'Costo Unitario', key: 'costoUnitario', type: 'number' },
                { label: 'Lote', key: 'lote', type: 'text' },
                { label: 'Vencimiento', key: 'fechaVencimiento', type: 'date' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-[10px] uppercase tracking-[0.3em] font-black text-stone-500 mb-2 block">
                    {field.label}
                    {field.disabled && (
                      <span className="normal-case tracking-normal text-stone-600">
                        {' '}
                        (usar &ldquo;Movimiento&rdquo; para cambiar stock)
                      </span>
                    )}
                  </label>
                  <input
                    type={field.type}
                    disabled={field.disabled}
                    value={(addForm as Record<string, string>)[field.key]}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetAddForm();
                }}
                className="flex-1 py-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-black text-[10px] uppercase tracking-[0.3em] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddSubmit}
                className="flex-1 py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showMoveModal && moveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowMoveModal(false)}></div>
          <div className="relative bg-stone-900 border border-stone-700 rounded-[2rem] p-10 w-full max-w-lg mx-4 shadow-2xl z-10">
            <h3 className="text-2xl font-black text-white mb-2">Movimiento: {moveTarget.nombre}</h3>
            <p className="text-stone-500 text-sm mb-8">
              Stock actual: {moveTarget.stockActual} {moveTarget.unidad}
            </p>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] uppercase tracking-[0.3em] font-black text-stone-500 mb-2 block">
                  Tipo
                </label>
                <div className="flex gap-4">
                  {(['entrada', 'salida'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setMoveForm((prev) => ({ ...prev, tipo: t }))}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${moveForm.tipo === t ? 'bg-orange-600 text-white' : 'bg-stone-800 text-stone-500'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.3em] font-black text-stone-500 mb-2 block">
                  Cantidad
                </label>
                <input
                  type="number"
                  value={moveForm.cantidad}
                  onChange={(e) => setMoveForm((prev) => ({ ...prev, cantidad: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.3em] font-black text-stone-500 mb-2 block">
                  Motivo
                </label>
                <input
                  type="text"
                  value={moveForm.motivo}
                  onChange={(e) => setMoveForm((prev) => ({ ...prev, motivo: e.target.value }))}
                  placeholder="Ej: Compra proveedor, Producción del día..."
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowMoveModal(false)}
                className="flex-1 py-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-black text-[10px] uppercase tracking-[0.3em] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleMoveSubmit}
                className="flex-1 py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-orange-600 text-white px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
};

export default InventarioView;
