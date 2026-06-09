
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const cashFlowData = [
  { name: 'Ene', ingresos: 15400000, egresos: 9800000 },
  { name: 'Feb', ingresos: 16200000, egresos: 10200000 },
  { name: 'Mar', ingresos: 17100000, egresos: 10700000 },
  { name: 'Abr', ingresos: 16800000, egresos: 11000000 },
  { name: 'May', ingresos: 17900000, egresos: 10900000 },
  { name: 'Jun', ingresos: 18450000, egresos: 11230000 },
];

const formatCOP = (value: number) =>
  '$' + value.toLocaleString('es-CO');

const INGRESOS_ESTIMADO = 18450000;

interface Gasto {
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
  metodoPago: string;
  proveedor: string;
  factura: string;
}

const gastosData: Gasto[] = [
  { categoria: 'Ingredientes', descripcion: 'Harina Trigo Panadero 50kg', monto: 2850000, fecha: '2026-06-04', metodoPago: 'Transferencia', proveedor: 'Harinas del Valle S.A.S.', factura: 'FV-2026-4891' },
  { categoria: 'Nómina', descripcion: 'Pago quincenal cocina y domicilios', monto: 4200000, fecha: '2026-06-03', metodoPago: 'Nómina', proveedor: 'Staff Operativo', factura: 'NOM-0626-01' },
  { categoria: 'Servicios', descripcion: 'Recibo energía eléctrica local Suba', monto: 890000, fecha: '2026-06-02', metodoPago: 'Débito', proveedor: 'Enel Colombia', factura: 'E-84219-06' },
  { categoria: 'Marketing', descripcion: 'Campaña Instagram + Facebook Ads Junio', monto: 1120000, fecha: '2026-06-01', metodoPago: 'Tarjeta', proveedor: 'Meta Business', factura: 'META-AD-0626' },
  { categoria: 'Mantenimiento', descripcion: 'Reparación horno pizzero G3', monto: 540000, fecha: '2026-05-30', metodoPago: 'Efectivo', proveedor: 'TecniHornos SAS', factura: 'TH-30589' },
  { categoria: 'Transporte', descripcion: 'Combustible domicilios mayo-junio', monto: 920000, fecha: '2026-05-29', metodoPago: 'Transferencia', proveedor: 'Terpel', factura: 'TC-2026-0512' },
  { categoria: 'Empaques', descripcion: 'Cajas pizza kraft 1000 und + stickers', monto: 760000, fecha: '2026-05-28', metodoPago: 'Tarjeta', proveedor: 'Empaques Bogotá Ltda.', factura: 'EB-4421' },
  { categoria: 'Varios', descripcion: 'Papelería administrativa y útiles', monto: 210000, fecha: '2026-05-27', metodoPago: 'Efectivo', proveedor: 'Papelería Suba', factura: 'PS-887' },
];

const gastosColors: Record<string, string> = {
  Ingredientes: '#ea580c', Nómina: '#f97316', Servicios: '#fdba74',
  Marketing: '#64748b', Mantenimiento: '#a8a29e', Transporte: '#d97706',
  Empaques: '#44403c', Varios: '#78716c',
};

