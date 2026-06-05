import React, { useState } from 'react';

interface InventoryItem {
  id: string;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  unidad: string;
  costoUnitario: number;
  lote: string;
  vencimiento: string;
}

interface Movimiento {
  id: string;
  tipo: 'Entrada' | 'Salida' | 'Ajuste' | 'Merma';
  item: string;
  cantidad: number;
  motivo: string;
  fecha: string;
  usuario: string;
}

interface RecetaIngrediente {
  nombre: string;
  cantidad: string;
  costo: number;
}

interface Receta {
  id: string;
  nombre: string;
  ingredientes: RecetaIngrediente[];
  costoTotal: number;
}

const inventoryData: InventoryItem[] = [
  { id: '1', nombre: 'Harina Trigo', categoria: 'Secos', stockActual: 50, stockMinimo: 20, unidad: 'kg', costoUnitario: 3200, lote: 'L-2024-01A', vencimiento: '2026-12-15' },
  { id: '2', nombre: 'Queso Mozzarella', categoria: 'Lácteos', stockActual: 12, stockMinimo: 15, unidad: 'kg', costoUnitario: 18500, lote: 'LQ-0225', vencimiento: '2026-07-10' },
  { id: '3', nombre: 'Pepperoni', categoria: 'Cárnicos', stockActual: 8, stockMinimo: 10, unidad: 'kg', costoUnitario: 42000, lote: 'CP-0315', vencimiento: '2026-08-22' },
  { id: '4', nombre: 'Salsa Tomate', categoria: 'Conservas', stockActual: 25, stockMinimo: 10, unidad: 'lt', costoUnitario: 8500, lote: 'ST-1104', vencimiento: '2027-01-05' },
  { id: '5', nombre: 'Champiñones', categoria: 'Frescos', stockActual: 3, stockMinimo: 8, unidad: 'kg', costoUnitario: 15000, lote: 'CH-0525', vencimiento: '2026-06-18' },
  { id: '6', nombre: 'Cebolla', categoria: 'Frescos', stockActual: 18, stockMinimo: 10, unidad: 'kg', costoUnitario: 4200, lote: 'CE-0612', vencimiento: '2026-06-30' },
  { id: '7', nombre: 'Pimentón', categoria: 'Frescos', stockActual: 5, stockMinimo: 8, unidad: 'kg', costoUnitario: 6800, lote: 'PM-0418', vencimiento: '2026-06-25' },
  { id: '8', nombre: 'Aceitunas', categoria: 'Conservas', stockActual: 20, stockMinimo: 5, unidad: 'kg', costoUnitario: 22000, lote: 'AC-0923', vencimiento: '2027-03-14' },
  { id: '9', nombre: 'Carne Molida', categoria: 'Cárnicos', stockActual: 6, stockMinimo: 12, unidad: 'kg', costoUnitario: 28000, lote: 'CM-0228', vencimiento: '2026-07-05' },
  { id: '10', nombre: 'Pollo', categoria: 'Cárnicos', stockActual: 15, stockMinimo: 10, unidad: 'kg', costoUnitario: 16500, lote: 'PL-0310', vencimiento: '2026-06-28' },
];

const movimientosData: Movimiento[] = [
  { id: 'M1', tipo: 'Entrada', item: 'Harina Trigo', cantidad: 25, motivo: 'Compra proveedor', fecha: '2026-06-04 14:30', usuario: 'Carlos M.' },
  { id: 'M2', tipo: 'Salida', item: 'Queso Mozzarella', cantidad: 3, motivo: 'Producción día', fecha: '2026-06-04 11:15', usuario: 'María G.' },
  { id: 'M3', tipo: 'Merma', item: 'Champiñones', cantidad: 1.5, motivo: 'Descomposición', fecha: '2026-06-03 18:00', usuario: 'Pedro R.' },
  { id: 'M4', tipo: 'Ajuste', item: 'Aceitunas', cantidad: 2, motivo: 'Inventario físico', fecha: '2026-06-03 09:45', usuario: 'Sistema' },
  { id: 'M5', tipo: 'Salida', item: 'Pepperoni', cantidad: 2, motivo: 'Preparación pedidos', fecha: '2026-06-02 20:10', usuario: 'Luisa F.' },
];

