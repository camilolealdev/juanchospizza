
import React, { useState, useMemo, useEffect } from 'react';
import { CATEGORIES, PRODUCTS } from '../../constants';
import VisualPizzaBuilder from '../../components/VisualPizzaBuilder';
import { getSmartRecommendations } from '../../services/geminiService';
import { api } from '../../services/api';
import { POS } from '../../services/payments';
import { CartItem, Order, OrderStatus, Category, Product, OrderItem, PizzaSize } from '../../types';
import { PaymentResponse } from '../../services/payments/paymentService';

const CustomerView: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [activeCategory, setActiveCategory] = useState('2');
  const [searchTerm, setSearchTerm] = useState('');
  const [aiRec, setAiRec] = useState<{recommendedId: string, reasoning: string} | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showPOS, setShowPOS] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', address: '', phone: '' });

  useEffect(() => {
    const loadApiData = async () => {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (!apiUrl || apiUrl.includes('localhost')) {
        return;
      }
      
      try {
        const [cats, prods] = await Promise.all([
          api.getCategories(),
          api.getProducts()
        ]);
        if (cats.length > 0) {
          setCategories(cats);
          setProducts(prods);
        }
      } catch (e) {
        console.log('Using local data');
      }
    };
    loadApiData();
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem('guido_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        localStorage.removeItem('guido_cart');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('guido_cart', JSON.stringify(cart));
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = p.categoryId === activeCategory;
      const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm, products]);

  const handleAiSearch = async () => {
    if (!searchTerm) return;
    setIsAiLoading(true);
    const rec = await getSmartRecommendations(searchTerm);
    setAiRec(rec);
    setIsAiLoading(false);
  };

  const createOrder = (paymentMethod: Order['paymentMethod'] = 'cash') => {
    const orderNumber = `GUIDO-${Math.floor(Math.random() * 9000) + 1000}`;
    const savedOrders = localStorage.getItem('guido_live_orders');
    const orders: Order[] = savedOrders ? JSON.parse(savedOrders) : [];
    const orderItems: OrderItem[] = cart.map(item => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      size: PizzaSize.PERSONAL,
      quantity: item.quantity,
      price: item.price,
      details: item.details
    }));
    
    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNumber,
      userId: 'cliente_web',
      customerName: customerInfo.name || 'Cliente',
      address: customerInfo.address || 'Dirección por confirmar',
      items: orderItems,
      total: cartTotal,
      status: OrderStatus.PENDING,
      createdAt: new Date().toLocaleTimeString(),
      estimatedTime: 30,
      paymentMethod
    };

    const updatedOrders = [...orders, newOrder];
    localStorage.setItem('guido_live_orders', JSON.stringify(updatedOrders));
    
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('new-order-submitted'));
    
    return newOrder;
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowPOS(true);
  };

  const handlePaymentComplete = (response: PaymentResponse) => {
    if (response.success) {
      createOrder('card');
      setCart([]);
      setIsCartOpen(false);
      localStorage.removeItem('guido_cart');
    }
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const addToCart = (product: Product) => {
    const newItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      name: product.nombre,
      price: product.basePrice,
      quantity: 1,
      image: product.image
    };
    setCart(prev => [...prev, newItem]);
  };

  const handleCustomPizzaAdd = (item: CartItem) => {
    setCart(prev => [...prev, item]);
  };

  const renderProductCard = (product: Product) => {
    return (
      <div key={product.id} className="group relative bg-stone-900/40 rounded-[3rem] overflow-hidden border border-white/5 hover:border-orange-500/30 transition-all duration-700 shadow-2xl flex flex-col h-full animate-in fade-in slide-in-from-bottom-5">
        <div className="relative h-[240px] md:h-[280px] overflow-hidden bg-stone-950">
          <img src={product.image} alt={product.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 to-transparent"></div>
          <div className="absolute top-6 right-6 flex flex-col gap-2 items-end">
             {product.isPremium && <span className="bg-stone-950/90 backdrop-blur-xl text-orange-500 text-[8px] font-black uppercase px-5 py-2 rounded-full border border-orange-500/20">PREMIUM D.O.P</span>}
             {product.ahorro && <span className="bg-green-600 text-white text-[8px] font-black uppercase px-5 py-2 rounded-full animate-pulse shadow-lg">AHORRA ${product.ahorro.toLocaleString()}</span>}
          </div>
        </div>
        <div className="p-8 md:p-10 space-y-5 flex-1 flex flex-col">
          <h3 className="text-2xl md:text-3xl font-brand text-stone-100 group-hover:text-orange-500 transition-colors leading-tight">{product.nombre}</h3>
          <p className="text-stone-500 text-xs md:text-sm leading-relaxed italic opacity-80 flex-1">&ldquo;{product.descripcion}&rdquo;</p>
          <div className="flex justify-between items-center pt-6 border-t border-white/5">
            <span className="text-2xl md:text-4xl font-black text-white tracking-tighter">${product.basePrice.toLocaleString()}</span>
            <button onClick={() => addToCart(product)} className="bg-orange-600 hover:bg-orange-500 w-14 h-14 md:w-16 md:h-16 rounded-[1.5rem] flex items-center justify-center transition-all shadow-xl shadow-orange-900/40 transform group-hover:rotate-12"><i className="fas fa-plus text-lg text-white"></i></button>
          </div>
        </div>
      </div>
    );
  };

  const renderCartModal = () => (
    <div className="fixed inset-0 z-[150] bg-stone-950/95 backdrop-blur-xl flex items-center justify-end">
      <div className="w-full max-w-md h-full bg-stone-900 border-l border-white/10 p-6 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-brand text-white">Tu Pedido</h2>
          <button onClick={() => setIsCartOpen(false)} className="text-stone-400 hover:text-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-500">
            <i className="fas fa-shopping-basket text-6xl mb-4 opacity-30"></i>
            <p>Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4">
             {cart.map(item => (
                <div key={item.id} className="flex gap-4 p-4 bg-stone-950 rounded-xl">
                  <img src={item.image || '/assets/images/products/pizza-default.svg'} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{item.name}</h4>
                    <p className="text-orange-500 font-black">${(item.price * item.quantity).toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 bg-stone-800 rounded-full text-white">-</button>
                      <span className="text-white w-8 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 bg-stone-800 rounded-full text-white">+</button>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-stone-500 hover:text-red-500">
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Subtotal</span>
                <span className="text-white font-medium">${cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xl">
                <span className="text-white">Total</span>
                <span className="text-orange-500 font-black text-2xl">${cartTotal.toLocaleString()}</span>
              </div>

              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Tu nombre"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-white placeholder:text-stone-600"
                />
                <input 
                  type="tel"
                  placeholder="Teléfono"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-white placeholder:text-stone-600"
                />
                <input 
                  type="text" 
                  placeholder="Dirección de entrega"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                  className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-white placeholder:text-stone-600"
                />
              </div>

              <button 
                onClick={handleCheckout}
                disabled={!customerInfo.name || !customerInfo.phone}
                className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-stone-700 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all"
              >
                <i className="fas fa-credit-card mr-2"></i>
                Ir a Pagar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      {showPOS && (
        <POS 
          orderId={`GUIDO-${Date.now()}`}
          total={cartTotal}
          customerName={customerInfo.name}
          customerEmail={customerInfo.email || 'cliente@guido.com'}
          onPaymentComplete={handlePaymentComplete}
          onClose={() => setShowPOS(false)}
        />
      )}

      {isCartOpen && renderCartModal()}

      <header className="fixed top-0 left-0 right-0 z-[100] px-6 md:px-10 py-6 md:py-8 flex justify-between items-center bg-stone-950/20 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-600 rounded-[1rem] flex items-center justify-center shadow-xl transform group-hover:rotate-12 transition-transform"><i className="fas fa-pizza-slice text-white text-lg"></i></div>
          <span className="text-2xl md:text-3xl font-brand tracking-tighter">Guido Pizza</span>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          <button onClick={() => setIsCartOpen(true)} className="relative w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-stone-900/80 border border-stone-800 flex items-center justify-center text-stone-400 hover:border-orange-600 transition-all shadow-xl group">
            <i className="fas fa-shopping-basket text-base md:text-lg"></i>
            <span className="absolute -top-3 -right-3 w-5 h-5 md:w-6 md:h-6 bg-orange-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-stone-950 shadow-lg">{cart.length}</span>
          </button>
        </div>
      </header>

      <main>
        <section className="relative min-h-[85vh] flex flex-col items-center justify-center text-center overflow-hidden px-6 pt-32 pb-24">
          <div className="absolute inset-0 w-full h-full">
            <div className="w-full h-full bg-gradient-to-b from-stone-950/20 via-stone-950/80 to-stone-950"></div>
          </div>
          <div className="relative z-10 space-y-12 max-w-5xl">
            <div className="inline-flex items-center gap-3 bg-orange-600/20 border border-orange-500/30 px-6 py-2 rounded-full text-[9px] font-black tracking-[0.4em] text-orange-400 uppercase shadow-2xl animate-pulse"><i className="fas fa-location-dot"></i> Nemocón & Zipaquirá</div>
            <h1 className="text-6xl md:text-[9rem] font-brand text-white leading-none tracking-tighter drop-shadow-2xl">Guido <br/> <span className="text-orange-600 font-brand">Pizza</span></h1>
            <div className="max-w-3xl mx-auto w-full pt-4 px-4">
              <div className="flex bg-stone-900/80 backdrop-blur-3xl rounded-[2rem] md:rounded-[3.5rem] border border-white/10 p-2 shadow-2xl focus-within:border-orange-600 transition-all flex-col sm:flex-row">
                 <div className="flex-1 flex items-center px-6 py-4 sm:py-0">
                   <i className="fas fa-search text-stone-600 mr-4"></i>
                   <input type="text" placeholder="¿Qué buscas hoy? Pídeselo a la IA..." className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-stone-700 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()} />
                 </div>
                 <button onClick={handleAiSearch} disabled={isAiLoading} className="bg-orange-600 hover:bg-orange-500 px-8 py-5 rounded-[1.5rem] md:rounded-[3rem] font-black text-[10px] uppercase tracking-widest text-white shadow-xl transition-all flex items-center justify-center gap-3">
                   {isAiLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
                   <span>IA Recomendación</span>
                 </button>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 md:px-20 pb-40 space-y-20 -mt-20 relative z-20">
          {aiRec && <div className="bg-stone-900/80 backdrop-blur-3xl p-10 rounded-[4rem] border border-orange-500/30 shadow-2xl animate-in zoom-in fade-in duration-700 max-w-4xl mx-auto"><p className="text-xl md:text-2xl text-stone-100 font-light italic leading-relaxed text-center">{aiRec.reasoning}</p></div>}
          <div className="bg-stone-950/40 backdrop-blur-3xl p-4 md:p-8 rounded-[3rem] md:rounded-[4rem] border border-white/5 shadow-2xl">
            <div className="flex flex-wrap justify-center gap-3 md:gap-5">
               {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-3 md:gap-4 px-6 md:px-10 py-4 md:py-6 rounded-full border transition-all duration-500 ${activeCategory === cat.id ? 'bg-orange-600 border-orange-500 text-white shadow-xl scale-105' : 'bg-stone-900/60 border-white/5 text-stone-500 hover:border-white/20 hover:text-stone-300'}`}>
                  <i className={`fas fa-${cat.icon} ${activeCategory === cat.id ? 'text-white' : cat.color} text-base md:text-lg`}></i>
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-12">{filteredProducts.map(product => renderProductCard(product))}</div>
          <div className="pt-32 space-y-20">
            <div className="text-center space-y-6 max-w-2xl mx-auto">
               <h2 className="text-5xl md:text-8xl font-brand leading-none">Crea tu <br/> <span className="text-orange-600 font-brand">Obra Maestra</span></h2>
               <p className="text-stone-500 italic text-lg">Masa fermentada 48h, ingredientes D.O.P e iconos minimalistas IA. Diseña con alma.</p>
            </div>
            <VisualPizzaBuilder onAddToCart={handleCustomPizzaAdd} />
          </div>
        </section>
      </main>
      <footer className="px-6 md:px-10 py-32 border-t border-white/5 bg-[#0a0a0a] text-center">
         <div className="text-4xl font-brand mb-10">Guido <span className="text-orange-600 font-brand">Pizza</span></div>
         <p className="text-[10px] font-black text-stone-800 uppercase tracking-[0.8em]">Mastery in Fermentation & AI Experience</p>
      </footer>
    </div>
  );
};

export default CustomerView;
