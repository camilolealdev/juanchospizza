// DIAN Provider Adapter — Abstracción sobre el proveedor tecnológico (PSE).
//
// ═══════════════════════════════════════════════════════════════════════════
//  Resolución DIAN 000008/2023 obliga a enviar las facturas firmadas a
//  un Proveedor Tecnológico autorizado o directamente a la DIAN. Esta capa
//  selecciona el adapter correcto mediante DIAN_PROVIDER y normaliza la
//  respuesta al formato interno del CRM (estado + CUDE + diagnóstico).
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
// ═══════════════════════════════════════════════════════════════════════════

const PROVIDER = (process.env.DIAN_PROVIDER || 'muisca').toLowerCase();
const BASE_URL = (process.env.DIAN_PROVIDER_URL || '').replace(/\/$/, '');
const AMBIENTE = process.env.DIAN_AMBIENTE || '1'; // 1 pruebas, 2 producción

// ── Normalización de respuesta ───────────────────────────────────────────
// Cada proveedor retorna un payload distinto. Esta función lo adapta al
// shape interno que usa InvoicesView.tsx y la BD (status + cufe +
// xmlRespuestaProveedor + mensajeDiagnostico).
function normalizeResponse(raw, provider) {
  const normalized = {
    provider,
    raw,
    acceptedAt: raw?.acceptedAt || new Date().toISOString(),
  };

  switch (provider) {
    case 'muisca':
      // Muisca retorna { StatusCode, StatusDescription, ResponseDian: { cufe, xml, ... } }
      normalized.accepted = raw?.StatusCode === '200' || raw?.StatusCode === '00';
      normalized.cufe = raw?.ResponseDian?.cufe || raw?.cufe;
      normalized.dianXml = raw?.ResponseDian?.xml || raw?.xml;
      normalized.trackingId = raw?.ResponseDian?.trackId || raw?.trackId;
      normalized.diagnostico = raw?.StatusDescription || raw?.message || '';
      normalized.status = normalized.accepted ? 'accepted' : 'rejected';
      break;
    case 'dataico':
      // Dataico retorna { success: true, data: { cufe, ... }, error: null }
      normalized.accepted = !!raw?.success;
      normalized.cufe = raw?.data?.cufe;
      normalized.dianXml = raw?.data?.signedXml;
      normalized.trackingId = raw?.data?.transactionId;
      normalized.diagnostico = raw?.error?.message || raw?.message || '';
      normalized.status = normalized.accepted ? 'accepted' : 'rejected';
      break;
    case 'novasoft':
      // Novasoft retorna { status: 'PROCESSED', cufe: '...', ... }
      normalized.accepted = raw?.status === 'PROCESSED' || raw?.status === 'ACCEPTED';
      normalized.cufe = raw?.cufe;
      normalized.dianXml = raw?.xml;
      normalized.trackingId = raw?.id;
      normalized.diagnostico = raw?.observations?.join('; ') || raw?.message || '';
      normalized.status = normalized.accepted ? 'accepted' : 'rejected';
      break;
    case 'alegra':
      // Alegra retorna { status: 'ok', data: { cufe, ... } }
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
  const response = await fetch(endpoint, {
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
  });

  if (!response.ok) {
    return {
      StatusCode: String(response.status),
      StatusDescription: `HTTP ${response.status}: ${response.statusText}`,
    };
  }
  return response.json();
}

// ── Adapter: Dataico (REST) ─────────────────────────────────────────────
async function sendToDataico({ signedXml, invoiceNumber, claveTecnica, ambiente }) {
  const apiKey = process.env.DATAICO_API_KEY;
  if (!apiKey) {
    throw new Error('DATAICO_API_KEY no configurado');
  }

  const response = await fetch(`${BASE_URL}/invoices/send`, {
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
  });

  if (!response.ok) {
    return { success: false, error: { message: `HTTP ${response.status}` } };
  }
  return response.json();
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

  const response = await fetch(`${BASE_URL}/documents/send`, {
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
  });

  if (!response.ok) {
    return { status: 'ERROR', observations: [`HTTP ${response.status}: ${response.statusText}`] };
  }
  return response.json();
}

// ── Adapter: Alegra (REST) ───────────────────────────────────────────────
async function sendToAlegra({ signedXml, invoiceNumber, ambiente }) {
  const user = process.env.ALEGRA_USER;
  const token = process.env.ALEGRA_TOKEN;
  if (!user || !token) {
    throw new Error('ALEGRA_USER / ALEGRA_TOKEN no configurados');
  }

  const credentials = Buffer.from(`${user}:${token}`).toString('base64');

  const response = await fetch(`${BASE_URL}/invoices`, {
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
  });

  if (!response.ok) {
    return { status: 'error', message: `HTTP ${response.status}: ${response.statusText}` };
  }
  return response.json();
}

// ── Dispatcher principal ─────────────────────────────────────────────────
// Único punto de entrada: dado un XML firmado + metadatos, decide adapter
// según DIAN_PROVIDER y devuelve respuesta normalizada.
//
// Antes de producción real: revisar SIEMPRE contra el sandbox del proveedor
// activo. Los shape de respuesta varían mucho entre ellos (ver
// normalizeResponse arriba).
export async function sendInvoiceToProvider({ signedXml, invoiceNumber, claveTecnica }) {
  const payload = { signedXml, invoiceNumber, claveTecnica, ambiente: AMBIENTE };

  let raw;
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

  return normalizeResponse(raw, PROVIDER);
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
