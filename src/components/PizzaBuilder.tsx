
import React, { useState } from 'react';
// Fix: Updated import to use INGREDIENTS as TOPPINGS is not exported from constants
import { INGREDIENTS } from '../constants';
// Fix: Updated import to use Ingredient as Topping is not defined in types
import { Ingredient } from '../types';

const PizzaBuilder: React.FC = () => {
  // Fix: Using Ingredient type instead of Topping
  const [leftToppings, setLeftToppings] = useState<Ingredient[]>([]);
  const [rightToppings, setRightToppings] = useState<Ingredient[]>([]);
  const [activeSide, setActiveSide] = useState<'left' | 'right'>('left');

  const addTopping = (topping: Ingredient) => {
    if (activeSide === 'left') {
      if (!leftToppings.find(t => t.id === topping.id)) setLeftToppings([...leftToppings, topping]);
    } else {
      if (!rightToppings.find(t => t.id === topping.id)) setRightToppings([...rightToppings, topping]);
    }
  };

  const removeTopping = (side: 'left' | 'right', id: string) => {
    if (side === 'left') setLeftToppings(leftToppings.filter(t => t.id !== id));
    else setRightToppings(rightToppings.filter(t => t.id !== id));
  };

  // Fix: Using precio_extra instead of price to match Ingredient interface
  const totalPrice = 35000 + leftToppings.reduce((a, b) => a + b.precio_extra/2, 0) + rightToppings.reduce((a, b) => a + b.precio_extra/2, 0);

  return (
    <div className="grid md:grid-cols-2 gap-6 sm:gap-8 p-4 sm:p-6 bg-stone-900 rounded-2xl shadow-2xl border border-stone-800">
      <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-brand text-orange-500 text-center">Constructor Mitad y Mitad</h3>
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-full bg-orange-100 border-[6px] sm:border-8 border-orange-800 overflow-hidden shadow-inner flex">
          <div 
            onClick={() => setActiveSide('left')}
            className={`flex-1 h-full border-r border-orange-800/20 cursor-pointer transition-all ${activeSide === 'left' ? 'bg-orange-200/50' : 'bg-transparent'}`}
          >
            <div className="p-2 sm:p-4 flex flex-wrap gap-1 justify-center">
              {leftToppings.map(t => (
                <div key={t.id} className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-600 animate-pulse" title={t.nombre} />
              ))}
            </div>
          </div>
          <div 
            onClick={() => setActiveSide('right')}
            className={`flex-1 h-full cursor-pointer transition-all ${activeSide === 'right' ? 'bg-orange-200/50' : 'bg-transparent'}`}
          >
            <div className="p-2 sm:p-4 flex flex-wrap gap-1 justify-center">
              {rightToppings.map(t => (
                <div key={t.id} className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-600 animate-pulse" title={t.nombre} />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none border-[3px] sm:border-4 border-dashed border-orange-900/10 rounded-full" />
        </div>
        <div className="text-center px-4">
          <p className="text-stone-400 text-sm sm:text-base">Editando: <span className="text-orange-400 font-bold uppercase">{activeSide === 'left' ? 'Lado Izquierdo' : 'Lado Derecho'}</span></p>
          <p className="text-2xl sm:text-3xl font-bold text-white mt-2">${totalPrice.toLocaleString()} COP</p>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h4 className="font-semibold text-base sm:text-lg border-b border-stone-800 pb-2">Toppings Disponibles</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INGREDIENTS.map(t => (
            <button
              key={t.id}
              onClick={() => addTopping(t)}
              className="flex justify-between items-center p-2 sm:p-3 bg-stone-800 hover:bg-orange-600 transition-colors rounded-lg text-xs sm:text-sm"
            >
              <span className="truncate">{t.nombre}</span>
              <span className="text-[10px] sm:text-xs opacity-70 flex-shrink-0 ml-1">+${t.precio_extra/2}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 sm:mt-6">
          <h4 className="font-semibold text-xs sm:text-sm text-stone-500 uppercase tracking-widest">Resumen</h4>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-2">
             <div className="flex-1 bg-stone-950/40 rounded-xl p-3">
                <p className="text-[10px] sm:text-xs font-bold text-orange-400 mb-1">Izquierda</p>
                {leftToppings.length === 0 && <p className="text-[10px] text-stone-600">Sin toppings</p>}
                {leftToppings.map(t => (
                  <div key={t.id} className="flex justify-between text-[10px] sm:text-xs py-1">
                    <span className="truncate">{t.nombre}</span>
                    <button onClick={() => removeTopping('left', t.id)} className="text-red-500 flex-shrink-0 ml-2">×</button>
                  </div>
                ))}
             </div>
             <div className="flex-1 bg-stone-950/40 rounded-xl p-3">
                <p className="text-[10px] sm:text-xs font-bold text-orange-400 mb-1">Derecha</p>
                {rightToppings.length === 0 && <p className="text-[10px] text-stone-600">Sin toppings</p>}
                {rightToppings.map(t => (
                  <div key={t.id} className="flex justify-between text-[10px] sm:text-xs py-1">
                    <span className="truncate">{t.nombre}</span>
                    <button onClick={() => removeTopping('right', t.id)} className="text-red-500 flex-shrink-0 ml-2">×</button>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <button className="w-full bg-orange-600 hover:bg-orange-500 py-2.5 sm:py-3 rounded-xl font-bold mt-3 sm:mt-4 shadow-lg transition-transform active:scale-95 text-xs sm:text-sm">
          AGREGAR AL CARRITO
        </button>
      </div>
    </div>
  );
};

export default PizzaBuilder;
