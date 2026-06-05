import React, { useState } from 'react';

const reportTypes = ['Ventas', 'Inventario', 'Marketing', 'Fidelizacion', 'Finanzas'];
const groupOptions = ['Diario', 'Semanal', 'Mensual'];

const ventasData = [
  { label: 'Lunes', ventas: 1245000, pedidos: 32, ticketPromedio: 38906 },
  { label: 'Martes', ventas: 982000, pedidos: 27, ticketPromedio: 36370 },
  { label: 'Miercoles', ventas: 1103000, pedidos: 30, ticketPromedio: 36767 },
  { label: 'Jueves', ventas: 1456000, pedidos: 38, ticketPromedio: 38316 },
  { label: 'Viernes', ventas: 1820000, pedidos: 45, ticketPromedio: 40444 },
  { label: 'Sabado', ventas: 2100000, pedidos: 52, ticketPromedio: 40385 },
  { label: 'Domingo', ventas: 1680000, pedidos: 41, ticketPromedio: 40976 },
];

const inventarioData = [
  { label: 'Harina (kg)', stock: 120, minimo: 200, estado: 'Critico', unidad: 'kg' },
  { label: 'Queso (kg)', stock: 45, minimo: 50, estado: 'Critico', unidad: 'kg' },
  { label: 'Salsa de Tomate (l)', stock: 80, minimo: 60, estado: 'OK', unidad: 'l' },
  { label: 'Pepperoni (kg)', stock: 30, minimo: 25, estado: 'OK', unidad: 'kg' },
  { label: 'Champinones (kg)', stock: 15, minimo: 20, estado: 'Critico', unidad: 'kg' },
  { label: 'Cebolla (kg)', stock: 40, minimo: 30, estado: 'OK', unidad: 'kg' },
  { label: 'Aceite de Oliva (l)', stock: 25, minimo: 15, estado: 'OK', unidad: 'l' },
  { label: 'Tomates (kg)', stock: 8, minimo: 25, estado: 'Critico', unidad: 'kg' },
];

const marketingData = [
  { label: 'Facebook Ads', inversion: 450000, clicks: 3200, conversiones: 145, roas: 3.2 },
  { label: 'Google Ads', inversion: 380000, clicks: 4100, conversiones: 198, roas: 4.1 },
  { label: 'Instagram Ads', inversion: 520000, clicks: 5600, conversiones: 267, roas: 3.8 },
  { label: 'Email Marketing', inversion: 120000, clicks: 1800, conversiones: 89, roas: 5.2 },
  { label: 'TikTok Ads', inversion: 290000, clicks: 8900, conversiones: 312, roas: 2.9 },
];

const fidelizacionData = [
  { label: 'Puntos Emitidos', valor: 2450000, usuarios: 890, variacion: '+12%' },
  { label: 'Canjes Realizados', valor: 890000, usuarios: 345, variacion: '+8%' },
  { label: 'Tasa de Retencion', valor: 78, usuarios: null, variacion: '+3%' },
  { label: 'Clientes Activos', valor: 1240, usuarios: null, variacion: '+15%' },
  { label: 'Tarjetas Registradas', valor: 2100, usuarios: null, variacion: '+22%' },
];

const finanzasData = [
  { label: 'Efectivo', ingresos: 3200000, egresos: 1850000, neto: 1350000 },
  { label: 'Tarjeta Debito', ingresos: 2890000, egresos: 1200000, neto: 1690000 },
  { label: 'Tarjeta Credito', ingresos: 1560000, egresos: 800000, neto: 760000 },
  { label: 'Transferencias', ingresos: 890000, egresos: 450000, neto: 440000 },
  { label: 'Apps/Delivery', ingresos: 2100000, egresos: 950000, neto: 1150000 },
  { label: 'Gastos Operativos', ingresos: 0, egresos: 3200000, neto: -3200000 },
];

const savedReports = [
  { name: 'Reporte de Ventas Semanal', date: '15/05/2026', type: 'Ventas' },
  { name: 'Inventario Critico - Mayo', date: '12/05/2026', type: 'Inventario' },
  { name: 'Rendimiento de Campanas', date: '08/05/2026', type: 'Marketing' },
];

