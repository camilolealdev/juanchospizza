
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const topProductos = [
  { rank: 1, name: 'Pizza Especial', amount: 156 },
  { rank: 2, name: 'Lasaña', amount: 98 },
  { rank: 3, name: 'Hamburguesa', amount: 72 },
  { rank: 4, name: 'Spaghetti', amount: 54 },
  { rank: 5, name: 'Alitas', amount: 41 },
];

const clientesRecientes = [
  { name: 'Carlos Mendoza', total: '$124,500', lastOrder: 'Hoy 19:30' },
  { name: 'Ana García', total: '$89,200', lastOrder: 'Hoy 18:45' },
  { name: 'Luis Fernández', total: '$245,000', lastOrder: 'Hoy 17:20' },
  { name: 'María Torres', total: '$67,800', lastOrder: 'Ayer 21:10' },
  { name: 'Pedro Sánchez', total: '$156,300', lastOrder: 'Ayer 20:05' },
];

const generateWeeklyData = () => [
  { name: 'Lun', ventas: Math.floor(Math.random() * 800000) + 1800000, pedidos: Math.floor(Math.random() * 15) + 35 },
  { name: 'Mar', ventas: Math.floor(Math.random() * 800000) + 1900000, pedidos: Math.floor(Math.random() * 15) + 38 },
  { name: 'Mie', ventas: Math.floor(Math.random() * 700000) + 1700000, pedidos: Math.floor(Math.random() * 15) + 32 },
  { name: 'Jue', ventas: Math.floor(Math.random() * 800000) + 2200000, pedidos: Math.floor(Math.random() * 15) + 40 },
  { name: 'Vie', ventas: Math.floor(Math.random() * 1000000) + 2500000, pedidos: Math.floor(Math.random() * 20) + 42 },
  { name: 'Sab', ventas: Math.floor(Math.random() * 1200000) + 2800000, pedidos: Math.floor(Math.random() * 20) + 48 },
  { name: 'Dom', ventas: Math.floor(Math.random() * 800000) + 2000000, pedidos: Math.floor(Math.random() * 15) + 36 },
];

const predictions = [
  'Basado en análisis de los últimos 30 días, se proyecta un incremento del 18% en ventas para este fin de semana. Sugerimos aumentar inventario de ingredientes para Pizza Especial en un 30%.',
  'Los patrones de consumo indican un aumento del 22% en pedidos para el próximo jueves. Recomendamos preparar personal adicional para el turno nocturno.',
  'El análisis estacional muestra una tendencia al alza del 15% en ventas de Lasaña. Considere promocionar este plato durante los próximos días.',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-stone-900/95 border border-stone-700/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
        <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">{label}</p>
        <p className="text-white font-black text-xl">${payload[0].value.toLocaleString('es-CO')}</p>
        {payload[1] && (
          <p className="text-orange-400 font-bold text-sm mt-1">{payload[1].value} pedidos</p>
        )}
      </div>
    );
  }
  return null;
};

const GastroProDashboard: React.FC = () => {
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [pedidosHoy, setPedidosHoy] = useState(48);
  const [predictionUpdating, setPredictionUpdating] = useState(false);
  const [predictionMessage, setPredictionMessage] = useState(
    'Basado en análisis de los últimos 30 días, se proyecta un incremento del 18% en ventas para este fin de semana. Sugerimos aumentar inventario de ingredientes para Pizza Especial en un 30%.'
  );

  useEffect(() => {
    const savedVentas = localStorage.getItem('gastropro_ventas');
    const savedPedidos = localStorage.getItem('gastropro_pedidos');

    if (savedVentas) {
      try {
        const parsed = JSON.parse(savedVentas);
        if (Array.isArray(parsed) && parsed.length === 7) {
          setWeeklyData(parsed);
        } else {
          const data = generateWeeklyData();
          setWeeklyData(data);
          localStorage.setItem('gastropro_ventas', JSON.stringify(data));
        }
      } catch {
        const data = generateWeeklyData();
        setWeeklyData(data);
        localStorage.setItem('gastropro_ventas', JSON.stringify(data));
      }
    } else {
      const data = generateWeeklyData();
      setWeeklyData(data);
      localStorage.setItem('gastropro_ventas', JSON.stringify(data));
    }

    if (savedPedidos) {
      try {
        setPedidosHoy(JSON.parse(savedPedidos));
      } catch {
        setPedidosHoy(48);
        localStorage.setItem('gastropro_pedidos', JSON.stringify(48));
      }
    } else {
      localStorage.setItem('gastropro_pedidos', JSON.stringify(48));
    }
  }, []);

  const handleRefresh = () => {
    const data = generateWeeklyData();
    setWeeklyData(data);
    const newPedidos = Math.floor(Math.random() * 20) + 36;
    setPedidosHoy(newPedidos);
    localStorage.setItem('gastropro_ventas', JSON.stringify(data));
    localStorage.setItem('gastropro_pedidos', JSON.stringify(newPedidos));
  };

  const handleUpdatePrediction = () => {
    setPredictionUpdating(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * predictions.length);
      setPredictionMessage(predictions[randomIndex]);
      setPredictionUpdating(false);
    }, 2000);
  };

  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const ventasHoy = weeklyData.length === 7 ? weeklyData[todayIndex].ventas : 0;
  const ticketPromedio = pedidosHoy > 0 ? Math.round(ventasHoy / pedidosHoy) : 0;
  const utilidadNeta = Math.round(ventasHoy * 0.28);
  const totalVentas = weeklyData.length === 7
    ? weeklyData.reduce((acc, d) => acc + d.ventas, 0)
    : 16900000;

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
          onClick={handleRefresh}
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
            <i className="fas fa-arrow-up text-green-500 text-xs"></i>
            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">+18% vs ayer</span>
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
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">+12%</span>
          </div>
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
          <p className="text-4xl font-black text-white mb-2">${utilidadNeta.toLocaleString('es-CO')}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">28% Margen</span>
          </div>
        </div>
      </div>

      <div className="bg-stone-900/40 p-8 md:p-10 rounded-[2.5rem] border border-stone-800/50">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">Ventas Semanales</h3>
            <p className="text-2xl font-black text-white mt-1">${totalVentas.toLocaleString('es-CO')}</p>
          </div>
          <div className="flex items-center gap-2 bg-stone-950 rounded-2xl px-4 py-2 border border-white/5">
            <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Semana Actual</span>
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
          <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-[0.3em] mb-6">Productos Más Vendidos</h3>
          <div className="space-y-5">
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
                      style={{ width: `${(p.amount / 156) * 100}%` }}
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
            {clientesRecientes.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-600/20 flex items-center justify-center">
                    <i className="fas fa-user text-orange-500 text-xs"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">{c.lastOrder}</p>
                  </div>
                </div>
                <span className="text-sm font-black text-orange-500">{c.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-purple-900/60 via-purple-800/40 to-stone-900/60 border border-purple-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                <i className="fas fa-brain text-purple-400 text-sm"></i>
              </div>
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Predicción IA</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed mb-6 flex-1">
              {predictionMessage}
            </p>
            <button
              onClick={handleUpdatePrediction}
              disabled={predictionUpdating}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-[2rem] bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:text-purple-400 text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98]"
            >
              <i className={`fas fa-rotate ${predictionUpdating ? 'fa-spin' : ''}`}></i>
              {predictionUpdating ? 'Actualizando...' : 'Actualizar Predicción'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GastroProDashboard;
