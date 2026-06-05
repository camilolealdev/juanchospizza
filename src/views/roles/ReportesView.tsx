import React, { useState, useEffect } from 'react';

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

const mockVentas = [
  { day: 'Lunes', ventas: 1245000, pedidos: 32, ticketPromedio: 38906 },
  { day: 'Martes', ventas: 982000, pedidos: 27, ticketPromedio: 36370 },
  { day: 'Miércoles', ventas: 1103000, pedidos: 30, ticketPromedio: 36767 },
  { day: 'Jueves', ventas: 1456000, pedidos: 38, ticketPromedio: 38316 },
  { day: 'Viernes', ventas: 1820000, pedidos: 45, ticketPromedio: 40444 },
  { day: 'Sábado', ventas: 2100000, pedidos: 52, ticketPromedio: 40385 },
  { day: 'Domingo', ventas: 1680000, pedidos: 41, ticketPromedio: 40976 },
];

const mockInventario = [
  { item: 'Harina (kg)', stock: 120, minimo: 50, estado: 'Disponible' },
  { item: 'Queso Mozzarella (kg)', stock: 45, minimo: 20, estado: 'Disponible' },
  { item: 'Salsa de Tomate (L)', stock: 8, minimo: 15, estado: 'Crítico' },
  { item: 'Pepperoni (kg)', stock: 22, minimo: 10, estado: 'Disponible' },
  { item: 'Champiñones (kg)', stock: 5, minimo: 8, estado: 'Por Agotarse' },
  { item: 'Aceite de Oliva (L)', stock: 3, minimo: 5, estado: 'Por Agotarse' },
];

const mockMarketing = [
  { campana: 'Promo Verano', alcance: 45000, conversiones: 1200, tasa: '2.67%' },
  { campana: '2x1 en Pizzas', alcance: 32000, conversiones: 980, tasa: '3.06%' },
  { campana: 'Descuento Estudiantes', alcance: 18000, conversiones: 720, tasa: '4.00%' },
  { campana: 'Lanzamiento BBQ', alcance: 28000, conversiones: 560, tasa: '2.00%' },
];

const mockFidelizacion = [
  { recompensa: 'Pizza Gratis', puntos: 1000, canjes: 45, disponibles: 12 },
  { recompensa: 'Bebida 2x1', puntos: 300, canjes: 128, disponibles: 55 },
  { recompensa: 'Postre Gratis', puntos: 500, canjes: 67, disponibles: 28 },
  { recompensa: 'Descuento 20%', puntos: 750, canjes: 34, disponibles: 8 },
];

