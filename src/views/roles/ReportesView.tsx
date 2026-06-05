
import React, { useState } from 'react';

const reportTypes = ['Ventas', 'Inventario', 'Marketing', 'Fidelización', 'Finanzas'];
const groupOptions = ['Diario', 'Semanal', 'Mensual'];

const quickReports = [
  { title: 'Ventas del Día', value: '$1,284,500', trend: '+12.3%', icon: 'fa-chart-line', color: 'text-green-500', bg: 'from-green-600/10' },
  { title: 'Productos Más Vendidos', value: 'Pizza Tradicional', trend: '+8.7%', icon: 'fa-pizza-slice', color: 'text-orange-500', bg: 'from-orange-600/10' },
  { title: 'Clientes Nuevos', value: '147', trend: '+23.5%', icon: 'fa-users', color: 'text-blue-500', bg: 'from-blue-600/10' },
  { title: 'Inventario Crítico', value: '6 ítems', trend: '-2', icon: 'fa-exclamation-triangle', color: 'text-red-500', bg: 'from-red-600/10' },
  { title: 'Campañas Activas', value: '4', trend: '+1', icon: 'fa-bullhorn', color: 'text-purple-500', bg: 'from-purple-600/10' },
  { title: 'Utilidad del Mes', value: '$3,892,000', trend: '+15.2%', icon: 'fa-coins', color: 'text-amber-500', bg: 'from-amber-600/10' },
];

const mockReportData = [
  { day: 'Lunes', ventas: 1245000, pedidos: 32, ticketPromedio: 38906 },
  { day: 'Martes', ventas: 982000, pedidos: 27, ticketPromedio: 36370 },
  { day: 'Miércoles', ventas: 1103000, pedidos: 30, ticketPromedio: 36767 },
  { day: 'Jueves', ventas: 1456000, pedidos: 38, ticketPromedio: 38316 },
  { day: 'Viernes', ventas: 1820000, pedidos: 45, ticketPromedio: 40444 },
  { day: 'Sábado', ventas: 2100000, pedidos: 52, ticketPromedio: 40385 },
  { day: 'Domingo', ventas: 1680000, pedidos: 41, ticketPromedio: 40976 },
];

const savedReports = [
  { name: 'Reporte de Ventas Semanal', date: '15/05/2026', type: 'Ventas' },
  { name: 'Inventario Crítico - Mayo', date: '12/05/2026', type: 'Inventario' },
  { name: 'Rendimiento de Campañas', date: '08/05/2026', type: 'Marketing' },
];