const recetasData: Receta[] = [
  {
    id: 'R1',
    nombre: 'Masa Clásica',
    ingredientes: [
      { nombre: 'Harina Trigo', cantidad: '1 kg', costo: 3200 },
      { nombre: 'Agua', cantidad: '600 ml', costo: 0 },
      { nombre: 'Levadura', cantidad: '10 g', costo: 800 },
      { nombre: 'Sal', cantidad: '20 g', costo: 200 },
      { nombre: 'Aceite Oliva', cantidad: '50 ml', costo: 2500 },
    ],
    costoTotal: 6700,
  },
  {
    id: 'R2',
    nombre: 'Salsa de la Casa',
    ingredientes: [
      { nombre: 'Salsa Tomate', cantidad: '800 ml', costo: 6800 },
      { nombre: 'Albahaca', cantidad: '10 g', costo: 1200 },
      { nombre: 'Ajo', cantidad: '15 g', costo: 600 },
      { nombre: 'Aceite Oliva', cantidad: '30 ml', costo: 1500 },
      { nombre: 'Sal y Pimienta', cantidad: 'al gusto', costo: 300 },
    ],
    costoTotal: 10400,
  },
  {
    id: 'R3',
    nombre: 'Lasaña Mixta',
    ingredientes: [
      { nombre: 'Carne Molida', cantidad: '500 g', costo: 14000 },
      { nombre: 'Pollo', cantidad: '300 g', costo: 4950 },
      { nombre: 'Queso Mozzarella', cantidad: '400 g', costo: 7400 },
      { nombre: 'Salsa Tomate', cantidad: '400 ml', costo: 3400 },
      { nombre: 'Láminas Pasta', cantidad: '250 g', costo: 5200 },
    ],
    costoTotal: 34950,
  },
];

const statusConfig = {
  OK: { color: 'bg-green-500', text: 'OK', textColor: 'text-green-400' },
  ALERTA: { color: 'bg-yellow-500', text: 'ALERTA', textColor: 'text-yellow-400' },
  CRITICO: { color: 'bg-red-500', text: 'CRÍTICO', textColor: 'text-red-400' },
};

const getStatus = (item: InventoryItem): 'OK' | 'ALERTA' | 'CRITICO' => {
  const ratio = item.stockActual / item.stockMinimo;
  if (ratio >= 1) return 'OK';
  if (ratio >= 0.5) return 'ALERTA';
  return 'CRITICO';
};

const badgeStyle = (tipo: Movimiento['tipo']) => {
  switch (tipo) {
    case 'Entrada': return 'bg-green-900/40 text-green-400 border-green-700/50';
    case 'Salida': return 'bg-blue-900/40 text-blue-400 border-blue-700/50';
    case 'Ajuste': return 'bg-purple-900/40 text-purple-400 border-purple-700/50';
    case 'Merma': return 'bg-red-900/40 text-red-400 border-red-700/50';
  }
};