function aggregateByGroup(data: { label: string; [key: string]: any }[], group: string) {
  if (group === 'Diario') return data;
  const weeks = [];
  const months = [];
  if (group === 'Semanal') {
    for (let i = 0; i < data.length; i += 3) {
      const chunk = data.slice(i, i + 3);
      const agg: any = { label: `Semana ${Math.floor(i / 3) + 1}` };
      Object.keys(chunk[0]).forEach(k => {
        if (k !== 'label' && typeof chunk[0][k] === 'number') {
          agg[k] = chunk.reduce((s, r) => s + (r[k] || 0), 0);
        }
      });
      weeks.push(agg);
    }
    return weeks;
  }
  if (group === 'Mensual') {
    const total: any = { label: 'Junio 2026' };
    Object.keys(data[0]).forEach(k => {
      if (k !== 'label' && typeof data[0][k] === 'number') {
        total[k] = data.reduce((s, r) => s + (r[k] || 0), 0);
      }
    });
    return [total];
  }
  return data;
}

const ReportesView: React.FC = () => {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [reportType, setReportType] = useState('Ventas');
  const [groupBy, setGroupBy] = useState('Diario');
  const [showGenerated, setShowGenerated] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  const showToast = (msg: string) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  };

  const totalSales = ventasData.reduce((a, b) => a + b.ventas, 0);
  const totalOrders = ventasData.reduce((a, b) => a + b.pedidos, 0);
  const avgTicket = Math.round(totalSales / totalOrders);
  const criticalItems = inventarioData.filter(i => i.estado === 'Critico').length;
  const totalMarketingInversion = marketingData.reduce((a, b) => a + b.inversion, 0);
  const activeCampaigns = marketingData.length;
  const totalFidelizacion = fidelizacionData.reduce((a, b) => a + (typeof b.valor === 'number' ? b.valor : 0), 0);
  const totalFinanzasNeto = finanzasData.reduce((a, b) => a + b.neto, 0);

  const quickReports = [
    { title: 'Ventas del Dia', value: `$${(totalSales / 7).toLocaleString()}`, icon: 'fa-chart-line', color: 'text-green-500', bg: 'from-green-600/10', trend: '+12.3%' },
    { title: 'Productos Mas Vendidos', value: 'Pizza Tradicional', icon: 'fa-pizza-slice', color: 'text-orange-500', bg: 'from-orange-600/10', trend: '+8.7%' },
    { title: 'Clientes Nuevos', value: '147', icon: 'fa-users', color: 'text-blue-500', bg: 'from-blue-600/10', trend: '+23.5%' },
    { title: 'Inventario Critico', value: `${criticalItems} items`, icon: 'fa-exclamation-triangle', color: 'text-red-500', bg: 'from-red-600/10', trend: '-2' },
    { title: 'Campanas Activas', value: `${activeCampaigns}`, icon: 'fa-bullhorn', color: 'text-purple-500', bg: 'from-purple-600/10', trend: '+1' },
    { title: 'Utilidad del Mes', value: `$${totalFinanzasNeto.toLocaleString()}`, icon: 'fa-coins', color: 'text-amber-500', bg: 'from-amber-600/10', trend: '+15.2%' },
  ];

  const renderVentasTable = () => {
    const data = aggregateByGroup(ventasData, groupBy);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-stone-800 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">
              <th className="pb-5 pr-6">{groupBy === 'Diario' ? 'Dia' : groupBy === 'Semanal' ? 'Semana' : 'Mes'}</th>
              <th className="pb-5 pr-6">Ventas</th>
              <th className="pb-5 pr-6">Pedidos</th>
              <th className="pb-5">Ticket Promedio</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                <td className="py-5 pr-6 font-bold text-white">{row.label}</td>
                <td className="py-5 pr-6 text-orange-400 font-bold">${row.ventas.toLocaleString()}</td>
                <td className="py-5 pr-6 text-stone-300">{row.pedidos}</td>
                <td className="py-5 text-stone-400">${Math.round(row.ventas / row.pedidos).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderInventarioTable = () => {
    const data = groupBy === 'Diario' ? inventarioData : groupBy === 'Semanal'
      ? inventarioData.slice(0, 4) : inventarioData.filter(i => i.estado === 'Critico');
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-stone-800 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">
              <th className="pb-5 pr-6">Producto</th>
              <th className="pb-5 pr-6">Stock Actual</th>
              <th className="pb-5 pr-6">Stock Minimo</th>
              <th className="pb-5">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                <td className="py-5 pr-6 font-bold text-white">{row.label}</td>
                <td className={`py-5 pr-6 font-bold ${row.stock < row.minimo ? 'text-red-400' : 'text-green-400'}`}>{row.stock} {row.unidad}</td>
                <td className="py-5 pr-6 text-stone-400">{row.minimo} {row.unidad}</td>
                <td className="py-5">
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-full ${row.estado === 'Critico' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-green-950 text-green-400 border border-green-800'}`}>
                    {row.estado === 'Critico' ? 'CRITICO' : 'OK'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMarketingTable = () => {
    const data = aggregateByGroup(marketingData, groupBy);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-stone-800 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">
              <th className="pb-5 pr-6">Campana</th>
              <th className="pb-5 pr-6">Inversion</th>
              <th className="pb-5 pr-6">Clicks</th>
              <th className="pb-5 pr-6">Conversiones</th>
              <th className="pb-5">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                <td className="py-5 pr-6 font-bold text-white">{row.label}</td>
                <td className="py-5 pr-6 text-orange-400 font-bold">${row.inversion.toLocaleString()}</td>
                <td className="py-5 pr-6 text-stone-300">{row.clicks.toLocaleString()}</td>
                <td className="py-5 pr-6 text-green-400 font-bold">{row.conversiones}</td>
                <td className="py-5 text-amber-400 font-bold">{row.roas}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderFidelizacionTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-stone-800 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">
              <th className="pb-5 pr-6">Metrica</th>
              <th className="pb-5 pr-6">Valor</th>
              <th className="pb-5 pr-6">Usuarios</th>
              <th className="pb-5">Variacion</th>
            </tr>
          </thead>
          <tbody>
            {fidelizacionData.map((row, i) => (
              <tr key={i} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                <td className="py-5 pr-6 font-bold text-white">{row.label}</td>
                <td className="py-5 pr-6 text-orange-400 font-bold">{typeof row.valor === 'number' && row.valor > 1000 ? `$${row.valor.toLocaleString()}` : `${row.valor}%`}</td>
                <td className="py-5 pr-6 text-stone-300">{row.usuarios !== null ? row.usuarios.toLocaleString() : '-'}</td>
                <td className="py-5">
                  <span className="text-green-400 font-bold text-xs">{row.variacion}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderFinanzasTable = () => {
    const data = groupBy === 'Diario' ? finanzasData : groupBy === 'Semanal'
      ? finanzasData.slice(0, 3) : finanzasData.filter(f => f.neto > 0);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-stone-800 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">
              <th className="pb-5 pr-6">Concepto</th>
              <th className="pb-5 pr-6">Ingresos</th>
              <th className="pb-5 pr-6">Egresos</th>
              <th className="pb-5">Neto</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                <td className="py-5 pr-6 font-bold text-white">{row.label}</td>
                <td className="py-5 pr-6 text-green-400 font-bold">{row.ingresos > 0 ? `$${row.ingresos.toLocaleString()}` : '-'}</td>
                <td className="py-5 pr-6 text-red-400 font-bold">{row.egresos > 0 ? `$${row.egresos.toLocaleString()}` : '-'}</td>
                <td className={`py-5 font-bold ${row.neto >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {row.neto >= 0 ? '+' : ''}${row.neto.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderReportContent = () => {
    switch (reportType) {
      case 'Ventas': return renderVentasTable();
      case 'Inventario': return renderInventarioTable();
      case 'Marketing': return renderMarketingTable();
      case 'Fidelizacion': return renderFidelizacionTable();
      case 'Finanzas': return renderFinanzasTable();
      default: return renderVentasTable();
    }
  };

  return (
    <div className="p-10 space-y-12 pb-40 animate-fade-in relative">
      {/* Toast */}
      {toast.visible && (
        <div className="fixed top-8 right-8 z-50 bg-stone-900 border border-orange-500/40 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-fade-in">
          <i className="fas fa-check-circle text-orange-500 text-lg"></i>
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

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
                {fechaDesde || 'Ultimos 7 dias'} — {fechaHasta || 'Hoy'} · Agrupado por {groupBy}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => showToast(`Reporte exportado: ${reportType}.pdf`)}
                className="bg-stone-800 hover:bg-stone-700 px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl active:scale-95"
              >
                <i className="fas fa-file-pdf text-red-400"></i> EXPORTAR PDF
              </button>
              <button
                onClick={() => showToast(`Reporte exportado: ${reportType}.xlsx`)}
                className="bg-stone-800 hover:bg-stone-700 px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl active:scale-95"
              >
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

          {/* Dynamic Table based on reportType and groupBy */}
          {renderReportContent()}
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
                <button
                  onClick={() => showToast(`Descargando: ${r.name}`)}
                  className="w-10 h-10 rounded-full bg-stone-950 border border-white/5 flex items-center justify-center text-orange-500 hover:bg-orange-600 hover:text-white transition-all active:scale-90"
                >
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
