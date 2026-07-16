import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, FinanceSummary } from '../../services/api';
import { Client, LocationId, Order, OrderStatus } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';

interface WeeklyPoint {
  name: string;
  ventas: number;
  pedidos: number;
}

type ApiOrder = Omit<Order, 'items'> & { items: string | Order['items'] };
const normalizeOrder = (order: ApiOrder): Order => ({
  ...order,
  items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
});

const DIA_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

const CustomTooltip: React.FC<{ active?: boolean; payload?: { value: number }[]; label?: string }> = ({
  active,
  payload,
  label,
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-stone-900/95 border border-stone-700/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
        <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">{label}</p>
        <p className="text-white font-black text-xl">${payload[0].value.toLocaleString('es-CO')}</p>
        {payload[1] && <p className="text-orange-400 font-bold text-sm mt-1">{payload[1].value} pedidos</p>}
      </div>
    );
  }
  return null;
};

interface GastroProDashboardProps {
  // Sede seleccionada en el dropdown de AdminLayout -- sin ella (o con
  // undefined) se ve el consolidado de ambas sedes, igual que antes.
  locationId?: LocationId;
}

const GastroProDashboard: React.FC<GastroProDashboardProps> = ({ locationId }) => {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ord, cli, fin] = await Promise.all([
        api.getOrders(undefined, { paidOnly: true }),
        api.getClients(),
        api.getFinanceSummary(),
      ]);
      setOrders(ord.map(normalizeOrder));
      setClients(cli);
      setFinance(fin);
    } catch (e) {
      setToast(`Error cargando dashboard: ${e instanceof Error ? e.message : 'error desconocido'}`);
      setTimeout(() => setToast(''), 3000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Recargar datos cuando llegan eventos en tiempo real vía WebSocket
  useWebSocket('order:new', () => {
    loadAll();
  });

  useWebSocket('order:update', () => {
    loadAll();
  });

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[50vh] text-stone-500">
        <i className="fas fa-spinner fa-spin text-3xl mr-4"></i>
        <span className="font-bold uppercase tracking-widest text-sm">Cargando dashboard...</span>
      </div>
    );
  }

  const validOrders = orders.filter(
    (o) => o.status !== OrderStatus.CANCELLED && (!locationId || o.locationId === locationId)
  );

  // Last 7 calendar days, oldest to newest
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const weeklyData: WeeklyPoint[] = last7Days.map((d) => {
    const dayOrders = validOrders.filter((o) => new Date(o.createdAt).toDateString() === d.toDateString());
    return {
      name: DIA_LABELS[d.getDay()],
      ventas: dayOrders.reduce((a, o) => a + o.total, 0),
      pedidos: dayOrders.length,
    };
  });

  const todayOrders = validOrders.filter((o) => new Date(o.createdAt).toDateString() === today.toDateString());
  const ventasHoy = todayOrders.reduce((a, o) => a + o.total, 0);
  const pedidosHoy = todayOrders.length;
  const ticketPromedio = pedidosHoy > 0 ? Math.round(ventasHoy / pedidosHoy) : 0;
  const totalVentas = weeklyData.reduce((acc, d) => acc + d.ventas, 0);

  const productCounts = validOrders
    .flatMap((o) => o.items)
    .reduce<Record<string, number>>((acc, item) => {
      acc[item.name] = (acc[item.name] || 0) + item.quantity;
      return acc;
    }, {});
  const topProductos = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount], i) => ({ rank: i + 1, name, amount }));
  const maxProducto = topProductos[0]?.amount || 1;

  // Clients no tienen locationId propio; se filtran por sede vía los teléfonos
  // presentes en validOrders (que ya respeta locationId), igual que las demás tarjetas.
  const phonesEnSede = locationId ? new Set(validOrders.map((o) => o.customerPhone).filter(Boolean)) : null;
  const clientesRecientes = [...clients]
    .filter((c) => c.ultimaCompra && (!phonesEnSede || phonesEnSede.has(c.telefono)))
    .sort((a, b) => new Date(b.ultimaCompra).getTime() - new Date(a.ultimaCompra).getTime())
    .slice(0, 5);

  const promedioVentaDiaria = weeklyData.length > 0 ? totalVentas / weeklyData.length : 0;
  const variacionHoy =
    promedioVentaDiaria > 0 ? Math.round(((ventasHoy - promedioVentaDiaria) / promedioVentaDiaria) * 100) : 0;

  return (
    <div className="p-8 md:p-12 space-y-12 pb-40">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
          <h1 className="text-5xl md:text-6xl font-brand text-white">Dashboard Ejecutivo</h1>
          <div className="flex items-center gap-3 bg-orange-600/10 border border-orange-600/30 rounded-full px-6 py-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></div>
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Tiempo Real</span>
          </div>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-3 py-3 px-6 rounded-[2rem] bg-stone-800 hover:bg-stone-700 text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98]"
        >
          <i className="fas fa-rotate"></i>
          Refrescar Datos
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-stone-800/50 hover:border-orange-500/30 transition-all group">
          <div className="flex justify-between items-start mb-6">
            <span className="text-stone-500 text-[10px] uppercase font-black tracking-[0.3em]">Ventas Hoy</span>
            <div className="w-11 h-11 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 text-orange-500">
              <i className="fas fa-arrow-trend-up text-lg"></i>
            </div>
          </div>
          <p className="text-4xl font-black text-white mb-2">${ventasHoy.toLocaleString('es-CO')}</p>
          <div className="flex items-center gap-2">
            <i
              className={`fas ${variacionHoy >= 0 ? 'fa-arrow-up text-green-500' : 'fa-arrow-down text-red-500'} text-xs`}
            ></i>
            <span
              className={`text-[10px] font-black uppercase tracking-widest ${variacionHoy >= 0 ? 'text-green-500' : 'text-red-500'}`}
            >
              {variacionHoy >= 0 ? '+' : ''}
              {variacionHoy}% vs promedio semanal
            </span>
          </div>
        </div>

        <div className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-stone-800/50 hover:border-orange-500/30 transition-all group">
          <div className="flex justify-between items-start mb-6">
            <span className="text-stone-500 text-[10px] uppercase font-black tracking-[0.3em]">Pedidos Hoy</span>
            <div className="w-11 h-11 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 text-orange-500">
              <i className="fas fa-pizza-slice text-lg"></i>
            </div>
          </div>
          <p className="text-4xl font-black text-white mb-2">{pedidosHoy}</p>
        </div>

        <div className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-stone-800/50 hover:border-orange-500/30 transition-all group">
          <div className="flex justify-between items-start mb-6">
            <span className="text-stone-500 text-[10px] uppercase font-black tracking-[0.3em]">Ticket Promedio</span>
            <div className="w-11 h-11 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 text-orange-500">
              <i className="fas fa-wallet text-lg"></i>
            </div>
          </div>
          <p className="text-4xl font-black text-white mb-2">${ticketPromedio.toLocaleString('es-CO')}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Por orden</span>
          </div>
        </div>

        <div className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-stone-800/50 hover:border-orange-500/30 transition-all group">
          <div className="flex justify-between items-start mb-6">
            <span className="text-stone-500 text-[10px] uppercase font-black tracking-[0.3em]">Utilidad Neta</span>
            <div className="w-11 h-11 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 text-orange-500">
              <i className="fas fa-coins text-lg"></i>
            </div>
          </div>
          <p className="text-4xl font-black text-white mb-2">${(finance?.utilidad ?? 0).toLocaleString('es-CO')}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Acumulado histórico</span>
          </div>
        </div>
      </div>

      <div className="bg-stone-900/40 p-8 md:p-10 rounded-[2.5rem] border border-stone-800/50">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">Ventas Últimos 7 Días</h3>
            <p className="text-2xl font-black text-white mt-1">${totalVentas.toLocaleString('es-CO')}</p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <defs>
                <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                  <stop offset="100%" stopColor="#9a3412" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 113, 108, 0.15)" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#78716c', fontSize: 11, fontWeight: 800 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#78716c', fontSize: 11, fontWeight: 800 }}
                tickFormatter={(val: number) => `$${(val / 1000000).toFixed(1)}M`}
                dx={-5}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="ventas" fill="url(#ventasGradient)" radius={[8, 8, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-stone-800/50">
          <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] mb-6">
            Productos Más Vendidos
          </h3>
          <div className="space-y-5">
            {topProductos.length === 0 && (
              <p className="text-stone-600 font-bold text-xs uppercase tracking-widest py-6 text-center">
                Sin ventas registradas todavía
              </p>
            )}
            {topProductos.map((p) => (
              <div key={p.rank} className="flex items-center gap-4">
                <span className="text-xs font-black text-stone-600 w-5">{String(p.rank).padStart(2, '0')}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-bold text-white">{p.name}</span>
                    <span className="text-xs font-black text-orange-500">{p.amount}</span>
                  </div>
                  <div className="h-1.5 bg-stone-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-800 to-orange-500 rounded-full transition-all duration-700"
                      style={{ width: `${(p.amount / maxProducto) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-stone-800/50">
          <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] mb-6">Clientes Recientes</h3>
          <div className="space-y-4">
            {clientesRecientes.length === 0 && (
              <p className="text-stone-600 font-bold text-xs uppercase tracking-widest py-6 text-center">
                Sin clientes registrados todavía
              </p>
            )}
            {clientesRecientes.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-600/20 flex items-center justify-center">
                    <i className="fas fa-user text-orange-500 text-xs"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{c.nombre}</p>
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">
                      {new Date(c.ultimaCompra).toLocaleString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-orange-500">${c.totalGastado.toLocaleString('es-CO')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-purple-900/60 via-purple-800/40 to-stone-900/60 border border-purple-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                <i className="fas fa-chart-simple text-purple-400 text-sm"></i>
              </div>
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">
                Análisis de Tendencia
              </span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed mb-6 flex-1">
              {ventasHoy === 0
                ? 'Todavía no hay ventas registradas hoy. Esta sección se calcula sobre pedidos reales, no proyecciones.'
                : variacionHoy >= 0
                  ? `Las ventas de hoy (${ventasHoy.toLocaleString('es-CO')}) están un ${variacionHoy}% por encima del promedio de los últimos 7 días. El producto más vendido es ${topProductos[0]?.name || '—'}.`
                  : `Las ventas de hoy (${ventasHoy.toLocaleString('es-CO')}) están un ${Math.abs(variacionHoy)}% por debajo del promedio de los últimos 7 días.`}
            </p>
            <p className="text-[9px] text-purple-300/60 uppercase tracking-widest font-bold">
              Cálculo directo sobre pedidos reales — no es una predicción de IA
            </p>
          </div>
        </div>
      </div>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl text-sm font-bold animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
};

export default GastroProDashboard;