const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const InventarioView: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>(inventoryData);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);

  const [addForm, setAddForm] = useState({
    nombre: '', categoria: '', stockActual: '', stockMinimo: '',
    unidad: '', costoUnitario: '', lote: '', vencimiento: '',
  });

  const [editForm, setEditForm] = useState({
    stockActual: '', stockMinimo: '', costoUnitario: '', lote: '', vencimiento: '',
  });

  const alertasCount = inventory.filter(i => i.stockActual < i.stockMinimo).length;
  const totalValor = inventory.reduce((acc, i) => acc + i.stockActual * i.costoUnitario, 0);
  const mermasMes = 127000;

  const openEditModal = (item: InventoryItem) => {
    setEditTarget(item);
    setEditForm({
      stockActual: String(item.stockActual),
      stockMinimo: String(item.stockMinimo),
      costoUnitario: String(item.costoUnitario),
      lote: item.lote,
      vencimiento: item.vencimiento,
    });
    setShowEditModal(true);
  };

  const handleAddSubmit = () => {
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      nombre: addForm.nombre,
      categoria: addForm.categoria,
      stockActual: Number(addForm.stockActual),
      stockMinimo: Number(addForm.stockMinimo),
      unidad: addForm.unidad,
      costoUnitario: Number(addForm.costoUnitario),
      lote: addForm.lote,
      vencimiento: addForm.vencimiento,
    };
    setInventory(prev => [...prev, newItem]);
    setShowAddModal(false);
    setAddForm({ nombre: '', categoria: '', stockActual: '', stockMinimo: '', unidad: '', costoUnitario: '', lote: '', vencimiento: '' });
  };

  const handleEditSubmit = () => {
    if (!editTarget) return;
    setInventory(prev => prev.map(item =>
      item.id === editTarget.id ? {
        ...item,
        stockActual: Number(editForm.stockActual),
        stockMinimo: Number(editForm.stockMinimo),
        costoUnitario: Number(editForm.costoUnitario),
        lote: editForm.lote,
        vencimiento: editForm.vencimiento,
      } : item
    ));
    setShowEditModal(false);
    setEditTarget(null);
  };

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
              {alertasCount} {alertasCount === 1 ? 'insumo está por debajo' : 'insumos están por debajo'} del stock mínimo
            </p>
          </div>
          <span className="ml-auto text-5xl font-black text-red-400/60">{alertasCount}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {[
          { label: 'Total SKUs', value: `${inventory.length}`, icon: 'boxes-stacked', color: 'text-blue-500', trend: 'registrados' },
          { label: 'Alertas de Stock', value: `${alertasCount}`, icon: 'bell', color: 'text-orange-500', trend: 'requieren acción' },
          { label: 'Valor Inventario', value: formatter.format(totalValor), icon: 'dollar-sign', color: 'text-green-500', trend: 'costo total' },
          { label: 'Mermas del Mes', value: formatter.format(mermasMes), icon: 'trash-alt', color: 'text-red-500', trend: 'últimos 30 días' },
        ].map((stat, i) => (
          <div key={i} className="bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800/50 shadow-2xl group hover:border-orange-500/40 transition-all">
            <div className="flex justify-between items-start mb-6">
              <span className="text-stone-600 text-[11px] uppercase font-black tracking-[0.4em]">{stat.label}</span>
              <div className={`w-12 h-12 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 ${stat.color}`}>
                <i className={`fas fa-${stat.icon} text-xl`}></i>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-black text-white tracking-tighter">{stat.value}</p>
              <span className="text-[10px] font-black uppercase mb-1.5 bg-stone-800/30 px-3 py-1 rounded-full border border-white/5 text-stone-500">{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-8">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand">Inventario General</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Kardex de insumos y materias primas</p>
          </div>
          <span className="text-[10px] font-black text-stone-700 uppercase tracking-widest">{inventory.length} Registros</span>
        </div>

        <div className="bg-stone-900/30 rounded-[2.5rem] border border-stone-800/50 overflow-hidden shadow-2xl">
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
                {inventory.map((item, idx) => {
                  const status = getStatus(item);
                  const cfg = statusConfig[status];
                  return (
                    <tr key={item.id} className={`border-b border-stone-800/40 transition-all hover:bg-stone-800/20 ${idx % 2 === 0 ? 'bg-stone-900/10' : ''}`}>
                      <td className="p-6 pl-8 font-bold text-white">{item.nombre}</td>
                      <td className="p-6 text-stone-400 text-[11px] uppercase tracking-wider">{item.categoria}</td>
                      <td className={`p-6 text-right font-black text-lg ${status === 'CRITICO' ? 'text-red-400' : status === 'ALERTA' ? 'text-yellow-400' : 'text-white'}`}>{item.stockActual}</td>
                      <td className="p-6 text-right text-stone-500">{item.stockMinimo}</td>
                      <td className="p-6 text-center text-stone-500 uppercase text-[11px]">{item.unidad}</td>
                      <td className="p-6 text-right text-stone-300 font-mono">{formatter.format(item.costoUnitario)}</td>
                      <td className="p-6 text-stone-400 text-[11px] font-mono">{item.lote}</td>
                      <td className="p-6 text-stone-400 text-[11px]">{item.vencimiento}</td>
                      <td className="p-6 text-center">
                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${cfg.textColor} border-white/10 bg-stone-950/60`}>
                          <span className={`w-2 h-2 rounded-full ${cfg.color}`}></span>
                          {cfg.text}
                        </span>
                      </td>
                      <td className="p-6 pr-8 text-center">
                        <button
                          onClick={() => openEditModal(item)}
                          className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-orange-600 text-stone-400 hover:text-white text-[10px] font-black uppercase tracking-wider border border-stone-700 hover:border-orange-500 transition-all"
                        >
                          Editar
                        </button>
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
          <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Entradas, salidas, ajustes y mermas</p>
        </div>

        <div className="bg-stone-900/30 rounded-[2.5rem] border border-stone-800/50 divide-y divide-stone-800/40 shadow-2xl">
          {movimientosData.map((mov) => (
            <div key={mov.id} className="flex items-center gap-6 p-6 px-8 hover:bg-stone-800/20 transition-all">
              <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeStyle(mov.tipo)}`}>
                {mov.tipo}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{mov.item}</p>
                <p className="text-[11px] text-stone-500 mt-0.5">{mov.motivo}</p>
              </div>
              <div className="text-right">
                <p className={`font-black text-lg ${mov.tipo === 'Entrada' ? 'text-green-400' : mov.tipo === 'Merma' ? 'text-red-400' : 'text-stone-200'}`}>
                  {mov.tipo === 'Entrada' ? '+' : '-'}{mov.cantidad}
                </p>
              </div>
              <div className="text-right w-40">
                <p className="text-[11px] text-stone-400 font-medium">{mov.fecha}</p>
                <p className="text-[10px] text-stone-600 uppercase tracking-wider">{mov.usuario}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <div className="border-b border-white/5 pb-8">
          <h2 className="text-4xl font-brand">Recetas</h2>
          <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Composición y costeo automático</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {recetasData.map((receta) => (
            <div key={receta.id} className="bg-stone-900/40 rounded-[2.5rem] border border-stone-800/50 shadow-2xl overflow-hidden group hover:border-orange-500/40 transition-all">
              <div className="p-8 pb-6 border-b border-stone-800/40">
                <h3 className="text-xl font-black text-white">{receta.nombre}</h3>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Costo Total</span>
                  <span className="text-2xl font-black text-white">{formatter.format(receta.costoTotal)}</span>
                </div>
              </div>
              <div className="p-8 space-y-4">
                {receta.ingredientes.map((ing, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500/60"></div>
                      <span className="text-sm text-stone-300 font-medium">{ing.nombre}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-stone-500 font-mono">{ing.cantidad}</span>
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
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-4 px-14 py-6 bg-orange-600 hover:bg-orange-500 text-white rounded-[3rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-orange-900/40 active:scale-95"
        >
          <i className="fas fa-plus-circle text-lg"></i>
          Añadir al Inventario
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-stone-900 border border-stone-700 rounded-[2rem] p-10 w-full max-w-lg mx-4 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-white mb-8">Añadir al Inventario</h3>
            <div className="space-y-5">
              {[
                { label: 'Nombre', key: 'nombre', type: 'text' },
                { label: 'Categoría', key: 'categoria', type: 'text' },
                { label: 'Stock Actual', key: 'stockActual', type: 'number' },
                { label: 'Stock Mínimo', key: 'stockMinimo', type: 'number' },
                { label: 'Unidad', key: 'unidad', type: 'text' },
                { label: 'Costo Unitario', key: 'costoUnitario', type: 'number' },
                { label: 'Lote', key: 'lote', type: 'text' },
                { label: 'Vencimiento', key: 'vencimiento', type: 'date' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-[10px] uppercase tracking-[0.3em] font-black text-stone-500 mb-2 block">{field.label}</label>
                  <input
                    type={field.type}
                    value={(addForm as Record<string, string>)[field.key]}
                    onChange={e => setAddForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
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

      {showEditModal && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          <div className="relative bg-stone-900 border border-stone-700 rounded-[2rem] p-10 w-full max-w-lg mx-4 shadow-2xl z-10">
            <h3 className="text-2xl font-black text-white mb-2">Editar: {editTarget.nombre}</h3>
            <p className="text-stone-500 text-sm mb-8">Actualizar stock, costo y lote</p>
            <div className="space-y-5">
              {[
                { label: 'Stock Actual', key: 'stockActual', type: 'number' },
                { label: 'Stock Mínimo', key: 'stockMinimo', type: 'number' },
                { label: 'Costo Unitario', key: 'costoUnitario', type: 'number' },
                { label: 'Lote', key: 'lote', type: 'text' },
                { label: 'Vencimiento', key: 'vencimiento', type: 'date' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-[10px] uppercase tracking-[0.3em] font-black text-stone-500 mb-2 block">{field.label}</label>
                  <input
                    type={field.type}
                    value={(editForm as Record<string, string>)[field.key]}
                    onChange={e => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-black text-[10px] uppercase tracking-[0.3em] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditSubmit}
                className="flex-1 py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioView;
