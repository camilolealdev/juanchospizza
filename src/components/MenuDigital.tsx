import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import BoldCheckoutButton from './payments/BoldCheckoutButton';
import type { OrderDraft } from '../services/payments/paymentService';
import { PizzaSize, OrderItem } from '../types';
import { api } from '../services/api';
import type { Product, Category } from '../types';
import { generateOrderNumber } from '../utils/orderNumber';
import { lockBodyScroll, unlockBodyScroll } from '../utils/useBodyScrollLock';
import { useFocusTrap } from '../hooks/useFocusTrap';
import PizzaBuilder from './PizzaBuilder';

interface MenuProduct {
  id: string;
  category: string;
  subcategory?: string;
  name: string;
  description: string;
  price: number;
  priceCombo?: number;
  image: string;
  ingredients: string[];
  vegetariano?: boolean;
  sizes?: { label: string; portions: number; sabores: number; price: number }[];
  sabores?: Sabor[];
  baseSabor?: string;
}

interface Sabor {
  name: string;
  ingredients: string[];
}

interface MenuCategoryTab {
  id: string;
  label: string;
  icon: string;
}

// La tabla `categories` (server/db.js) solo tiene id/name/icon/color -- no hay
// slug/tipo estable e independiente de la fuente de seed para detectar "es la
// categoría de pizzas". El id de esa categoría varía según qué seed se corrió:
// el legacy hardcoded (server/seedData/juanchosMenu.js) usa 'pizzas', el nuevo
// scripts/seed-menu.sql usa 'cat_pizzas'. Toleramos ambos para no romper el
// selector de tamaño/sabores si el proyecto corrió el seed nuevo (audit #11).
const PIZZA_CATEGORY_IDS = new Set(['pizzas', 'cat_pizzas']);
const isPizzaCategory = (categoryId: string) => PIZZA_CATEGORY_IDS.has(categoryId);

const CROSS_SELL: Record<string, { id: string; name: string; price: number; image: string }[]> = {
  pizzas: [
    {
      id: 'cs1',
      name: 'Gaseosa Personal',
      price: 3000,
      image: 'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?auto=format&fit=crop&w=200&q=80',
    },
    {
      id: 'cs2',
      name: 'Papas con Queso',
      price: 8000,
      image: 'https://images.unsplash.com/photo-1624378420232-d5f1341b5c37?auto=format&fit=crop&w=200&q=80',
    },
    { id: 'cs3', name: 'Salsa de la Casa', price: 3000, image: '' },
  ],
  hamburguesas: [{ id: 'cs4', name: 'Combo Completo', price: 5000, image: '' }],
  default: [
    {
      id: 'cs5',
      name: 'Gaseosa Litro',
      price: 5000,
      image: 'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?auto=format&fit=crop&w=200&q=80',
    },
    { id: 'cs6', name: 'Porción de Papas', price: 5000, image: '' },
  ],
};

