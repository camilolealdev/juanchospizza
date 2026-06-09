
import React, { useState, useEffect } from 'react';
import type { Ingredient, Product } from '../../types';
import { PRODUCTS, INGREDIENTS } from '../../constants';
import { generateProductImage, generateIngredientImage } from '../../services/geminiService';

type AssetItem = (Ingredient & { isProduct: false }) | (Product & { isProduct: true });

const ASSET_CATALOG: AssetItem[] = [
  ...INGREDIENTS.map(item => ({ ...item, isProduct: false as const })),
  ...PRODUCTS.map(item => ({ ...item, isProduct: true as const }))
];

const AdminDashboard: React.FC = () => {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [assetImages, setAssetImages] = useState<Record<string, string>>({});
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string>('Sistemas Listos');

  useEffect(() => {
    const saved = localStorage.getItem('guido_ai_images');
    if (saved) setAssetImages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('guido_ai_images', JSON.stringify(assetImages));
    window.dispatchEvent(new Event('product-images-updated'));
  }, [assetImages]);

  const runMasterSync = async () => {
    if (isBatchRunning) return;
    setIsBatchRunning(true);
    setBatchProgress(0);
    setSyncStatus("Iniciando Renderizado Masivo...");

    for (let i = 0; i < ASSET_CATALOG.length; i++) {
      const asset = ASSET_CATALOG[i];
      setBatchProgress(Math.round(((i + 1) / ASSET_CATALOG.length) * 100));
      
      if (assetImages[asset.id]) {
         continue; 
      }
      
      setGeneratingId(asset.id);
      setSyncStatus(`Renderizando: ${asset.nombre}...`);
      try {
        const result = asset.isProduct 
          ? await generateProductImage(asset.nombre, asset.descripcion)
          : await generateIngredientImage(asset.nombre, asset.descripcion);

        if (result) {
          setAssetImages(prev => ({ ...prev, [asset.id]: result }));
        }
      } catch (err) {
        console.error(`Error en ${asset.nombre}:`, err);
      }
    }

    setGeneratingId(null);
    setIsBatchRunning(false);
    setSyncStatus("Catálogo 100% Sincronizado");
  };

  const handleSingleGenerate = async (asset: AssetItem) => {
    setGeneratingId(asset.id);
    try {
      const result = asset.isProduct
        ? await generateProductImage(asset.nombre, asset.descripcion)
        : await generateIngredientImage(asset.nombre, asset.descripcion);
      
      if (result) {
        setAssetImages(prev => ({ ...prev, [asset.id]: result }));
      }
    } catch (e) {
      console.error(e);
    }
    setGeneratingId(null);
  };

  return (
    <div className="p-8 md:p-12 space-y-16 pb-40 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl font-brand">Master Control</h1>
          <p className="text-stone-500 max-w-xl text-lg italic opacity-80">Gestión de activos visuales e infraestructura digital Guido Bogotá.</p>
        </div>
        <div className="flex flex-col items-end gap-6 w-full md:w-auto">
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black text-stone-600 uppercase tracking-[0.6em] mb-2">Sync Engine</p>
            <p className="text-xs font-bold text-orange-500 uppercase">{syncStatus}</p>
          </div>
          <button 
            onClick={runMasterSync}
            disabled={isBatchRunning}
            className={`w-full md:w-auto flex items-center justify-center gap-6 px-12 py-6 rounded-[3rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-95 ${isBatchRunning ? 'bg-stone-900 text-stone-600 border border-white/5' : 'bg-orange-600 text-white hover:bg-orange-500 shadow-orange-900/40'}`}
          >
            {isBatchRunning ? (
              <><i className="fas fa-sync fa-spin"></i> {batchProgress}% Sincronizando</>
            ) : (
              <><i className="fas fa-wand-magic-sparkles"></i> Sincronización Global de Activos</>
            )}
          </button>
        </div>
      </div>

      {isBatchRunning && (
        <div className="bg-stone-900/40 border border-orange-500/20 rounded-[4rem] p-12 shadow-inner">
          <div className="flex justify-between items-center mb-6">
            <span className="text-[11px] font-black text-orange-500 uppercase tracking-[0.5em]">IA Rendering Activo</span>
            <span className="text-sm font-black text-white">{batchProgress}% Sincronizado</span>
          </div>
          <div className="h-2.5 bg-stone-950 rounded-full overflow-hidden border border-white/5 p-0.5">
            <div className="h-full bg-gradient-to-r from-orange-800 to-orange-500 transition-all duration-700 ease-out rounded-full" style={{ width: `${batchProgress}%` }}></div>
          </div>
        </div>
      )}

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {[
          { label: 'Ventas Live', value: '$4.2M', icon: 'vault', color: 'text-green-500', trend: '+12%' },
          { label: 'Pedidos Hoy', value: '42', icon: 'pizza-slice', color: 'text-orange-500', trend: '+5' },
          { label: 'Eficiencia IA', value: '98%', icon: 'brain-circuit', color: 'text-purple-500', trend: 'Optimum' },
          { label: 'Catálogo Visual', value: Object.keys(assetImages).length, icon: 'image', color: 'text-blue-500', trend: 'Sincronizado' },
        ].map((stat, i) => (
          <div key={i} className="bg-stone-900/40 p-10 rounded-[4rem] border border-stone-800/50 shadow-2xl group hover:border-orange-500/40 transition-all">
            <div className="flex justify-between items-start mb-6">
               <span className="text-stone-600 text-[11px] uppercase font-black tracking-[0.4em]">{stat.label}</span>
               <div className={`w-12 h-12 rounded-2xl bg-stone-950 flex items-center justify-center border border-white/5 ${stat.color}`}>
                 <i className={`fas fa-${stat.icon} text-xl`}></i>
               </div>
            </div>
            <div className="flex items-end gap-3">
              <p className="text-5xl font-black text-white tracking-tighter">{stat.value}</p>
              <span className={`text-[10px] font-black uppercase mb-1.5 ${stat.color.replace('text', 'bg')}/10 px-3 py-1 rounded-full border border-white/5`}>{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Workshop Section */}
      <section className="space-y-12">
        <div className="flex justify-between items-end border-b border-white/5 pb-10">
           <div>
             <h2 className="text-4xl font-brand">Ecosistema Visual</h2>
             <p className="text-stone-600 text-xs mt-2 uppercase tracking-[0.4em] font-bold">Laboratorio de activos minimalistas D.O.P</p>
           </div>
           <span className="text-[10px] font-black text-stone-700 uppercase tracking-widest">{INGREDIENTS.length + PRODUCTS.length} Activos</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-6">
          {ASSET_CATALOG.map(asset => (
            <div key={asset.id} className="bg-stone-900/40 rounded-[2.5rem] border border-stone-800 overflow-hidden group hover:border-orange-600/60 transition-all flex flex-col shadow-xl">
              <div className="relative aspect-square bg-stone-950 overflow-hidden flex items-center justify-center">
                {assetImages[asset.id] ? (
                  <img src={assetImages[asset.id]} className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-125 ${generatingId === asset.id ? 'opacity-20 blur-sm' : 'opacity-100'}`} alt={asset.nombre} />
                ) : (
                  <div className="text-stone-800 flex flex-col items-center gap-3 opacity-20">
                    <i className={`fas ${asset.isProduct ? 'fa-box' : 'fa-pizza-slice'} text-3xl`}></i>
                    <span className="text-[8px] font-black uppercase tracking-tighter">No Render</span>
                  </div>
                )}
                
                {generatingId === asset.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="w-10 h-10 border-2 border-orange-600/30 border-t-orange-600 rounded-full animate-spin"></div>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button 
                    onClick={() => handleSingleGenerate(asset)}
                    disabled={generatingId === asset.id}
                    className="bg-orange-600 w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-transform shadow-2xl"
                   >
                     <i className="fas fa-sync-alt text-white text-sm"></i>
                   </button>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center bg-stone-900/60">
                <h4 className="font-black text-[10px] truncate uppercase text-stone-300 tracking-tight">{asset.nombre}</h4>
                <p className="text-[8px] text-stone-600 mt-1 uppercase font-bold tracking-[0.2em]">{asset.isProduct ? 'Producto' : asset.categoria}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
