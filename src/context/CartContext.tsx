import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  details?: string;
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
    __pizzaBuilderAddToCart?: (name: string) => void;
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);

  useEffect(() => {
    localStorage.setItem('juanchos_cart', cartCount.toString());
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: cartCount }));
  }, [cartCount]);

  const addToCart = useCallback((item: Omit<CartItem, 'id'>) => {
    const id = item.productId + '-' + Date.now();
    setCart(prev => [...prev, { ...item, id }]);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Expose global bridge for vanilla pizza builder
  useEffect(() => {
    window.__pizzaBuilderAddToCart = (name: string) => {
      const id = 'pizza-builder-' + Date.now();
      setCart(prev => {
        const next = [...prev, { id, productId: 'pizza-builder', name, price: 0, quantity: 1, details: 'Pizza personalizada' }];
        const count = next.reduce((s, i) => s + i.quantity, 0);
        localStorage.setItem('juanchos_cart', count.toString());
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: count }));
        return next;
      });
    };
    return () => { delete window.__pizzaBuilderAddToCart; };
  }, []);

  return (
    <CartContext.Provider value={{ cart, cartCount, cartTotal, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