const mockFinanzas = [
  { concepto: 'Ventas Totales', ingresos: 12450000, egresos: 0, tipo: 'ingreso' },
  { concepto: 'Nómina', ingresos: 0, egresos: 3200000, tipo: 'egreso' },
  { concepto: 'Insumos', ingresos: 0, egresos: 2800000, tipo: 'egreso' },
  { concepto: 'Servicios', ingresos: 0, egresos: 950000, tipo: 'egreso' },
  { concepto: 'Marketing', ingresos: 0, egresos: 1200000, tipo: 'egreso' },
  { concepto: 'Otros Ingresos', ingresos: 480000, egresos: 0, tipo: 'ingreso' },
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
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const totalSales = mockVentas.reduce((a, b) => a + b.ventas, 0);
  const totalOrders = mockVentas.reduce((a, b) => a + b.pedidos, 0);
  const avgTicket = Math.round(totalSales / totalOrders);

  const totalIncomeFinanzas = mockFinanzas.filter(f => f.tipo === 'ingreso').reduce((a, b) => a + b.ingresos, 0);
  const totalExpenseFinanzas = mockFinanzas.filter(f => f.tipo === 'egreso').reduce((a, b) => a + b.egresos, 0);

  const renderTable = () => {
    switch (reportType) {
      case 'Inventario':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-800 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">
                  <th className="pb-5 pr-6">Producto</th>
                  <th className="pb-5 pr-6">Stock Actual</th>
                  <th className="pb-5 pr-6">Stock Mínimo</th>
                  <th className="pb-5">Estado</th>
                </tr>
              </thead>
              <tbody>
                {mockInventario.map((row, i) => (
                  <tr key={i} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                    <td className="py-5 pr-6 font-bold text-white">{row.item}</td>
                    <td className="py-5 pr-6 text-stone-300">{row.stock}</td>
                    <td className="py-5 pr-6 text-stone-500">{row.minimo}</td>
                    <td className="py-5">
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border ${
                        row.estado === 'Crítico' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                        row.estado === 'Por Agotarse' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                        'text-green-400 border-green-500/30 bg-green-500/10'
                      }`}>
                        {row.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'Marketing':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-800 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">
                  <th className="pb-5 pr-6">Campaña</th>
                  <th className="pb-5 pr-6">Alcance</th>
                  <th className="pb-5 pr-6">Conversiones</th>
                  <th className="pb-5">Tasa de Conversión</th>
                </tr>
              </thead>
              <tbody>
                {mockMarketing.map((row, i) => (
                  <tr key={i} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                    <td className="py-5 pr-6 font-bold text-white">{row.campana}</td>
                    <td className="py-5 pr-6 text-stone-300">{row.alcance.toLocaleString()}</td>
                    <td className="py-5 pr-6 text-purple-400 font-bold">{row.conversiones.toLocaleString()}</td>
                    <td className="py-5 text-amber-400 font-bold">{row.tasa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'Fidelización':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-800 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">
                  <th className="pb-5 pr-6">Recompensa</th>
                  <th className="pb-5 pr-6">Puntos Necesarios</th>
                  <th className="pb-5 pr-6">Canjes Realizados</th>
                  <th className="pb-5">Disponibles</th>
                </tr>
              </thead>
              <tbody>
                {mockFidelizacion.map((row, i) => (
                  <tr key={i} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                    <td className="py-5 pr-6 font-bold text-white">{row.recompensa}</td>
                    <td className="py-5 pr-6 text-stone-300">{row.puntos}</td>
                    <td className="py-5 pr-6 text-orange-400 font-bold">{row.canjes}</td>
                    <td className="py-5">
                      <span className={`font-bold ${row.disponibles < 15 ? 'text-red-400' : row.disponibles < 30 ? 'text-amber-400' : 'text-green-400'}`}>
                        {row.disponibles}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'Finanzas':
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-800 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">
                  <th className="pb-5 pr-6">Concepto</th>
                  <th className="pb-5 pr-6">Ingresos</th>
                  <th className="pb-5 pr-6">Egresos</th>
                  <th className="pb-5">Balance</th>
                </tr>
              </thead>
              <tbody>
                {mockFinanzas.map((row, i) => (
                  <tr key={i} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                    <td className="py-5 pr-6 font-bold text-white">{row.concepto}</td>
                    <td className="py-5 pr-6 text-green-400 font-bold">{row.ingresos > 0 ? `$${row.ingresos.toLocaleString()}` : '-'}</td>
                    <td className="py-5 pr-6 text-red-400 font-bold">{row.egresos > 0 ? `$${row.egresos.toLocaleString()}` : '-'}</td>
                    <td className={`py-5 font-bold ${row.ingresos - row.egresos >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${(row.ingresos - row.egresos).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-stone-700 text-sm font-black">
                  <td className="py-5 pr-6 text-stone-400 uppercase tracking-wider">Totales</td>
                  <td className="py-5 pr-6 text-green-400">${totalIncomeFinanzas.toLocaleString()}</td>
                  <td className="py-5 pr-6 text-red-400">${totalExpenseFinanzas.toLocaleString()}</td>
                  <td className={`py-5 ${totalIncomeFinanzas - totalExpenseFinanzas >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${(totalIncomeFinanzas - totalExpenseFinanzas).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      default:
        return (
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
                {mockVentas.map((row, i) => (
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
        );
    }
  };

  const getSummaryStats = () => {
    switch (reportType) {
      case 'Inventario':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Total Productos</p>
              <p className="text-3xl font-black text-white">{mockInventario.length}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Stock Crítico</p>
              <p className="text-3xl font-black text-red-400">{mockInventario.filter(i => i.estado === 'Crítico').length}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Por Agotarse</p>
              <p className="text-3xl font-black text-amber-400">{mockInventario.filter(i => i.estado === 'Por Agotarse').length}</p>
            </div>
          </div>
        );
      case 'Marketing':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Alcance Total</p>
              <p className="text-3xl font-black text-white">{mockMarketing.reduce((a, b) => a + b.alcance, 0).toLocaleString()}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Conversiones Totales</p>
              <p className="text-3xl font-black text-purple-400">{mockMarketing.reduce((a, b) => a + b.conversiones, 0).toLocaleString()}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Tasa Promedio</p>
              <p className="text-3xl font-black text-amber-400">
                {(mockMarketing.reduce((a, b) => a + parseFloat(b.tasa), 0) / mockMarketing.length).toFixed(2)}%
              </p>
            </div>
          </div>
        );
      case 'Fidelización':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Recompensas</p>
              <p className="text-3xl font-black text-white">{mockFidelizacion.length}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Total Canjes</p>
              <p className="text-3xl font-black text-orange-400">{mockFidelizacion.reduce((a, b) => a + b.canjes, 0)}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Puntos Más Altos</p>
              <p className="text-3xl font-black text-amber-400">{Math.max(...mockFidelizacion.map(r => r.puntos))}</p>
            </div>
          </div>
        );
      case 'Finanzas':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Ingresos Totales</p>
              <p className="text-3xl font-black text-green-400">${totalIncomeFinanzas.toLocaleString()}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Egresos Totales</p>
              <p className="text-3xl font-black text-red-400">${totalExpenseFinanzas.toLocaleString()}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Utilidad Neta</p>
              <p className={`text-3xl font-black ${totalIncomeFinanzas - totalExpenseFinanzas >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                ${(totalIncomeFinanzas - totalExpenseFinanzas).toLocaleString()}
              </p>
            </div>
          </div>
        );
      default:
        return (
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
        );
    }
  };

  return (
    <div className="p-10 space-y-12 pb-40 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-8 right-8 z-50 bg-stone-900 border border-stone-700 rounded-[2rem] px-8 py-5 shadow-2xl animate-fade-in flex items-center gap-4">
          <i className="fas fa-check-circle text-orange-500 text-lg"></i>
          <span className="text-sm font-bold text-white">{toast}</span>
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
                {fechaDesde || 'Últimos 7 días'} — {fechaHasta || 'Hoy'} · Agrupado por {groupBy}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setToast(`Reporte PDF exportado: ${reportType}`)}
                className="bg-stone-800 hover:bg-stone-700 px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl active:scale-95"
              >
                <i className="fas fa-file-pdf text-red-400"></i> EXPORTAR PDF
              </button>
              <button
                onClick={() => setToast(`Reporte Excel exportado: ${reportType}`)}
                className="bg-stone-800 hover:bg-stone-700 px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl active:scale-95"
              >
                <i className="fas fa-file-excel text-green-400"></i> EXPORTAR EXCEL
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          {getSummaryStats()}

          {/* Table */}
          {renderTable()}
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
                  onClick={() => setToast(`Descargando: ${r.name}`)}
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
