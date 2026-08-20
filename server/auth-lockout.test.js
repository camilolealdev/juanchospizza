// Vitest spec for the per-account brute-force lockout in server/auth.js
// authenticate(). Mocks the DB pool entirely -- these are unit tests of the
// lockout state machine (increment/lock/reset), not integration tests
// against a real Postgres.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('./db.js', () => ({ pool: { query: (...args) => queryMock(...args) } }));

// auth.js exige JWT_SECRET real (>=32 chars) fuera de NODE_ENV=development;
// vitest corre con NODE_ENV='test', así que lo seteamos acá -- mismo patrón
// que .env.example documenta para producción, solo que en memoria.
process.env.JWT_SECRET = 'test-jwt-secret-not-for-production-use-only12345';

const { authenticate, hashPin, generateSalt } = await import('./auth.js');

function makeEmployee(overrides = {}) {
  const salt = generateSalt();
  const pinHash = hashPin('1234', salt);
  return {
    id: 'emp-1',
    role: 'OPERATOR',
    pinHash,
    salt,
    passwordHash: null,
    passwordSalt: null,
    isSuperAdmin: false,
    locationId: 'nemocon',
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

beforeEach(() => {
  queryMock.mockReset();
});

describe('authenticate() lockout', () => {
  it('returns null for a username that does not exist, without hitting a second query', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const token = await authenticate('ghost', { pin: '0000' });
    expect(token).toBeNull();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('authenticates with the correct PIN and resets the failure counter', async () => {
    const emp = makeEmployee({ failedLoginAttempts: 2 });
    queryMock.mockResolvedValueOnce({ rows: [emp] }).mockResolvedValueOnce({ rows: [] });

    const token = await authenticate('cocina', { pin: '1234' });

    expect(token).toEqual(expect.any(String));
    expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('"failedLoginAttempts" = 0'), [emp.id]);
  });

  it('increments failedLoginAttempts on a wrong PIN, without locking below the threshold', async () => {
    const emp = makeEmployee({ failedLoginAttempts: 1 });
    queryMock.mockResolvedValueOnce({ rows: [emp] }).mockResolvedValueOnce({ rows: [] });

    const token = await authenticate('cocina', { pin: '9999' });

    expect(token).toBeNull();
    expect(queryMock).toHaveBeenLastCalledWith(expect.stringContaining('UPDATE employees SET "failedLoginAttempts"'), [
      2,
      null,
      emp.id,
    ]);
  });

  it('locks the account once failures reach the threshold, resetting the counter', async () => {
    const emp = makeEmployee({ failedLoginAttempts: 4 });
    queryMock.mockResolvedValueOnce({ rows: [emp] }).mockResolvedValueOnce({ rows: [] });

    const token = await authenticate('cocina', { pin: '9999' });

    expect(token).toBeNull();
    const [, params] = queryMock.mock.calls[1];
    expect(params[0]).toBe(0);
    expect(params[1]).toBeInstanceOf(Date);
    expect(params[1].getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects correct credentials while locked, without touching the row again', async () => {
    const emp = makeEmployee({ lockedUntil: new Date(Date.now() + 60_000) });
    queryMock.mockResolvedValueOnce({ rows: [emp] });

    const token = await authenticate('cocina', { pin: '1234' });

    expect(token).toBeNull();
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('allows login again once lockedUntil is in the past', async () => {
    const emp = makeEmployee({ lockedUntil: new Date(Date.now() - 1000) });
    queryMock.mockResolvedValueOnce({ rows: [emp] }).mockResolvedValueOnce({ rows: [] });

    const token = await authenticate('cocina', { pin: '1234' });

    expect(token).toEqual(expect.any(String));
  });
});
