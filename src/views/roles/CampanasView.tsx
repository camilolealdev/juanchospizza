import React, { useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Campaign {
  id: number;
  name: string;
  channels: string[];
  status: 'Active' | 'Scheduled' | 'Draft';
  reach: number;
  conversions: number;
  discount?: string;
  budget?: string;
}

const channelStyles: Record<string, string> = {
  WhatsApp: 'bg-green-600/20 text-green-400 border-green-500/20',
  Email: 'bg-blue-600/20 text-blue-400 border-blue-500/20',
  SMS: 'bg-purple-600/20 text-purple-400 border-purple-500/20',
};

const channelIcons: Record<string, string> = {
  WhatsApp: 'fa-whatsapp',
  Email: 'fa-envelope',
  SMS: 'fa-message',
};

const statusStyles: Record<string, string> = {
  Active: 'bg-green-950 text-green-500 border-green-500/20',
  Scheduled: 'bg-amber-950 text-amber-500 border-amber-500/20',
  Draft: 'bg-stone-800 text-stone-500 border-stone-700',
};

const segments = [
  { name: 'Todos los Clientes', count: 346, icon: 'fa-users', color: 'text-stone-400' },
  { name: 'Clientes VIP', count: 28, icon: 'fa-crown', color: 'text-amber-400' },
  { name: 'Inactivos >30 días', count: 53, icon: 'fa-user-clock', color: 'text-red-400' },
  { name: 'Alta Frecuencia', count: 112, icon: 'fa-bolt', color: 'text-sky-400' },
  { name: 'Cumpleaños Este Mes', count: 14, icon: 'fa-cake-candles', color: 'text-pink-400' },
];

const triggerOptions = ['Cliente Inactivo 30 días', 'Cumpleaños', 'Compra > $50k'];
const segmentOptions = ['Todos los Clientes', 'Clientes VIP', 'Inactivos >30 días', 'Alta Frecuencia', 'Cumpleaños Este Mes'];
const actionOptions = ['Enviar WhatsApp', 'Enviar Email', 'Enviar SMS', 'Asignar Cupón'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-stone-900 border border-stone-700 rounded-2xl px-5 py-4 shadow-2xl">
      <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-orange-500 text-lg font-black">{payload[0].value} conv.</p>
    </div>
  );
};

