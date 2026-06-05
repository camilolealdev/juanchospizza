import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const channelColors: Record<string, string> = {
  WhatsApp: 'bg-green-600/20 text-green-400 border-green-500/20',
  Email: 'bg-blue-600/20 text-blue-400 border-blue-500/20',
  SMS: 'bg-purple-600/20 text-purple-400 border-purple-500/20',
};

const statusStyles: Record<string, string> = {
  Active: 'bg-green-950 text-green-500 border-green-500/20',
  Scheduled: 'bg-amber-950 text-amber-500 border-amber-500/20',
  Draft: 'bg-stone-800 text-stone-500 border-stone-700',
};

const kpiData = [
  { label: 'Campañas Activas', value: '4', icon: 'fa-bullhorn', color: 'text-orange-500', trend: '+2 este mes' },
  { label: 'Tasa de Conversión', value: '12.8%', icon: 'fa-percent', color: 'text-green-500', trend: '+3.2%' },
  { label: 'ROI General', value: '340%', icon: 'fa-chart-line', color: 'text-blue-500', trend: '+28% vs Q1' },
];

const campaignsData = [
  { name: 'Recuperación Clientes Inactivos', channels: ['WhatsApp'], status: 'Active', reach: 1200, conversions: 89 },
  { name: 'Cumpleaños Feliz', channels: ['WhatsApp', 'Email'], status: 'Active', reach: 450, conversions: 120 },
  { name: 'Flash Viernes', channels: ['SMS', 'WhatsApp'], status: 'Scheduled', reach: 0, conversions: 0 },
  { name: 'Promo Lunes', channels: ['Email'], status: 'Draft', reach: 0, conversions: 0 },
];

const segments = [
  { name: 'Todos los Clientes', count: 346, icon: 'fa-users', color: 'text-stone-400' },
  { name: 'Clientes VIP', count: 28, icon: 'fa-crown', color: 'text-amber-400' },
  { name: 'Inactivos >30 días', count: 53, icon: 'fa-user-clock', color: 'text-red-400' },
  { name: 'Alta Frecuencia', count: 112, icon: 'fa-bolt', color: 'text-sky-400' },
  { name: 'Cumpleaños Este Mes', count: 14, icon: 'fa-cake-candles', color: 'text-pink-400' },
];

const chartData = [
  { name: 'Ene', conversion: 145 },
  { name: 'Feb', conversion: 201 },
  { name: 'Mar', conversion: 178 },
  { name: 'Abr', conversion: 256 },
  { name: 'May', conversion: 312 },
  { name: 'Jun', conversion: 289 },
];

const triggerOptions = ['Cliente Inactivo 30 días', 'Cumpleaños', 'Compra > $50k'];
const segmentOptions = ['Todos los Clientes', 'Clientes VIP', 'Inactivos >30 días', 'Alta Frecuencia', 'Cumpleaños Este Mes'];
const actionOptions = ['Enviar WhatsApp', 'Enviar Email', 'Enviar SMS', 'Asignar Cupón'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-stone-900 border border-stone-700 rounded-2xl px-5 py-3">
        <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">{label}</p>
        <p className="text-orange-500 text-lg font-black">{payload[0].value} conversiones</p>
      </div>
    );
  }
  return null;
};

