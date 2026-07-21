// DIAN Provider Adapter — Abstracción sobre el proveedor tecnológico (PSE).
//
// ═══════════════════════════════════════════════════════════════════════════
//  Resolución DIAN 000008/2023 obliga a enviar las facturas firmadas a
//  un Proveedor Tecnológico autorizado o directamente a la DIAN. Esta capa
//  selecciona el adapter correcto mediante DIAN_PROVIDER y normaliza la
//  respuesta al formato interno del CRM (estado + CUFE + diagnóstico).
//
//  Proveedores soportados:
//    'muisca'   — SOAP/XML contra ccdn.dian.gov.co (sin intermediario)
//    'dataico'  — REST contra api.dataico.com
//    'novasoft' — REST contra api.novasoft.com.co/api/v1
//    'alegra'   — REST contra api.alegra.co/api/v1
//
//  Configurar:
//   - DIAN_PROVIDER=muisca|dataico|novasoft|alegra
//   - DIAN_PROVIDER_URL=https://...
//   - DIAN_AMBIENTE=1|2  (1=pruebas, 2=producción)
//
//  Las credenciales de cada proveedor viven en sus propias env vars
//  (MUISCA_TOKEN, DATAICO_API_KEY, etc.) y se leen dentro de cada adapter.
//
//  Hardening (2026-07-21):
//   - 30s timeout por intento (AbortController) — antes podía colgar al
//     worker si el proveedor respondía lento o tiraba la conexión.
//   - 1 retry en 5xx/408/429 — antes un blip de red rechazaba la factura.
//   - 409 idempotency en normalizeResponse — si el provider reporta "ya
//     existe" pero trae un CUFE en el body, marcar accepted=true. El
//     invoiceNumber es la clave de idempotencia: un reintento siempre
//     lleva el mismo número.
//   - Audit log estructurado por envío — JSON-line a stdout, suficiente
//     para reconstruir la cadena de auditoría sin WORM storage.
//   - clearTimeout en todas las ramas de error para evitar handles
//     abiertos que filtran memoria/timer-ticks.
// ═══════════════════════════════════════════════════════════════════════════

const PROVIDER = (process.env.DIAN_PROVIDER || 'muisca').toLowerCase();
const BASE_URL = (process.env.DIAN_PROVIDER_URL || '').replace(/\/$/, '');
const AMBIENTE = process.env.DIAN_AMBIENTE || '1'; // 1 pruebas, 2 producción

// ── HTTP hardening ──────────────────────────────────────────────────────
// 30s por intento, 1 retry en respuestas o errores retryables. 4xx (excepto
// 408 Request Timeout y 429 Too Many Requests) NO se reintentan — son del
// cliente y reintentar idéntico solo añadiría latencia.
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;
const RETRYABLE_HTTP = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Fetch + parse JSON con timeout y retry. Devuelve un objeto con
 * `_httpStatus` inyectado en el body para que `normalizeResponse` pueda
 * detectar 409 idempotente.
 *
 * @returns {Promise<object>} body parseado con `_httpStatus` propagado.
 *   Si el body no es JSON válido, el campo `_httpStatus` queda en el
 *   objeto de todas formas y `_bodyParseError=true`.
 * @throws Solo en errores de red no-recuperables (e.g. ECONNREFUSED
 *   tras agotar retries). Los HTTP errors legibles se devuelven como
 *   resultado normal con su status code.
 */
