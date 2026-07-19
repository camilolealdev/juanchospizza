import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';

// Mantener shape sincronizado con src/types/index.ts CartItem. El `size?: string`
// lleva el label real del tamaño que eligió el cliente (small/junior/mediana/
// familiar). Antes del fix se perdía acá y OrderItem.size siempre salía como
// PizzaSize.PERSONAL, así que pizzas Familiares viajaban a cocina con el
// shape viejo.
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  details?: string;
  size?: string;
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType>({
  cart: [],
  cartCount: 0,
  cartTotal: 0,
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
});

export const useCart = () => useContext(CartContext);

declare global {
  interface Window {
    __pizzaBuilderAddToCart?: (name: string, details?: string, size?: string) => void;
  }
}

const CART_ITEMS_KEY = 'juanchos_cart_items';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 'juanchos_cart' (below) only ever stored the item COUNT, read by the
  // vanilla-JS badge counter in index.html -- the actual cart contents were
  // never persisted, so refreshing the page silently emptied the cart. This
  // second key stores the real array; the count key stays untouched so the
  // vanilla counter keeps working as-is.
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_ITEMS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);

  useEffect(() => {
    localStorage.setItem(CART_ITEMS_KEY, JSON.stringify(cart));
    localStorage.setItem('juanchos_cart', cartCount.toString());
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: cartCount }));
  }, [cart, cartCount]);

  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    const id = item.productId + '-' + Date.now();
    setCart((prev) => [...prev, { ...item, id }]);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Expose global bridge for vanilla pizza builder (accepts optional details/ingredients)
  useEffect(() => {
    window.__pizzaBuilderAddToCart = (name: string, details?: string, size?: string) => {
      // Read actual price from the DOM (set by vanilla pizza builder)
      const priceEl = document.getElementById('priceDisplay');
      const priceText = priceEl?.textContent || '$0';
      const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 30000;

      // Use passed details (which now includes ingredients) or fall back to dough name
      const doughEl = document.getElementById('doughName');
      const dough = doughEl?.textContent || 'Personalizada';
      const itemDetails = details || `Pizza artesanal · ${dough}`;
      // IMPORTANTE: no defaultear size a 'small' acá (decisión del code-review).
      // Si `public/pizza-builder.js` renderiza un Familiar de $88k y olvida
      // pasar size, falsificarlo a 'small' silenciaría el OrderItem.size como
      // 'small' en cocina (mismatch precio/tamaño). Mejor que item.size quede
      // undefined y MenuDigital.buildOrderDraft caiga al fallback legacy
      // (PizzaSize.PERSONAL) — menos mentiroso que mentir sobre el size nuevo.
      // TODO: actualizar public/pizza-builder.js para que SIEMPRE pase size
      // cuando llame al bridge acá y este default-relaxation ya no sea
      // necesario.
      const itemSize = size;

      const id = 'pizza-builder-' + Date.now();
      setCart((prev) => {
        const next = [
          ...prev,
          { id, productId: 'pizza-builder', name, price, quantity: 1, details: itemDetails, size: itemSize },
        ];
        const count = next.reduce((s, i) => s + i.quantity, 0);
        localStorage.setItem('juanchos_cart', count.toString());
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: count }));
        return next;
      });
    };
    return () => {
      delete window.__pizzaBuilderAddToCart;
    };
  }, []);

  return (
    <CartContext.Provider value={{ cart, cartCount, cartTotal, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
