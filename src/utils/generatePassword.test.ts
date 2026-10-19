import { describe, it, expect } from 'vitest';
import { generatePassword, passwordAgeDays, PASSWORD_MAX_AGE_DAYS } from './generatePassword';

describe('generatePassword', () => {
  it('cumple la política del servidor en 500 muestras (>=10, letra y número)', () => {
    for (let i = 0; i < 500; i++) {
      const p = generatePassword();
      expect(p.length).toBe(16);
      expect(p).toMatch(/[a-zA-Z]/);
      expect(p).toMatch(/[0-9]/);
    }
  });

  it('nunca baja de 10 caracteres ni usa caracteres ambiguos', () => {
    expect(generatePassword(4).length).toBe(10);
    for (let i = 0; i < 200; i++) expect(generatePassword()).not.toMatch(/[0O1lI]/);
  });

  it('no repite contraseñas', () => {
    const set = new Set(Array.from({ length: 200 }, () => generatePassword()));
    expect(set.size).toBe(200);
  });
});

describe('passwordAgeDays', () => {
  const now = new Date('2026-10-19T12:00:00Z').getTime();
  it('null cuando no hay fecha o es inválida', () => {
    expect(passwordAgeDays(null, now)).toBeNull();
    expect(passwordAgeDays(undefined, now)).toBeNull();
    expect(passwordAgeDays('nope', now)).toBeNull();
  });
  it('cuenta días completos', () => {
    expect(passwordAgeDays('2026-10-19T00:00:00Z', now)).toBe(0);
    expect(passwordAgeDays('2026-07-21T12:00:00Z', now)).toBe(90);
    expect(90).toBe(PASSWORD_MAX_AGE_DAYS);
  });
});
