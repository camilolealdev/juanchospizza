// PizzaCRM — Vitest spec for the Habeas Data consent schema (server/schemas/consent.js)
// Pure schema validation; no DB / no Express required.
//
// El schema exporta `postConsentSchema` con shape:
//   { consent_type: 'all' | 'privacy_only' | 'marketing',
//     granted: boolean,
//     phone?: nullable string (regex /^[0-9+\-\s()]{6,20}$/),
//     email?: nullable string (email),
//     path?: nullable string (max 255) }
//
// Cubre:
//   - acepta un payload válido con todas las claves requeridas
//   - rechaza cuando falta consent_type (es requerido)
//   - rechaza un consent_type fuera del enum
//   - valida formato de teléfono (regex 6-20 chars de dígitos/+/-/espacio/paréntesis)
//   - valida formato de email
//   - permite granted=false (rechazo explícito — válido bajo Ley 1581)
//   - acepta path ausente o nulo (es opcional)
import { describe, it, expect } from 'vitest';
import { postConsentSchema } from './consent.js';

describe('postConsentSchema', () => {
  const baseValid = {
    consent_type: 'all',
    granted: true,
    phone: '3117074843',
    email: 'cliente@juanchospizza.com',
    path: '/menu',
  };

  it('acepta un payload válido con todas las claves', () => {
    const r = postConsentSchema.safeParse(baseValid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.consent_type).toBe('all');
      expect(r.data.granted).toBe(true);
    }
  });

  it('rechaza cuando falta consent_type (requerido)', () => {
    const { consent_type: _consent_type, ...sinCT } = baseValid;
    const r = postConsentSchema.safeParse(sinCT);
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('consent_type');
    }
  });

  it('rechaza un consent_type fuera del enum', () => {
    const r = postConsentSchema.safeParse({ ...baseValid, consent_type: 'todo-y-nada' });
    expect(r.success).toBe(false);
  });

  it('acepta los tres valores válidos del enum', () => {
    for (const v of ['all', 'privacy_only', 'marketing']) {
      expect(postConsentSchema.safeParse({ ...baseValid, consent_type: v }).success).toBe(true);
    }
  });

  it('rechaza granted ausente (es requerido, no opcional)', () => {
    const { granted: _granted, ...sin } = baseValid;
    const r = postConsentSchema.safeParse(sin);
    expect(r.success).toBe(false);
  });

  it('rechaza un granted que no es boolean', () => {
    expect(postConsentSchema.safeParse({ ...baseValid, granted: 'si' }).success).toBe(false);
    expect(postConsentSchema.safeParse({ ...baseValid, granted: 1 }).success).toBe(false);
  });

  it('acepta granted=false como rechazo explícito válido', () => {
    const r = postConsentSchema.safeParse({ ...baseValid, granted: false });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.granted).toBe(false);
  });

  it('rechaza un teléfono con caracteres no permitidos', () => {
    expect(postConsentSchema.safeParse({ ...baseValid, phone: 'abcdefghij' }).success).toBe(false);
  });

  it('rechaza un teléfono demasiado corto (< 6 caracteres)', () => {
    expect(postConsentSchema.safeParse({ ...baseValid, phone: '12345' }).success).toBe(false);
  });

  it('rechaza un teléfono demasiado largo (> 20 caracteres)', () => {
    expect(postConsentSchema.safeParse({ ...baseValid, phone: '1'.repeat(21) }).success).toBe(false);
  });

  it('acepta teléfonos que cumplen el regex (incl. celular colombiano y formatos con espacios/()+/-)', () => {
    expect(postConsentSchema.safeParse({ ...baseValid, phone: '3117074843' }).success).toBe(true);
    expect(postConsentSchema.safeParse({ ...baseValid, phone: '+57 311 707 4843' }).success).toBe(true);
    expect(postConsentSchema.safeParse({ ...baseValid, phone: '(311) 707-4843' }).success).toBe(true);
  });

  it('acepta phone nulo (es optional+nullable)', () => {
    const r = postConsentSchema.safeParse({ ...baseValid, phone: null });
    expect(r.success).toBe(true);
  });

  it('rechaza un email inválido', () => {
    expect(postConsentSchema.safeParse({ ...baseValid, email: 'no-es-email' }).success).toBe(false);
  });

  it('acepta path ausente (es opcional)', () => {
    const { path: _path, ...sinPath } = baseValid;
    const r = postConsentSchema.safeParse(sinPath);
    expect(r.success).toBe(true);
  });

  it('acepta path dentro del límite (max 255)', () => {
    expect(postConsentSchema.safeParse({ ...baseValid, path: '/'.padEnd(255, 'x') }).success).toBe(true);
  });

  it('rechaza path que excede 255 caracteres', () => {
    expect(postConsentSchema.safeParse({ ...baseValid, path: 'a'.repeat(256) }).success).toBe(false);
  });

  it('acepta todos los opcionales nulos (caso de visitante anónimo sin identificación)', () => {
    const r = postConsentSchema.safeParse({
      consent_type: 'privacy_only',
      granted: true,
      phone: null,
      email: null,
      path: null,
    });
    expect(r.success).toBe(true);
  });
});
