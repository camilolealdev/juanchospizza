import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  str, strOpt, strDefault,
  clampedNumber, clampedNumberOpt, clampedNumberDefaultOnUndef,
  bool, boolOpt,
  requiredPositiveNumber,
} from './helpers.js';

describe('str()', () => {
  const schema = z.object({ name: str(10) });

  it('rejects a missing field with the given message', () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Faltan datos requeridos');
  });

  it('rejects an empty string with the same message', () => {
    const result = schema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Faltan datos requeridos');
  });

  it('rejects a value over the max length instead of truncating', () => {
    const result = schema.safeParse({ name: 'x'.repeat(11) });
    expect(result.success).toBe(false);
  });

  it('accepts and trims a valid value', () => {
    const result = schema.safeParse({ name: '  ok  ' });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('ok');
  });

  it('uses a custom message when provided', () => {
    const custom = z.object({ orderId: str(50, 'Falta orderId') });
    const result = custom.safeParse({});
    expect(result.error.issues[0].message).toBe('Falta orderId');
  });
});

describe('strOpt()', () => {
  const schema = z.object({ descripcion: strOpt(20) });

  it('allows the field to be absent', () => {
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('allows null', () => {
    expect(schema.safeParse({ descripcion: null }).success).toBe(true);
  });

  it('still rejects an over-length value', () => {
    expect(schema.safeParse({ descripcion: 'x'.repeat(21) }).success).toBe(false);
  });
});

describe('strDefault()', () => {
  // Mirrors the original manual code's `String(x || def)` idiom -- an empty
  // string counts as "use the default", not just an absent field.
  const schema = z.object({ paymentMethod: strDefault(20, 'cash') });

  it('defaults when the field is absent', () => {
    expect(schema.safeParse({}).data.paymentMethod).toBe('cash');
  });

  it('defaults when the field is an empty string (falsy, not just missing)', () => {
    expect(schema.safeParse({ paymentMethod: '' }).data.paymentMethod).toBe('cash');
  });

  it('keeps a real value', () => {
    expect(schema.safeParse({ paymentMethod: 'bold' }).data.paymentMethod).toBe('bold');
  });
});

describe('clampedNumber()', () => {
  const schema = z.object({ estimatedTime: clampedNumber(0, 180, 30) });

  it('defaults when the field is absent', () => {
    expect(schema.safeParse({}).data.estimatedTime).toBe(30);
  });

  it('defaults on an explicit 0 too -- matches the original `x || def` idiom, not `x ?? def`', () => {
    expect(schema.safeParse({ estimatedTime: 0 }).data.estimatedTime).toBe(30);
  });

  it('clamps to the max', () => {
    expect(schema.safeParse({ estimatedTime: 999 }).data.estimatedTime).toBe(180);
  });

  it('clamps a real positive value below max unchanged', () => {
    expect(schema.safeParse({ estimatedTime: 45 }).data.estimatedTime).toBe(45);
  });

  it('supports a negative min (e.g. a price modifier / discount)', () => {
    const discountSchema = z.object({ precioModificador: clampedNumber(-999999999, 999999999) });
    expect(discountSchema.safeParse({ precioModificador: -500 }).data.precioModificador).toBe(-500);
  });
});

describe('clampedNumberOpt()', () => {
  const schema = z.object({ stockMinimo: clampedNumberOpt(0, 9999999) });

  it('stays undefined when the field is absent -- partial-update routes rely on this to skip the column', () => {
    expect(schema.safeParse({}).data.stockMinimo).toBeUndefined();
  });

  it('clamps a present value', () => {
    expect(schema.safeParse({ stockMinimo: -5 }).data.stockMinimo).toBe(0);
  });
});

describe('clampedNumberDefaultOnUndef()', () => {
  // loyalty_rewards.vigente: an INTEGER 0/1 column where 0 is a meaningful,
  // real value -- must NOT be coerced back to the default like clampedNumber does.
  const schema = z.object({ vigente: clampedNumberDefaultOnUndef(0, 1, 1) });

  it('defaults only when the field is truly absent', () => {
    expect(schema.safeParse({}).data.vigente).toBe(1);
  });

  it('respects an explicit 0 -- the exact case clampedNumber gets wrong', () => {
    expect(schema.safeParse({ vigente: 0 }).data.vigente).toBe(0);
  });

  it('respects an explicit 1', () => {
    expect(schema.safeParse({ vigente: 1 }).data.vigente).toBe(1);
  });
});

describe('bool() / boolOpt()', () => {
  it('bool() defaults only when absent, keeps an explicit false', () => {
    const schema = z.object({ activo: bool(true) });
    expect(schema.safeParse({}).data.activo).toBe(true);
    expect(schema.safeParse({ activo: false }).data.activo).toBe(false);
  });

  it('boolOpt() stays undefined when absent', () => {
    const schema = z.object({ activo: boolOpt() });
    expect(schema.safeParse({}).data.activo).toBeUndefined();
  });
});

describe('requiredPositiveNumber()', () => {
  const schema = z.object({ total: requiredPositiveNumber(999999999, 'Faltan datos requeridos') });

  it('rejects a missing value', () => {
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('rejects zero -- an order total of 0 is not valid', () => {
    expect(schema.safeParse({ total: 0 }).success).toBe(false);
  });

  it('rejects a negative value', () => {
    expect(schema.safeParse({ total: -100 }).success).toBe(false);
  });

  it('accepts and clamps a real value to the max', () => {
    expect(schema.safeParse({ total: 5_000_000_000 }).data.total).toBe(999999999);
  });

  it('accepts a normal order total unchanged', () => {
    expect(schema.safeParse({ total: 45000 }).data.total).toBe(45000);
  });
});
