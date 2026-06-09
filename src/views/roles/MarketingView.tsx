
import React, { useState } from 'react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Campaign } from '../../types';

const MarketingView: React.FC = () => {
  const [campaigns] = useState<Campaign[]>([
    { id: 'c1', name: 'Guido Lover Sweet', type: 'segment', discount: 15, status: 'active', reach: 1200, conversions: 145, budget: 450000 },
    { id: 'c2', name: 'Flash Sale Suba D.O.P', type: 'flash', discount: 22, status: 'scheduled', reach: 0, conversions: 0, budget: 150000 },
    { id: 'c3', name: 'RappiPromo Weekend Tradicional', type: 'rappipromo', discount: 13, status: 'active', reach: 5000, conversions: 420, budget: 800000 },
  ]);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const campaignStats = campaigns.map(c => ({ name: c.name.substring(0, 15), conv: c.conversions }));

  return (
    <div className="p-10 space-y-12 pb-40">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-brand">Marketing Engine</h1>
          <p className="text-stone-500 mt-4 max-w-xl">Gestión de campañas para el ecosistema Guido Pizza. Segmentación por tipo de masa y zona horaria.</p>
        </div>
        <button onClick={() => showToast('Generando campaña con IA...')} className="bg-orange-600 hover:bg-orange-500 px-10 py-5 rounded-[2.5rem] font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all flex items-center gap-4 w-full md:w-auto justify-center">
          <i className="fas fa-magic"></i> GENERAR CAMPAÑA IA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800 shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-bold text-xl flex items-center gap-4">
              <i className="fas fa-bullseye text-orange-500"></i> Tracción por Segmento
            </h3>
            <div className="flex gap-4">
               <span className="text-[10px] font-black text-stone-600 uppercase">Tiempo Real</span>
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse self-center"></div>
            </div>
          </div>
          <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignStats}>
                   <XAxis dataKey="name" stroke="#444" fontSize={9} axisLine={false} tickLine={false} />
                   <YAxis stroke="#444" fontSize={9} axisLine={false} tickLine={false} />
                   <Tooltip cursor={{fill: '#ffffff05'}} contentStyle={{backgroundColor: '#1c1917', border: '1px solid #333', borderRadius: '16px'}} />
                   <Bar dataKey="conv" radius={[10,10,0,0]} barSize={50}>
                      {campaignStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 1 ? '#ea580c' : '#444'} />
                      ))}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/30 to-stone-900 p-10 rounded-[4rem] border border-purple-500/20 shadow-2xl space-y-8 flex flex-col justify-center">
          <div className="flex items-center gap-4 text-purple-400">
            <i className="fas fa-brain-circuit text-2xl"></i>
            <h4 className="font-black text-xs uppercase tracking-widest">Predicción IA</h4>
          </div>
          <p className="text-stone-300 text-lg leading-relaxed italic opacity-80">
            "Detectamos un aumento en la búsqueda de <span className="text-pink-400 font-bold">postres dulces</span> los jueves en Suba. Sugerimos activar la Promo Flash <span className="text-orange-500 font-bold">Nutella Lovers</span> de 2:00 PM a 5:00 PM."
          </p>
          <button onClick={() => showToast('Ejecutando estrategia Nutella Lovers...')} className="w-full bg-purple-600 hover:bg-purple-500 py-6 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl">
            EJECUTAR ESTRATEGIA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {campaigns.map(c => (
          <div key={c.id} className="bg-stone-900/60 p-8 rounded-[3.5rem] border border-stone-800 hover:border-orange-500/40 transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 ${c.status === 'active' ? 'bg-green-500' : 'bg-stone-500'}`}></div>
            <div className="flex justify-between items-start mb-8">
              <span className={`text-[8px] font-black uppercase px-5 py-2 rounded-full border ${
                c.status === 'active' ? 'bg-green-950 text-green-500 border-green-500/20' : 'bg-stone-800 text-stone-500 border-stone-700'
              }`}>
                {c.status}
              </span>
              <button onClick={() => showToast(`Configurando: ${c.name}`)} className="text-stone-700 hover:text-white transition-colors"><i className="fas fa-cog"></i></button>
            </div>
            <h4 className="font-black text-xl mb-3 tracking-tight">{c.name}</h4>
            <p className="text-stone-500 text-[10px] mb-8 uppercase tracking-[0.3em] font-bold italic">{c.type}</p>
            
            <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-8">
              <div>
                <p className="text-[9px] text-stone-600 uppercase font-black tracking-widest mb-1">Impacto</p>
                <p className="text-2xl font-black text-white">{c.reach.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-stone-600 uppercase font-black tracking-widest mb-1">Conversión</p>
                <p className="text-2xl font-black text-orange-500">{c.conversions}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 border border-stone-700 px-6 py-3 rounded-2xl shadow-2xl z-50 text-sm font-bold">
          {toast}
        </div>
      )}
    </div>
  );
};

export default MarketingView;
