// PizzaCRM — Vitest spec for ARCO data-rights schema (server/schemas/derechos.js)
// Pure schema validation; no DB / no Express required.
//
// Cubre los 4 derechos de la Ley 1581/2012:
//   - consulta: el titular pregunta qué datos tiene la empresa
//   - rectificacion: el titular pide corregir un dato inexacto
//   - supresion: el titular pide eliminar sus datos
//   - reclamo: el titular presenta una queja por uso indebido
import { describe, it, expect } from 'vitest';
import { derechoBaseSchema } from './derechos.js';

const textoLargo = ' '.repeat(0) + 'Esta es una descripción de prueba con más de 10 caracteres.';

describe('derechoBaseSchema', () => {
  it('acepta una solicitud de CONSULTA válida', () => {
    const r = derechoBaseSchema.safeParse({
      tipo: 'consulta',
      descripcion: textoLargo,
      email: 'cliente@juanchospizza.com',
      telefono: '3117074843',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.tipo).toBe('consulta');
  });

  it('acepta una solicitud de RECTIFICACIÓN válida', () => {
    const r = derechoBaseSchema.safeParse({
      tipo: 'rectificacion',
      descripcion: textoLargo,
      email: 'cliente@juanchospizza.com',
      telefono: '3117074843',
    });
    expect(r.success).toBe(true);
  });

  it('acepta una solicitud de SUPRESIÓN válida', () => {
    const r = derechoBaseSchema.safeParse({
      tipo: 'supresion',
      descripcion: textoLargo,
      email: 'cliente@juanchospizza.com',
      telefono: '3117074843',
    });
    expect(r.success).toBe(true);
  });

  it('acepta una solicitud de RECLAMO válida', () => {
    const r = derechoBaseSchema.safeParse({
      tipo: 'reclamo',
      descripcion: textoLargo,
      email: 'cliente@juanchospizza.com',
      telefono: '3117074843',
    });
    expect(r.success).toBe(true);
  });

  it('rechaza un tipo de solicitud desconocido', () => {
    const r = derechoBaseSchema.safeParse({
      tipo: 'hackeo',
      descripcion: textoLargo,
      email: 'cliente@juanchospizza.com',
      telefono: '3117074843',
    });
    expect(r.success).toBe(false);
  });

  it('rechaza descripciones demasiado cortas (< 10 caracteres)', () => {
    const r = derechoBaseSchema.safeParse({
      tipo: 'consulta',
      descripcion: 'corto',
      email: 'cliente@juanchospizza.com',
      telefono: '3117074843',
    });
    expect(r.success).toBe(false);
  });

  it('rechaza descripciones demasiado largas (> 2000 caracteres)', () => {
    const r = derechoBaseSchema.safeParse({
      tipo: 'consulta',
      descripcion: 'a'.repeat(2001),
      email: 'cliente@juanchospizza.com',
      telefono: '3117074843',
    });
    expect(r.success).toBe(false);
  });

  it('exige al menos UNO de email o teléfono (Art. 12 Ley 1581)', () => {
    // Solo teléfono → válido
    expect(
      derechoBaseSchema.safeParse({
        tipo: 'consulta',
        descripcion: textoLargo,
        telefono: '3117074843',
      }).success
    ).toBe(true);

    // Solo email → válido
    expect(
      derechoBaseSchema.safeParse({
        tipo: 'consulta',
        descripcion: textoLargo,
        email: 'cliente@juanchospizza.com',
      }).success
    ).toBe(true);

    // Sin ninguno → inválido
    expect(
      derechoBaseSchema.safeParse({
        tipo: 'consulta',
        descripcion: textoLargo,
      }).success
    ).toBe(false);
  });

  it('rechaza teléfonos colombianos inválidos', () => {
    const r = derechoBaseSchema.safeParse({
      tipo: 'consulta',
      descripcion: textoLargo,
      email: 'cliente@juanchospizza.com',
      telefono: '123', // inválido
    });
    expect(r.success).toBe(false);
  });

  it('rechaza emails inválidos', () => {
    const r = derechoBaseSchema.safeParse({
      tipo: 'consulta',
      descripcion: textoLargo,
      email: 'no-es-email',
      telefono: '3117074843',
    });
    expect(r.success).toBe(false);
  });
});
