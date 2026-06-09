import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';

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
  badges: string[];
  sizes?: { label: string; portions: number; sabores: number; price: number }[];
  sabores?: Sabor[];
  baseSabor?: string;
}

interface Sabor {
  name: string;
  ingredients: string[];
}

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  details?: string;
}

const SABORES: Sabor[] = [
  { name: 'Hawaiana', ingredients: ['Piña', 'Jamón'] },
  { name: 'Pollo y Champiñones', ingredients: ['Jamón', 'Champiñones', 'Pollo Desmechado'] },
  { name: 'Carnes', ingredients: ['Jamón', 'Salami', 'Cábano'] },
  { name: 'Costillitas BBQ', ingredients: ['Jamón', 'Costillas BBQ', 'Maíz Tierno'] },
  { name: 'Criolla', ingredients: ['Carne Desmechada', 'Maíz Tierno'] },
  { name: 'Mexicana', ingredients: ['Carne Molida', 'Maíz', 'Tomate', 'Cilantro', 'Tostacos'] },
  { name: 'Ranchera', ingredients: ['Champiñones', 'Cebolla', 'Maíz', 'Chorizo'] },
  { name: 'De La Casa', ingredients: ['Champiñones', 'Cebolla', 'Carne Desmechada'] },
  { name: 'Española', ingredients: ['Espinaca', 'Tocineta', 'Maíz', 'Champiñones'] },
  { name: 'Napolitana', ingredients: ['Tomate', 'Orégano'] },
  { name: 'Vegetariana', ingredients: ['Champiñones', 'Maíz', 'Cebolla'] },
  { name: 'Tropical', ingredients: ['Cerezas', 'Piña', 'Duraznos', 'Uvas Pasas'] },
  { name: 'Queso y Bocadillo', ingredients: ['Queso', 'Bocadillo'] },
];

const PIZZA_SIZES = [
  { label: 'Small', portions: 4, sabores: 1, price: 30000 },
  { label: 'Junior', portions: 6, sabores: 2, price: 42000 },
  { label: 'Mediana', portions: 8, sabores: 2, price: 52000 },
  { label: 'Familiar', portions: 10, sabores: 3, price: 88000 },
];

