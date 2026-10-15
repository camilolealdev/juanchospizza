// ponytail: ejecuta la supresion real de PII cuando se aprueba una
// solicitud de derecho de supresion (Art. 14, Ley 1581/2012). Antes
// server/routes/consent.js solo marcaba el cliente como
// 'borrado_solicitado' y registraba la solicitud -- nada ejecutaba el
// borrado (auditoria MEDIA-01, docs/PENDIENTES-agente5-datos.md).
//
// Candado fiscal: una factura y sus soportes deben conservarse un minimo
// de 5 anios (Art. 632 Estatuto Tributario, concordante con Art. 46 Ley
// 962/2005 modificado por Art. 304 Ley 1819/2016) y hasta 10 anios bajo
// el regimen comercial/contable (Art. 60 Codigo de Comercio, Art. 28 Ley
// 962/2005). Se usa el plazo mas largo (10 anios) por ser el estandar mas
// seguro -- decision de negocio del 2026-10-01. Mientras un pedido tenga
// una factura dentro de esa ventana, NO se borra su PII aunque el titular
// lo pida: es la excepcion del Art. 13 de la Ley 1581 (obligacion legal
// de conservar).
//
// Resenas y loyalty: el negocio decidio (2026-10-01) que por defecto
// quiere poder identificar a las personas -- no se ofrece anonimizacion
// de oficio (ver docs/PLAN_REMEDIACION_2026-09-30.md). Pero una solicitud
// de supresion valida igual debe honrarse salvo excepcion legal, y no hay
// retencion fiscal aplicable a resenas, asi que se suprimen junto con el
// resto cuando se ejecuta esta funcion.
import { pool } from '../db.js';
import logger from './logger.js';

export const FISCAL_RETENTION_YEARS = 10;

async function classifyOrdersForClient(client, clientId) {
  const { rows } = await client.query(
    `SELECT o.id, o."orderNumber", i."createdAt" AS invoice_created_at
       FROM orders o
       LEFT JOIN invoices i ON i."orderId" = o.id
      WHERE o."clientId" = $1`,
    [clientId]
  );
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - FISCAL_RETENTION_YEARS);

  const suprimibles = [];
  const retenidos = [];
  for (const row of rows) {
    if (row.invoice_created_at && new Date(row.invoice_created_at) > cutoff) {
      retenidos.push(row);
    } else {
      suprimibles.push(row);
    }
  }
  return { suprimibles, retenidos };
}

// Ejecuta la supresion real para un cliente. Devuelve un resumen pensado
// para quedar como evidencia en derechos_solicitudes.respuesta -- qué se
// suprimió y qué quedó retenido y por qué, para la SIC.
export async function executeSuppression(clientId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { suprimibles, retenidos } = await classifyOrdersForClient(client, clientId);

    if (suprimibles.length) {
      await client.query(
        `UPDATE orders SET "customerName" = '[SUPRIMIDO]', address = '[SUPRIMIDO]', "customerPhone" = NULL
           WHERE id = ANY($1::text[])`,
        [suprimibles.map((o) => o.id)]
      );
    }

    await client.query(
      `UPDATE reviews SET "clientName" = '[SUPRIMIDO]', "clientPhone" = NULL
         WHERE "orderId" IN (SELECT id FROM orders WHERE "clientId" = $1)`,
      [clientId]
    );

    await client.query(
      `UPDATE clients
          SET nombre = '[SUPRIMIDO]', telefono = NULL, email = NULL, direccion = NULL, notas = NULL,
              estado = 'suprimido'
        WHERE id = $1`,
      [clientId]
    );

    await client.query('COMMIT');

    const resumen =
      suprimibles.length > 0
        ? `Suprimidos ${suprimibles.length} pedido(s) y los datos del cliente.`
        : 'Cliente sin pedidos con PII suprimible en este momento; datos del cliente suprimidos igual.';
    const retencionMsg = retenidos.length
      ? ` ${retenidos.length} pedido(s) retenidos por obligación legal de conservar soportes fiscales (Art. 632 Estatuto Tributario / Art. 60 Código de Comercio, ${FISCAL_RETENTION_YEARS} años desde la factura) hasta que venza ese plazo: ${retenidos.map((o) => o.orderNumber).join(', ')}.`
      : '';

    return {
      ok: true,
      suprimidos: suprimibles.length,
      retenidos: retenidos.length,
      resumen: resumen + retencionMsg,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err: err.message, clientId }, '[DataRetention] Error ejecutando supresión');
    throw err;
  } finally {
    client.release();
  }
}
