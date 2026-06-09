
import React, { useState, useMemo, useEffect } from 'react';
import { INGREDIENTS, SIZE_FACTORS } from '../constants';
import { Ingredient, PizzaSize, CartItem } from '../types';

interface SlotPosition {
  x: number;
  y: number;
  rot: number;
  scale: number;
}

// Algoritmo de Phyllotaxis para distribución orgánica
const generatePhyllotaxisSlots = (count: number, radiusScale: number = 0.82): SlotPosition[] => {
  const slots: SlotPosition[] = [];
  const goldenAngle = 137.508; 
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(i / count) * radiusScale; 
    const theta = i * goldenAngle;
    slots.push({
      x: 50 + (r * 50) * Math.cos(theta * Math.PI / 180),
      y: 50 + (r * 50) * Math.sin(theta * Math.PI / 180),
      rot: (i * 137.5) % 360,
      scale: 0.85 + (i % 4) * 0.05
    });
  }
  return slots;
};

const MASTER_SLOTS = generatePhyllotaxisSlots(180);

const CATEGORY_UI: Record<string, { color: string; icon: string; visualColor?: string }> = {
  base: { color: 'bg-stone-600', icon: 'bread-slice' },
  salsa: { color: 'bg-red-900', icon: 'droplet', visualColor: 'rgba(153, 27, 27, 0.6)' },
  queso: { color: 'bg-yellow-500', icon: 'cheese', visualColor: 'rgba(251, 191, 36, 0.4)' },
  carne: { color: 'bg-red-800', icon: 'drumstick-bite' },
  vegetal: { color: 'bg-green-700', icon: 'leaf' },
  dulce: { color: 'bg-pink-500', icon: 'cookie' },
  extra: { color: 'bg-orange-600', icon: 'plus' },
  especia: { color: 'bg-stone-700', icon: 'pepper-hot' }
};

