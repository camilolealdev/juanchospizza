// [2026-07-21] Frontend audit follow-up: dos useEffects (LoginModal en
// App.tsx y MenuDigital) modificaban `document.body.style.overflow`
// directamente con cleanup destructivo. Si los dos modales se montan
// al mismo tiempo y uno cierra primero, su cleanup borra el lock del
// otro y reaparece la doble scrollbar. Este utilitario usa un refcount
// módulo-nivel para que el lock solo se libere cuando el ÚLTIMO
// consumidor sale.

let lockCount = 0;
let savedOverflow = '';

// [2026-07-21] SSR safety guard: si este módulo llega a evaluarse en un
// entorno donde `document` no existe (Next/Vite SSR/Workers/Remix
// runtime no-browser), ningún call hace nada. El codebase hoy es SPA
// puro (vite.config.ts), pero el guard previene un ReferenceError si
// en el futuro se migra a SSR. Mantener barato para no penalizar la
// branch del browser (lo importante es que lock/unlock funcionen
// normalmente cuando SÍ hay document).
const hasDOM = typeof document !== 'undefined';

/**
 * Lock body scroll. Idempotent and refcounted: every call pairs with a
 * matching `unlockBodyScroll()`. The original `overflow` value is
 * restored only when the last lock is released.
 *
 * Designed to be called from useEffect cleanup functions of any modal.
 * Safe to call multiple times from components that may overlap.
 * No-ops in SSR (no `document`).
 */
export function lockBodyScroll(): void {
  if (!hasDOM) return;
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount++;
}

/**
 * Release a body scroll lock acquired by `lockBodyScroll()`. The very
 * last release restores the original overflow value the page had
 * before any modal opened. No-ops in SSR.
 */
export function unlockBodyScroll(): void {
  if (!hasDOM) return;
  if (lockCount === 0) return; // already at zero — defensive guard
  lockCount--;
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow;
  }
}

// Test hook: allows tests to wipe state between cases (e.g. vitest
// with React StrictMode double-effect in dev).
export function __resetBodyScrollLockForTests(): void {
  lockCount = 0;
  savedOverflow = '';
  if (hasDOM) {
    document.body.style.overflow = '';
  }
}
