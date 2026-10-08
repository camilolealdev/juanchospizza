// Vitest spec for authenticateGoogle() in server/auth.js. Mocks the DB pool
// -- la verificación del id_token (google-auth-library) vive en
// loginWithGoogle(), una capa arriba; esto prueba solo el mapeo
// email -> empleado y el segundo factor de SUPER_ADMIN.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const queryMock = vi.fn();
vi.mock('./db.js', () => ({ pool: { query: (...args) => queryMock(...args) } }));

process.env.JWT_SECRET = 'test-jwt-secret-not-for-production-use-only12345';

const { authenticateGoogle, hashPin, generateSalt } = await import('./auth.js');

function makeEmployee(overrides = {}) {
  const salt = generateSalt();
  const pinHash = hashPin('1234', salt);
  return {
    id: 'emp-1',
    role: 'OPERATOR',
    pinHash,
    salt,
    isSuperAdmin: false,
    locationId: 'nemocon',
    lockedUntil: null,
    ...overrides,
  };
}

beforeEach(() => {
  queryMock.mockReset();
});

describe('authenticateGoogle()', () => {
  it('returns null when no employee matches the email', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const token = await authenticateGoogle('nadie@example.com');
    expect(token).toBeNull();
  });

  it('authenticates a non-super-admin with just the verified email', async () => {
    queryMock.mockResolvedValueOnce({ rows: [makeEmployee()] });
    const token = await authenticateGoogle('cocina@example.com');
    expect(token).toEqual(expect.any(String));
  });

  it('rejects a super admin without a PIN', async () => {
    queryMock.mockResolvedValueOnce({ rows: [makeEmployee({ isSuperAdmin: true })] });
    const token = await authenticateGoogle('admin@example.com');
    expect(token).toBeNull();
  });

  it('rejects a super admin with the wrong PIN', async () => {
    queryMock.mockResolvedValueOnce({ rows: [makeEmployee({ isSuperAdmin: true })] });
    const token = await authenticateGoogle('admin@example.com', '0000');
    expect(token).toBeNull();
  });

  it('authenticates a super admin with the correct PIN', async () => {
    queryMock.mockResolvedValueOnce({ rows: [makeEmployee({ isSuperAdmin: true })] });
    const token = await authenticateGoogle('admin@example.com', '1234');
    expect(token).toEqual(expect.any(String));
  });

  it('rejects while the account is locked', async () => {
    const emp = makeEmployee({ lockedUntil: new Date(Date.now() + 60_000) });
    queryMock.mockResolvedValueOnce({ rows: [emp] });
    const token = await authenticateGoogle('cocina@example.com');
    expect(token).toBeNull();
  });
});