const VisualPizzaBuilder: React.FC<{ onAddToCart?: (item: CartItem) => void }> = ({ onAddToCart }) => {
  const [size, setSize] = useState<PizzaSize>(PizzaSize.MEDIANA);
  const [activeSide, setActiveSide] = useState<'whole' | 'left' | 'right'>('whole');
  const [activeCategory, setActiveCategory] = useState<string>('base');
  const [assetImages, setAssetImages] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [selections, setSelections] = useState<{ whole: string[], left: string[], right: string[] }>({
    whole: [], left: [], right: []
  });

  useEffect(() => {
    const loadAssets = () => {
      const saved = localStorage.getItem('guido_ai_images');
      if (saved) try { setAssetImages(JSON.parse(saved)); } catch (e) { console.error(e); }
    };
    loadAssets();
    window.addEventListener('product-images-updated', loadAssets);
    return () => window.removeEventListener('product-images-updated', loadAssets);
  }, []);

  const toggleIngredient = (id: string) => {
    setSelections(prev => {
      const current = [...prev[activeSide]];
      const ing = INGREDIENTS.find(i => i.id === id);
      const isSelected = current.includes(id);

      let updated;
      if (ing && (ing.categoria === 'base' || ing.categoria === 'salsa' || ing.categoria === 'queso')) {
        const othersInCat = INGREDIENTS.filter(i => i.categoria === ing.categoria && i.id !== id).map(i => i.id);
        updated = isSelected ? current.filter(x => x !== id) : [...current.filter(x => !othersInCat.includes(x)), id];
      } else {
        updated = isSelected ? current.filter(x => x !== id) : [...current, id];
      }
      return { ...prev, [activeSide]: updated };
    });
  };

  const currentMasa = useMemo(() => {
    const all = [...selections.whole, ...selections.left, ...selections.right];
    return INGREDIENTS.find(i => i.categoria === 'base' && all.includes(i.id));
  }, [selections]);

  const totalPrice = useMemo(() => {
    const factor = SIZE_FACTORS[size];
    let base = 25000 * factor;
    const calc = (ids: string[], mult: number) => {
      ids.forEach(id => {
        const ing = INGREDIENTS.find(i => i.id === id);
        if (ing) base += (ing.precio_extra * factor * mult);
      });
    };
    calc(selections.whole, 1);
    calc(selections.left, 0.5);
    calc(selections.right, 0.5);
    return Math.round(base);
  }, [selections, size]);

  const handleConfirm = async () => {
    if (!currentMasa) return;
    setIsProcessing(true);
    
    // Simulación de Horneado y Sincronización con Ops
    setTimeout(() => {
      const getNames = (ids: string[]) => ids.map(id => INGREDIENTS.find(ing => ing.id === id)?.nombre).filter(Boolean).join(', ');
      
      const details = [
        `Masa: ${currentMasa.nombre}`,
        selections.whole.length > 0 ? `Toda: ${getNames(selections.whole)}` : null,
        selections.left.length > 0 ? `Izq: ${getNames(selections.left)}` : null,
        selections.right.length > 0 ? `Der: ${getNames(selections.right)}` : null
      ].filter(Boolean).join(' | ');

      onAddToCart?.({
        id: `custom-${Date.now()}`,
        productId: 'custom-pizza',
        name: `Pizza Artesanal Personalizada (${size})`,
        price: totalPrice,
        quantity: 1,
        image: assetImages[currentMasa.id] || 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
        details: details
      });

      setIsProcessing(false);
      setShowSuccess(true);
      
      // Reset constructor tras éxito
      setTimeout(() => {
        setShowSuccess(false);
        setSelections({ whole: [], left: [], right: [] });
      }, 4000);
    }, 2800);
  };

  const renderToppingsLayer = (side: 'whole' | 'left' | 'right') => {
    const ids = selections[side];
    return ids.flatMap((id, ingredientIdx) => {
      const ing = INGREDIENTS.find(i => i.id === id);
      if (!ing || ing.categoria === 'base' || ing.categoria === 'salsa' || ing.categoria === 'queso') return [];

      const count = ing.categoria === 'carne' ? 8 : (ing.categoria === 'vegetal' ? 12 : 10);
      const ingredientSeed = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const startIdx = (ingredientSeed + ingredientIdx * 15) % (MASTER_SLOTS.length - count);
      const slots = MASTER_SLOTS.slice(startIdx, startIdx + count);

      return slots.map((slot, i) => {
        if (side === 'left' && slot.x > 50) return null;
        if (side === 'right' && slot.x < 50) return null;
        const imgUrl = assetImages[id];
        return (
          <div 
            key={`${side}-${id}-${i}`}
            className="absolute transition-all duration-700 animate-in zoom-in fade-in"
            style={{ 
              left: `${slot.x}%`, 
              top: `${slot.y}%`, 
              transform: `translate(-50%, -50%) rotate(${slot.rot}deg) scale(${slot.scale})`,
              zIndex: 40 + ingredientIdx
            }}
          >
            <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center ${imgUrl ? 'bg-transparent' : (CATEGORY_UI[ing.categoria]?.color || 'bg-stone-800')}`}>
              {imgUrl ? <img src={imgUrl} className="w-full h-full object-cover" alt={ing.nombre} /> : <i className={`fas fa-${CATEGORY_UI[ing.categoria]?.icon || 'pizza-slice'} text-[8px] md:text-[10px] text-white/80`}></i>}
            </div>
          </div>
        );
      });
    });
  };

  return (
    <div className="bg-stone-900/40 rounded-[2rem] md:rounded-[4rem] p-3 sm:p-6 md:p-10 lg:p-16 border border-white/5 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.8)] animate-fade-in relative w-full overflow-hidden">
      
      {/* OVERLAY DE PROCESAMIENTO: PIZZA GIRATORIA WORLD CLASS */}
      {isProcessing && (
        <div className="absolute inset-0 z-[1000] bg-stone-950/95 backdrop-blur-3xl flex flex-col items-center justify-center animate-in fade-in duration-500 rounded-[2rem] md:rounded-[4rem] overflow-hidden">
          <div className="relative">
            <svg className="w-56 h-56 animate-[spin_8s_linear_infinite]" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="pizzaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor: '#f97316', stopOpacity: 1}} />
                  <stop offset="100%" style={{stopColor: '#9a3412', stopOpacity: 1}} />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="none" stroke="url(#pizzaGrad)" strokeWidth="0.5" strokeDasharray="4 2" />
              <circle cx="50" cy="50" r="42" fill="#292524" stroke="#444" strokeWidth="2" />
              {/* Slices representation */}
              <path d="M50 8 A42 42 0 0 1 92 50 L50 50 Z" fill="#ea580c" opacity="0.9" />
              <path d="M50 50 L10 50 A42 42 0 0 1 50 8 Z" fill="#9a3412" opacity="0.7" />
              <path d="M50 50 L92 50 A42 42 0 0 1 50 92 Z" fill="#c2410c" opacity="0.8" />
              {/* Pepperonis */}
              <circle cx="70" cy="35" r="4" fill="#7c2d12" />
              <circle cx="35" cy="75" r="5" fill="#7c2d12" />
              <circle cx="25" cy="40" r="3" fill="#7c2d12" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full animate-ping"></div>
            </div>
          </div>
          <h3 className="text-3xl font-brand mt-12 text-white tracking-[0.2em] animate-pulse uppercase">Horneando tu Obra...</h3>
          <p className="text-[10px] text-stone-500 font-black uppercase tracking-[0.6em] mt-4">Sincronizando con Módulo de Operaciones</p>
        </div>
      )}

      {/* MENSAJE DE ÉXITO ESTILO PREMIUM */}
      {showSuccess && (
        <div className="absolute inset-0 z-[1001] bg-orange-600 flex flex-col items-center justify-center p-6 sm:p-12 text-center animate-in zoom-in fade-in duration-700 rounded-[2rem] md:rounded-[5rem] overflow-hidden">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center mb-6 sm:mb-10 shadow-2xl animate-bounce">
            <i className="fas fa-check text-3xl sm:text-4xl text-orange-600"></i>
          </div>
          <h3 className="text-4xl sm:text-5xl md:text-7xl font-brand text-white mb-4 sm:mb-6 tracking-tighter">¡Proceso Correcto!</h3>
          <p className="text-lg sm:text-xl md:text-2xl text-orange-100 font-light italic max-w-2xl leading-relaxed">
            Tu obra maestra ha sido recibida en cocina. Pronto disfrutarás de la mejor pizza artesanal de Bogotá, hecha a tu medida.
          </p>
          <div className="mt-8 sm:mt-12 flex gap-4">
            <button onClick={() => setShowSuccess(false)} className="px-8 sm:px-12 py-4 sm:py-5 bg-stone-950 text-white rounded-full font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">Continuar Navegando</button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row landscape:flex-row gap-6 md:gap-8 lg:gap-20 w-full">
        <div className="w-full md:w-1/2 landscape:w-1/2 flex flex-col items-center gap-4 md:gap-8">
          <div className="grid grid-cols-3 gap-1 md:gap-2 p-1 md:p-1.5 bg-black/40 rounded-full border border-white/10 w-full max-w-md mx-auto">
            {Object.values(PizzaSize).map(s => {
              const parts = s.split(' ');
              return (
                <button key={s} onClick={() => setSize(s as PizzaSize)} className={`w-full py-3.5 md:py-4 px-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-tighter md:tracking-widest transition-all flex flex-col items-center justify-center leading-tight ${size === s ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-500 hover:text-stone-300'}`}>
                  <span>{parts[0]}</span>
                  {parts[1] && <span className="opacity-70 text-[6px] sm:text-[8px] font-bold tracking-normal mt-0.5">{parts[1]}</span>}
                </button>
              );
            })}
          </div>

          <div className="relative w-full max-w-[220px] sm:max-w-[280px] md:max-w-[400px] lg:max-w-[500px] landscape:max-w-[200px] md:landscape:max-w-[240px] lg:landscape:max-w-[500px] aspect-square mx-auto mt-2 md:mt-0">
            <div className={`absolute inset-0 rounded-full transition-colors duration-1000 ${currentMasa ? 'bg-[#dcae73]' : 'bg-stone-800'} border-[12px] sm:border-[16px] md:border-[24px] lg:border-[30px] ${currentMasa?.id === 'base_2' ? 'border-[#8B4513]' : 'border-[#a67c52]'} shadow-[inset_0_0_40px_rgba(0,0,0,0.6),0_20px_50px_rgba(0,0,0,0.8)] md:shadow-[inset_0_0_80px_rgba(0,0,0,0.6),0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden pizza-texture`}>
              {['whole', 'left', 'right'].map(side => {
                const salsa = INGREDIENTS.find(i => i.categoria === 'salsa' && selections[side as keyof typeof selections].includes(i.id));
                if (!salsa) return null;
                return <div key={`salsa-${side}`} className={`absolute inset-2 md:inset-4 rounded-full blur-xl md:blur-2xl opacity-60 transition-all duration-1000 ${side === 'left' ? 'w-1/2 left-2 md:left-4' : side === 'right' ? 'w-1/2 left-1/2' : 'w-full'}`} style={{ backgroundColor: CATEGORY_UI.salsa.visualColor || 'red' }}></div>;
              })}
              {['whole', 'left', 'right'].map(side => {
                const queso = INGREDIENTS.find(i => i.categoria === 'queso' && selections[side as keyof typeof selections].includes(i.id));
                if (!queso) return null;
                return <div key={`queso-${side}`} className={`absolute inset-4 md:inset-6 rounded-full blur-lg md:blur-xl opacity-40 transition-all duration-1000 ${side === 'left' ? 'w-1/2 left-4 md:left-6' : side === 'right' ? 'w-1/2 left-1/2' : 'w-full'}`} style={{ backgroundColor: CATEGORY_UI.queso.visualColor || 'yellow' }}></div>;
              })}
              <div className="absolute inset-0 pointer-events-none">
                {renderToppingsLayer('whole')}
                <div className="absolute inset-0" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}>{renderToppingsLayer('left')}</div>
                <div className="absolute inset-0" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}>{renderToppingsLayer('right')}</div>
              </div>
              {!currentMasa && <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8 text-center"><p className="text-stone-500 text-[7px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] leading-relaxed">Selecciona una base para comenzar</p></div>}
            </div>
            <div className="absolute -bottom-4 sm:-bottom-6 md:-bottom-8 left-1/2 -translate-x-1/2 bg-stone-950/90 px-4 sm:px-6 md:px-8 py-1.5 sm:py-2 md:py-3 rounded-full border border-white/10 backdrop-blur-md shadow-2xl">
               <span className="text-[7px] sm:text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-orange-500 whitespace-nowrap">{currentMasa ? currentMasa.nombre : 'Plato Vacío'}</span>
            </div>
          </div>
          <div className="text-center pt-4 md:pt-6">
            <h2 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter drop-shadow-2xl">${totalPrice.toLocaleString()}</h2>
            <p className="text-[7px] sm:text-[9px] md:text-[10px] text-stone-600 uppercase font-black tracking-[0.5em] md:tracking-[0.8em] mt-1 md:mt-3">Diseño D.O.P</p>
          </div>
        </div>

        <div className="w-full md:w-1/2 landscape:w-1/2 flex flex-col gap-4 md:gap-8">
          <div className="grid grid-cols-3 gap-1 md:gap-2 bg-black/40 p-1 md:p-1.5 rounded-full border border-white/5 w-full">
            {[{ id: 'whole', label: 'Toda' }, { id: 'left', label: 'Mitad Izq' }, { id: 'right', label: 'Mitad Der' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveSide(tab.id as any)} className={`w-full py-3.5 md:py-4 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-tighter md:tracking-widest transition-all flex items-center justify-center gap-1 md:gap-2 ${activeSide === tab.id ? 'bg-orange-600 text-white shadow-xl' : 'text-stone-600 hover:text-stone-400'}`}>
                <span className="truncate px-1">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-4 no-scrollbar scroll-smooth -mx-3 px-3 sm:mx-0 sm:px-0 w-[calc(100%+1.5rem)] sm:w-full">
            {['base', 'salsa', 'queso', 'carne', 'vegetal', 'dulce', 'extra'].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 sm:px-6 md:px-8 py-2 md:py-3 rounded-full border text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 flex items-center gap-1.5 md:gap-2 ${activeCategory === cat ? 'bg-white text-stone-950 border-white shadow-xl scale-105' : 'bg-transparent border-white/10 text-stone-600 hover:border-white/20'}`}>
                <i className={`fas fa-${CATEGORY_UI[cat]?.icon || 'circle'} text-[10px] md:text-sm`}></i>
                <span>{cat === 'base' ? 'Masa' : cat}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 max-h-[35vh] sm:max-h-[40vh] md:max-h-[50vh] lg:max-h-[400px] overflow-y-auto pr-1 md:pr-3 custom-scrollbar w-full">
            {INGREDIENTS.filter(i => activeCategory === 'extra' ? (i.categoria === 'extra' || i.categoria === 'especia') : i.categoria === activeCategory).map(ing => {
              const selected = selections[activeSide].includes(ing.id);
              const imgUrl = assetImages[ing.id];
              return (
                <button key={ing.id} onClick={() => toggleIngredient(ing.id)} className={`flex items-center gap-3 md:gap-5 p-3 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border transition-all text-left relative overflow-hidden group ${selected ? 'bg-orange-600/10 border-orange-500 shadow-xl' : 'bg-stone-900 border-white/5 hover:border-white/10'}`}>
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden ${selected ? 'bg-orange-600 text-white shadow-inner' : 'bg-stone-950 text-stone-700 group-hover:text-stone-500'}`}>
                    {imgUrl ? <img src={imgUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={ing.nombre} /> : <i className={`fas fa-${CATEGORY_UI[ing.categoria]?.icon || 'pizza-slice'} text-base md:text-lg`}></i>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[9px] md:text-[11px] font-black uppercase tracking-tight truncate ${selected ? 'text-white' : 'text-stone-200'}`}>{ing.nombre}</p>
                    <p className={`text-[8px] md:text-[9px] font-bold mt-0.5 ${selected ? 'text-orange-400' : 'text-stone-600'}`}>{ing.precio_extra > 0 ? `+$${ing.precio_extra.toLocaleString()}` : 'Incluido'}</p>
                  </div>
                  {selected && <div className="absolute top-3 right-3 md:top-4 md:right-4 animate-in zoom-in"><i className="fas fa-check-circle text-orange-500 text-[10px] md:text-xs"></i></div>}
                </button>
              );
            })}
          </div>

          <button 
            disabled={!currentMasa || isProcessing}
            onClick={handleConfirm}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-stone-800 disabled:text-stone-600 py-4 md:py-8 rounded-full text-white font-black text-[9px] md:text-xs tracking-[0.3em] md:tracking-[0.6em] shadow-[0_20px_50px_rgba(234,88,12,0.4)] md:shadow-[0_30px_80px_rgba(234,88,12,0.4)] transition-all active:scale-95 uppercase flex items-center justify-center gap-2 md:gap-4 group mt-2 md:mt-4"
          >
            {isProcessing ? <i className="fas fa-sync fa-spin"></i> : <i className="fas fa-fire-flame-curved group-hover:animate-bounce"></i>}
            <span className="truncate px-2">{isProcessing ? 'Enviando a Cocina...' : currentMasa ? 'Confirmar Creación' : 'Selecciona una Masa'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisualPizzaBuilder;