async function fetchJsonWithRetry(url, fetchOptions, _ctx = {}) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
      // CRÍTICO: clearTimeout en CADA rama exitosa — si no, el timer
      // queda abierto hasta los 30s reales aunque la respuesta llegó.
      clearTimeout(timer);

      let body = null;
      let bodyParseError = false;
      // Algunos providers devuelven 204 sin body; intentar parsear y
      // tolerar failure.
      try {
        body = await response.json();
      } catch {
        bodyParseError = true;
      }

      if (response.ok) {
        return {
          _httpStatus: response.status,
          _timeout: false,
          ...(body && typeof body === 'object' ? body : {}),
        };
      }
      if (RETRYABLE_HTTP.has(response.status) && attempt < MAX_RETRIES) {
        continue;
      }
      return {
        _httpStatus: response.status,
        _timeout: false,
        _bodyParseError: bodyParseError,
        ...(body && typeof body === 'object' ? body : {}),
      };
    } catch (e) {
      clearTimeout(timer); // CRÍTICO también en catch
      const isAbort = e.name === 'AbortError' || /abort/i.test(String(e?.message));
      if (isAbort && attempt < MAX_RETRIES) {
        continue;
      }
      if (isAbort) {
        // Agotamos los reintentos por timeout → devolver shape de error
        // para que normalizeResponse lo marque como rejected y el audit
        // log registre httpStatus=408 sin tirar el flujo al cliente.
        return { _httpStatus: 408, _timeout: true, message: e.message };
      }
      // Otros errores (ECONNREFUSED, DNS, etc.) — propagar al caller.
      throw e;
    }
  }
  // Inalcanzable: el loop siempre retorna o throws.
  throw new Error('[DIAN] fetchJsonWithRetry agotó reintentos sin respuesta (error interno)');
}

// ── Audit log ───────────────────────────────────────────────────────────
// Una línea JSON por envío. Suficiente para reconstruir la cadena de
// auditoría end-to-end sin WORM storage hoy; si mañana hay requerimiento
// legal de inmutabilidad, migrar a S3 + Object Lock.
function auditLog(event, ctx) {
  console.info(
    JSON.stringify({
      audit: 'dian',
      ts: new Date().toISOString(),
      event, // 'accepted' | 'rejected' | 'duplicate' | 'dispatch-error'
      provider: ctx.provider,
      ambiente: AMBIENTE,
      invoiceNumber: ctx.invoiceNumber,
      status: ctx.status,
      cufe: ctx.cufe || null,
      trackingId: ctx.trackingId || null,
      httpStatus: typeof ctx.httpStatus === 'number' ? ctx.httpStatus : null,
      duplicate: !!ctx.duplicate,
      durationMs: ctx.durationMs,
    })
  );
}

