import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const CATEGORIAS = ['Ingredientes', 'Nómina', 'Servicios', 'Marketing', 'Mantenimiento', 'Transporte', 'Empaques', 'Varios'];
const METODOS_PAGO = ['Transferencia', 'Nómina', 'Débito', 'Tarjeta', 'Efectivo'];
const COLORS = ['#ea580c', '#f97316', '#fdba74', '#64748b', '#a8a29e', '#44403c', '#78716c', '#292524'];

const formatCOP = (value: number) =>
  '$' + value.toLocaleString('es-CO');

const monthIndex = (fecha: string) => {
  const d = new Date(fecha + 'T00:00:00');
  return d.getMonth();
};

interface Gasto {
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
  metodoPago: string;
  proveedor: string;
  factura: string;
}

const initialGastos: Gasto[] = [
  { categoria: 'Ingredientes', descripcion: 'Harina Trigo Panadero 50kg', monto: 2850000, fecha: '2026-06-04', metodoPago: 'Transferencia', proveedor: 'Harinas del Valle S.A.S.', factura: 'FV-2026-4891' },
  { categoria: 'Nómina', descripcion: 'Pago quincenal cocina y domicilios', monto: 4200000, fecha: '2026-06-03', metodoPago: 'Nómina', proveedor: 'Staff Operativo', factura: 'NOM-0626-01' },
  { categoria: 'Servicios', descripcion: 'Recibo energía eléctrica local Suba', monto: 890000, fecha: '2026-06-02', metodoPago: 'Débito', proveedor: 'Enel Colombia', factura: 'E-84219-06' },
  { categoria: 'Marketing', descripcion: 'Campaña Instagram + Facebook Ads Junio', monto: 1120000, fecha: '2026-06-01', metodoPago: 'Tarjeta', proveedor: 'Meta Business', factura: 'META-AD-0626' },
  { categoria: 'Mantenimiento', descripcion: 'Reparación horno pizzero G3', monto: 540000, fecha: '2026-05-30', metodoPago: 'Efectivo', proveedor: 'TecniHornos SAS', factura: 'TH-30589' },
  { categoria: 'Transporte', descripcion: 'Combustible domicilios mayo-junio', monto: 920000, fecha: '2026-05-29', metodoPago: 'Transferencia', proveedor: 'Terpel', factura: 'TC-2026-0512' },
  { categoria: 'Empaques', descripcion: 'Cajas pizza kraft 1000 und + stickers', monto: 760000, fecha: '2026-05-28', metodoPago: 'Tarjeta', proveedor: 'Empaques Bogotá Ltda.', factura: 'EB-4421' },
  { categoria: 'Varios', descripcion: 'Papelería administrativa y útiles', monto: 210000, fecha: '2026-05-27', metodoPago: 'Efectivo', proveedor: 'Papelería Suba', factura: 'PS-887' },
];

const initialCashFlow = [
  { name: 'Ene', ingresos: 15400000, egresos: 9800000 },
  { name: 'Feb', ingresos: 16200000, egresos: 10200000 },
  { name: 'Mar', ingresos: 17100000, egresos: 10700000 },
  { name: 'Abr', ingresos: 16800000, egresos: 11000000 },
  { name: 'May', ingresos: 17900000, egresos: 10900000 },
  { name: 'Jun', ingresos: 18450000, egresos: 11230000 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-stone-900 border border-stone-700 rounded-2xl px-5 py-3 shadow-2xl">
      <p className="text-stone-400 text-xs font-bold mb-1 uppercase tracking-wider">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-mono font-bold" style={{ color: p.color }}>
          {p.name}: {formatCOP(p.value)}
        </p>
      ))}
    </div>
  );
};

