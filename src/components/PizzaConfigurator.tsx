import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { PIZZA_SIZES, PIZZA_FLAVORS, formatPrice, type PizzaSize } from '../data/menu-data';
import { useCartStore } from '../store/cartStore';
import ChefMascot from './ChefMascot';

const FLAVOR_ICONS: Record<string, string> = {
  hawaiana: '🍍',
  'pollo-champinones': '🍗',
  carnes: '🥩',
  'costillitas-bbq': '🍖',
  criolla: '🫕',
  mexicana: '🌶️',
  ranchera: '🥘',
  'de-la-casa': '🏠',
  espanola: '🫒',
  napolitana: '🍅',
  vegetariana: '🥬',
  tropical: '🍒',
  'queso-bocadillo': '🧀',
};

const PizzaConfigurator: React.FC = () => {
  const [selectedSize, setSelectedSize] = useState<PizzaSize | null>(null);
  const [selectedFlavors, setSelectedFlavors] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState(false);
  const [animatingFlavor, setAnimatingFlavor] = useState<string | null>(null);

  const addItem = useCartStore((s) => s.addItem);

  const sizeInfo = useMemo(() => PIZZA_SIZES.find((s) => s.id === selectedSize) || null, [selectedSize]);

  const currentStep = useMemo(() => {
    if (!sizeInfo) return 1;
    if (selectedFlavors.size === 0) return 2;
    return 3;
  }, [sizeInfo, selectedFlavors.size]);

  const handleToggleFlavor = useCallback(
    (flavorId: string) => {
      if (!sizeInfo) return;
      setAnimatingFlavor(flavorId);
      setTimeout(() => setAnimatingFlavor(null), 400);

      setSelectedFlavors((prev) => {
        const next = new Set(prev);
        if (next.has(flavorId)) {
          next.delete(flavorId);
        } else if (next.size < sizeInfo.maxFlavors) {
          next.add(flavorId);
        }
        return next;
      });
    },
    [sizeInfo]
  );

  const handleSizeChange = useCallback((sizeId: PizzaSize) => {
    setSelectedSize(sizeId);
    setSelectedFlavors(new Set());
  }, []);

  const canAdd = sizeInfo && selectedFlavors.size >= 1;

  const flavorNames = useMemo(() => {
    return PIZZA_FLAVORS.filter((f) => selectedFlavors.has(f.id)).map((f) => f.name);
  }, [selectedFlavors]);

  const handleAddToCart = useCallback(() => {
    if (!sizeInfo || selectedFlavors.size === 0) return;
    const flavorIds = PIZZA_FLAVORS.filter((f) => selectedFlavors.has(f.id))
      .map((f) => f.id)
      .sort()
      .join('-');
    const deterministicId = `pizza-${sizeInfo.id}-${flavorIds}`;
    addItem({
      id: deterministicId,
      name: `Pizza ${sizeInfo.label} (${flavorNames.join(' + ')})`,
      price: sizeInfo.price,
      details: flavorNames.join(' + '),
    });
    setToast(true);
  }, [sizeInfo, flavorNames, selectedFlavors, addItem]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <section id="crea-tu-pizza" className="bg-carbon min-h-screen overflow-hidden w-full max-w-full">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10 md:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="font-heading text-5xl md:text-6xl text-queso mb-3 tracking-wider">CREA TU PIZZA</h2>
          <p className="text-crema/50 text-base font-body max-w-md mx-auto">
            Diseña tu pizza perfecta paso a paso. Elige, combina y disfruta.
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-heading text-sm transition-all duration-500 ${
                    currentStep >= step
                      ? 'bg-queso text-carbon scale-110 shadow-lg shadow-queso/20'
                      : 'bg-crema/10 text-crema/30'
                  }`}
                >
                  {currentStep > step ? (
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                <span
                  className={`text-xs font-heading tracking-wider uppercase transition-colors duration-300 hidden sm:block ${
                    currentStep >= step ? 'text-queso' : 'text-crema/25'
                  }`}
                >
                  {step === 1 ? 'Tamaño' : step === 2 ? 'Sabores' : 'Listo'}
                </span>
              </div>
              {step < 3 && (
                <div
                  className={`w-12 h-0.5 rounded-full transition-colors duration-500 ${
                    currentStep > step ? 'bg-queso' : 'bg-crema/10'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Pizza visual (sticky) */}
          <div className="lg:col-span-2 order-1 lg:order-none">
            <div className="lg:sticky lg:top-8">
              <div className="bg-crema/5 backdrop-blur-sm rounded-3xl p-6 border border-crema/10">
                <div className="w-56 h-64 sm:w-72 sm:h-80 md:w-80 md:h-[22rem] mx-auto transition-transform duration-500 hover:scale-105 overflow-hidden">
                  <ChefMascot
                    selectedFlavors={Array.from(selectedFlavors)}
                    flavorIcons={FLAVOR_ICONS}
                    flavorNames={flavorNames}
                    sizeLabel={sizeInfo?.label}
                  />
                </div>

                {/* Live summary */}
                {sizeInfo && (
                  <div className="mt-6 text-center animate-fade-in">
                    <div className="font-heading text-lg text-queso tracking-wider uppercase">
                      Pizza {sizeInfo.label}
                    </div>
                    <div className="text-crema/40 text-sm mt-1">
                      {sizeInfo.portions} porciones · {sizeInfo.maxFlavors} sabor{sizeInfo.maxFlavors > 1 ? 'es' : ''}
                    </div>
                    {selectedFlavors.size > 0 && (
                      <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                        {flavorNames.map((name) => (
                          <span
                            key={name}
                            className="px-2.5 py-1 bg-queso/15 text-queso text-xs font-heading tracking-wider rounded-full"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="font-heading text-3xl text-queso mt-4">{formatPrice(sizeInfo.price)}</div>
                  </div>
                )}
              </div>

              {/* Add to cart button - fixed below visual */}
              {canAdd && (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="mt-4 w-full py-4 rounded-2xl bg-albahaca text-white font-heading text-lg uppercase tracking-wider hover:bg-albahaca-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-albahaca/20 hover:scale-[1.02] animate-fade-in"
                >
                  🛒 Agregar al Carrito
                </button>
              )}
            </div>
          </div>

          {/* Right: Controls */}
          <div className="lg:col-span-3 order-2 space-y-8">
            {/* Step 1: Size */}
            <div className={`transition-all duration-300 ${currentStep >= 1 ? 'opacity-100' : 'opacity-40'}`}>
              <div className="flex items-center gap-3 mb-5">
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-heading text-sm transition-all duration-300 ${
                    currentStep >= 1 ? 'bg-queso text-carbon' : 'bg-crema/10 text-crema/30'
                  }`}
                >
                  1
                </span>
                <div>
                  <h3 className="font-heading text-xl text-crema tracking-wider uppercase">Elige el tamaño</h3>
                  <p className="text-crema/40 text-xs">Cuántas personas van a comer</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PIZZA_SIZES.map((size) => {
                  const isSelected = selectedSize === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => handleSizeChange(size.id)}
                      className={`relative rounded-2xl border-2 p-4 text-left transition-all duration-300 group ${
                        isSelected
                          ? 'border-queso bg-queso/10 shadow-lg shadow-queso/10 scale-[1.02]'
                          : 'border-crema/10 bg-crema/5 hover:border-queso/30 hover:bg-crema/10 hover:scale-[1.01]'
                      }`}
                    >
                      <div className="font-heading text-lg text-crema uppercase tracking-wider group-hover:text-queso transition-colors">
                        {size.label}
                      </div>
                      <div className="text-xs text-crema/40 mt-1">{size.portions} porciones</div>
                      <div className="text-[10px] text-crema/25 mt-0.5">
                        Hasta {size.maxFlavors} sabor{size.maxFlavors > 1 ? 'es' : ''}
                      </div>
                      <div
                        className={`font-heading text-lg mt-2 transition-colors ${isSelected ? 'text-queso' : 'text-tomato group-hover:text-queso'}`}
                      >
                        {formatPrice(size.price)}
                      </div>
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-queso flex items-center justify-center shadow-lg animate-scale-in">
                          <svg className="w-3.5 h-3.5 text-carbon" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Flavors */}
            {sizeInfo && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-10 h-10 rounded-xl bg-queso text-carbon flex items-center justify-center font-heading text-sm">
                    2
                  </span>
                  <div>
                    <h3 className="font-heading text-xl text-crema tracking-wider uppercase">Elige tus sabores</h3>
                    <p className="text-crema/40 text-xs">
                      Selecciona hasta {sizeInfo.maxFlavors} sabor{sizeInfo.maxFlavors > 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>

                {/* Flavor counter */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-heading text-crema/60">
                      {selectedFlavors.size}/{sizeInfo.maxFlavors}
                    </span>
                    <div className="flex gap-1">
                      {Array.from({ length: sizeInfo.maxFlavors }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            i < selectedFlavors.size ? 'bg-queso scale-110' : 'bg-crema/15'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {selectedFlavors.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedFlavors(new Set())}
                      className="text-xs text-tomato/80 hover:text-tomato font-heading tracking-wider uppercase transition-colors"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>

                {/* Flavor grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[32rem] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-crema/10 scrollbar-track-transparent">
                  {PIZZA_FLAVORS.map((flavor) => {
                    const checked = selectedFlavors.has(flavor.id);
                    const disabled = !checked && selectedFlavors.size >= sizeInfo.maxFlavors;
                    const isAnimating = animatingFlavor === flavor.id;
                    return (
                      <label
                        key={flavor.id}
                        className={`relative flex items-start gap-3 rounded-2xl border-2 p-3.5 cursor-pointer transition-all duration-300 ${
                          disabled && !checked
                            ? 'opacity-30 cursor-not-allowed border-crema/5 bg-crema/5'
                            : checked
                              ? 'border-queso bg-queso/10 shadow-md shadow-queso/5 scale-[1.01]'
                              : 'border-crema/10 bg-crema/5 hover:border-queso/30 hover:bg-crema/10 hover:scale-[1.005]'
                        } ${isAnimating ? 'scale-[1.03]' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => handleToggleFlavor(flavor.id)}
                          className="sr-only"
                        />
                        <span
                          className={`text-xl mt-0.5 transition-transform duration-300 ${checked ? 'scale-125' : ''}`}
                        >
                          {FLAVOR_ICONS[flavor.id] || '🍕'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-sm font-heading tracking-wider transition-colors ${checked ? 'text-queso' : 'text-crema/80'}`}
                          >
                            {flavor.name}
                          </div>
                          <div className="text-[11px] text-crema/35 leading-tight mt-0.5">{flavor.ingredients}</div>
                        </div>
                        {checked && (
                          <div className="w-5 h-5 rounded-full bg-queso flex items-center justify-center shrink-0 animate-scale-in">
                            <svg className="w-3 h-3 text-carbon" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Summary card */}
            {sizeInfo && selectedFlavors.size > 0 && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-10 h-10 rounded-xl bg-albahaca text-white flex items-center justify-center font-heading text-sm">
                    3
                  </span>
                  <div>
                    <h3 className="font-heading text-xl text-crema tracking-wider uppercase">Tu pizza está lista</h3>
                    <p className="text-crema/40 text-xs">Revisa tu pedido antes de agregar</p>
                  </div>
                </div>
                <div className="bg-crema/5 backdrop-blur-sm rounded-2xl border border-crema/10 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-heading text-lg text-queso uppercase tracking-wider">
                      Pizza {sizeInfo.label}
                    </span>
                    <span className="font-heading text-lg text-queso">{formatPrice(sizeInfo.price)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {flavorNames.map((name) => (
                      <span
                        key={name}
                        className="px-2.5 py-1 bg-crema/10 text-crema/60 text-xs font-heading tracking-wider rounded-full"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                  <div className="border-t border-crema/10 pt-3 flex items-center justify-between">
                    <span className="text-sm font-heading text-crema/50 tracking-wider uppercase">Total</span>
                    <span className="font-heading text-2xl text-queso">{formatPrice(sizeInfo.price)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-carbon text-white px-6 py-3.5 rounded-2xl font-body text-sm font-semibold shadow-2xl flex items-center gap-2.5 border border-crema/10">
            <span className="w-6 h-6 rounded-full bg-albahaca flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <span>¡Pizza agregada al carrito!</span>
          </div>
        </div>
      )}
    </section>
  );
};

export default PizzaConfigurator;