const ReportesView: React.FC = () => {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [reportType, setReportType] = useState('Ventas');
  const [groupBy, setGroupBy] = useState('Diario');
  const [showGenerated, setShowGenerated] = useState(false);

  const totalSales = mockReportData.reduce((a, b) => a + b.ventas, 0);
  const totalOrders = mockReportData.reduce((a, b) => a + b.pedidos, 0);
  const avgTicket = Math.round(totalSales / totalOrders);

  return (
    <div className="p-10 space-y-12 pb-40 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-brand">Centro de Reportes</h1>
          <p className="text-stone-500 mt-4 max-w-xl">Exporta y analiza datos de tu negocio</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-stone-900/40 p-8 rounded-[4rem] border border-stone-800 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
          <div>
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] block mb-3">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-[1.5rem] px-5 py-4 text-sm text-white focus:border-orange-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] block mb-3">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-[1.5rem] px-5 py-4 text-sm text-white focus:border-orange-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] block mb-3">Tipo Reporte</label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-[1.5rem] px-5 py-4 text-sm text-white focus:border-orange-500 focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              {reportTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] block mb-3">Agrupar</label>
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-[1.5rem] px-5 py-4 text-sm text-white focus:border-orange-500 focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              {groupOptions.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowGenerated(true)}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black text-[10px] uppercase tracking-[0.3em] px-8 py-5 rounded-[2.5rem] shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-95"
          >
            <i className="fas fa-chart-simple"></i> GENERAR REPORTE
          </button>
        </div>
      </div>

      {/* Quick Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {quickReports.map((r, i) => (
          <div
            key={i}
            className={`bg-gradient-to-br ${r.bg} to-stone-900/60 p-8 rounded-[3.5rem] border border-stone-800 hover:border-orange-500/40 transition-all group relative overflow-hidden shadow-xl`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 ${r.color.replace('text', 'bg')}`}></div>
            <div className="flex justify-between items-start mb-8">
              <span className="text-[9px] font-black text-stone-500 uppercase tracking-[0.4em]">{r.title}</span>
              <div className={`w-12 h-12 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 ${r.color}`}>
                <i className={`fas ${r.icon} text-lg`}></i>
              </div>
            </div>
            <div className="flex items-end gap-4">
              <p className="text-3xl font-black text-white tracking-tight">{r.value}</p>
              <span className={`text-[10px] font-black mb-1 px-3 py-1 rounded-full border border-white/5 ${r.color} ${r.color.replace('text', 'bg')}/10`}>{r.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Generated Report */}
      {showGenerated && (
        <div className="bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800 shadow-2xl space-y-10 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-2xl font-brand">Reporte de {reportType}</h3>
              <p className="text-stone-500 text-xs mt-2 uppercase tracking-[0.3em] font-bold">
                {fechaDesde || 'Últimos 7 días'} — {fechaHasta || 'Hoy'} · Agrupado por {groupBy}
              </p>
            </div>
            <div className="flex gap-4">
              <button className="bg-stone-800 hover:bg-stone-700 px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl active:scale-95">
                <i className="fas fa-file-pdf text-red-400"></i> EXPORTAR PDF
              </button>
              <button className="bg-stone-800 hover:bg-stone-700 px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl active:scale-95">
                <i className="fas fa-file-excel text-green-400"></i> EXPORTAR EXCEL
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Ventas Totales</p>
              <p className="text-3xl font-black text-orange-500">${totalSales.toLocaleString()}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Pedidos Totales</p>
              <p className="text-3xl font-black text-white">{totalOrders}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Ticket Promedio</p>
              <p className="text-3xl font-black text-amber-400">${avgTicket.toLocaleString()}</p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-800 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">
                  <th className="pb-5 pr-6">Día</th>
                  <th className="pb-5 pr-6">Ventas</th>
                  <th className="pb-5 pr-6">Pedidos</th>
                  <th className="pb-5">Ticket Promedio</th>
                </tr>
              </thead>
              <tbody>
                {mockReportData.map((row, i) => (
                  <tr key={i} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                    <td className="py-5 pr-6 font-bold text-white">{row.day}</td>
                    <td className="py-5 pr-6 text-orange-400 font-bold">${row.ventas.toLocaleString()}</td>
                    <td className="py-5 pr-6 text-stone-300">{row.pedidos}</td>
                    <td className="py-5 text-stone-400">${row.ticketPromedio.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Saved Reports */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 border-b border-white/5 pb-6">
          <i className="fas fa-folder-open text-orange-500 text-xl"></i>
          <h2 className="text-3xl font-brand">Reportes Guardados</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {savedReports.map((r, i) => (
            <div key={i} className="bg-stone-900/40 p-8 rounded-[3.5rem] border border-stone-800 hover:border-orange-500/40 transition-all group shadow-xl">
              <div className="flex items-start justify-between mb-8">
                <div className="w-14 h-14 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 text-orange-500">
                  <i className="fas fa-file-lines text-xl"></i>
                </div>
                <span className="text-[9px] font-black text-stone-600 uppercase tracking-[0.3em] px-4 py-1.5 rounded-full bg-stone-950 border border-white/5">{r.type}</span>
              </div>
              <h4 className="font-black text-lg text-white mb-3">{r.name}</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-stone-500 text-xs">
                  <i className="fas fa-calendar"></i>
                  <span>{r.date}</span>
                </div>
                <button className="w-10 h-10 rounded-full bg-stone-950 border border-white/5 flex items-center justify-center text-orange-500 hover:bg-orange-600 hover:text-white transition-all active:scale-90">
                  <i className="fas fa-download text-xs"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportesView;
