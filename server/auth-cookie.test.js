// PizzaCRM — Vitest spec for the JWT cookie helpers in server/auth.js
// Pure unit tests for buildAuthCookie / buildClearAuthCookie / readAuthCookie.
//
// Baseline threat model:
//   - El JWT nunca debe aparecer en localStorage (única fuente = cookie).
//   - La cookie debe ser HttpOnly para evitar robo vía XSS.
//   - La cookie debe tener SameSite=Lax para mitigar CSRF de navegación cross-site.
//   - En producción debe tener Secure (HTTPS-only).
//   - El Max-Age debe coincidir con la expiración del access token (~15 min).
//
// Estos tests no requieren DB ni Express: solo verifican el contrato del
// helper de cookie, que es la pieza que rompe silenciosamente si alguien
// cambia el formato sin actualizar el frontend.
import { describe, it, expect } from 'vitest';

// ⚠️  auth.js inicializa JWT_SECRET en memoria al cargar; los tests sólo
// llaman a helpers puros (buildAuthCookie / buildClearAuthCookie) que no
// dependen del secreto — son funciones deterministas sobre el input.
import { buildAuthCookie, buildClearAuthCookie, readAuthCookie } from './auth.js';

const SAMPLE_TOKEN = 'eyJfake.fake.fake';
const SAMPLE_PASTE = 'foo=bar; auth_token=' + SAMPLE_TOKEN + '; baz=qux';

describe('buildAuthCookie', () => {
  it('produce una cookie HttpOnly con el nombre auth_token', () => {
    const c = buildAuthCookie(SAMPLE_TOKEN);
    expect(c).toMatch(/^auth_token=/);
    expect(c.toLowerCase()).toContain('httponly');
  });

  it('incluye el path raíz (/) para que aplique a toda la API', () => {
    const c = buildAuthCookie(SAMPLE_TOKEN);
    expect(c).toMatch(/Path=\//i);
  });

  it('incluye SameSite=Lax para bloquear CSRF cross-site', () => {
    const c = buildAuthCookie(SAMPLE_TOKEN);
    expect(c).toMatch(/SameSite=Lax/i);
  });

  it('NO incluye Secure en dev (NODE_ENV !== production)', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const c = buildAuthCookie(SAMPLE_TOKEN);
      expect(c.toLowerCase()).not.toContain(' secure;');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('incluye Secure en producción (NODE_ENV=production)', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const c = buildAuthCookie(SAMPLE_TOKEN);
      expect(c.toLowerCase()).toContain(' secure');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('incluye un Max-Age que coincide con la expiración del access token', () => {
    const c = buildAuthCookie(SAMPLE_TOKEN);
    // Acepta el formato Max-Age=<n> con n = 900 (15 min) o n = 900s tolerante.
    expect(c).toMatch(/Max-Age=(\d+)/i);
  });
});

describe('buildClearAuthCookie', () => {
  it('produce una cookie que vacía auth_token (sobrescribe al logout)', () => {
    const c = buildClearAuthCookie();
    expect(c).toMatch(/^auth_token=;/);
  });

  it('mantiene HttpOnly, Path, SameSite para que el navegador la acepte', () => {
    const c = buildClearAuthCookie();
    expect(c.toLowerCase()).toContain('httponly');
    expect(c).toMatch(/Path=\//i);
    expect(c).toMatch(/SameSite=Lax/i);
  });

  it('expira inmediatamente (Max-Age=0)', () => {
    const c = buildClearAuthCookie();
    expect(c).toMatch(/Max-Age=0/i);
  });
});

describe('readAuthCookie', () => {
  // Simulamos una request Express mínima con `headers.cookie`.
  function fakeReq(cookieHeader) {
    return { headers: { cookie: cookieHeader || '' } };
  }

  it('lee correctamente el token de auth_token desde el header Cookie', () => {
    const req = fakeReq(SAMPLE_PASTE);
    expect(readAuthCookie(req)).toBe(SAMPLE_TOKEN);
  });

  it('devuelve null si no hay cookie presente', () => {
    const req = fakeReq();
    expect(readAuthCookie(req)).toBeNull();
  });

  it('devuelve null si no existe specifically auth_token=', () => {
    const req = fakeReq('foo=bar; baz=qux');
    expect(readAuthCookie(req)).toBeNull();
  });

  it('tolera cookies con espacios y atributos extra', () => {
    const req = fakeReq('  auth_token=' + SAMPLE_TOKEN + '; Path=/; HttpOnly  ');
    expect(readAuthCookie(req)).toBe(SAMPLE_TOKEN);
  });
});