const categorias = ['Ingredientes', 'Nómina', 'Servicios', 'Marketing', 'Mantenimiento', 'Transporte', 'Empaques', 'Varios'];

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl px-5 py-4 shadow-2xl">
      <p className="text-stone-400 font-bold text-[11px] uppercase tracking-wider mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="font-bold text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCOP(entry.value)}
        </p>
      ))}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl px-5 py-4 shadow-2xl">
      {payload.map((entry: any, i: number) => (
        <p key={i} className="font-bold text-sm text-stone-200">
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  );
};

const FinanzasView: React.FC = () => {
  const [gastos, setGastos] = useState(gastosData);
  const [showModal, setShowModal] = useState(false);
  const [nuevoGasto, setNuevoGasto] = useState<Gasto>({
    categoria: 'Ingredientes',
    descripcion: '',
    monto: 0,
    fecha: '',
    metodoPago: '',
    proveedor: '',
    factura: '',
  });

  const totalEgresos = gastos.reduce((s, g) => s + g.monto, 0);
  const utilidadNeta = INGRESOS_ESTIMADO - totalEgresos;
  const puntoEquilibrio = Math.round(INGRESOS_ESTIMADO * 0.46);

  const computedKpis = [
    { label: 'Ingresos Mes', value: formatCOP(INGRESOS_ESTIMADO), icon: 'arrow-trend-up', color: 'text-green-500', trend: '+8.2%' },
    { label: 'Egresos Mes', value: formatCOP(totalEgresos), icon: 'arrow-trend-down', color: 'text-red-500', trend: totalEgresos > 11000000 ? '+3.1%' : '+1.2%' },
    { label: 'Utilidad Neta', value: formatCOP(utilidadNeta), icon: 'sack-dollar', color: utilidadNeta > 0 ? 'text-orange-500' : 'text-red-500', trend: utilidadNeta > 0 ? '+14.7%' : 'Negativa' },
    { label: 'Punto Equilibrio', value: formatCOP(puntoEquilibrio), icon: 'scale-balanced', color: 'text-blue-500', trend: totalEgresos < puntoEquilibrio ? 'Sobre meta' : 'Bajo meta' },
  ];

  const gastosPorCategoria = gastos.reduce<Record<string, number>>((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] || 0) + g.monto;
    return acc;
  }, {});
  const totalPorCat = Object.values(gastosPorCategoria).reduce((a, b) => a + b, 0);
  const computedDistribucion = Object.entries(gastosPorCategoria)
    .filter(([_, m]) => m > 0)
    .map(([cat, monto]) => ({
      name: cat,
      value: Math.round((monto / totalPorCat) * 100),
      color: gastosColors[cat] || '#78716c',
    }))
    .sort((a, b) => b.value - a.value);

  const gastosPorMes = gastos.reduce<Record<string, number>>((acc, g) => {
    const mes = g.fecha.slice(0, 7);
    acc[mes] = (acc[mes] || 0) + g.monto;
    return acc;
  }, {});
  const compCashFlow = cashFlowData.map(m => ({
    ...m,
    egresos: m.name === 'Jun' && gastosPorMes['2026-06'] ? Math.max(gastosPorMes['2026-06'], m.egresos) : m.egresos,
  }));

  const handleChange = (field: keyof Gasto, value: string | number) => {
    setNuevoGasto(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!nuevoGasto.descripcion || !nuevoGasto.monto || !nuevoGasto.fecha || !nuevoGasto.metodoPago || !nuevoGasto.proveedor || !nuevoGasto.factura) return;
    setGastos(prev => [...prev, { ...nuevoGasto }]);
    setShowModal(false);
    setNuevoGasto({ categoria: 'Ingredientes', descripcion: '', monto: 0, fecha: '', metodoPago: '', proveedor: '', factura: '' });
  };

  const eliminarGasto = (index: number) => {
    setGastos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-8 md:p-12 space-y-16 pb-40 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl font-brand">Gestión Financiera</h1>
          <p className="text-stone-500 max-w-xl text-lg italic opacity-80">Flujo de caja, gastos y estado de resultados</p>
        </div>
        <button onClick={() => setShowModal(true)} className="w-full md:w-auto flex items-center justify-center gap-6 px-12 py-6 rounded-[3rem] font-black text-[11px] uppercase tracking-[0.3em] bg-orange-600 text-white hover:bg-orange-500 shadow-2xl shadow-orange-900/40 transition-all active:scale-95">
          <i className="fas fa-plus-circle"></i> REGISTRAR GASTO
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-stone-900 border border-stone-800 rounded-[2rem] p-10 w-full max-w-lg max-h-screen overflow-y-auto shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-brand mb-8">Nuevo Gasto</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">Categoría</label>
                <select value={nuevoGasto.categoria} onChange={e => handleChange('categoria', e.target.value)} className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500">
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">Descripción</label>
                <input type="text" value={nuevoGasto.descripcion} onChange={e => handleChange('descripcion', e.target.value)} className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500" placeholder="Descripción del gasto" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">Monto ($)</label>
                <input type="number" value={nuevoGasto.monto || ''} onChange={e => handleChange('monto', Number(e.target.value))} className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">Fecha</label>
                <input type="date" value={nuevoGasto.fecha} onChange={e => handleChange('fecha', e.target.value)} className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">Método de Pago</label>
                <input type="text" value={nuevoGasto.metodoPago} onChange={e => handleChange('metodoPago', e.target.value)} className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500" placeholder="Efectivo, Tarjeta, Transferencia..." />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">Proveedor</label>
                <input type="text" value={nuevoGasto.proveedor} onChange={e => handleChange('proveedor', e.target.value)} className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500" placeholder="Nombre del proveedor" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-2">Factura</label>
                <input type="text" value={nuevoGasto.factura} onChange={e => handleChange('factura', e.target.value)} className="w-full bg-stone-800/60 border border-stone-700 rounded-2xl px-5 py-4 text-sm text-stone-200 outline-none focus:border-orange-500" placeholder="N° factura" />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] bg-stone-800 text-stone-400 hover:bg-stone-700 transition-all">Cancelar</button>
              <button onClick={handleSubmit} className="flex-1 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] bg-orange-600 text-white hover:bg-orange-500 transition-all">Guardar</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {computedKpis.map((kpi, i) => (
          <div key={i} className="bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800/50 shadow-2xl group hover:border-orange-500/40 transition-all">
            <div className="flex justify-between items-start mb-6">
              <span className="text-stone-600 text-[11px] uppercase font-black tracking-[0.4em]">{kpi.label}</span>
              <div className={`w-12 h-12 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 ${kpi.color}`}>
                <i className={`fas fa-${kpi.icon} text-xl`}></i>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-5xl font-black text-white tracking-tighter">{kpi.value}</p>
              <span className={`text-[10px] font-black uppercase mb-1.5 px-3 py-1 rounded-full border border-white/5 ${kpi.color.includes('green') ? 'bg-green-500/10 text-green-500' : kpi.color.includes('red') ? 'bg-red-500/10 text-red-500' : kpi.color.includes('orange') ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>{kpi.trend}</span>
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
        <div className="bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800 shadow-2xl">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compCashFlow} barGap={4} barCategoryGap="20%">
                <XAxis dataKey="name" stroke="#57534e" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#57534e" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v: number) => '$' + (v / 1000000).toFixed(1) + 'M'} />
                <Tooltip
                  cursor={{ fill: '#ffffff08' }}
                  content={<CustomBarTooltip />}
                  labelStyle={{ color: '#a8a29e', fontWeight: 700, fontSize: 11 }}
                />
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
                  <th className="p-6 pr-10"></th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((g, i) => (
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
                    <td className="p-6">
                      <span className="font-mono text-[11px] text-stone-500">{g.factura}</span>
                    </td>
                    <td className="p-6 pr-10">
                      <button onClick={() => eliminarGasto(i)} className="text-stone-600 hover:text-red-400 transition-colors" title="Eliminar">
                        <i className="fas fa-trash-can"></i>
                      </button>
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
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
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
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
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
    </div>
  );
};

export default FinanzasView;
