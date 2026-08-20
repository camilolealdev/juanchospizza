import React, { useEffect, useState } from 'react';
import { api, Expense, FinanceSummary } from '../../services/api';
import { useLazyCharts } from '../../hooks/useLazyCharts';
import ChartSkeleton from '../../components/ChartSkeleton';

const formatCOP = (value: number) => '$' + value.toLocaleString('es-CO');

const gastosColors: Record<string, string> = {
  Ingredientes: '#ea580c',
  Nómina: '#f97316',
  Servicios: '#fdba74',
  Marketing: '#64748b',
  Mantenimiento: '#a8a29e',
  Transporte: '#d97706',
  Empaques: '#44403c',
  Varios: '#78716c',
};

const categorias = [
  'Ingredientes',
  'Nómina',
  'Servicios',
  'Marketing',
  'Mantenimiento',
  'Transporte',
  'Empaques',
  'Varios',
];

interface BarTooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface PieTooltipPayload {
  name: string;
  value: number;
}

const CustomBarTooltip: React.FC<{ active?: boolean; payload?: BarTooltipPayload[]; label?: string }> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl px-5 py-4 shadow-2xl">
      <p className="text-stone-400 font-bold text-[11px] uppercase tracking-wider mb-2">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="font-bold text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCOP(entry.value)}
        </p>
      ))}
    </div>
  );
};