// ── Normalización de respuesta ───────────────────────────────────────────
// Cada proveedor retorna un payload distinto. Esta función lo adapta al
// shape interno que usa InvoicesView.tsx y la BD (status + cufe +
// xmlRespuestaProveedor + mensajeDiagnostico).
//
// Adicionalmente, si recibe un `_httpStatus === 409` con un CUFE en el
// body, mapea a accepted (idempotencia): el primer envío tuvo éxito,
// solo estamos viendo el efecto de un reintento.
function normalizeResponse(raw, provider) {
  const httpStatus = raw?._httpStatus || 0;
  const normalized = {
    provider,
    raw,
    _httpStatus: httpStatus,
    _timeout: !!raw?._timeout,
    acceptedAt: raw?.acceptedAt || new Date().toISOString(),
  };

  switch (provider) {
    case 'muisca':
      normalized.accepted = raw?.StatusCode === '200' || raw?.StatusCode === '00';
      normalized.cufe = raw?.ResponseDian?.cufe || raw?.cufe;
      normalized.dianXml = raw?.ResponseDian?.xml || raw?.xml;
      normalized.trackingId = raw?.ResponseDian?.trackId || raw?.trackId;
      normalized.diagnostico = raw?.StatusDescription || raw?.message || '';
      normalized.status = normalized.accepted ? 'accepted' : 'rejected';
      break;
    case 'dataico':
      normalized.accepted = !!raw?.success;
      normalized.cufe = raw?.data?.cufe;
      normalized.dianXml = raw?.data?.signedXml;
      normalized.trackingId = raw?.data?.transactionId;
      normalized.diagnostico = raw?.error?.message || raw?.message || '';
      normalized.status = normalized.accepted ? 'accepted' : 'rejected';
      break;
    case 'novasoft':
      normalized.accepted = raw?.status === 'PROCESSED' || raw?.status === 'ACCEPTED';
      normalized.cufe = raw?.cufe;
      normalized.dianXml = raw?.xml;
      normalized.trackingId = raw?.id;
      normalized.diagnostico = raw?.observations?.join('; ') || raw?.message || '';
      normalized.status = normalized.accepted ? 'accepted' : 'rejected';
      break;
    case 'alegra':
      normalized.accepted = raw?.status === 'ok' || raw?.status === 'sent';
      normalized.cufe = raw?.data?.cufe || raw?.cufe;
      normalized.dianXml = raw?.data?.documentXml || raw?.xml;
      normalized.trackingId = raw?.data?.id || raw?.reference;
      normalized.diagnostico = raw?.message || '';
      normalized.status = normalized.accepted ? 'accepted' : 'rejected';
      break;
    default:
      normalized.accepted = false;
      normalized.status = 'rejected';
      normalized.diagnostico = `Proveedor DIAN desconocido: ${provider}`;
  }

  // ── Idempotencia en 409 ─────────────────────────────────────────────
  // Si el provider retornó HTTP 409 + un CUFE en el body, el envío
  // original fue aceptado. Marcamos accepted=true con flag duplicate
  // para que el caller (rutas) pueda distinguir el reintento del
  // envío primario al construir la respuesta HTTP al cliente.
  if (httpStatus === 409 && normalized.cufe) {
    normalized.accepted = true;
    normalized.status = 'accepted';
    normalized.duplicate = true;
    normalized.diagnostico = 'Reenvío idempotente: el proveedor ya tenía registrada esta factura';
  }

  return normalized;
}

// ── Adapter: Muisca (SOAP/XML directo) ──────────────────────────────────
async function sendToMuisca({ signedXml, invoiceNumber, claveTecnica, ambiente }) {
  const token = process.env.MUISCA_TOKEN;
  if (!token) {
    throw new Error('MUISCA_TOKEN no configurado. Ver docs/DIAN_MODULE_STATUS.md');
  }

  // Muisca usa SOAP/XML contra ccdn.dian.gov.co. Para MVP, usamos el endpoint
  // REST de envío de documento electrónico firmado. El frontend SOAP/XML
  // (request con envelope SOAP) se prefiere solo si la cuenta es
  // 'Muisca' tradicional sin API REST.
  const endpoint = `${BASE_URL}/v1/document/send`;
  return fetchJsonWithRetry(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        xml: signedXml,
        invoiceNumber,
        // Forma explícita (no shorthand) para que ESLint vea el uso real del
        // parámetro y para tener un fallback seguro si llega undefined.
        claveTecnica: claveTecnica || '',
        ambiente,
      }),
    },
    { provider: 'muisca', invoiceNumber }
  );
}

// ── Adapter: Dataico (REST) ─────────────────────────────────────────────
async function sendToDataico({ signedXml, invoiceNumber, claveTecnica, ambiente }) {
  const apiKey = process.env.DATAICO_API_KEY;
  if (!apiKey) {
    throw new Error('DATAICO_API_KEY no configurado');
  }

  return fetchJsonWithRetry(
    `${BASE_URL}/invoices/send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        invoiceNumber,
        signedXml,
        // Forma explícita (no shorthand) para que ESLint vea el uso del
        // parámetro y para tener un fallback seguro si llega undefined.
        claveTecnica: claveTecnica || '',
        ambiente,
      }),
    },
    { provider: 'dataico', invoiceNumber }
  );
}

// ── Adapter: Novasoft (REST) ─────────────────────────────────────────────
async function sendToNovasoft({ signedXml, invoiceNumber, claveTecnica, ambiente }) {
  const username = process.env.NOVASOFT_USER;
  const password = process.env.NOVASOFT_PASSWORD;
  if (!username || !password) {
    throw new Error('NOVASOFT_USER / NOVASOFT_PASSWORD no configurados');
  }

  // Novasoft usa Basic Auth por convención. Si su endpoint requiere OAuth,
  // reemplazar por el handshake correspondiente.
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');

  // Mantenemos `claveTecnica` recibido para futuras ampliaciones del
  // adapter (algunos perfiles Novasoft requieren firma dual); esta
  // marca explícita evita que @typescript-eslint lo marque como unused.
  void claveTecnica;

  return fetchJsonWithRetry(
    `${BASE_URL}/documents/send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        document: signedXml,
        reference: invoiceNumber,
        ambiente,
      }),
    },
    { provider: 'novasoft', invoiceNumber }
  );
}