const FinanzasView: React.FC = () => {
  const [gastos, setGastos] = useState<Gasto[]>(initialGastos);
  const [cashFlow, setCashFlow] = useState(initialCashFlow);
  const [showModal, setShowModal] = useState(false);
  const [filterCat, setFilterCat] = useState('');

  const [form, setForm] = useState<Gasto>({
    categoria: 'Ingredientes',
    descripcion: '',
    monto: 0,
    fecha: new Date().toISOString().slice(0, 10),
    metodoPago: 'Transferencia',
    proveedor: '',
    factura: '',
  });

  const handleAddGasto = () => {
    if (!form.descripcion || form.monto <= 0) return;
    const nuevo = { ...form };
    setGastos(prev => [...prev, nuevo]);

    const mIdx = monthIndex(form.fecha);
    if (mIdx >= 0 && mIdx < 6) {
      setCashFlow(prev => {
        const next = [...prev];
        next[mIdx] = { ...next[mIdx], egresos: next[mIdx].egresos + form.monto };
        return next;
      });
    }

    setShowModal(false);
    setForm({
      categoria: 'Ingredientes',
      descripcion: '',
      monto: 0,
      fecha: new Date().toISOString().slice(0, 10),
      metodoPago: 'Transferencia',
      proveedor: '',
      factura: '',
    });
  };

  const handleDeleteGasto = (idx: number) => {
    const removed = gastos[idx];
    setGastos(prev => prev.filter((_, i) => i !== idx));

    const mIdx = monthIndex(removed.fecha);
    if (mIdx >= 0 && mIdx < 6) {
      setCashFlow(prev => {
        const next = [...prev];
        next[mIdx] = { ...next[mIdx], egresos: Math.max(0, next[mIdx].egresos - removed.monto) };
        return next;
      });
    }
  };

  const filteredGastos = filterCat
    ? gastos.filter(g => g.categoria === filterCat)
    : gastos;

  const latest = cashFlow[5] || cashFlow[cashFlow.length - 1];
  const ingresosMes = latest?.ingresos ?? 0;
  const egresosMes = latest?.egresos ?? 0;
  const utilidadNeta = ingresosMes - egresosMes;
  const puntoEquilibrio = egresosMes;

  const kpis = [
    { label: 'Ingresos Mes', value: ingresosMes, icon: 'arrow-trend-up', color: 'text-green-500', trend: '+'},
    { label: 'Egresos Mes', value: egresosMes, icon: 'arrow-trend-down', color: 'text-red-500', trend: '-' },
    { label: 'Utilidad Neta', value: utilidadNeta, icon: 'sack-dollar', color: 'text-orange-500', trend: utilidadNeta >= 0 ? 'Rentable' : 'Pérdida' },
    { label: 'Punto Equilibrio', value: puntoEquilibrio, icon: 'scale-balanced', color: 'text-blue-500', trend: 'Estable' },
  ];

  const distribucionData = useMemo(() => {
    const grouped: Record<string, number> = {};
    gastos.forEach(g => {
      grouped[g.categoria] = (grouped[g.categoria] || 0) + g.monto;
    });
    const total = Object.values(grouped).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(grouped).map(([name, value], i) => ({
      name,
      value: Math.round((value / total) * 100),
      color: COLORS[i % COLORS.length],
    }));
  }, [gastos]);

  return (
    <div className="p-8 md:p-12 space-y-16 pb-40 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl font-brand">Gestión Financiera</h1>
          <p className="text-stone-500 max-w-xl text-lg italic opacity-80">Flujo de caja, gastos y estado de resultados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full md:w-auto flex items-center justify-center gap-6 px-12 py-6 rounded-[3rem] font-black text-[11px] uppercase tracking-[0.3em] bg-orange-600 text-white hover:bg-orange-500 shadow-2xl shadow-orange-900/40 transition-all active:scale-95"
        >
          <i className="fas fa-plus-circle"></i> REGISTRAR GASTO
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-stone-900/40 p-10 rounded-[2.5rem] border border-stone-800/50 shadow-2xl group hover:border-orange-500/40 transition-all">
            <div className="flex justify-between items-start mb-6">
              <span className="text-stone-600 text-[11px] uppercase font-black tracking-[0.4em]">{kpi.label}</span>
              <div className={`w-12 h-12 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 ${kpi.color}`}>
                <i className={`fas fa-${kpi.icon} text-xl`}></i>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-5xl font-black text-white tracking-tighter">{formatCOP(kpi.value)}</p>
              <span className={`text-[10px] font-black uppercase mb-1.5 px-3 py-1 rounded-full border border-white/5 ${
                kpi.color === 'text-green-500' ? 'bg-green-500/10 text-green-500' :
                kpi.color === 'text-red-500' ? 'bg-red-500/10 text-red-500' :
                kpi.color === 'text-orange-500' ? (utilidadNeta >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500') :
                'bg-blue-500/10 text-blue-500'
              }`}>{kpi.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-10">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand">Flujo de Caja</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Enero - Junio 2026</p>
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
        <div className="bg-stone-900/40 p-10 rounded-[2.5rem] border border-stone-800 shadow-2xl">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlow} barGap={4} barCategoryGap="20%">
                <XAxis dataKey="name" stroke="#57534e" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#57534e" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v: number) => '$' + (v / 1000000).toFixed(1) + 'M'} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="ingresos" fill="#22c55e" radius={[8, 8, 0, 0]} barSize={28} />
                <Bar dataKey="egresos" fill="#ef4444" radius={[8, 8, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="space-y-10">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl font-brand">Gastos Recientes</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Últimos movimientos registrados</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">Filtrar:</label>
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="bg-stone-800 border border-stone-700 rounded-2xl px-4 py-2 text-xs font-bold text-stone-300 outline-none focus:border-orange-500"
            >
              <option value="">Todas</option>
              {CATEGORIAS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="bg-stone-900/40 rounded-[2.5rem] border border-stone-800 shadow-2xl overflow-hidden">
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
                  <th className="p-6 pr-10">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredGastos.map((g, i) => (
                  <tr key={i} className="border-b border-stone-800/40 hover:bg-stone-800/20 transition-colors text-sm">
                    <td className="p-6 pl-10">
                      <span className="font-bold text-orange-500 text-[11px] uppercase tracking-wider">{g.categoria}</span>
                    </td>
                    <td className="p-6 text-stone-300">{g.descripcion}</td>
                    <td className="p-6 font-mono font-bold text-white">{formatCOP(g.monto)}</td>
                    <td className="p-6 text-stone-400">{g.fecha}</td>
                    <td className="p-6">
                      <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider">{g.metodoPago}</span>
                    </td>
                    <td className="p-6 text-stone-400 text-xs">{g.proveedor}</td>
                    <td className="p-6 pr-10">
                      <button
                        onClick={() => handleDeleteGasto(gastos.indexOf(g))}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-2xl transition-all active:scale-90"
                      >
                        <i className="fas fa-trash-can mr-2"></i> ELIMINAR
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredGastos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-stone-500 text-sm">No hay gastos registrados</td>
                  </tr>
                )}
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
        <div className="bg-stone-900/40 p-10 rounded-[2.5rem] border border-stone-800 shadow-2xl">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribucionData}
                  cx="50%"
                  cy="45%"
                  innerRadius={80}
                  outerRadius={140}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {distribucionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={48}
                  iconType="circle"
                  iconSize={10}
                  formatter={(value: string) => <span className="text-xs text-stone-400 font-bold">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div
            className="bg-stone-900 border border-stone-700 rounded-[2.5rem] p-10 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-brand">Registrar Gasto</h3>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-700 transition-all">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] block mb-2">Categoría</label>
                <select
                  value={form.categoria}
                  onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                >
                  {CATEGORIAS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] block mb-2">Descripción</label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                  placeholder="Ej: Compra de insumos"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] block mb-2">Monto ($)</label>
                <input
                  type="number"
                  value={form.monto || ''}
                  onChange={e => setForm(p => ({ ...p, monto: Number(e.target.value) }))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                  placeholder="0"
                  min={0}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] block mb-2">Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] block mb-2">Método de Pago</label>
                <select
                  value={form.metodoPago}
                  onChange={e => setForm(p => ({ ...p, metodoPago: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                >
                  {METODOS_PAGO.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] block mb-2">Proveedor</label>
                <input
                  type="text"
                  value={form.proveedor}
                  onChange={e => setForm(p => ({ ...p, proveedor: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] block mb-2">N° Factura</label>
                <input
                  type="text"
                  value={form.factura}
                  onChange={e => setForm(p => ({ ...p, factura: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500"
                  placeholder="FV-2026-XXXX"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] bg-stone-800 text-stone-400 hover:bg-stone-700 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddGasto}
                className="flex-1 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] bg-orange-600 text-white hover:bg-orange-500 shadow-lg shadow-orange-900/40 transition-all active:scale-95"
              >
                Guardar Gasto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanzasView;
