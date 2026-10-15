import logger from './logger.js';
import { sendTemplatedEmail, templates } from './email.js';
import { sendPushToPhone } from '../push.js';

// ── Scheduler de campañas programadas ─────────────────────────────
// Cron simple (ladder ponytail: una query SQL basta, sin node-cron):
// cada tick activa las campañas `scheduled` cuya fecha programada ya
// venció Y las despacha a los clientes (email + push), poblando
// reach/conversions. El status `scheduled` era decorativo -- nada
// transitaba a `active` ni se enviaba nada; este módulo cierra ese hueco.
//
// Canales de envío (best-effort, nunca lanzan):
//   - Email  → server/services/email.js (salta si SMTP_USER falta)
//   - Push   → server/push.js (salta si VAPID falta o no hay suscripción)
// WhatsApp NO está disponible como canal de envío (no hay integración con
// ningún proveedor; solo existe wa.me como método de pedido).
//
// `activateDueCampaigns` es la pieza pura y testeable (exportada por
// separado para testearla sin timers). `startCampaignScheduler` es el
// wrapper que la corre en un setInterval y devuelve el handle para
// limpiarlo en graceful shutdown.

const DUE_CAMPAIGNS_SQL = `
  SELECT id, name, type, discount
  FROM campaigns
  WHERE status = 'scheduled'
    AND "scheduleAt" IS NOT NULL
    AND "scheduleAt" <= NOW()
`;

const ACTIVE_CLIENTS_SQL = `
  SELECT id, nombre, email, telefono
  FROM clients
  WHERE estado = 'activo'
`;

// Despacha una campaña a todos los clientes activos. Devuelve
// { reach, conversions }: reach = clientes a los que se intentó llegar
// (con email o suscripción push), conversions = cuántos recibieron al
// menos un mensaje exitoso. Nunca lanza: cada canal es best-effort.
export async function dispatchCampaign(pool, campaign) {
  const { rows: clients } = await pool.query(ACTIVE_CLIENTS_SQL);
  if (!clients.length) return { reach: 0, conversions: 0 };

  let reach = 0;
  let conversions = 0;

  for (const client of clients) {
    const hasEmail = !!client.email;
    let delivered = false;

    // Un fallo de envío para un cliente NO debe abortar la campaña entera:
    // se loguea y se sigue con el siguiente (best-effort por diseño).
    if (hasEmail) {
      try {
        const result = await sendTemplatedEmail({
          to: client.email,
          subject: `${campaign.discount}% OFF — ${campaign.name}`,
          template: templates.campaign,
          data: {
            campaignName: campaign.name,
            customerName: client.nombre || 'cliente',
            discount: campaign.discount,
            message: 'Aprovecha este descuento en tu próximo pedido.',
          },
        });
        if (!result?.skipped) delivered = true;
      } catch (err) {
        logger.warn({ err: err.message, to: client.email }, 'Campaign: email falló para un cliente');
      }
    }

    const pushed = await sendPushToPhone(pool, client.telefono, {
      title: `${campaign.discount}% OFF — ${campaign.name}`,
      body: 'Aprovecha este descuento en tu próximo pedido. 🍕',
      data: { campaignId: campaign.id, type: campaign.type, discount: campaign.discount },
    });
    if (pushed > 0) delivered = true;

    if (delivered || hasEmail || client.telefono) reach++;
    if (delivered) conversions++;
  }

  return { reach, conversions };
}

// Activa campañas programadas vencidas y las despacha. Devuelve cuántas
// se activaron (o null si la DB falló -- el error se loguea y el tick
// siguiente reintenta).
export async function activateDueCampaigns(pool) {
  try {
    const { rows: due } = await pool.query(DUE_CAMPAIGNS_SQL);
    if (!due.length) return 0;

    let activated = 0;
    for (const campaign of due) {
      const { reach, conversions } = await dispatchCampaign(pool, campaign);
      await pool.query('UPDATE campaigns SET status = $1, reach = $2, conversions = $3 WHERE id = $4', [
        'active',
        reach,
        conversions,
        campaign.id,
      ]);
      activated++;
      logger.info(
        { campaign: campaign.id, reach, conversions },
        `Campaña "${campaign.name}" activada (reach=${reach}, conversions=${conversions})`
      );
    }
    return activated;
  } catch (err) {
    logger.error({ err: err.message }, 'Campaign scheduler: error activando campañas programadas');
    return null;
  }
}

// Arranca el ciclo. Devuelve el interval handle (para clearInterval en
// graceful shutdown). intervalMs por defecto 60s -- suficiente para un
// negocio de restaurante; cada tick es una query barata sobre 0-2 filas.
export function startCampaignScheduler(pool, { intervalMs = 60_000 } = {}) {
  // Primer tick inmediato: si el server estuvo caído justo a la hora
  // programada, la campaña se activa al boot sin esperar 60s.
  activateDueCampaigns(pool);
  return setInterval(() => {
    activateDueCampaigns(pool);
  }, intervalMs);
}