const MenuDigital: React.FC<{ onClose?: () => void; variant?: 'overlay' | 'section' }> = ({
  onClose,
  variant = 'overlay',
}) => {
  const [activeCategory, setActiveCategory] = useState('pizzas');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('todos');
  const [showCart, setShowCart] = useState(false);
  const [showPizzaBuilder, setShowPizzaBuilder] = useState<string | null>(null);

  // El focus-trap/Escape del pizza builder ahora vive dentro de
  // PizzaBuilder.tsx (variant="modal") -- acá solo queda el del carrito.
  useFocusTrap(showCart, () => setShowCart(false), '#md-cart-title');
  const [showSuccess, setShowSuccess] = useState('');
  const [showCrossSell, setShowCrossSell] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const tabsRef = useRef<HTMLDivElement>(null);

  // Menú real: productos/categorías/tamaños vienen de la DB (server/seedData/
  // juanchosMenu.js vía POST /api/seed), no hardcodeados -- misma fuente que
  // lee la CRM (MenuInteligente.tsx) para que ambas superficies no se desincronicen.
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [categories, setCategories] = useState<MenuCategoryTab[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  // Antes el catch dejaba products/categories vacíos sin marcar nada más --
  // "sin productos para este filtro" y "la API falló" se veían exactamente
  // igual (mismo empty-state genérico), perpetuando el bug de grid vacío en
  // producción sin forma de distinguir la causa ni de reintentar. Mismo
  // patrón que ya usa PizzaBuilder.tsx (loadError + reintento).
  const [menuLoadError, setMenuLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setMenuLoading(true);
    setMenuLoadError(false);
    (async () => {
      try {
        const [rawProducts, rawCategories, sizes, variants] = await Promise.all([
          api.getProducts() as Promise<Product[]>,
          api.getCategories(),
          api.getPizzaSizes(),
          api.getMenuVariants(),
        ]);
        if (cancelled) return;

        const sizeOptions = sizes
          .filter((s) => s.activo)
          .sort((a, b) => a.precio - b.precio)
          .map((s) => ({ label: s.nombre, portions: s.porciones || 0, sabores: s.incluidos, price: s.precio }));

        const pizzaSabores: Sabor[] = rawProducts
          .filter((p) => isPizzaCategory(p.categoryId) && p.subcategory !== 'Porción')
          .map((p) => ({
            name: p.nombre,
            ingredients: p.descripcion ? p.descripcion.split(',').map((s) => s.trim()) : [],
          }));

        const comboDeltaByProduct = new Map<string, number>();
        variants.forEach((v) => {
          if (v.activo && v.nombre === 'Combo' && v.productoId)
            comboDeltaByProduct.set(v.productoId, v.precioModificador);
        });

        const mapped: MenuProduct[] = rawProducts.map((p) => {
          const isPizzaSabor = isPizzaCategory(p.categoryId) && p.subcategory !== 'Porción';
          const comboDelta = comboDeltaByProduct.get(p.id);
          return {
            id: p.id,
            category: p.categoryId,
            subcategory: p.subcategory,
            name: p.nombre,
            description: p.descripcion,
            price: p.basePrice,
            priceCombo: comboDelta !== undefined ? p.basePrice + comboDelta : undefined,
            image: p.image,
            ingredients: p.descripcion ? p.descripcion.split(',').map((s) => s.trim()) : [],
            vegetariano: p.vegetariano,
            sizes: isPizzaSabor ? sizeOptions : undefined,
            sabores: isPizzaSabor ? pizzaSabores : undefined,
            baseSabor: isPizzaSabor ? p.nombre : undefined,
          };
        });

        setProducts(mapped);
        setCategories(rawCategories.map((c: Category) => ({ id: c.id, label: c.name, icon: `fa-${c.icon}` })));
        if (rawCategories[0])
          setActiveCategory((prev) =>
            rawCategories.some((c: Category) => c.id === prev) ? prev : rawCategories[0].id
          );
      } catch {
        if (!cancelled) setMenuLoadError(true);
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const {
    cart,
    cartCount,
    cartTotal,
    addToCart: contextAddToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCart();

  // Mismo fix que CartSection.tsx: orderNumber estable por intento de
  // checkout, no regenerado en cada llamada a buildOrderDraft() (antes
  // rompía la idempotencia -- un retry de red mandaba un orderNumber
  // distinto, esquivando el índice único de la DB).
  const [orderNumber, setOrderNumber] = useState(() => generateOrderNumber());
  const prevCartLenRef = useRef(cart.length);
  useEffect(() => {
    if (prevCartLenRef.current > 0 && cart.length === 0) {
      setOrderNumber(generateOrderNumber());
    }
    prevCartLenRef.current = cart.length;
  }, [cart.length]);

  const filteredProducts = useMemo(() => {
    let items = products.filter((p) => p.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.ingredients.some((i) => i.toLowerCase().includes(q)) ||
          p.description.toLowerCase().includes(q)
      );
    }
    if (activeFilter === 'vegetarianos') items = items.filter((p) => p.vegetariano);
    return items;
  }, [products, activeCategory, searchQuery, activeFilter]);

  const addToCart = useCallback(
    (product: MenuProduct, size?: string, details?: string) => {
      let price = product.price;
      if (size && product.sizes) {
        const sz = product.sizes.find((s) => s.label === size);
        if (sz) price = sz.price;
      }
      // Propagamos `size` al cart para que OrderItem.size generado por el
      // checkout lleve el tamaño real del cliente (small/junior/mediana/familiar)
      // y no el fallback legacy PizzaSize.PERSONAL hardcodeado.
      contextAddToCart({ productId: product.id, name: product.name, price, quantity: 1, size, details });
      setShowSuccess(product.name);
      setTimeout(() => setShowSuccess(''), 2000);
      setShowCrossSell(product.category);
      setTimeout(() => setShowCrossSell(null), 5000);
    },
    [contextAddToCart]
  );

  const openPizzaBuilder = useCallback((product: MenuProduct) => {
    setShowPizzaBuilder(product.id);
  }, []);

  const whatsappMessage = useMemo(() => {
    const items = cart
      .map(
        (i) =>
          `• ${i.quantity}x ${i.name}${i.details ? ` (${i.details})` : ''} — $${(i.price * i.quantity).toLocaleString()}`
      )
      .join('\n');
    return `Hola Juanchos Pizza! 🍕\n\nQuiero realizar el siguiente pedido:\n\n${items}\n\n━━━━━━━━━━━━━\n💵 Total estimado: $${cartTotal.toLocaleString()}\n\n👤 Nombre: ${customerName || '________'}\n📍 Dirección: ${customerAddress || '________'}\n\n¡Gracias! 🎉`;
  }, [cart, cartTotal, customerName, customerAddress]);

  const canCheckoutWithBold = !!customerName && !!customerAddress && !!customerPhone;

  const buildOrderDraft = useCallback((): OrderDraft => {
    const items: OrderItem[] = cart.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      // Acá estaba el bug B2: hardcode PizzaSize.PERSONAL descartaba la
      // selección real. Ahora respetamos item.size (populado por
      // PizzaBuilder.handleAdd vía CartContext.addToCart) o caemos al
      // legacy enum solo si el cart item es pre-pivot.
      size: item.size || PizzaSize.PERSONAL,
      quantity: item.quantity,
      price: item.price,
      details: item.details,
    }));

    return {
      orderNumber,
      customerName,
      customerPhone,
      address: customerAddress,
      items,
      total: cartTotal,
      estimatedTime: 30,
    };
  }, [cart, customerName, customerPhone, customerAddress, cartTotal, orderNumber]);

  const handleWhatsApp = useCallback(async () => {
    // [2026-07-30] Backlog: window.open DESPUÉS de un await pierde el user
    // gesture y los popup blockers lo bloquean (audit P2). Se abre la
    // ventana en blanco SINCRÓNICAMENTE (dentro del gesture del click) y se
    // navega tras el registro del pedido.
    const url = `https://wa.me/573108613690?text=${encodeURIComponent(whatsappMessage)}`;
    const waWin = window.open('', '_blank');
    try {
      await api.createOrder({ ...buildOrderDraft(), paymentMethod: 'whatsapp' });
    } catch {
      // WhatsApp se abre igual aunque falle el registro
    }
    if (waWin) {
      waWin.location.href = url;
    } else {
      // Popup bloqueado por el navegador: último recurso, navegamos en la
      // misma pestaña (el pedido ya se registró vía createOrder).
      window.location.href = url;
    }
  }, [whatsappMessage, buildOrderDraft]);

  const scrollTab = useCallback((dir: number) => {
    if (tabsRef.current) tabsRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' });
  }, []);

  const isOverlay = variant === 'overlay';

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPizzaBuilder) setShowPizzaBuilder(null);
        else if (showCart) setShowCart(false);
        else if (isOverlay) onClose?.();
      }
    };
    window.addEventListener('keydown', handleEsc);
    // [2026-07-21] Audit follow-up: el body-scroll lock se aplicaba SOLO en
    // variant="overlay". Cuando el menú se monta como inline section (la
    // portal en index.html, variant="section"), abrir el cart o el pizza
    // builder dejaba el body scrollable y se producía doble scrollbar.
    // Ahora el lock se activa si CUALQUIER modal está abierto o si el menú
    // entero es overlay. Usamos lockBodyScroll/unlockBodyScroll del utilitario
    // compartido: ambos modales (LoginModal + MenuDigital) acumulan locks y
    // el overflow solo se restaura cuando el ÚLTIMO consumidor sale.
    const modalOpen = !!showPizzaBuilder || !!showCart;
    if (isOverlay || modalOpen) {
      lockBodyScroll();
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      if (isOverlay || modalOpen) unlockBodyScroll();
    };
  }, [onClose, showPizzaBuilder, showCart, isOverlay]);

  // Mismo problema de seed-source drift que isPizzaCategory: CROSS_SELL está
  // keyed por el id legacy 'pizzas', así que con cat_pizzas (seed nuevo) caía
  // silenciosamente al bucket 'default' en vez de mostrar cross-sell de pizza.
  const crossSellItems =
    (isPizzaCategory(activeCategory) ? CROSS_SELL.pizzas : CROSS_SELL[activeCategory]) || CROSS_SELL.default;

  return (
    <motion.div
      {...(isOverlay ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : {})}
      className={
        isOverlay
          ? 'fixed inset-0 z-overlay-max bg-[#F4EFEA] overflow-y-auto overscroll-behavior-contain'
          : 'bg-[#F4EFEA] min-h-screen scroll-mt-16 animate-fade-in'
      }
      id={isOverlay ? undefined : 'menu'}
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Top Bar */}
      <div className="sticky top-0 z-header bg-[#F4EFEA]/95 backdrop-blur-xl border-b border-[#8B572A]/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOverlay && (
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-[#8B572A]/10 flex items-center justify-center text-[#8B572A] hover:bg-[#8B572A]/20 transition-all"
              >
                <i className="fas fa-arrow-left text-sm"></i>
              </button>
            )}
            <div>
              <h1 className="text-xl font-black text-[#1A1A1A]" style={{ fontFamily: "'Bitter', serif" }}>
                Nuestro Menú
              </h1>
              <p className="text-[10px] text-[#8B572A]/70 font-semibold uppercase tracking-widest">
                {isOverlay ? 'Descubre y pide desde aquí' : 'Explora, elige y pide desde aquí'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative w-10 h-10 rounded-xl bg-[#C0392B] flex items-center justify-center text-white hover:bg-[#962D22] transition-all"
            aria-label={`Ver pedido (${cartCount} producto${cartCount !== 1 ? 's' : ''})`}
          >
            <i className="fas fa-basket-shopping text-sm" aria-hidden="true"></i>
            {cartCount > 0 && (
              <span
                aria-live="polite"
                aria-atomic="true"
                className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#F9DC5C] text-[#1A1A1A] flex items-center justify-center text-[10px] font-black shadow-lg"
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* Search */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="relative mb-6">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[#8B572A]/40 text-sm"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="¿Qué se te antoja hoy?"
            className="w-full bg-white/80 border border-[#8B572A]/15 rounded-2xl py-4 pl-12 pr-10 text-[#1A1A1A] text-sm font-medium placeholder:text-[#8B572A]/30 outline-none focus:border-[#C0392B]/40 focus:ring-2 focus:ring-[#C0392B]/10 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B572A]/40 hover:text-[#C0392B] transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </motion.div>

        {/* Category Tabs */}
        <div className="relative mb-6">
          <button
            onClick={() => scrollTab(-1)}
            className="absolute left-0 top-0 bottom-0 z-sticky w-8 bg-gradient-to-r from-[#F4EFEA] to-transparent flex items-center justify-start md:hidden"
          >
            <i className="fas fa-chevron-left text-[10px] text-[#8B572A]/50"></i>
          </button>
          <div
            ref={tabsRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setActiveFilter('todos');
                }}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all flex-shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-[#C0392B] text-white shadow-lg shadow-[#C0392B]/30 scale-105'
                    : 'bg-white/60 text-[#8B572A]/70 hover:bg-white hover:text-[#1A1A1A] border border-[#8B572A]/10'
                }`}
              >
                <i className={`fas ${cat.icon} text-base`}></i>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => scrollTab(1)}
            className="absolute right-0 top-0 bottom-0 z-sticky w-8 bg-gradient-to-l from-[#F4EFEA] to-transparent flex items-center justify-end md:hidden"
          >
            <i className="fas fa-chevron-right text-[10px] text-[#8B572A]/50"></i>
          </button>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'vegetarianos', label: 'Vegetarianos' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(activeFilter === f.id ? 'todos' : f.id)}
              className={`px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all flex-shrink-0 border ${
                activeFilter === f.id
                  ? 'bg-[#1A1A1A] text-[#F9DC5C] border-[#1A1A1A]'
                  : 'bg-white/50 text-[#8B572A]/60 border-[#8B572A]/10 hover:bg-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        {/* Products Grid */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-20">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, idx) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className="group bg-white/70 backdrop-blur-sm rounded-3xl overflow-hidden border border-[#8B572A]/8 hover:border-[#C0392B]/20 hover:shadow-xl hover:shadow-[#C0392B]/5 transition-all duration-500"
              >
                <div className="relative h-48 overflow-hidden bg-[#F4EFEA]">
                  <img
                    src={product.image}
                    alt={product.name}
                    onError={(e) => {
                      // Fallback defensivo: si la ruta local falla, usar la ilustración genérica de pizza
                      if (!e.currentTarget.src.endsWith('/pizza-default.svg')) {
                        e.currentTarget.src = '/assets/images/products/pizza-default.svg';
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  {product.vegetariano && (
                    <div className="absolute top-3 left-3 bg-green-700 text-white px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider">
                      Vegetariano
                    </div>
                  )}
                  {product.priceCombo && (
                    <div className="absolute top-3 right-3 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[8px] font-bold">
                      -${(product.priceCombo - product.price).toLocaleString()} en combo
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-base font-black text-[#1A1A1A] mb-1">{product.name}</h3>
                  <p className="text-[11px] text-[#8B572A]/70 leading-relaxed mb-3 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {product.ingredients.slice(0, 4).map((ing, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-[#8B572A]/8 rounded-full text-[8px] font-medium text-[#8B572A]/60"
                      >
                        {ing}
                      </span>
                    ))}
                    {product.ingredients.length > 4 && (
                      <span className="text-[8px] text-[#8B572A]/40 font-bold">+{product.ingredients.length - 4}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xl font-black text-[#C0392B]">${product.price.toLocaleString()}</span>
                      {product.priceCombo && (
                        <span className="block text-[10px] font-bold text-emerald-600">
                          Combo: ${product.priceCombo.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {product.sizes ? (
                        <button
                          onClick={() => openPizzaBuilder(product)}
                          className="px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-[9px] font-bold uppercase tracking-wider hover:bg-[#C0392B] transition-all shadow-lg shadow-black/10"
                        >
                          <i className="fas fa-sliders mr-1.5"></i>Personalizar
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => addToCart(product)}
                            className="px-4 py-2.5 bg-[#C0392B] text-white rounded-xl text-[9px] font-bold uppercase tracking-wider hover:bg-[#962D22] transition-all shadow-lg shadow-[#C0392B]/20"
                          >
                            <i className="fas fa-plus mr-1.5"></i>Agregar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        {menuLoading && (
          <div className="text-center py-20">
            <p className="text-[#8B572A]/50 font-bold text-sm">Cargando menú…</p>
          </div>
        )}
        {!menuLoading && menuLoadError && (
          <div className="text-center py-20">
            <i className="fas fa-triangle-exclamation text-4xl text-[#C0392B]/40 mb-4"></i>
            <p className="text-[#8B572A]/70 font-bold text-sm mb-4">
              No pudimos cargar el menú. Revisa tu conexión e intenta de nuevo.
            </p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="px-6 py-3 bg-[#C0392B] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#962D22] transition-all"
            >
              <i className="fas fa-rotate-right mr-2"></i>Reintentar
            </button>
          </div>
        )}
        {!menuLoading && !menuLoadError && filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <i className="fas fa-search text-4xl text-[#8B572A]/20 mb-4"></i>
            <p className="text-[#8B572A]/50 font-bold text-sm">No encontramos productos con ese filtro</p>
          </div>
        )}
      </div>

      {/* Pizza Builder Modal -- componente único, compartido con la página
        estática "Crea tu Pizza" (ver src/components/PizzaBuilder.tsx) */}
      <AnimatePresence mode="wait">
        {showPizzaBuilder &&
          (() => {
            const product = products.find((p) => p.id === showPizzaBuilder);
            if (!product) return null;
            return (
              <PizzaBuilder
                variant="modal"
                productId={product.id}
                productName={product.name}
                onClose={() => setShowPizzaBuilder(null)}
              />
            );
          })()}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <AnimatePresence mode="wait">
        {' '}
        {showCart && (
          // [2026-07-21] A11y P1: role="dialog" + aria-modal="true" +
          // aria-labelledby apuntando al h2 "Tu Pedido" (id=md-cart-title).
          // Esc→close ya estaba implementado.
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-overlay bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="md-cart-title"
              className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col overscroll-behavior-contain"
            >
              {/* Cart Header */}
              <div className="p-6 border-b border-[#8B572A]/10 flex items-center justify-between">
                <div>
                  <h2
                    id="md-cart-title"
                    className="text-xl font-black text-[#1A1A1A]"
                    style={{ fontFamily: "'Bitter', serif" }}
                  >
                    Tu Pedido
                  </h2>
                  <p className="text-[11px] text-[#8B572A]/60 font-medium">
                    {cartCount} producto{cartCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setShowCart(false)}
                  aria-label="Cerrar pedido"
                  className="w-9 h-9 rounded-xl bg-[#8B572A]/10 flex items-center justify-center text-[#8B572A] hover:bg-[#8B572A]/20 transition-all"
                >
                  <i className="fas fa-times text-xs" aria-hidden="true"></i>
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-16">
                    <i className="fas fa-basket-shopping text-5xl text-[#8B572A]/10 mb-4"></i>
                    <p className="text-[#8B572A]/40 font-bold text-sm">Tu carrito está vacío</p>
                    <p className="text-[#8B572A]/30 text-[11px] mt-1">Agrega productos del menú</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-[#F4EFEA]/60 border border-[#8B572A]/8"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-[#1A1A1A]">{item.name}</h4>
                        {item.details && <p className="text-[10px] text-[#8B572A]/60 mt-0.5">{item.details}</p>}
                        <p className="text-sm font-black text-[#C0392B] mt-1">
                          ${(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white border border-[#8B572A]/10 flex items-center justify-center text-[10px] text-[#8B572A] hover:bg-[#C0392B] hover:text-white transition-all"
                        >
                          <i className="fas fa-minus"></i>
                        </button>
                        <span className="text-xs font-black text-[#1A1A1A] w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-[#8B572A]/10 flex items-center justify-center text-[10px] text-[#8B572A] hover:bg-[#C0392B] hover:text-white transition-all"
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
                      >
                        <i className="fas fa-trash-can text-[10px]"></i>
                      </button>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Cart Footer */}
              {cart.length > 0 && (
                <div className="p-6 border-t border-[#8B572A]/10 bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#8B572A]/60 font-medium">Subtotal</span>
                    <span className="text-lg font-black text-[#1A1A1A]">${cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#8B572A]/60 font-medium">Envío</span>
                    <span className="text-sm font-bold text-emerald-600">Gratis</span>
                  </div>
                  <div className="border-t border-[#8B572A]/10 pt-4 flex items-center justify-between">
                    <span className="text-base font-black text-[#1A1A1A]" style={{ fontFamily: "'Bitter', serif" }}>
                      Total
                    </span>
                    <span className="text-2xl font-black text-[#C0392B]">${cartTotal.toLocaleString()}</span>
                  </div>

                  {/* Checkout Form */}
                  <div className="space-y-3">
                    {/* [2026-07-21] A11y: WCAG 3.3.2 — label programático
                      asociado por htmlFor + id. Placeholder-only NO es label.
                      `<label className="sr-only">` lo esconde visualmente
                      pero lo expone a screen readers. También mantiene el
                      placeholder para la affordance visual. */}
                    <label htmlFor="md-checkout-name" className="sr-only">
                      Tu nombre
                    </label>
                    <input
                      id="md-checkout-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Tu nombre *"
                      required
                      aria-required="true"
                      className="w-full bg-[#F4EFEA]/60 border border-[#8B572A]/10 rounded-xl p-3.5 text-sm font-medium text-[#1A1A1A] outline-none focus:border-[#C0392B]/30 transition-all placeholder:text-[#8B572A]/30"
                    />
                    <label htmlFor="md-checkout-address" className="sr-only">
                      Dirección de entrega
                    </label>
                    <input
                      id="md-checkout-address"
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Dirección de entrega *"
                      required
                      aria-required="true"
                      className="w-full bg-[#F4EFEA]/60 border border-[#8B572A]/10 rounded-xl p-3.5 text-sm font-medium text-[#1A1A1A] outline-none focus:border-[#C0392B]/30 transition-all placeholder:text-[#8B572A]/30"
                    />
                    <label htmlFor="md-checkout-phone" className="sr-only">
                      Teléfono para pago y seguimiento
                    </label>
                    <input
                      id="md-checkout-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Teléfono (para pago y seguimiento) *"
                      required
                      aria-required="true"
                      autoComplete="tel"
                      className="w-full bg-[#F4EFEA]/60 border border-[#8B572A]/10 rounded-xl p-3.5 text-sm font-medium text-[#1A1A1A] outline-none focus:border-[#C0392B]/30 transition-all placeholder:text-[#8B572A]/30"
                    />
                    <BoldCheckoutButton
                      orderDraft={buildOrderDraft()}
                      disabled={!canCheckoutWithBold}
                      className="w-full"
                      onOrderCreated={() => clearCart()}
                      onError={(msg) => setCheckoutError(msg)}
                    />
                    {checkoutError && <p className="text-xs text-red-600 font-bold text-center">{checkoutError}</p>}
                    <button
                      onClick={handleWhatsApp}
                      disabled={!customerName || !customerAddress}
                      className="w-full py-4 bg-[#25D366] text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-[#1ebd58] transition-all shadow-lg shadow-[#25D366]/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      <i className="fab fa-whatsapp text-lg"></i>Pedir por WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Success */}
      <AnimatePresence mode="wait">
        {showSuccess && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 right-6 z-toast bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <i className="fas fa-check-circle"></i>
            <span className="text-sm font-bold">{showSuccess} agregado</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cross-sell Toast */}
      <AnimatePresence mode="wait">
        {showCrossSell && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-44 right-6 z-toast bg-white border border-[#8B572A]/10 rounded-2xl shadow-2xl p-4 max-w-xs"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B572A]/60 mb-3">
              Complementa tu pedido
            </p>
            <div className="space-y-2">
              {crossSellItems.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    const prod = {
                      id: item.id,
                      category: activeCategory,
                      name: item.name,
                      description: '',
                      price: item.price,
                      image: item.image,
                      ingredients: [],
                      badges: [],
                    };
                    addToCart(prod);
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#F4EFEA]/60 transition-all"
                >
                  {item.image ? (
                    <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#8B572A]/10 flex items-center justify-center text-[#8B572A]/40">
                      <i className="fas fa-plus"></i>
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="text-xs font-bold text-[#1A1A1A]">{item.name}</p>
                    <p className="text-[10px] font-black text-[#C0392B]">${item.price.toLocaleString()}</p>
                  </div>
                  <i className="fas fa-plus text-[10px] text-[#8B572A]/30"></i>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MenuDigital;
