// ── DIAN Sandbox / Dry-Run Mode ────────────────────────────────────
// Controla si el envío a DIAN es real o simulado.
//
// DIAN_ENVIRONMENT=sandbox  → genera XML, firma, pero NO envía al
//                             proveedor. Loggea el XML que se habría
//                             enviado y retorna una respuesta simulada.
// DIAN_ENVIRONMENT=production → envía real al proveedor configurado.
//
// DRY_RUN=true (en sandbox)  → ni siquiera firma, solo genera el XML
//                               y loggea. Útil para desarrollo.

import logger from './logger.js';

const ENVIRONMENT = (process.env.DIAN_ENVIRONMENT || 'sandbox').toLowerCase();
const DRY_RUN = process.env.DRY_RUN === 'true';

export function isSandbox() {
  return ENVIRONMENT === 'sandbox';
}

export function isDryRun() {
  return DRY_RUN;
}

export function getEnvironment() {
  return ENVIRONMENT;
}

// Genera una respuesta simulada para sandbox (sin llamar al proveedor)
export function simulateSend({ signedXml, invoiceNumber }) {
  const trackingId = `sandbox_${Date.now()}`;
  const cufe = `SANDBOX_CUFE_${Date.now().toString(36).toUpperCase()}`;

  logger.info({
    invoiceNumber,
    environment: 'sandbox',
    dryRun: DRY_RUN,
    trackingId,
    cufe,
    xmlLength: signedXml?.length || 0,
  }, '[DIAN Sandbox] Factura procesada en modo simulación');

  return {
    accepted: true,
    provider: 'sandbox',
    cufe,
    dianXml: signedXml || '<sandbox>Simulado</sandbox>',
    trackingId,
    diagnostico: 'Factura procesada en ambiente sandbox — no enviada a DIAN',
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
    raw: {
      simulated: true,
      environment: 'sandbox',
      dryRun: DRY_RUN,
    },
  };
}

// Wrapper: decide si enviar real o simular
export async function sendWithEnvironmentCheck(providerFn, { signedXml, invoiceNumber, claveTecnica }) {
  if (isSandbox()) {
    return simulateSend({ signedXml, invoiceNumber });
  }

  logger.info({
    invoiceNumber,
    environment: 'production',
  }, '[DIAN] Enviando factura a proveedor');

  try {
    const result = await providerFn({ signedXml, invoiceNumber, claveTecnica });
    logger.info({
      invoiceNumber,
      status: result.status,
      cufe: result.cufe,
    }, '[DIAN] Factura enviada');
    return result;
  } catch (err) {
    logger.error({
      err,
      invoiceNumber,
      environment: 'production',
    }, '[DIAN] Error enviando factura a proveedor');
    throw err;
  }
}

export default {
  isSandbox,
  isDryRun,
  getEnvironment,
  simulateSend,
  sendWithEnvironmentCheck,
};
