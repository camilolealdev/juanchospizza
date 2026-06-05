
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const kpis = [
  { label: 'Ingresos Mes', value: '$18,450,000', icon: 'arrow-trend-up', color: 'text-green-500', trend: '+8.2%' },
  { label: 'Egresos Mes', value: '$11,230,000', icon: 'arrow-trend-down', color: 'text-red-500', trend: '+3.1%' },
  { label: 'Utilidad Neta', value: '$7,220,000', icon: 'sack-dollar', color: 'text-orange-500', trend: '+14.7%' },
  { label: 'Punto Equilibrio', value: '$8,500,000', icon: 'scale-balanced', color: 'text-blue-500', trend: 'Estable' },
];

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

interface Gasto {
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
  metodoPago: string;
  proveedor: string;
  factura: string;
}

const gastos: Gasto[] = [
  { categoria: 'Ingredientes', descripcion: 'Harina Trigo Panadero 50kg', monto: 2850000, fecha: '2026-06-04', metodoPago: 'Transferencia', proveedor: 'Harinas del Valle S.A.S.', factura: 'FV-2026-4891' },
  { categoria: 'Nómina', descripcion: 'Pago quincenal cocina y domicilios', monto: 4200000, fecha: '2026-06-03', metodoPago: 'Nómina', proveedor: 'Staff Operativo', factura: 'NOM-0626-01' },
  { categoria: 'Servicios', descripcion: 'Recibo energía eléctrica local Suba', monto: 890000, fecha: '2026-06-02', metodoPago: 'Débito', proveedor: 'Enel Colombia', factura: 'E-84219-06' },
  { categoria: 'Marketing', descripcion: 'Campaña Instagram + Facebook Ads Junio', monto: 1120000, fecha: '2026-06-01', metodoPago: 'Tarjeta', proveedor: 'Meta Business', factura: 'META-AD-0626' },
  { categoria: 'Mantenimiento', descripcion: 'Reparación horno pizzero G3', monto: 540000, fecha: '2026-05-30', metodoPago: 'Efectivo', proveedor: 'TecniHornos SAS', factura: 'TH-30589' },
  { categoria: 'Transporte', descripcion: 'Combustible domicilios mayo-junio', monto: 920000, fecha: '2026-05-29', metodoPago: 'Transferencia', proveedor: 'Terpel', factura: 'TC-2026-0512' },
  { categoria: 'Empaques', descripcion: 'Cajas pizza kraft 1000 und + stickers', monto: 760000, fecha: '2026-05-28', metodoPago: 'Tarjeta', proveedor: 'Empaques Bogotá Ltda.', factura: 'EB-4421' },
  { categoria: 'Varios', descripcion: 'Papelería administrativa y útiles', monto: 210000, fecha: '2026-05-27', metodoPago: 'Efectivo', proveedor: 'Papelería Suba', factura: 'PS-887' },
];

const distribucionData = [
  { name: 'Ingredientes', value: 35, color: '#ea580c' },
  { name: 'Nómina', value: 25, color: '#f97316' },
  { name: 'Servicios', value: 12, color: '#fdba74' },
  { name: 'Marketing', value: 10, color: '#64748b' },
  { name: 'Transporte', value: 8, color: '#a8a29e' },
  { name: 'Otros', value: 10, color: '#44403c' },
];

const FinanzasView: React.FC = () => {
  return (
    <div className="p-8 md:p-12 space-y-16 pb-40 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl font-brand">Gestión Financiera</h1>
          <p className="text-stone-500 max-w-xl text-lg italic opacity-80">Flujo de caja, gastos y estado de resultados</p>
        </div>
        <button className="w-full md:w-auto flex items-center justify-center gap-6 px-12 py-6 rounded-[3rem] font-black text-[11px] uppercase tracking-[0.3em] bg-orange-600 text-white hover:bg-orange-500 shadow-2xl shadow-orange-900/40 transition-all active:scale-95">
          <i className="fas fa-plus-circle"></i> REGISTRAR GASTO
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {kpis.map((kpi, i) => (
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
              <BarChart data={cashFlowData} barGap={4} barCategoryGap="20%">
                <XAxis dataKey="name" stroke="#57534e" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#57534e" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v: number) => '$' + (v / 1000000).toFixed(1) + 'M'} />
                <Tooltip
                  cursor={{ fill: '#ffffff08' }}
                  contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #292524', borderRadius: '16px', color: '#e7e5e4' }}
                  formatter={(value: number) => [formatCOP(value), '']}
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
        <div className="bg-stone-900/40 rounded-[4rem] border border-stone-800 shadow-2xl overflow-hidden">
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
                  <th className="p-6 pr-10">Factura</th>
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
                    <td className="p-6 pr-10">
                      <span className="font-mono text-[11px] text-stone-500">{g.factura}</span>
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
                <Tooltip
                  contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #292524', borderRadius: '16px', color: '#e7e5e4' }}
                  formatter={(value: number) => [`${value}%`, 'Porcentaje']}
                />
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