const CampanasView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    { id: 1, name: 'Recuperación Clientes Inactivos', channels: ['WhatsApp'], status: 'Active', reach: 1200, conversions: 89 },
    { id: 2, name: 'Cumpleaños Feliz', channels: ['WhatsApp', 'Email'], status: 'Active', reach: 450, conversions: 120 },
    { id: 3, name: 'Flash Viernes', channels: ['SMS', 'WhatsApp'], status: 'Scheduled', reach: 0, conversions: 0 },
    { id: 4, name: 'Promo Lunes', channels: ['Email'], status: 'Draft', reach: 0, conversions: 0 },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('WhatsApp');
  const [formDiscount, setFormDiscount] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState(triggerOptions[0]);
  const [selectedSegment, setSelectedSegment] = useState(segmentOptions[0]);
  const [selectedAction, setSelectedAction] = useState(actionOptions[0]);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [flowActivated, setFlowActivated] = useState(false);

  const showToast = useCallback((message: string, type: string = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const activeCampaigns = campaigns.filter(c => c.status === 'Active');
  const totalReach = activeCampaigns.reduce((s, c) => s + c.reach, 0);
  const totalConversions = activeCampaigns.reduce((s, c) => s + c.conversions, 0);
  const conversionRate = totalReach > 0 ? ((totalConversions / totalReach) * 100).toFixed(1) : '0.0';
  const roi = activeCampaigns.length > 0 ? (120 + activeCampaigns.length * 55) : 0;

  const chartData = [
    { name: 'Ene', conversion: 145 },
    { name: 'Feb', conversion: 201 },
    { name: 'Mar', conversion: 178 },
    { name: 'Abr', conversion: 256 },
    { name: 'May', conversion: 312 },
    { name: 'Jun', conversion: 289 },
  ];

  const handleNewCampaign = () => {
    if (!formName.trim()) return;
    const newCamp: Campaign = {
      id: Date.now(),
      name: formName,
      channels: [formType],
      status: 'Draft',
      reach: 0,
      conversions: 0,
      discount: formDiscount || undefined,
      budget: formBudget || undefined,
    };
    setCampaigns(prev => [...prev, newCamp]);
    setFormName('');
    setFormType('WhatsApp');
    setFormDiscount('');
    setFormBudget('');
    setShowModal(false);
    showToast(`Campaña "${formName}" creada como borrador`, 'success');
  };

  const handleDuplicate = (camp: Campaign) => {
    const dup: Campaign = { ...camp, id: Date.now(), name: `${camp.name} (copia)` };
    setCampaigns(prev => [...prev, dup]);
    showToast(`Campaña duplicada: "${dup.name}"`, 'success');
  };

  const handleDelete = (id: number) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    showToast('Campaña eliminada', 'error');
  };

  const handleUseSegment = (segName: string) => {
    showToast(`Segmento "${segName}" aplicado al filtro`, 'info');
  };

  const handleActivateFlow = () => {
    setFlowActivated(true);
    showToast('¡Flujo activado exitosamente!', 'success');
    setTimeout(() => setFlowActivated(false), 2000);
  };

  const kpiData = [
    { label: 'Campañas Activas', value: String(activeCampaigns.length), icon: 'fa-bullhorn', color: 'text-orange-500', trend: `${campaigns.length} total` },
    { label: 'Tasa de Conversión', value: `${conversionRate}%`, icon: 'fa-percent', color: 'text-green-500', trend: `de ${totalReach} alcanzados` },
    { label: 'ROI General', value: `${roi}%`, icon: 'fa-chart-line', color: 'text-blue-500', trend: 'retorno positivo' },
  ];

  return (
    <div className="p-10 space-y-16 pb-40 animate-fade-in">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-8 py-5 rounded-[2rem] shadow-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
          toast.type === 'success' ? 'bg-green-950 text-green-400 border-green-500/20' :
          toast.type === 'error' ? 'bg-red-950 text-red-400 border-red-500/20' :
          'bg-stone-900 text-stone-300 border-stone-700'
        }`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : toast.type === 'error' ? 'fa-times-circle' : 'fa-info-circle'} mr-3`}></i>
          {toast.message}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-stone-900 p-12 rounded-[4rem] border border-stone-700 shadow-2xl max-w-lg w-full mx-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black">Nueva Campaña</h3>
              <button className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center hover:bg-stone-700 transition-colors" onClick={() => setShowModal(false)}>
                <i className="fas fa-times text-stone-400"></i>
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-3 block">Nombre</label>
                <input className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors" placeholder="Nombre de la campaña" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-3 block">Tipo</label>
                <div className="flex gap-3">
                  {['WhatsApp', 'Email', 'SMS'].map(t => (
                    <button key={t} className={`flex-1 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                      formType === t
                        ? 'bg-orange-600 border-orange-500 text-white'
                        : 'bg-stone-950 border-stone-700 text-stone-500 hover:border-stone-600'
                    }`} onClick={() => setFormType(t)}>
                      <i className={`fas ${channelIcons[t]} mr-2`}></i> {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-3 block">Descuento (%)</label>
                  <input className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors" placeholder="15" value={formDiscount} onChange={e => setFormDiscount(e.target.value)} />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-stone-500 mb-3 block">Presupuesto ($)</label>
                  <input className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-orange-500 transition-colors" placeholder="50000" value={formBudget} onChange={e => setFormBudget(e.target.value)} />
                </div>
              </div>
              <button className="w-full bg-orange-600 hover:bg-orange-500 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-2xl" onClick={handleNewCampaign}>
                <i className="fas fa-plus mr-3"></i> CREAR CAMPAÑA
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-brand">Campañas Automatizadas</h1>
          <p className="text-stone-500 mt-4 max-w-xl">WhatsApp, Email, SMS y flujos visuales</p>
        </div>
        <button className="bg-orange-600 hover:bg-orange-500 px-10 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4 w-full md:w-auto justify-center" onClick={() => setShowModal(true)}>
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
          {campaigns.map(c => (
            <div key={c.id} className="bg-stone-900/60 p-8 rounded-[3.5rem] border border-stone-800 hover:border-orange-500/40 transition-all group relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 ${c.status === 'Active' ? 'bg-green-500' : c.status === 'Scheduled' ? 'bg-amber-500' : 'bg-stone-500'}`}></div>
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-wrap gap-2">
                  {c.channels.map((ch, j) => (
                    <span key={j} className={`text-[8px] font-black uppercase px-4 py-1.5 rounded-full border ${channelStyles[ch] || 'bg-stone-800 text-stone-500'}`}>
                      <i className={`fas ${channelIcons[ch] || 'fa-message'} mr-1.5`}></i>
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
              <div className="flex gap-3 mt-6 pt-6 border-t border-white/5">
                <button className="flex-1 bg-stone-950 hover:bg-stone-800 py-3 rounded-2xl text-[8px] font-black uppercase tracking-widest text-stone-400 hover:text-white transition-all border border-stone-700" onClick={() => handleDuplicate(c)}>
                  <i className="fas fa-copy mr-2"></i> DUPLICAR
                </button>
                <button className="flex-1 bg-stone-950 hover:bg-red-950 py-3 rounded-2xl text-[8px] font-black uppercase tracking-widest text-stone-400 hover:text-red-400 transition-all border border-stone-700 hover:border-red-500/30" onClick={() => handleDelete(c.id)}>
                  <i className="fas fa-trash mr-2"></i> ELIMINAR
                </button>
              </div>
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
              <button className="mt-5 text-[8px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-500 transition-colors" onClick={() => handleUseSegment(seg.name)}>
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
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-0">
            <div className="w-full lg:w-auto lg:flex-1 bg-stone-950/80 p-8 rounded-[2.5rem] border border-orange-500/20 max-w-xs">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white">
                  <i className="fas fa-bolt text-sm"></i>
                </div>
                <span className="font-black text-sm uppercase tracking-widest text-orange-500">TRIGGER</span>
              </div>
              <div className="relative">
                <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none text-xs"></i>
                <select className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:border-orange-500 transition-colors" value={selectedTrigger} onChange={e => setSelectedTrigger(e.target.value)}>
                  {triggerOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="flex-shrink-0 px-4 rotate-90 lg:rotate-0">
              <i className="fas fa-arrow-right text-2xl text-stone-700"></i>
            </div>
            <div className="w-full lg:w-auto lg:flex-1 bg-stone-950/80 p-8 rounded-[2.5rem] border border-blue-500/20 max-w-xs">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <i className="fas fa-users text-sm"></i>
                </div>
                <span className="font-black text-sm uppercase tracking-widest text-blue-500">SEGMENTO</span>
              </div>
              <div className="relative">
                <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none text-xs"></i>
                <select className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:border-blue-500 transition-colors" value={selectedSegment} onChange={e => setSelectedSegment(e.target.value)}>
                  {segmentOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="flex-shrink-0 px-4 rotate-90 lg:rotate-0">
              <i className="fas fa-arrow-right text-2xl text-stone-700"></i>
            </div>
            <div className="w-full lg:w-auto lg:flex-1 bg-stone-950/80 p-8 rounded-[2.5rem] border border-green-500/20 max-w-xs">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white">
                  <i className="fas fa-play text-sm"></i>
                </div>
                <span className="font-black text-sm uppercase tracking-widest text-green-500">ACCIÓN</span>
              </div>
              <div className="relative">
                <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-stone-600 pointer-events-none text-xs"></i>
                <select className="w-full bg-stone-950 border border-stone-700 rounded-2xl px-5 py-4 text-xs font-bold appearance-none cursor-pointer focus:outline-none focus:border-green-500 transition-colors" value={selectedAction} onChange={e => setSelectedAction(e.target.value)}>
                  {actionOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-10">
            <button className="bg-orange-600 hover:bg-orange-500 px-12 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4" onClick={handleActivateFlow}>
              <i className={`fas ${flowActivated ? 'fa-check-circle animate-pulse' : 'fa-play'}`}></i>
              {flowActivated ? 'FLUJO ACTIVADO' : 'ACTIVAR FLUJO'}
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
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
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
