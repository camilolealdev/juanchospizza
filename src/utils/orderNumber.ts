// [2026-07-21] Frontend audit P0 #8: el orderNumber local se generaba con
// `Math.floor(Math.random() * 9000) + 1000` que solo producía 9000
// valores distintos — trivialmente adivinable y con colisiones visibles
// entre pedidos paralelos. crypto.randomUUID() está disponible en todos
// los browsers modernos (Samsung Internet/Safari iOS >= iOS 15.4,
// Firefox/Chrome >= 2022) y entrega hex UUIDs con 4.29B^2 combinaciones
// en los primeros 8 chars.
//
// El **server** (POST /api/orders) genera el orderNumber canónico
// persistido en DB. Este helper es solo el prefijo display que aparece
// en WhatsApp antes de confirmar el pedido — pierde importancia una vez
// el order entra al sistema. Por eso el fallback a Math.random si
// crypto.randomUUID no existe es aceptable (sólo usado en browsers
// exóticos sin WebCrypto).

/**
 * Generates a customer-facing order number like "GUIDO-550E8400".
 * Uses crypto.randomUUID() when available (modern browsers) and falls
 * back to Math.random for ancient browsers that lack WebCrypto.
 *
 * The canonical order number is generated server-side in
 * `/api/orders` POST — this string is what's displayed in the WhatsApp
 * pre-checkout message and shown to the user before the order is
 * committed.
 */
export function generateOrderNumber(): string {
  // crypto.randomUUID() returns `${string}-${string}-${string}-${string}-${string}`.
  // After strip + slice(0,8) we get 8 hex chars uppercase = ~4.3B
  // combinations. The leading `u ? ` guard rejects empty strings so
  // 'GUIDO-' is never produced.
  try {
    // globalThis.crypto is the standard location for WebCrypto, available
    // in window, worker, and Node 19+ contexts.
    const uuid = globalThis.crypto?.randomUUID?.() ?? '';
    const segment = uuid.replace(/-/g, '').slice(0, 8).toUpperCase();
    if (segment) return `GUIDO-${segment}`;
  } catch {
    // Some hardened contexts (corporate proxies, devtools-overrides)
    // throw on crypto access — fall through to Math.random below.
  }
  // Fallback: pre-audit behavior. ~9k values, conflicts possible but
  // acceptable for short-lived display-only identifiers.
  return `GUIDO-${Math.floor(Math.random() * 9000) + 1000}`;
}
