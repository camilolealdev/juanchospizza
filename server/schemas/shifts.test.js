import { describe, it, expect } from 'vitest';
import { openShiftSchema, closeShiftSchema, updateShiftSchema } from './shifts.js';

describe('openShiftSchema', () => {
  it('accepts a valid open request', () => {
    const result = openShiftSchema.safeParse({ locationId: 'nemocon', openingCash: 50000 });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown locationId', () => {
    expect(openShiftSchema.safeParse({ locationId: 'bogota', openingCash: 50000 }).success).toBe(false);
  });

  it('rejects a missing openingCash', () => {
    expect(openShiftSchema.safeParse({ locationId: 'nemocon' }).success).toBe(false);
  });

  it('accepts openingCash of 0 (starting with no cash is valid)', () => {
    expect(openShiftSchema.safeParse({ locationId: 'zipaquira', openingCash: 0 }).success).toBe(true);
  });

  it('rejects a negative openingCash', () => {
    expect(openShiftSchema.safeParse({ locationId: 'nemocon', openingCash: -100 }).success).toBe(false);
  });
});

describe('updateShiftSchema', () => {
  it('accepts notas opcionales', () => {
    const result = updateShiftSchema.safeParse({ notas: 'Arqueo corregido' });
    expect(result.success).toBe(true);
    expect(result.data.notas).toBe('Arqueo corregido');
  });

  it('accepts un body vacío (todas las columnas opcionales)', () => {
    expect(updateShiftSchema.safeParse({}).success).toBe(true);
  });

  it('permite limpiar notas con null', () => {
    const result = updateShiftSchema.safeParse({ notas: null });
    expect(result.success).toBe(true);
    expect(result.data.notas).toBeNull();
  });

  it('rejects notas que exceden 500 chars', () => {
    expect(updateShiftSchema.safeParse({ notas: 'x'.repeat(501) }).success).toBe(false);
  });

  it('rejects notas que no es string', () => {
    expect(updateShiftSchema.safeParse({ notas: 123 }).success).toBe(false);
  });
});

describe('closeShiftSchema', () => {
  it('accepts a valid close request', () => {
    const result = closeShiftSchema.safeParse({ closingCash: 120000 });
    expect(result.success).toBe(true);
  });

  it('rejects a missing closingCash', () => {
    expect(closeShiftSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a negative closingCash', () => {
    expect(closeShiftSchema.safeParse({ closingCash: -1 }).success).toBe(false);
  });

  it('accepts optional notas', () => {
    const result = closeShiftSchema.safeParse({ closingCash: 100, notas: 'Faltante justificado' });
    expect(result.data.notas).toBe('Faltante justificado');
  });
});
