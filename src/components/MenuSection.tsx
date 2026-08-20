import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, MENU_ITEMS, formatPrice, getProductImage, type MenuItem } from '../data/menu-data';

import ProductAddModal from './ProductAddModal';

const MenuSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('pizzas');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(false);
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);

  const showToast = useCallback(() => {
    setToast(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredItems = useMemo(() => {
    const base = MENU_ITEMS.filter((item) => item.category === activeCategory);
    if (!searchTerm.trim()) return base;
    const term = searchTerm.toLowerCase();
    return base.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
    );
  }, [activeCategory, searchTerm]);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const term = searchTerm.toLowerCase();
    return MENU_ITEMS.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const displayItems = searchResults ?? filteredItems;
  const isSearching = searchResults !== null;

  return (
    <section id="menu" className="relative bg-gradient-to-b from-crema via-crema to-crema/95 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Heading */}
        <div className="text-center mb-12">
          <span className="inline-block mb-3 px-4 py-1.5 rounded-full bg-carbon/5 text-carbon/60 text-xs font-body font-semibold tracking-widest uppercase">
            🍽️ Descubre nuestro sabor
          </span>
          <h2 className="font-heading text-5xl md:text-6xl text-carbon mb-4">
            Nuestro Menú
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-queso to-tomato mx-auto rounded-full" />
        </div>

        {/* Search */}
        <div className="relative w-full max-w-md mx-auto mb-10">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-carbon/40 text-lg pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar pizza, hamburguesa, ingrediente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-full border-2 border-carbon/10 focus:border-queso bg-white px-5 py-3.5 pl-12 text-carbon placeholder:text-carbon/40 outline-none transition-colors shadow-sm focus:shadow-md"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-carbon/40 hover:text-carbon transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category tabs */}
        {!isSearching && (
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-carbon text-queso shadow-lg'
                    : 'bg-carbon/10 text-carbon hover:bg-carbon/20'
                }`}
              >
                <span className="mr-1.5">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        {isSearching && displayItems.length > 0 && (
          <p className="text-sm text-carbon/50 mb-4">
            {displayItems.length} resultado{displayItems.length !== 1 ? 's' : ''} para
            &ldquo;{searchTerm}&rdquo;
          </p>
        )}

        {displayItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🍕</p>
            <p className="font-heading text-2xl text-carbon">No encontramos resultados</p>
            <p className="text-carbon/50 mt-2">Intenta con otro término de búsqueda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pizza CTA card */}
            {activeCategory === 'pizzas' && !isSearching && (
              <Link
                to="/pizza"
                className="group bg-gradient-to-br from-tomato via-tomato to-tomato/90 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 flex flex-col items-center justify-center text-center min-h-[220px] relative overflow-hidden"
              >
                <span className="text-6xl mb-3 group-hover:scale-110 transition-transform duration-300 relative z-10">
                  🍕
                </span>
                <h3 className="font-heading text-2xl text-white mb-1 relative z-10">
                  Crea tu propia pizza
                </h3>
                <p className="text-crema/80 text-sm relative z-10">
                  Elige tamaño, sabores y ingredientes a tu gusto
                </p>
                <span className="mt-4 inline-block bg-white text-tomato font-heading text-sm uppercase rounded-xl px-5 py-2.5 group-hover:bg-crema transition-colors relative z-10">
                  Construir pizza →
                </span>
              </Link>
            )}

            {displayItems.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onOpenModal={setModalItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add-to-cart modal */}
      <ProductAddModal
        item={modalItem!}
        isOpen={modalItem !== null}
        onClose={() => {
          setModalItem(null);
          showToast();
        }}
      />

      {/* Toast */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-carbon text-queso font-heading text-sm uppercase px-6 py-3 rounded-full shadow-lg transition-all duration-300 z-50 ${
          toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        ¡Agregado! ✓
      </div>
    </section>
  );
};

function ProductCard({
  item,
  onOpenModal,
}: {
  item: MenuItem;
  onOpenModal: (item: MenuItem) => void;
}) {
  const hasPopular = item.tags?.includes('popular');

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={getProductImage(item.category, item.id)}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {hasPopular && (
          <span className="absolute top-3 right-3 bg-gradient-to-r from-tomato to-tomato/90 text-white text-[10px] font-heading uppercase tracking-wider rounded-full px-3 py-1 shadow-lg">
            ⭐ Más pedida
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex-1">
          <h3 className="font-heading text-xl text-carbon leading-tight mb-1.5">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-xs text-carbon/50 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between mt-4 pt-3 border-t border-carbon/5">
          <div>
            <p className="font-heading text-xl text-tomato">{formatPrice(item.price)}</p>
            {item.priceCombo && (
              <p className="text-[11px] text-albahaca font-medium">
                Combo: {formatPrice(item.priceCombo)}
              </p>
            )}
          </div>
          <button
            onClick={() => onOpenModal(item)}
            className="bg-gradient-to-r from-queso to-queso-500 text-carbon font-heading text-xs uppercase rounded-xl px-4 py-2.5 hover:bg-queso-500 active:scale-95 transition-all duration-200 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <span className="text-base leading-none">+</span>
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

export default MenuSection;
