// PizzaCRM — Vitest spec for order route helper functions
// Tests the exported pure functions from server/routes/orders.js:
// computeNivel (client tier from spend).
// These are unit-testable WITHOUT a database connection.

import { describe, it, expect } from 'vitest';
import { computeNivel } from './orders.js';

describe('computeNivel (tier from total spend)', () => {
  it('returns bronce for spend < 100000', () => {
    expect(computeNivel(0)).toBe('bronce');
    expect(computeNivel(50000)).toBe('bronce');
    expect(computeNivel(99999)).toBe('bronce');
  });

  it('returns plata for spend between 100000 and 299999', () => {
    expect(computeNivel(100000)).toBe('plata');
    expect(computeNivel(200000)).toBe('plata');
    expect(computeNivel(299999)).toBe('plata');
  });

  it('returns oro for spend between 300000 and 599999', () => {
    expect(computeNivel(300000)).toBe('oro');
    expect(computeNivel(450000)).toBe('oro');
    expect(computeNivel(599999)).toBe('oro');
  });

  it('returns platino for spend >= 600000', () => {
    expect(computeNivel(600000)).toBe('platino');
    expect(computeNivel(1000000)).toBe('platino');
    expect(computeNivel(999999999)).toBe('platino');
  });

  it('handles edge case at exact boundaries', () => {
    expect(computeNivel(99999)).toBe('bronce');
    expect(computeNivel(100000)).toBe('plata');
    expect(computeNivel(300000)).toBe('oro');
    expect(computeNivel(600000)).toBe('platino');
  });
});
