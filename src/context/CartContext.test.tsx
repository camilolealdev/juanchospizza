import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  );

  it('starts empty', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.cart).toHaveLength(0);
    expect(result.current.cartCount).toBe(0);
    expect(result.current.cartTotal).toBe(0);
  });

  it('adds an item and recalculates count/total', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart({ productId: 'p1', name: 'Pizza Especial', price: 24900, quantity: 2 });
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cartCount).toBe(2);
    expect(result.current.cartTotal).toBe(49800);
  });

  it('updateQuantity never drops below 1', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart({ productId: 'p1', name: 'Pizza Especial', price: 24900, quantity: 1 });
    });
    const id = result.current.cart[0].id;

    act(() => {
      result.current.updateQuantity(id, -5);
    });

    expect(result.current.cart[0].quantity).toBe(1);
  });

  it('removeFromCart drops the item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart({ productId: 'p1', name: 'Pizza Especial', price: 24900, quantity: 1 });
    });
    const id = result.current.cart[0].id;

    act(() => {
      result.current.removeFromCart(id);
    });

    expect(result.current.cart).toHaveLength(0);
  });

  it('clearCart empties the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addToCart({ productId: 'p1', name: 'A', price: 1000, quantity: 1 });
      result.current.addToCart({ productId: 'p2', name: 'B', price: 2000, quantity: 1 });
    });
    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cart).toHaveLength(0);
  });
});
