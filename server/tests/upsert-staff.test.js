// Tests de server/scripts/upsert-staff.js -- alta idempotente de staff con
// correo + contraseña (evita el 401 de cuentas sin contraseña en el login web).
// Ejecutar: npx vitest run server/tests/upsert-staff.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../auth.js', () => ({
  hashPin: (pin, salt) => `hash:${pin}:${salt}`,
  generateSalt: () => 'salt',
}));

const { upsertStaff, validateEntry, generatePassword } = await import('../scripts/upsert-staff.js');

const entry = { nombre: 'Caja', role: 'OPERATOR', email: ' Caja@Pizza.com ', username: 'Caja', locationId: 'nemocon' };

describe('generatePassword', () => {
  it('cumple la política (>=10, letra y número) en 200 muestras', () => {
    for (let i = 0; i < 200; i++) {
      const p = generatePassword();
      expect(p.length).toBeGreaterThanOrEqual(10);
      expect(p).toMatch(/[a-zA-Z]/);
      expect(p).toMatch(/[0-9]/);
    }
  });
});

describe('validateEntry', () => {
  it('normaliza correo y usuario a minúsculas', () => {
    expect(validateEntry(entry)).toMatchObject({ email: 'caja@pizza.com', username: 'caja' });
  });
  it('rechaza ADMIN, rol desconocido, correo inválido y sede inválida', () => {
    expect(() => validateEntry({ ...entry, role: 'ADMIN' })).toThrow(/Rol inválido/);
    expect(() => validateEntry({ ...entry, role: 'X' })).toThrow(/Rol inválido/);
    expect(() => validateEntry({ ...entry, email: 'nope' })).toThrow(/Correo inválido/);
    expect(() => validateEntry({ ...entry, locationId: 'mars' })).toThrow(/Sede inválida/);
  });
});

describe('upsertStaff', () => {
  let query;
  beforeEach(() => {
    query = vi.fn();
  });

  it('simulación: no escribe nada', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const r = await upsertStaff({ query }, entry);
    expect(r).toMatchObject({ action: 'crear', applied: false, password: null });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('crea con passwordHash y devuelve la contraseña una vez', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
    const r = await upsertStaff({ query }, entry, { apply: true });
    expect(r.applied).toBe(true);
    expect(r.password).toBeTruthy();
    const [sql, params] = query.mock.calls[1];
    expect(sql).toContain('INSERT INTO employees');
    expect(params[7]).toBe('caja@pizza.com');
    expect(params[8]).toBe(`hash:${r.password}:salt`);
  });

  it('existente con contraseña: actualiza y desbloquea sin tocar la contraseña', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'emp_1', isSuperAdmin: false, tiene_pwd: true }] })
      .mockResolvedValueOnce({ rows: [] });
    const r = await upsertStaff({ query }, entry, { apply: true });
    expect(r.password).toBeNull();
    const [sql] = query.mock.calls[1];
    expect(sql).toContain('"lockedUntil"=NULL');
    expect(sql).not.toContain('"passwordHash"');
  });

  it('existente sin contraseña: se la asigna', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'emp_1', isSuperAdmin: false, tiene_pwd: false }] })
      .mockResolvedValueOnce({ rows: [] });
    const r = await upsertStaff({ query }, entry, { apply: true });
    expect(r.password).toBeTruthy();
    expect(query.mock.calls[1][0]).toContain('"passwordHash"');
  });

  it('--reset regenera la contraseña de una cuenta con contraseña', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'emp_1', isSuperAdmin: false, tiene_pwd: true }] })
      .mockResolvedValueOnce({ rows: [] });
    const r = await upsertStaff({ query }, entry, { apply: true, reset: true });
    expect(r.password).toBeTruthy();
  });

  it('nunca modifica a un super admin', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'admin_default', isSuperAdmin: true, tiene_pwd: true }] });
    await expect(upsertStaff({ query }, entry, { apply: true })).rejects.toThrow(/super admin/);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
