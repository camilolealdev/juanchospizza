import { describe, it, expect } from 'vitest';
import { createOrderSchema, updateOrderSchema, updateOrderStatusSchema } from './orders.js';

const validOrder = {
  orderNumber: 'GUIDO-1234',
  customerName: 'Juan Pérez',
  customerPhone: '3001234567',
  address: 'Calle 1 # 2-3',
  items: [{ id: 'x', productId: 'p1', name: 'Pizza', quantity: 1, price: 30000 }],
  total: 30000,
};

describe('createOrderSchema', () => {
  it('accepts a well-formed order and applies cash/estimatedTime defaults', () => {
    const result = createOrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
    expect(result.data.paymentMethod).toBe('cash');
    expect(result.data.estimatedTime).toBe(30);
  });

  it('rejects a missing total -- an order with no amount is not valid', () => {
    const { total, ...rest } = validOrder;
    expect(createOrderSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a zero or negative total', () => {
    expect(createOrderSchema.safeParse({ ...validOrder, total: 0 }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...validOrder, total: -100 }).success).toBe(false);
  });

  it('rejects when items is not an array', () => {
    expect(createOrderSchema.safeParse({ ...validOrder, items: 'not-an-array' }).success).toBe(false);
  });

  it('rejects an oversized items payload (mirrors the original 5000-char JSON cap)', () => {
    const hugeItems = Array.from({ length: 500 }, (_, i) => ({
      id: `item-${i}`, productId: `p${i}`, name: 'x'.repeat(50), quantity: 1, price: 1000,
    }));
    expect(createOrderSchema.safeParse({ ...validOrder, items: hugeItems }).success).toBe(false);
  });

  it('allows an empty items array (matches original `!items` truthy-check leniency)', () => {
    expect(createOrderSchema.safeParse({ ...validOrder, items: [] }).success).toBe(true);
  });

  it('accepts an explicit non-default paymentMethod', () => {
    const result = createOrderSchema.safeParse({ ...validOrder, paymentMethod: 'bold' });
    expect(result.data.paymentMethod).toBe('bold');
  });
});

describe('updateOrderSchema (partial)', () => {
  it('leaves untouched fields undefined so the dynamic UPDATE skips them', () => {
    const result = updateOrderSchema.safeParse({ address: 'Nueva dirección' });
    expect(result.success).toBe(true);
    expect(result.data.total).toBeUndefined();
    expect(result.data.paymentMethod).toBeUndefined();
  });

  it('still clamps a provided total', () => {
    const result = updateOrderSchema.safeParse({ total: 5_000_000_000 });
    expect(result.data.total).toBe(999999999);
  });
});

describe('updateOrderStatusSchema', () => {
  it('accepts every real order status', () => {
    for (const status of ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'ASSIGNED', 'DELIVERING', 'COMPLETED', 'CANCELLED']) {
      expect(updateOrderStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects an unknown status with the original error message', () => {
    const result = updateOrderStatusSchema.safeParse({ status: 'BOGUS' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Status inválido');
  });
});