const CampanasView: React.FC = () => {
  const [campaigns, setCampaigns] = useState(campaignsData);
  const [selectedTrigger, setSelectedTrigger] = useState(triggerOptions[0]);
  const [selectedSegment, setSelectedSegment] = useState(segmentOptions[0]);
  const [selectedAction, setSelectedAction] = useState(actionOptions[0]);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const [formNombre, setFormNombre] = useState('');
  const [formCanales, setFormCanales] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<'Active' | 'Scheduled' | 'Draft'>('Draft');
  const [formPresupuesto, setFormPresupuesto] = useState('');

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleCanal = (canal: string) => {
    setFormCanales(prev =>
      prev.includes(canal) ? prev.filter(c => c !== canal) : [...prev, canal]
    );
  };

  const handleNewCampaign = () => {
    setFormNombre('');
    setFormCanales([]);
    setFormStatus('Draft');
    setFormPresupuesto('');
    setShowModal(true);
  };

  const handleSubmitCampaign = () => {
    if (!formNombre.trim()) return;
    const newCampaign = {
      name: formNombre,
      channels: formCanales.length > 0 ? formCanales : ['WhatsApp'],
      status: formStatus,
      reach: 0,
      conversions: 0,
    };
    setCampaigns(prev => [newCampaign, ...prev]);
    setShowModal(false);
    showToast(`Campaña "${formNombre}" creada exitosamente`);
  };

  return (
    <div className="p-10 space-y-16 pb-40 animate-fade-in">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-8 py-4 rounded-2xl shadow-2xl border text-sm font-bold uppercase tracking-widest animate-fade-in ${toast.type === 'success' ? 'bg-green-900/90 border-green-500/30 text-green-400' : 'bg-blue-900/90 border-blue-500/30 text-blue-400'}`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} mr-3`}></i>
          {toast.message}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-stone-900 p-10 rounded-[3rem] border border-stone-700 shadow-2xl max-w-lg w-full mx-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-brand mb-8">Nueva Campaña</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-2">Nombre</label>
                <input className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors" value={formNombre} onChange={e => setFormNombre(e.target.value)} placeholder="Ej: Promo Verano" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-3">Canales</label>
                <div className="flex gap-4">
                  {['WhatsApp', 'Email', 'SMS'].map(c => (
                    <label key={c} className={`flex items-center gap-2 px-5 py-3 rounded-2xl border cursor-pointer transition-colors text-xs font-bold uppercase tracking-widest ${formCanales.includes(c) ? 'border-orange-500/40 bg-orange-600/10 text-orange-400' : 'border-stone-700 text-stone-500 hover:border-stone-500'}`}>
                      <input type="checkbox" className="hidden" checked={formCanales.includes(c)} onChange={() => toggleCanal(c)} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-2">Estado</label>
                <div className="relative">
                  <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none text-xs"></i>
                  <select className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:border-orange-500 transition-colors" value={formStatus} onChange={e => setFormStatus(e.target.value as 'Active' | 'Scheduled' | 'Draft')}>
                    <option value="Active">Activa</option>
                    <option value="Scheduled">Programada</option>
                    <option value="Draft">Borrador</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 block mb-2">Presupuesto</label>
                <input className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors" value={formPresupuesto} onChange={e => setFormPresupuesto(e.target.value)} placeholder="Ej: $500,000" />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-10">
              <button className="px-8 py-4 rounded-2xl border border-stone-700 text-xs font-black uppercase tracking-widest text-stone-500 hover:border-stone-500 transition-colors" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="px-8 py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-xs font-black uppercase tracking-widest transition-colors shadow-xl" onClick={handleSubmitCampaign}>Crear Campaña</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-brand">Campañas Automatizadas</h1>
          <p className="text-stone-500 mt-4 max-w-xl">WhatsApp, Email, SMS y flujos visuales</p>
        </div>
        <button className="bg-orange-600 hover:bg-orange-500 px-10 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4 w-full md:w-auto justify-center" onClick={handleNewCampaign}>
          <i className="fas fa-plus"></i> NUEVA CAMPAÑA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {kpiData.map((kpi, i) => (
          <div key={i} className="bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800/50 shadow-2xl group hover:border-orange-500/40 transition-all">
            <div className="flex justify-between items-start mb-6">
              <span className="text-stone-600 text-[11px] uppercase font-black tracking-[0.4em]">{kpi.label}</span>
              <div className={`w-12 h-12 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 ${kpi.color}`}>
                <i className={`fas ${kpi.icon} text-xl`}></i>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-5xl font-black text-white tracking-tighter">{kpi.value}</p>
              <span className="text-[10px] font-black text-stone-500 uppercase mb-1.5">{kpi.trend}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-10">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-3xl font-brand">Campañas Activas</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Gestión de campañas automatizadas</p>
          </div>
          <span className="text-[10px] font-black text-stone-700 uppercase tracking-widest">{campaigns.length} total</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {campaigns.map((c, i) => (
            <div key={i} className="bg-stone-900/60 p-8 rounded-[3.5rem] border border-stone-800 hover:border-orange-500/40 transition-all group relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 ${c.status === 'Active' ? 'bg-green-500' : c.status === 'Scheduled' ? 'bg-amber-500' : 'bg-stone-500'}`}></div>

              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-wrap gap-2">
                  {c.channels.map((ch, j) => (
                    <span key={j} className={`text-[8px] font-black uppercase px-4 py-1.5 rounded-full border ${channelColors[ch] || 'bg-stone-800 text-stone-500'}`}>
                      <i className={`fas ${ch === 'WhatsApp' ? 'fa-whatsapp' : ch === 'Email' ? 'fa-envelope' : 'fa-message'} mr-1.5`}></i>
                      {ch}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[8px] font-black uppercase px-4 py-1.5 rounded-full border ${statusStyles[c.status]}`}>
                    {c.status === 'Active' ? <><i className="fas fa-circle text-[6px] mr-1.5 text-green-500"></i> Activa</> :
                     c.status === 'Scheduled' ? <><i className="fas fa-clock mr-1.5 text-amber-500"></i> Programada</> :
                     <><i className="fas fa-pen mr-1.5"></i> Borrador</>}
                  </span>
                  <button className="text-stone-700 hover:text-white transition-colors">
                    <i className="fas fa-ellipsis-vertical"></i>
                  </button>
                </div>
              </div>

              <h4 className="font-black text-xl mb-6 tracking-tight">{c.name}</h4>

              {c.status !== 'Draft' ? (
                <>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-[9px] text-stone-600 uppercase font-black tracking-widest mb-1">Alcance</p>
                      <p className="text-2xl font-black text-white">{c.reach.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-stone-600 uppercase font-black tracking-widest mb-1">Conversiones</p>
                      <p className="text-2xl font-black text-orange-500">{c.conversions}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                      <span className="text-stone-600">Progreso</span>
                      <span className={c.reach > 0 ? 'text-orange-500' : 'text-stone-600'}>{c.reach > 0 ? Math.round((c.conversions / c.reach) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-stone-950 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-gradient-to-r from-orange-800 to-orange-500 rounded-full transition-all duration-700"
                        style={{ width: `${c.reach > 0 ? Math.min((c.conversions / c.reach) * 100, 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4 text-stone-600 py-4">
                  <i className="fas fa-pen-to-square text-lg"></i>
                  <span className="text-sm font-bold uppercase tracking-widest text-[10px]">No iniciada — edita para configurar</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-3xl font-brand">Segmentación</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Segmentos de clientes disponibles</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {segments.map((seg, i) => (
            <div key={i} className="bg-stone-900/40 p-8 rounded-[3rem] border border-stone-800 hover:border-orange-500/40 transition-all group text-center">
              <div className={`w-14 h-14 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 mx-auto mb-5 ${seg.color} group-hover:scale-110 transition-transform`}>
                <i className={`fas ${seg.icon} text-xl`}></i>
              </div>
              <p className="text-3xl font-black text-white mb-2">{seg.count}</p>
              <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">{seg.name}</p>
              <button className="mt-5 text-[8px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-500 transition-colors" onClick={() => showToast(`Segmento ${seg.name} seleccionado`, 'info')}>
                <i className="fas fa-arrow-right mr-1.5"></i> USAR SEGMENTO
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-3xl font-brand">Flujo Visual</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Constructor de automatización visual</p>
          </div>
        </div>

        <div className="bg-stone-900/40 p-12 rounded-[4rem] border border-stone-800 shadow-2xl">
          <div className="flex items-center justify-center gap-0">
            <div className="flex-1 bg-stone-950/80 p-8 rounded-[2.5rem] border border-orange-500/20 max-w-xs">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white">
                  <i className="fas fa-bolt text-sm"></i>
                </div>
                <span className="font-black text-sm uppercase tracking-widest text-orange-500">TRIGGER</span>
              </div>
              <div className="relative">
                <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none text-xs"></i>
                <select
                  className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:border-orange-500 transition-colors"
                  value={selectedTrigger}
                  onChange={e => setSelectedTrigger(e.target.value)}
                >
                  {triggerOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-shrink-0 px-4">
              <i className="fas fa-arrow-right text-2xl text-stone-700"></i>
            </div>

            <div className="flex-1 bg-stone-950/80 p-8 rounded-[2.5rem] border border-blue-500/20 max-w-xs">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <i className="fas fa-users text-sm"></i>
                </div>
                <span className="font-black text-sm uppercase tracking-widest text-blue-500">SEGMENTO</span>
              </div>
              <div className="relative">
                <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none text-xs"></i>
                <select
                  className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:border-blue-500 transition-colors"
                  value={selectedSegment}
                  onChange={e => setSelectedSegment(e.target.value)}
                >
                  {segmentOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-shrink-0 px-4">
              <i className="fas fa-arrow-right text-2xl text-stone-700"></i>
            </div>

            <div className="flex-1 bg-stone-950/80 p-8 rounded-[2.5rem] border border-green-500/20 max-w-xs">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white">
                  <i className="fas fa-play text-sm"></i>
                </div>
                <span className="font-black text-sm uppercase tracking-widest text-green-500">ACCIÓN</span>
              </div>
              <div className="relative">
                <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none text-xs"></i>
                <select
                  className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:border-green-500 transition-colors"
                  value={selectedAction}
                  onChange={e => setSelectedAction(e.target.value)}
                >
                  {actionOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-10">
            <button className="bg-orange-600 hover:bg-orange-500 px-12 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4" onClick={() => showToast(`Flujo activado: ${selectedTrigger} → ${selectedSegment} → ${selectedAction}`)}>
              <i className="fas fa-play"></i> ACTIVAR FLUJO
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-10">
        <div className="flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-3xl font-brand">Rendimiento Mensual</h2>
            <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Conversiones por campaña automatizada</p>
          </div>
          <span className="text-[10px] font-black text-stone-700 uppercase tracking-widest">Ene — Jun 2026</span>
        </div>

        <div className="bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800 shadow-2xl">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#444" fontSize={9} axisLine={false} tickLine={false} />
                <YAxis stroke="#444" fontSize={9} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#ffffff05' }} content={<CustomTooltip />} />
                <Bar dataKey="conversion" radius={[10, 10, 0, 0]} barSize={48} fill="#ea580c" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CampanasView;