// ── Adapter: Alegra (REST) ───────────────────────────────────────────────
async function sendToAlegra({ signedXml, invoiceNumber, ambiente }) {
  const user = process.env.ALEGRA_USER;
  const token = process.env.ALEGRA_TOKEN;
  if (!user || !token) {
    throw new Error('ALEGRA_USER / ALEGRA_TOKEN no configurados');
  }

  const credentials = Buffer.from(`${user}:${token}`).toString('base64');

  return fetchJsonWithRetry(
    `${BASE_URL}/invoices`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        xml: signedXml,
        number: invoiceNumber,
        environment: ambiente === '2' ? 'production' : 'sandbox',
      }),
    },
    { provider: 'alegra', invoiceNumber }
  );
}

// ── Dispatcher principal ─────────────────────────────────────────────────
// Único punto de entrada: dado un XML firmado + metadatos, decide adapter
// según DIAN_PROVIDER y devuelve respuesta normalizada. Audit log por
// cada envío, éxito o fallo.
//
// Antes de producción real: revisar SIEMPRE contra el sandbox del proveedor
// activo. Los shape de respuesta varían mucho entre ellos (ver
// normalizeResponse arriba).
export async function sendInvoiceToProvider({ signedXml, invoiceNumber, claveTecnica }) {
  const start = Date.now();
  const payload = { signedXml, invoiceNumber, claveTecnica, ambiente: AMBIENTE };

  let raw;
  let dispatchError = null;
  try {
    switch (PROVIDER) {
      case 'muisca':
        raw = await sendToMuisca(payload);
        break;
      case 'dataico':
        raw = await sendToDataico(payload);
        break;
      case 'novasoft':
        raw = await sendToNovasoft(payload);
        break;
      case 'alegra':
        raw = await sendToAlegra(payload);
        break;
      default:
        throw new Error(
          `[DIAN] Proveedor '${PROVIDER}' no soportado. Opciones: muisca | dataico | novasoft | alegra`
        );
    }
  } catch (e) {
    dispatchError = e;
    auditLog('dispatch-error', {
      provider: PROVIDER,
      invoiceNumber,
      status: 'dispatch-error',
      httpStatus: null,
      durationMs: Date.now() - start,
    });
    throw e;
  }

  const normalized = normalizeResponse(raw, PROVIDER);
  auditLog(
    normalized.duplicate ? 'duplicate' : normalized.accepted ? 'accepted' : 'rejected',
    {
      provider: PROVIDER,
      invoiceNumber,
      status: normalized.status,
      cufe: normalized.cufe,
      trackingId: normalized.trackingId,
      httpStatus: normalized._httpStatus,
      duplicate: normalized.duplicate,
      durationMs: Date.now() - start,
    }
  );

  // Silenciar lint de var unused dispatchError cuando el switch tiene éxito.
  void dispatchError;
  return normalized;
}

// ── Helpers exportados ──────────────────────────────────────────────────
export function getActiveProvider() {
  return PROVIDER;
}

export function listSupportedProviders() {
  return ['muisca', 'dataico', 'novasoft', 'alegra'];
}

export default {
  sendInvoiceToProvider,
  getActiveProvider,
  listSupportedProviders,
  normalizeResponse,
};