const PRODUCTS: MenuProduct[] = [
  { id: 'p-ej', category: 'pizzas', name: 'Pizza Especial Juancho\'s', description: 'La insignia de la casa. Un balance perfecto entre crujido y suavidad artesanal.', price: 30000, image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80', ingredients: ['Salsa de tomate casera', 'Queso mozzarella', 'Pepperoni curado', 'Champiñones frescos', 'Aceitunas', 'Pimentón'], badges: ['Más Vendido', 'De la Casa'], sizes: PIZZA_SIZES, sabores: SABORES },
  { id: 'p-h', category: 'pizzas', name: 'Pizza Hawaiana', description: 'La clásica combinación tropical que nunca falla.', price: 30000, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80', ingredients: ['Piña', 'Jamón'], badges: ['Clásica', 'Más Vendido'], sizes: PIZZA_SIZES, sabores: SABORES, baseSabor: 'Hawaiana' },
  { id: 'p-pc', category: 'pizzas', name: 'Pizza Pollo y Champiñones', description: 'La combinación perfecta de pollo y champiñones.', price: 30000, image: 'https://images.unsplash.com/photo-1555109307-f7d9da25c244?auto=format&fit=crop&w=600&q=80', ingredients: ['Jamón', 'Champiñones', 'Pollo Desmechado'], badges: ['Recomendado'], sizes: PIZZA_SIZES, sabores: SABORES, baseSabor: 'Pollo y Champiñones' },
  { id: 'p-c', category: 'pizzas', name: 'Pizza Carnes', description: 'Para los amantes de la carne, una explosión de sabor.', price: 30000, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80', ingredients: ['Jamón', 'Salami', 'Cábano'], badges: ['Especial'], sizes: PIZZA_SIZES, sabores: SABORES, baseSabor: 'Carnes' },
  { id: 'p-cb', category: 'pizzas', name: 'Pizza Costillitas BBQ', description: 'Costillitas bañadas en BBQ con maíz tierno.', price: 30000, image: 'https://images.unsplash.com/photo-1566853923569-3c0eb2e79edf?auto=format&fit=crop&w=600&q=80', ingredients: ['Jamón', 'Costillas BBQ', 'Maíz Tierno'], badges: ['Especial'], sizes: PIZZA_SIZES, sabores: SABORES, baseSabor: 'Costillitas BBQ' },
  { id: 'p-cr', category: 'pizzas', name: 'Pizza Criolla', description: 'El sabor criollo que nos identifica.', price: 30000, image: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=600&q=80', ingredients: ['Carne Desmechada', 'Maíz Tierno'], badges: ['De la Casa'], sizes: PIZZA_SIZES, sabores: SABORES, baseSabor: 'Criolla' },
  { id: 'p-m', category: 'pizzas', name: 'Pizza Mexicana', description: 'Un viaje de sabores intensos y picantes.', price: 30000, image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80', ingredients: ['Carne Molida', 'Maíz', 'Tomate', 'Cilantro', 'Tostacos'], badges: ['Clásica', 'Especial'], sizes: PIZZA_SIZES, sabores: SABORES, baseSabor: 'Mexicana' },
  { id: 'p-r', category: 'pizzas', name: 'Pizza Ranchera', description: 'El sabor del campo en cada rebanada.', price: 30000, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80', ingredients: ['Champiñones', 'Cebolla', 'Maíz', 'Chorizo'], badges: ['Recomendado'], sizes: PIZZA_SIZES, sabores: SABORES, baseSabor: 'Ranchera' },
  { id: 'p-dlc', category: 'pizzas', name: 'Pizza De La Casa', description: 'Nuestra creación estrella con ingredientes selectos.', price: 30000, image: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=600&q=80', ingredients: ['Champiñones', 'Cebolla', 'Carne Desmechada'], badges: ['Recomendado', 'De la Casa'], sizes: PIZZA_SIZES, sabores: SABORES, baseSabor: 'De La Casa' },
  { id: 'p-e', category: 'pizzas', name: 'Pizza Española', description: 'Un sabor mediterráneo con espinaca y tocineta.', price: 30000, image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80', ingredients: ['Espinaca', 'Tocineta', 'Maíz', 'Champiñones'], badges: ['Especial'], sizes: PIZZA_SIZES, sabores: SABORES, baseSabor: 'Española' },
  { id: 'p-n', category: 'pizzas', name: 'Pizza Napolitana', description: 'La sencillez perfecta: tomate y orégano.', price: 30000, image: 'https://images.unsplash.com/photo-1588315029754-2dd089d39a07?auto=format&fit=crop&w=600&q=80', ingredients: ['Tomate', 'Orégano'], badges: ['Clásica'], sizes: PIZZA_SIZES, sabores: SABORES, baseSabor: 'Napolitana' },
  { id: 'p-v', category: 'pizzas', name: 'Pizza Vegetariana', description: 'La opción más fresca y saludable del menú.', price: 30000, image: 'https://images.unsplash.com/photo-1604917877934-07d8d248d396?auto=format&fit=crop&w=600&q=80', ingredients: ['Champiñones', 'Maíz', 'Cebolla'], badges: ['Vegetariano'], sizes: PIZZA_SIZES, sabores: SABORES, baseSabor: 'Vegetariana' },
  { id: 'p-t', category: 'pizzas', name: 'Pizza Tropical', description: 'Dulce y salada, la combinación perfecta.', price: 30000, image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=600&q=80', ingredients: ['Cerezas', 'Piña', 'Duraznos', 'Uvas Pasas'], badges: ['Especial'], sizes: PIZZA_SIZES, sabores: SABORES, baseSabor: 'Tropical' },
  { id: 'p-qb', category: 'pizzas', name: 'Pizza Queso y Bocadillo', description: 'La combinación colombiana por excelencia.', price: 30000, image: 'https://images.unsplash.com/photo-1512152272829-e3139592d56f?auto=format&fit=crop&w=600&q=80', ingredients: ['Queso', 'Bocadillo'], badges: ['Clásica'], sizes: PIZZA_SIZES, sabores: SABORES, baseSabor: 'Queso y Bocadillo' },
  { id: 'h1', category: 'hamburguesas', subcategory: 'De La Casa', name: 'Hamburguesa de la Casa', description: 'Grande, jugosa y pecaminosa. Hecha con fuego, pasión y mística urbana.', price: 13500, priceCombo: 18500, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80', ingredients: ['Carne artesanal de res 150g', 'Queso cheddar doble', 'Vegetales frescos', 'Salsas especiales', 'Pan brioche'], badges: ['Más Vendido', 'De la Casa'] },
  { id: 'h2', category: 'hamburguesas', subcategory: 'Tradicionales', name: 'Hamburguesa Clásica', description: 'La tradicional de toda la vida con ingredientes frescos.', price: 10900, priceCombo: 15900, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80', ingredients: ['Carne de res', 'Lechuga', 'Tomate', 'Cebolla', 'Salsa de la casa'], badges: ['Clásica'] },
  { id: 'h3', category: 'hamburguesas', subcategory: 'Apanadas', name: 'Hamburguesa Apanada', description: 'Crujiente por fuera, jugosa por dentro. La favorita.', price: 14900, priceCombo: 19900, image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80', ingredients: ['Carne apanada', 'Queso', 'Lechuga', 'Tomate', 'Salsas especiales'], badges: ['Especial'] },
  { id: 'pr1', category: 'perros', name: 'Perro Sencillo', description: 'El clásico perro caliente con lo esencial.', price: 8500, priceCombo: 12000, image: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=600&q=80', ingredients: ['Salchicha', 'Pan', 'Salsa de tomate', 'Mostaza', 'Kétchup'], badges: [] },
  { id: 'pr2', category: 'perros', name: 'Perro Especial', description: 'Con todos los ingredientes que te encantan.', price: 12000, priceCombo: 16000, image: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=600&q=80', ingredients: ['Salchicha', 'Pan', 'Queso', 'Tocineta', 'Piña', 'Salsas'], badges: ['Más Vendido'] },
  { id: 'pr3', category: 'perros', name: 'Perro Supremo', description: 'La experiencia completa con ingredientes premium.', price: 16000, priceCombo: 21000, image: 'https://images.unsplash.com/photo-1619740455993-9e612b1af08a?auto=format&fit=crop&w=600&q=80', ingredients: ['Salchicha', 'Pan artesanal', 'Queso mozzarella', 'Tocineta', 'Piña', 'Maíz', 'Salsas especiales'], badges: ['Recomendado'] },
  { id: 's1', category: 'salchipapas', name: 'Salchipapas Clásicas', description: 'Papas crujientes con salchicha y salsas.', price: 9500, image: 'https://images.unsplash.com/photo-1624378420232-d5f1341b5c37?auto=format&fit=crop&w=600&q=80', ingredients: ['Papas a la francesa', 'Salchicha', 'Salsa de tomate', 'Mostaza', 'Mayonesa'], badges: [] },
  { id: 's2', category: 'salchipapas', name: 'Salchipapas Super Especial', description: 'La experiencia definitiva en salchipapas.', price: 18000, image: 'https://images.unsplash.com/photo-1624378420232-d5f1341b5c37?auto=format&fit=crop&w=600&q=80', ingredients: ['Papas a la francesa', 'Salchicha', 'Queso gratinado', 'Tocineta', 'Maíz', 'Salsas especiales', 'Aguacate'], badges: ['Recomendado', 'Especial'] },
  { id: 'l1', category: 'lasañas', name: 'Lasaña Súper Mixta', description: 'Dorada a la perfección con una capa crujiente de queso parmesano.', price: 18500, image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=600&q=80', ingredients: ['Capas de pasta artesanal', 'Carne boloñesa', 'Pollo desmechado', 'Salsa bechamel', 'Queso gratinado'], badges: ['Más Vendido'] },
  { id: 'l2', category: 'lasañas', name: 'Lasaña Vegetariana', description: 'Capas de verduras frescas con queso gratinado.', price: 16000, image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=600&q=80', ingredients: ['Capas de pasta', 'Espinaca', 'Champiñones', 'Zanahoria', 'Salsa bechamel', 'Queso'], badges: ['Vegetariano'] },
  { id: 'l3', category: 'lasañas', name: 'Lasaña de Pollo', description: 'Suave pollo desmechado entre capas de pasta y queso.', price: 17000, image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=600&q=80', ingredients: ['Pollo desmechado', 'Capas de pasta', 'Salsa cremosa', 'Queso mozzarella'], badges: ['De la Casa'] },
  { id: 'sp1', category: 'spaghettis', name: 'Spaguetti a la Boloñesa', description: 'El verdadero comfort food de barrio. Sabor denso, casero y entrañable.', price: 15900, image: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=600&q=80', ingredients: ['Pasta italiana al dente', 'Salsa de carne receta original', 'Especias aromáticas', 'Albahaca', 'Queso parmesano'], badges: ['Más Vendido'] },
  { id: 'sp2', category: 'spaghettis', name: 'Spaguetti Alfredo', description: 'Pasta en salsa cremosa con pollo y champiñones.', price: 17500, image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=600&q=80', ingredients: ['Pasta italiana', 'Salsa Alfredo', 'Pollo', 'Champiñones', 'Queso parmesano'], badges: ['Recomendado'] },
  { id: 'sp3', category: 'spaghettis', name: 'Spaguetti Tropical', description: 'Una explosión de sabores dulces y salados.', price: 16500, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=600&q=80', ingredients: ['Pasta', 'Piña', 'Jamón', 'Salsa de la casa', 'Queso'], badges: ['Especial'] },
  { id: 'e1', category: 'especialidades', name: 'Alitas BBQ', description: 'Alitas bañadas en salsa BBQ ahumada.', price: 22000, image: 'https://images.unsplash.com/photo-1608039829572-9e18f2cf88d2?auto=format&fit=crop&w=600&q=80', ingredients: ['Alitas de pollo', 'Salsa BBQ ahumada', 'Acompañamiento de papas'], badges: ['Recomendado'] },
  { id: 'e2', category: 'especialidades', name: 'Nachos Supremos', description: 'Totopos bañados en queso con carne y guacamole.', price: 19000, image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80', ingredients: ['Totopos', 'Queso cheddar', 'Carne molida', 'Guacamole', 'Crema', 'Pico de gallo'], badges: ['Especial'] },
  { id: 'e3', category: 'especialidades', name: 'Papa Asada Rellena', description: 'Papa grande rellena de carne, queso y salsas.', price: 16000, image: 'https://images.unsplash.com/photo-1624378420232-d5f1341b5c37?auto=format&fit=crop&w=600&q=80', ingredients: ['Papa asada', 'Carne desmechada', 'Queso', 'Maíz', 'Salsas especiales'], badges: [] },
  { id: 'e4', category: 'especialidades', name: 'Costillas BBQ', description: 'Costillas de cerdo bañadas en salsa BBQ ahumada.', price: 32000, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80', ingredients: ['Costillas de cerdo', 'Salsa BBQ', 'Papas', 'Ensarta de verduras'], badges: ['Especial'] },
];

const CATEGORIES = [
  { id: 'pizzas', label: 'Pizzas', icon: 'fa-pizza-slice' },
  { id: 'hamburguesas', label: 'Hamburguesas', icon: 'fa-burger' },
  { id: 'perros', label: 'Perros', icon: 'fa-hotdog' },
  { id: 'salchipapas', label: 'Salchipapas', icon: 'fa-plate-wheat' },
  { id: 'lasañas', label: 'Lasañas', icon: 'fa-cubes' },
  { id: 'spaghettis', label: 'Spaghettis', icon: 'fa-utensils' },
  { id: 'especialidades', label: 'Especialidades', icon: 'fa-star' },
];

const CROSS_SELL: Record<string, { id: string; name: string; price: number; image: string }[]> = {
  pizzas: [
    { id: 'cs1', name: 'Gaseosa Personal', price: 3000, image: 'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?auto=format&fit=crop&w=200&q=80' },
    { id: 'cs2', name: 'Papas con Queso', price: 8000, image: 'https://images.unsplash.com/photo-1624378420232-d5f1341b5c37?auto=format&fit=crop&w=200&q=80' },
    { id: 'cs3', name: 'Salsa de la Casa', price: 3000, image: '' },
  ],
  hamburguesas: [
    { id: 'cs4', name: 'Combo Completo', price: 5000, image: '' },
  ],
  default: [
    { id: 'cs5', name: 'Gaseosa Litro', price: 5000, image: 'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?auto=format&fit=crop&w=200&q=80' },
    { id: 'cs6', name: 'Porción de Papas', price: 5000, image: '' },
  ],
};

const BADGE_STYLES: Record<string, string> = {
  'Más Vendido': 'bg-rose-600 text-white',
  'Recomendado': 'bg-amber-600 text-white',
  'Especial': 'bg-violet-600 text-white',
  'Nuevo': 'bg-emerald-600 text-white',
  'Promoción': 'bg-orange-600 text-white',
  'Vegetariano': 'bg-green-700 text-white',
  'De la Casa': 'bg-red-700 text-white',
  'Clásica': 'bg-stone-600 text-white',
};

const MenuDigital: React.FC<{ onClose?: () => void; variant?: 'overlay' | 'section' }> = ({ onClose, variant = 'overlay' }) => {
  const [activeCategory, setActiveCategory] = useState('pizzas');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('todos');
  const [showCart, setShowCart] = useState(false);
  const [showPizzaBuilder, setShowPizzaBuilder] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState(PIZZA_SIZES[1]);
  const [selectedSabores, setSelectedSabores] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState('');
  const [showCrossSell, setShowCrossSell] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const { cart, cartCount, cartTotal, addToCart: contextAddToCart, removeFromCart, updateQuantity } = useCart();

  const filteredProducts = useMemo(() => {
    let items = PRODUCTS.filter(p => p.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.ingredients.some(i => i.toLowerCase().includes(q)) ||
        p.description.toLowerCase().includes(q)
      );
    }
    if (activeFilter === 'mas-vendidos') items = items.filter(p => p.badges.includes('Más Vendido'));
    else if (activeFilter === 'especiales') items = items.filter(p => p.badges.includes('Especial'));
    else if (activeFilter === 'promociones') items = items.filter(p => p.badges.includes('Promoción'));
    else if (activeFilter === 'vegetarianos') items = items.filter(p => p.badges.includes('Vegetariano'));
    else if (activeFilter === 'de-la-casa') items = items.filter(p => p.badges.includes('De la Casa'));
    else if (activeFilter === 'nuevos') items = items.filter(p => p.badges.includes('Nuevo'));
    return items;
  }, [activeCategory, searchQuery, activeFilter]);

  const addToCart = useCallback((product: MenuProduct, size?: string, sabores?: string[], details?: string) => {
    let price = product.price;
    if (size && product.sizes) {
      const sz = product.sizes.find(s => s.label === size);
      if (sz) price = sz.price;
    }
    contextAddToCart({ productId: product.id, name: product.name, price, quantity: 1, details });
    setShowSuccess(product.name);
    setTimeout(() => setShowSuccess(''), 2000);
    setShowCrossSell(product.category);
    setTimeout(() => setShowCrossSell(null), 5000);
  }, [contextAddToCart]);

  const openPizzaBuilder = useCallback((product: MenuProduct) => {
    setShowPizzaBuilder(product.id);
    setSelectedSize(PIZZA_SIZES[1]);
    setSelectedSabores(product.baseSabor ? [product.baseSabor] : []);
  }, []);

  const handleAddPizza = useCallback(() => {
    if (!showPizzaBuilder) return;
    const product = PRODUCTS.find(p => p.id === showPizzaBuilder);
    if (!product || selectedSabores.length === 0) return;
    const details = `${selectedSize.label} · ${selectedSabores.join(', ')}`;
    addToCart(product, selectedSize.label, selectedSabores, details);
    setShowPizzaBuilder(null);
  }, [showPizzaBuilder, selectedSize, selectedSabores, addToCart]);

  const whatsappMessage = useMemo(() => {
    const items = cart.map(i => `• ${i.quantity}x ${i.name}${i.details ? ` (${i.details})` : ''} — $${(i.price * i.quantity).toLocaleString()}`).join('\n');
    return `Hola Juanchos Pizza! 🍕\n\nQuiero realizar el siguiente pedido:\n\n${items}\n\n━━━━━━━━━━━━━\n💵 Total estimado: $${cartTotal.toLocaleString()}\n\n👤 Nombre: ${customerName || '________'}\n📍 Dirección: ${customerAddress || '________'}\n\n¡Gracias! 🎉`;
  }, [cart, cartTotal, customerName, customerAddress]);

  const handleWhatsApp = useCallback(() => {
    const url = `https://wa.me/573117074843?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
  }, [whatsappMessage]);

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
    if (isOverlay) {
      document.body.style.overflow = 'hidden';
    }
    return () => { window.removeEventListener('keydown', handleEsc); if (isOverlay) document.body.style.overflow = ''; };
  }, [onClose, showPizzaBuilder, showCart, isOverlay]);

  const crossSellItems = CROSS_SELL[activeCategory] || CROSS_SELL.default;

  return (
    <motion.div
      {...(isOverlay ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : {})}
      className={isOverlay ? "fixed inset-0 z-[9995] bg-[#F4EFEA] overflow-y-auto overscroll-behavior-contain" : "bg-[#F4EFEA] min-h-screen scroll-mt-16 animate-fade-in"}
      id={isOverlay ? undefined : 'menu'}
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-[#F4EFEA]/95 backdrop-blur-xl border-b border-[#8B572A]/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOverlay && (
              <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[#8B572A]/10 flex items-center justify-center text-[#8B572A] hover:bg-[#8B572A]/20 transition-all">
                <i className="fas fa-arrow-left text-sm"></i>
              </button>
            )}
            <div>
              <h1 className="text-xl font-black text-[#1A1A1A]" style={{ fontFamily: "'Bitter', serif" }}>Nuestro Menú</h1>
              <p className="text-[10px] text-[#8B572A]/70 font-semibold uppercase tracking-widest">{isOverlay ? 'Descubre y pide desde aquí' : 'Explora, elige y pide desde aquí'}</p>
            </div>
          </div>
          <button onClick={() => setShowCart(true)} className="relative w-10 h-10 rounded-xl bg-[#C0392B] flex items-center justify-center text-white hover:bg-[#962D22] transition-all">
            <i className="fas fa-basket-shopping text-sm"></i>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#F9DC5C] text-[#1A1A1A] flex items-center justify-center text-[10px] font-black shadow-lg">{cartCount}</span>
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
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B572A]/40 hover:text-[#C0392B] transition-colors">
              <i className="fas fa-times"></i>
            </button>
          )}
        </motion.div>

        {/* Category Tabs */}
        <div className="relative mb-6">
          <button onClick={() => scrollTab(-1)} className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-[#F4EFEA] to-transparent flex items-center justify-start md:hidden">
            <i className="fas fa-chevron-left text-[10px] text-[#8B572A]/50"></i>
          </button>
          <div ref={tabsRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setActiveFilter('todos'); }}
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
          <button onClick={() => scrollTab(1)} className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-[#F4EFEA] to-transparent flex items-center justify-end md:hidden">
            <i className="fas fa-chevron-right text-[10px] text-[#8B572A]/50"></i>
          </button>
        </div>

        {/* Filters */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'mas-vendidos', label: 'Más vendidos' },
            { id: 'especiales', label: 'Especiales' },
            { id: 'de-la-casa', label: 'De la casa' },
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
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {product.badges.map(b => (
                      <span key={b} className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${BADGE_STYLES[b] || 'bg-stone-800 text-white'}`}>
                        {b}
                      </span>
                    ))}
                  </div>
                  {product.priceCombo && (
                    <div className="absolute top-3 right-3 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[8px] font-bold">
                      -${(product.priceCombo - product.price).toLocaleString()} en combo
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-base font-black text-[#1A1A1A] mb-1">{product.name}</h3>
                  <p className="text-[11px] text-[#8B572A]/70 leading-relaxed mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {product.ingredients.slice(0, 4).map((ing, i) => (
                      <span key={i} className="px-2 py-0.5 bg-[#8B572A]/8 rounded-full text-[8px] font-medium text-[#8B572A]/60">{ing}</span>
                    ))}
                    {product.ingredients.length > 4 && <span className="text-[8px] text-[#8B572A]/40 font-bold">+{product.ingredients.length - 4}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xl font-black text-[#C0392B]">${product.price.toLocaleString()}</span>
                      {product.priceCombo && (
                        <span className="block text-[10px] font-bold text-emerald-600">Combo: ${product.priceCombo.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {product.sizes ? (
                        <button onClick={() => openPizzaBuilder(product)} className="px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-[9px] font-bold uppercase tracking-wider hover:bg-[#C0392B] transition-all shadow-lg shadow-black/10">
                          <i className="fas fa-sliders mr-1.5"></i>Personalizar
                        </button>
                      ) : (
                        <>
                          <button onClick={() => addToCart(product)} className="px-4 py-2.5 bg-[#C0392B] text-white rounded-xl text-[9px] font-bold uppercase tracking-wider hover:bg-[#962D22] transition-all shadow-lg shadow-[#C0392B]/20">
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
        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <i className="fas fa-search text-4xl text-[#8B572A]/20 mb-4"></i>
            <p className="text-[#8B572A]/50 font-bold text-sm">No encontramos productos con ese filtro</p>
          </div>
        )}
      </div>

      {/* Pizza Builder Modal */}
      <AnimatePresence>
        {showPizzaBuilder && (() => {
          const product = PRODUCTS.find(p => p.id === showPizzaBuilder);
          if (!product) return null;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowPizzaBuilder(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#8B572A]/10"
              >
                <div className="relative h-48 bg-[#F4EFEA]">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  <button onClick={() => setShowPizzaBuilder(null)} className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-all">
                    <i className="fas fa-times text-xs"></i>
                  </button>
                  <div className="absolute bottom-4 left-4">
                    <h2 className="text-2xl font-black text-white drop-shadow-lg" style={{ fontFamily: "'Bitter', serif" }}>{product.name}</h2>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                  {/* Size Selector */}
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B572A]/60 mb-3 block">Tamaño</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                    {PIZZA_SIZES.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => setSelectedSize(s)}
                        className={`p-4 sm:p-3 rounded-2xl border-2 text-center transition-all ${
                          selectedSize.label === s.label
                            ? 'border-[#C0392B] bg-[#C0392B]/5 text-[#C0392B]'
                            : 'border-[#8B572A]/10 text-[#8B572A]/40 hover:border-[#8B572A]/20'
                        }`}
                      >
                        <div className="text-xs font-black">{s.label}</div>
                        <div className="text-[9px] font-semibold mt-0.5">{s.portions} porc</div>
                        <div className="text-[9px] font-semibold">{s.sabores} sabor{ s.sabores > 1 ? 'es' : ''}</div>
                        <div className="text-xs font-black mt-1 text-[#C0392B]">${s.price.toLocaleString()}</div>
                      </button>
                    ))}
                  </div>

                  {/* Sabor Selector */}
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B572A]/60 mb-3 block">
                    Sabores {selectedSize.sabores > 1 ? `(elige ${selectedSize.sabores})` : '(elige 1)'}
                    <span className="ml-2 text-[#C0392B]">{selectedSabores.length}/{selectedSize.sabores}</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                    {(product.sabores || SABORES).map((sabor) => {
                      const isBase = sabor.name === product.baseSabor;
                      const isSelected = selectedSabores.includes(sabor.name);
                      const isMaxed = selectedSabores.length >= selectedSize.sabores && !isSelected;
                      const isDisabled = !isBase && isMaxed && !isSelected;
                      return (
                        <button
                          key={sabor.name}
                          onClick={() => {
                            if (isBase) return;
                            if (isSelected) setSelectedSabores(prev => prev.filter(s => s !== sabor.name));
                            else if (!isMaxed) setSelectedSabores(prev => [...prev, sabor.name]);
                          }}
                          disabled={isDisabled}
                          className={`p-3 rounded-2xl border-2 text-left transition-all ${
                            isSelected
                              ? 'border-[#C0392B] bg-[#C0392B]/5'
                              : isDisabled
                                ? 'border-[#8B572A]/5 opacity-40'
                                : 'border-[#8B572A]/10 hover:border-[#8B572A]/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black ${
                              isSelected ? 'bg-[#C0392B] text-white' : 'bg-[#8B572A]/10 text-[#8B572A]/40'
                            }`}>
                              {isSelected ? <i className="fas fa-check"></i> : <i className="fas fa-pizza-slice"></i>}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-[#1A1A1A]">{sabor.name}</div>
                              <div className="text-[9px] text-[#8B572A]/60">{sabor.ingredients.join(' · ')}</div>
                              {isBase && <span className="text-[8px] font-bold text-[#C0392B]">Sabor base</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={handleAddPizza}
                    disabled={selectedSabores.length === 0}
                    className="w-full py-4 bg-[#C0392B] text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-[#962D22] transition-all shadow-lg shadow-[#C0392B]/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-plus mr-2"></i>Agregar al pedido · ${selectedSize.price.toLocaleString()}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col overscroll-behavior-contain"
            >
              {/* Cart Header */}
              <div className="p-6 border-b border-[#8B572A]/10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-[#1A1A1A]" style={{ fontFamily: "'Bitter', serif" }}>Tu Pedido</h2>
                  <p className="text-[11px] text-[#8B572A]/60 font-medium">{cartCount} producto{cartCount !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowCart(false)} className="w-9 h-9 rounded-xl bg-[#8B572A]/10 flex items-center justify-center text-[#8B572A] hover:bg-[#8B572A]/20 transition-all">
                  <i className="fas fa-times text-xs"></i>
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
                    <motion.div key={item.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4 p-4 rounded-2xl bg-[#F4EFEA]/60 border border-[#8B572A]/8">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-[#1A1A1A]">{item.name}</h4>
                        {item.details && <p className="text-[10px] text-[#8B572A]/60 mt-0.5">{item.details}</p>}
                        <p className="text-sm font-black text-[#C0392B] mt-1">${(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-lg bg-white border border-[#8B572A]/10 flex items-center justify-center text-[10px] text-[#8B572A] hover:bg-[#C0392B] hover:text-white transition-all">
                          <i className="fas fa-minus"></i>
                        </button>
                        <span className="text-xs font-black text-[#1A1A1A] w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-lg bg-white border border-[#8B572A]/10 flex items-center justify-center text-[10px] text-[#8B572A] hover:bg-[#C0392B] hover:text-white transition-all">
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all">
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
                    <span className="text-base font-black text-[#1A1A1A]" style={{ fontFamily: "'Bitter', serif" }}>Total</span>
                    <span className="text-2xl font-black text-[#C0392B]">${cartTotal.toLocaleString()}</span>
                  </div>

                  {/* Checkout Form */}
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Tu nombre *"
                      className="w-full bg-[#F4EFEA]/60 border border-[#8B572A]/10 rounded-xl p-3.5 text-sm font-medium text-[#1A1A1A] outline-none focus:border-[#C0392B]/30 transition-all placeholder:text-[#8B572A]/30"
                    />
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Dirección de entrega *"
                      className="w-full bg-[#F4EFEA]/60 border border-[#8B572A]/10 rounded-xl p-3.5 text-sm font-medium text-[#1A1A1A] outline-none focus:border-[#C0392B]/30 transition-all placeholder:text-[#8B572A]/30"
                    />
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
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 right-6 z-40 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <i className="fas fa-check-circle"></i>
            <span className="text-sm font-bold">{showSuccess} agregado</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cross-sell Toast */}
      <AnimatePresence>
        {showCrossSell && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-44 right-6 z-40 bg-white border border-[#8B572A]/10 rounded-2xl shadow-2xl p-4 max-w-xs"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B572A]/60 mb-3">Complementa tu pedido</p>
            <div className="space-y-2">
              {crossSellItems.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    const prod = { id: item.id, category: activeCategory, name: item.name, description: '', price: item.price, image: item.image, ingredients: [], badges: [] };
                    addToCart(prod);
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#F4EFEA]/60 transition-all"
                >
                  {item.image ? (
                    <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#8B572A]/10 flex items-center justify-center text-[#8B572A]/40"><i className="fas fa-plus"></i></div>
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