const CustomPieTooltip: React.FC<{ active?: boolean; payload?: PieTooltipPayload[] }> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl px-5 py-4 shadow-2xl">
      {payload.map((entry, i) => (
        <p key={i} className="font-bold text-sm text-stone-200">
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  );
};

const FinanzasView: React.FC = () => {
  const [gastos, setGastos] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const [nuevoGasto, setNuevoGasto] = useState({
    categoria: 'Ingredientes',
    descripcion: '',
    monto: 0,
    fecha: '',
    metodo: '',
    proveedor: '',
    factura: '',
  });
  // recharts se descarga en paralelo a los datos de finanzas: la tabla y
  // los KPIs pintan primero, y el chunk de ~363 KB llega cuando el primer
  // gráfico (Ingresos vs Egresos) se acerca al viewport.
  const { charts, error: chartsError, containerRef } = useLazyCharts();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [exp, sum] = await Promise.all([api.getExpenses(), api.getFinanceSummary()]);
      setGastos(exp);
      setSummary(sum);
    } catch (e) {
      showToast(`Error cargando finanzas: ${e instanceof Error ? e.message : 'error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  // loadAll is redefined every render (not memoized) -- including it would
  // refire this on every render instead of once on mount.

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field: keyof typeof nuevoGasto, value: string | number) => {
    setNuevoGasto((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setNuevoGasto({
      categoria: 'Ingredientes',
      descripcion: '',
      monto: 0,
      fecha: '',
      metodo: '',
      proveedor: '',
      factura: '',
    });
  };

  const openEdit = (g: Expense) => {
    setEditingId(g.id);
    setNuevoGasto({
      categoria: g.categoria,
      descripcion: g.descripcion,
      monto: g.monto,
      fecha: g.fecha ? g.fecha.slice(0, 10) : '',
      metodo: g.metodo,
      proveedor: g.proveedor,
      factura: g.factura,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (
      !nuevoGasto.descripcion ||
      !nuevoGasto.monto ||
      !nuevoGasto.fecha ||
      !nuevoGasto.metodo ||
      !nuevoGasto.proveedor ||
      !nuevoGasto.factura
    )
      return;
    try {
      if (editingId) {
        await api.updateExpense(editingId, nuevoGasto);
        showToast('Gasto actualizado');
      } else {
        await api.createExpense(nuevoGasto);
        showToast('Gasto registrado');
      }
      setShowModal(false);
      resetForm();
      loadAll();
    } catch (e) {
      showToast(`Error guardando gasto: ${e instanceof Error ? e.message : 'error desconocido'}`);
    }
  };

  const handleDelete = async (g: Expense) => {
    if (!window.confirm(`¿Eliminar el gasto "${g.descripcion}"?`)) return;
    try {
      await api.deleteExpense(g.id);
      showToast('Gasto eliminado');
      loadAll();
    } catch (e) {
      showToast(`Error eliminando gasto: ${e instanceof Error ? e.message : 'error desconocido'}`);
    }
  };

  if (loading || !summary) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[50vh] text-stone-500">
        <i className="fas fa-spinner fa-spin text-3xl mr-4"></i>
        <span className="font-bold uppercase tracking-widest text-sm">Cargando finanzas...</span>
      </div>
    );
  }

  const cashFlowData = [{ name: 'Actual', ingresos: summary.ingresos, egresos: summary.egresos }];

  const totalPorCat = summary.gastosPorCategoria.reduce((a, g) => a + g.total, 0);
  const computedDistribucion = summary.gastosPorCategoria
    .filter((g) => g.total > 0)
    .map((g) => ({
      name: g.categoria,
      value: totalPorCat > 0 ? Math.round((g.total / totalPorCat) * 100) : 0,
      color: gastosColors[g.categoria] || '#78716c',
    }))
    .sort((a, b) => b.value - a.value);

  const computedKpis = [
    { label: 'Ingresos', value: formatCOP(summary.ingresos), icon: 'arrow-trend-up', color: 'text-green-500' },
    { label: 'Egresos', value: formatCOP(summary.egresos), icon: 'arrow-trend-down', color: 'text-red-500' },
    {
      label: 'Utilidad Neta',
      value: formatCOP(summary.utilidad),
      icon: 'sack-dollar',
      color: summary.utilidad >= 0 ? 'text-orange-500' : 'text-red-500',
    },
    { label: 'Órdenes Totales', value: String(summary.totalOrdenes), icon: 'receipt', color: 'text-blue-500' },
  ];

  return (
    <div className="p-8 md:p-12 space-y-16 pb-40 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl font-brand">Gestión Financiera</h1>
          <p className="text-stone-500 max-w-xl text-lg italic opacity-80">
            Flujo de caja, gastos y estado de resultados
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="w-full md:w-auto flex items-center justify-center gap-6 px-12 py-6 rounded-[3rem] font-black text-[11px] uppercase tracking-[0.3em] bg-orange-600 text-white hover:bg-orange-500 shadow-2xl shadow-orange-900/40 transition-all active:scale-95"
        >
          <i className="fas fa-plus-circle"></i> REGISTRAR GASTO
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div
            className="bg-stone-900 border border-stone-800 rounded-[2rem] p-10 w-full max-w-lg max-h-screen overflow-y-auto shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-brand mb-8">{editingId ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">
                  Categoría
                </label>
                <select
                  value={nuevoGasto.categoria}
                  onChange={(e) => handleChange('categoria', e.target.value)}
                  className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                >
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">
                  Descripción
                </label>
                <input
                  type="text"
                  value={nuevoGasto.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                  placeholder="Descripción del gasto"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">
                  Monto ($)
                </label>
                <input
                  type="number"
                  value={nuevoGasto.monto || ''}
                  onChange={(e) => handleChange('monto', Number(e.target.value))}
                  className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  value={nuevoGasto.fecha}
                  onChange={(e) => handleChange('fecha', e.target.value)}
                  className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">
                  Método de Pago
                </label>
                <input
                  type="text"
                  value={nuevoGasto.metodo}
                  onChange={(e) => handleChange('metodo', e.target.value)}
                  className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                  placeholder="Efectivo, Tarjeta, Transferencia..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">
                  Proveedor
                </label>
                <input
                  type="text"
                  value={nuevoGasto.proveedor}
                  onChange={(e) => handleChange('proveedor', e.target.value)}
                  className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">
                  Factura
                </label>
                <input
                  type="text"
                  value={nuevoGasto.factura}
                  onChange={(e) => handleChange('factura', e.target.value)}
                  className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                  placeholder="N° factura"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="flex-1 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] bg-stone-800 text-stone-400 hover:bg-stone-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] bg-orange-600 text-white hover:bg-orange-500 transition-all"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {computedKpis.map((kpi, i) => (
          <div
            key={i}
            className="bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800/50 shadow-2xl group hover:border-orange-500/40 transition-all"
          >
            <div className="flex justify-between items-start mb-6">
              <span className="text-stone-600 text-[11px] uppercase font-black tracking-[0.4em]">{kpi.label}</span>
              <div
                className={`w-12 h-12 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 ${kpi.color}`}
              >
                <i className={`fas fa-${kpi.icon} text-xl`}></i>
              </div>
            </div>
            <p className="text-5xl font-black text-white tracking-tighter">{kpi.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-10">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand">Ingresos vs Egresos</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Acumulado histórico</p>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-[10px] font-black text-stone-400 uppercase">Ingresos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-[10px] font-black text-stone-400 uppercase">Egresos</span>
            </div>
          </div>
        </div>
        <div className="bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800 shadow-2xl">
          <div ref={containerRef} className="h-80">
            {!chartsError && charts ? (
              <charts.ResponsiveContainer width="100%" height="100%">
                <charts.BarChart data={cashFlowData} barGap={4} barCategoryGap="20%">
                  <charts.XAxis dataKey="name" stroke="#57534e" fontSize={11} axisLine={false} tickLine={false} />
                  <charts.YAxis
                    stroke="#57534e"
                    fontSize={10}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => '$' + (v / 1000000).toFixed(1) + 'M'}
                  />
                  <charts.Tooltip
                    cursor={{ fill: '#ffffff08' }}
                    content={<CustomBarTooltip />}
                    labelStyle={{ color: '#a8a29e', fontWeight: 700, fontSize: 11 }}
                  />
                  <charts.Bar dataKey="ingresos" fill="#22c55e" radius={[8, 8, 0, 0]} barSize={48} />
                  <charts.Bar dataKey="egresos" fill="#ef4444" radius={[8, 8, 0, 0]} barSize={48} />
                </charts.BarChart>
              </charts.ResponsiveContainer>
            ) : (
              <ChartSkeleton error={chartsError} height="h-80" />
            )}
          </div>
        </div>
      </section>

      <section className="space-y-10">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand">Gastos Recientes</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">
              Últimos movimientos registrados
            </p>
          </div>
        </div>
        <div className="bg-stone-900/40 rounded-[4rem] border border-stone-800 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-800/80 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">
                  <th className="p-6 pl-10">Categoría</th>
                  <th className="p-6">Descripción</th>
                  <th className="p-6">Monto</th>
                  <th className="p-6">Fecha</th>
                  <th className="p-6">Método Pago</th>
                  <th className="p-6">Proveedor</th>
                  <th className="p-6">Factura</th>
                  <th className="p-6 pr-10">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {gastos.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-10 text-center text-stone-600 font-bold text-xs uppercase tracking-widest"
                    >
                      Sin gastos registrados
                    </td>
                  </tr>
                )}
                {gastos.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-stone-800/40 hover:bg-stone-800/20 transition-colors text-sm"
                  >
                    <td className="p-6 pl-10">
                      <span className="font-bold text-orange-500 text-[11px] uppercase tracking-wider">
                        {g.categoria}
                      </span>
                    </td>
                    <td className="p-6 text-stone-300">{g.descripcion}</td>
                    <td className="p-6 font-mono font-bold text-white">{formatCOP(g.monto)}</td>
                    <td className="p-6 text-stone-400">{new Date(g.fecha).toLocaleDateString('es-CO')}</td>
                    <td className="p-6">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider">{g.metodo}</span>
                    </td>
                    <td className="p-6 text-stone-400 text-xs">{g.proveedor}</td>
                    <td className="p-6">
                      <span className="font-mono text-[11px] text-stone-500">{g.factura}</span>
                    </td>
                    <td className="p-6 pr-10">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => openEdit(g)}
                          className="text-stone-600 hover:text-white transition-colors"
                        >
                          <i className="fas fa-pen"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(g)}
                          className="text-stone-600 hover:text-red-500 transition-colors"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="space-y-10">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand">Distribución de Gastos</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Porcentaje por categoría</p>
          </div>
        </div>
        <div className="bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800 shadow-2xl">
          <div className="h-96">
            {computedDistribucion.length === 0 ? (
              <div className="h-full flex items-center justify-center text-stone-600 font-bold text-xs uppercase tracking-widest">
                Sin datos de gastos aún
              </div>
            ) : !chartsError && charts ? (
              <charts.ResponsiveContainer width="100%" height="100%">
                <charts.PieChart>
                  <charts.Pie
                    data={computedDistribucion}
                    cx="50%"
                    cy="45%"
                    innerRadius={80}
                    outerRadius={140}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {computedDistribucion.map((entry, index) => (
                      <charts.Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </charts.Pie>
                  <charts.Tooltip content={<CustomPieTooltip />} />
                  <charts.Legend
                    verticalAlign="bottom"
                    height={48}
                    iconType="circle"
                    iconSize={10}
                    formatter={(value: string) => <span className="text-xs text-stone-400 font-bold">{value}</span>}
                  />
                </charts.PieChart>
              </charts.ResponsiveContainer>
            ) : (
              <ChartSkeleton error={chartsError} height="h-96" />
            )}
          </div>
        </div>
      </section>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-orange-600 text-white px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
};

export default FinanzasView;
