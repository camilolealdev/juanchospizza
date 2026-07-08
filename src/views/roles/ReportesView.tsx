import React, { useState, useEffect } from 'react';
import { api, FinanceSummary, InventoryItem } from '../../services/api';
import { Campaign, LoyaltyReward, Order, OrderStatus } from '../../types';

const reportTypes = ['Ventas', 'Inventario', 'Marketing', 'Fidelización', 'Finanzas'];
const groupOptions = ['Diario', 'Semanal', 'Mensual'];

type ApiOrder = Omit<Order, 'items'> & { items: string | Order['items'] };
const normalizeOrder = (order: ApiOrder): Order => ({
  ...order,
  items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items
});

const ReportesView: React.FC = () => {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [reportType, setReportType] = useState('Ventas');
  const [groupBy, setGroupBy] = useState('Diario');
  const [showGenerated, setShowGenerated] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [ord, inv, camp, rew, fin] = await Promise.all([
          api.getOrders(),
          api.getInventory(),
          api.getCampaigns(),
          api.getLoyaltyRewards(),
          api.getFinanceSummary(),
        ]);
        setOrders(ord.map(normalizeOrder));
        setInventory(inv);
        setCampaigns(camp);
        setRewards(rew);
        setFinance(fin);
      } catch (e) {
        setToast(`Error cargando reportes: ${e instanceof Error ? e.message : 'error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const validOrders = orders.filter(o => o.status !== OrderStatus.CANCELLED);

  const ventasPorDia = Object.entries(
    validOrders.reduce<Record<string, { ventas: number; pedidos: number }>>((acc, o) => {
      const key = new Date(o.createdAt).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'short' });
      if (!acc[key]) acc[key] = { ventas: 0, pedidos: 0 };
      acc[key].ventas += o.total;
      acc[key].pedidos += 1;
      return acc;
    }, {})
  ).map(([day, v]) => ({ day, ventas: v.ventas, pedidos: v.pedidos, ticketPromedio: Math.round(v.ventas / v.pedidos) }));

  const totalSales = validOrders.reduce((a, o) => a + o.total, 0);
  const totalOrders = validOrders.length;
  const avgTicket = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;

  const productCounts = validOrders.flatMap(o => o.items).reduce<Record<string, number>>((acc, item) => {
    acc[item.name] = (acc[item.name] || 0) + item.quantity;
    return acc;
  }, {});
  const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

  const inventarioCritico = inventory.filter(i => i.stockActual < i.stockMinimo).length;
  const campanasActivas = campaigns.filter(c => c.status === 'active').length;

  const todayKey = new Date().toDateString();
  const ventasHoy = validOrders.filter(o => new Date(o.createdAt).toDateString() === todayKey).reduce((a, o) => a + o.total, 0);

  const quickReports = [
    { title: 'Ventas del Día', value: `$${ventasHoy.toLocaleString()}`, icon: 'fa-chart-line', color: 'text-green-500', bg: 'from-green-600/10' },
    { title: 'Producto Más Vendido', value: topProduct ? `${topProduct[0]}` : 'Sin datos', icon: 'fa-pizza-slice', color: 'text-orange-500', bg: 'from-orange-600/10' },
    { title: 'Clientes Totales', value: `${finance?.totalClientes ?? 0}`, icon: 'fa-users', color: 'text-blue-500', bg: 'from-blue-600/10' },
    { title: 'Inventario Crítico', value: `${inventarioCritico} ítems`, icon: 'fa-exclamation-triangle', color: 'text-red-500', bg: 'from-red-600/10' },
    { title: 'Campañas Activas', value: `${campanasActivas}`, icon: 'fa-bullhorn', color: 'text-purple-500', bg: 'from-purple-600/10' },
    { title: 'Utilidad del Mes', value: `$${(finance?.utilidad ?? 0).toLocaleString()}`, icon: 'fa-coins', color: 'text-amber-500', bg: 'from-amber-600/10' },
  ];

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
                {inventory.map((row) => {
                  const estado = row.stockActual < row.stockMinimo ? 'Crítico' : row.stockActual < row.stockMinimo * 1.5 ? 'Por Agotarse' : 'Disponible';
                  return (
                    <tr key={row.id} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                      <td className="py-5 pr-6 font-bold text-white">{row.nombre} ({row.unidad})</td>
                      <td className="py-5 pr-6 text-stone-300">{row.stockActual}</td>
                      <td className="py-5 pr-6 text-stone-500">{row.stockMinimo}</td>
                      <td className="py-5">
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border ${
                          estado === 'Crítico' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                          estado === 'Por Agotarse' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                          'text-green-400 border-green-500/30 bg-green-500/10'
                        }`}>
                          {estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
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
                {campaigns.map((row) => (
                  <tr key={row.id} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                    <td className="py-5 pr-6 font-bold text-white">{row.name}</td>
                    <td className="py-5 pr-6 text-stone-300">{row.reach.toLocaleString()}</td>
                    <td className="py-5 pr-6 text-purple-400 font-bold">{row.conversions.toLocaleString()}</td>
                    <td className="py-5 text-amber-400 font-bold">{row.reach > 0 ? ((row.conversions / row.reach) * 100).toFixed(2) : '0.00'}%</td>
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
                  <th className="pb-5 pr-6">Tipo</th>
                  <th className="pb-5">Vigente</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((row) => (
                  <tr key={row.id} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                    <td className="py-5 pr-6 font-bold text-white">{row.nombre}</td>
                    <td className="py-5 pr-6 text-stone-300">{row.puntosCosto}</td>
                    <td className="py-5 pr-6 text-orange-400 font-bold capitalize">{row.tipo}</td>
                    <td className="py-5">
                      <span className={`font-bold ${row.vigente ? 'text-green-400' : 'text-stone-600'}`}>{row.vigente ? 'Sí' : 'No'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'Finanzas':
        if (!finance) return null;
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
                <tr className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                  <td className="py-5 pr-6 font-bold text-white">Ventas Totales</td>
                  <td className="py-5 pr-6 text-green-400 font-bold">${finance.ingresos.toLocaleString()}</td>
                  <td className="py-5 pr-6 text-red-400 font-bold">-</td>
                  <td className="py-5 font-bold text-green-400">${finance.ingresos.toLocaleString()}</td>
                </tr>
                {finance.gastosPorCategoria.map((row, i) => (
                  <tr key={i} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                    <td className="py-5 pr-6 font-bold text-white">{row.categoria}</td>
                    <td className="py-5 pr-6 text-green-400 font-bold">-</td>
                    <td className="py-5 pr-6 text-red-400 font-bold">${row.total.toLocaleString()}</td>
                    <td className="py-5 font-bold text-red-400">-${row.total.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-stone-700 text-sm font-black">
                  <td className="py-5 pr-6 text-stone-400 uppercase tracking-wider">Totales</td>
                  <td className="py-5 pr-6 text-green-400">${finance.ingresos.toLocaleString()}</td>
                  <td className="py-5 pr-6 text-red-400">${finance.egresos.toLocaleString()}</td>
                  <td className={`py-5 ${finance.utilidad >= 0 ? 'text-green-400' : 'text-red-400'}`}>${finance.utilidad.toLocaleString()}</td>
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
                {ventasPorDia.length === 0 && (
                  <tr><td colSpan={4} className="py-10 text-center text-stone-600 font-bold text-xs uppercase tracking-widest">Sin ventas registradas todavía</td></tr>
                )}
                {ventasPorDia.map((row, i) => (
                  <tr key={i} className="border-b border-stone-800/40 text-sm group hover:bg-stone-800/20 transition-colors">
                    <td className="py-5 pr-6 font-bold text-white capitalize">{row.day}</td>
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
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Total Insumos</p>
              <p className="text-3xl font-black text-white">{inventory.length}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Stock Crítico</p>
              <p className="text-3xl font-black text-red-400">{inventarioCritico}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Valor Total</p>
              <p className="text-3xl font-black text-amber-400">${inventory.reduce((a, i) => a + i.stockActual * i.costoUnitario, 0).toLocaleString()}</p>
            </div>
          </div>
        );
      case 'Marketing':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Alcance Total</p>
              <p className="text-3xl font-black text-white">{campaigns.reduce((a, b) => a + b.reach, 0).toLocaleString()}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Conversiones Totales</p>
              <p className="text-3xl font-black text-purple-400">{campaigns.reduce((a, b) => a + b.conversions, 0).toLocaleString()}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Campañas Activas</p>
              <p className="text-3xl font-black text-amber-400">{campanasActivas}</p>
            </div>
          </div>
        );
      case 'Fidelización':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Recompensas</p>
              <p className="text-3xl font-black text-white">{rewards.length}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Vigentes</p>
              <p className="text-3xl font-black text-orange-400">{rewards.filter(r => r.vigente).length}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Puntos Más Altos</p>
              <p className="text-3xl font-black text-amber-400">{rewards.length > 0 ? Math.max(...rewards.map(r => r.puntosCosto)) : 0}</p>
            </div>
          </div>
        );
      case 'Finanzas':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Ingresos Totales</p>
              <p className="text-3xl font-black text-green-400">${(finance?.ingresos ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Egresos Totales</p>
              <p className="text-3xl font-black text-red-400">${(finance?.egresos ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-stone-950/60 rounded-[2.5rem] p-6 border border-stone-800/50 text-center">
              <p className="text-[9px] text-stone-600 font-black uppercase tracking-[0.3em] mb-2">Utilidad Neta</p>
              <p className={`text-3xl font-black ${(finance?.utilidad ?? 0) >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                ${(finance?.utilidad ?? 0).toLocaleString()}
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

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[50vh] text-stone-500">
        <i className="fas fa-spinner fa-spin text-3xl mr-4"></i>
        <span className="font-bold uppercase tracking-widest text-sm">Cargando reportes...</span>
      </div>
    );
  }

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
          <p className="text-stone-500 mt-4 max-w-xl">Analiza datos reales de tu negocio</p>
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
            <p className="text-3xl font-black text-white tracking-tight">{r.value}</p>
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
                {fechaDesde || 'Histórico'} — {fechaHasta || 'Hoy'} · Agrupado por {groupBy}
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setToast('La exportación a PDF todavía no está implementada')}
                className="bg-stone-800 hover:bg-stone-700 px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl active:scale-95"
              >
                <i className="fas fa-file-pdf text-red-400"></i> EXPORTAR PDF
              </button>
              <button
                onClick={() => setToast('La exportación a Excel todavía no está implementada')}
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
    </div>
  );
};

export default ReportesView;
