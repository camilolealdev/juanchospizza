import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  details?: string;
  category?: string;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  count: () => number;
}

function loadCart(): CartItem[] {
  try {
    const saved = localStorage.getItem('juanchos_cart');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem('juanchos_cart', JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { items } }));
}

export const useCartStore = create<CartState>((set, get) => ({
  items: loadCart(),

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      let newItems: CartItem[];
      if (existing) {
        newItems = state.items.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
        );
      } else {
        newItems = [...state.items, { ...item, quantity: item.quantity || 1 }];
      }
      saveCart(newItems);
      return { items: newItems };
    });
  },

  removeItem: (id) => {
    set((state) => {
      const newItems = state.items.filter((i) => i.id !== id);
      saveCart(newItems);
      return { items: newItems };
    });
  },

  updateQuantity: (id, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        const newItems = state.items.filter((i) => i.id !== id);
        saveCart(newItems);
        return { items: newItems };
      }
      const newItems = state.items.map((i) => (i.id === id ? { ...i, quantity } : i));
      saveCart(newItems);
      return { items: newItems };
    });
  },

  clearCart: () => {
    saveCart([]);
    set({ items: [] });
  },

  total: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

  count: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
