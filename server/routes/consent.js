// ═══════════════════════════════════════════════════════════════════════
//   Ley 1581/2012 — Habeas Data (Colombia)
//
//   Endpoints públicos (sin auth):
//     POST /api/consent           — registrar decisión de consentimiento.
//                                    Para visitantes anónimos basta el
//                                    consent_type+granted; si el banner
//                                    recogió phone/email, se asocia a un
//                                    client existente o se crea uno nuevo.
//     POST /api/derecho/consulta  — Art. 14: titular pide conocer sus
//                                    datos. Queda registrada para responder
//                                    en máx. 10 días hábiles (Art. 15).
//     POST /api/derecho/supresion — Art. 14: titular pide eliminar sus
//                                    datos. Marca el cliente como
//                                    'borrado_solicitado' (NO físico de
//                                    inmediato -- primero se verifica que no
//                                    aplique excepción Art. 13).
//     POST /api/derecho/reclamo   — Art. 15: queja sobre tratamiento.
//                                    Plazo de respuesta 10 días hábiles.
//
//   Endpoints admin:
//     GET /api/clients/:id/consent-history — log completo de consent_eventos
//                                    + derechos_solicitudes para un cliente,
//                                    evidencia para la SIC.
// ═══════════════════════════════════════════════════════════════════════

import express from 'express';
import crypto from 'crypto';
import logger from '../services/logger.js';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { postConsentSchema } from '../schemas/consent.js';
import { derechoBaseSchema } from '../schemas/derechos.js';
import { consentRateLimit, derechoRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Rayos y truenos: capturá el identificador de quien hace la solicitud
// para devolver evidencia forense si la SIC pide auditoría después.
function clientIp(req) {
  // Express con 'trust proxy' = 1 -> req.ip ya respeta X-Forwarded-For una
  // vez. Si por alguna razón llega vacío, no devolvemos null (rompe el
  // guardado) sino '0.0.0.0' literal.
  return req.ip || req.socket?.remoteAddress || '0.0.0.0';
}

const CONSENT_VERSION = 'v1-2026-07';

// ── POST /api/consent ────────────────────────────────────────────────────
// Best-effort: si no llega phone/email, aceptamos el evento y lo registramos
// anónimo (sin clientId). Si llega alguno, lo asociamos al primer cliente
// que matchee. La asociación se hace acá y no en el frontend porque el
// consentimiento debe quedar en una fuente verificable (la DB), no solo en
// localStorage del browser.
router.post('/api/consent', consentRateLimit, validate(postConsentSchema), async (req, res) => {
  try {
    const { consent_type, granted, phone, email, path } = req.body;
    const ip = clientIp(req);
    const ua = (req.headers['user-agent'] || '').toString().slice(0, 500);

    // 1) Resolver el clientId (o null)
    let clientId = null;
    if (phone || email) {
      const params = [];
      const conditions = [];
      if (phone) {
        params.push(phone);
        conditions.push(`telefono = $${params.length}`);
      }
      if (email) {
        params.push(email);
        conditions.push(`email = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT id FROM clients WHERE ${conditions.join(' OR ')} ORDER BY creado DESC LIMIT 1`,
        params
      );
      clientId = rows[0]?.id || null;
    }

    // 2) Log del evento (siempre)
    const eventoId = `evt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await pool.query(
      `INSERT INTO consent_eventos
         (id, "clientId", "consentType", granted, ip, "userAgent", source, path)
       VALUES ($1, $2, $3, $4, $5, $6, 'web', $7)`,
      [eventoId, clientId, consent_type, granted, ip, ua, path || null]
    );

    // 3) Si hay cliente asociado y es un consentimiento que afecta su estado
    //    consolidado, actualizamos clients.dataTreatmentAuthorized y
    //    clients.marketingAuthorized. 'privacy_only' y 'all' ambos aceptan
    //    tratamiento de datos (la diferencia es marketing).
    if (clientId) {
      const dataOk = consent_type === 'all' || consent_type === 'privacy_only' ? granted : null;
      const marketingOk =
        consent_type === 'all' ? granted
          : consent_type === 'marketing' ? granted
            : consent_type === 'privacy_only' ? false
              : null;

      const sets = ['"consentAt" = NOW()', '"consentIp" = $2', '"consentUserAgent" = $3', '"consentVersion" = $4'];
      const params = [clientId, ip, ua, CONSENT_VERSION];

      if (dataOk !== null) {
        params.push(dataOk);
        sets.push(`"dataTreatmentAuthorized" = $${params.length}`);
      }
      if (marketingOk !== null) {
        params.push(marketingOk);
        sets.push(`"marketingAuthorized" = $${params.length}`);
      }

      await pool.query(`UPDATE clients SET ${sets.join(', ')} WHERE id = $1`, params);
    }

    res.status(201).json({
      ok: true,
      event_id: eventoId,
      client_associated: clientId !== null,
    });
  } catch (e) {
    logger.error({ err: e }, '[Habeas Data] POST /api/consent failed');
    // 500 aquí no es fatal: el cliente puede seguir navegando. No exponemos
    // el error interno al exterior.
    res.status(500).json({ error: 'No pudimos registrar tu preferencia. Intenta de nuevo.' });
  }
});

// ── POST /api/derecho/:tipo ──────────────────────────────────────────────
// Una sola firma para los cuatro derechos; :tipo valida con zod y se
// rechaza cualquier valor fuera del enum. Procesar supresion tacha el
// cliente como 'borrado_solicitado' (NO borra datos) para que el equipo
// legal revise primero excepciones Art. 13 (orden público, salud pública,
// obligaciones legales de conservar facturas DIAN — mínima 5 años).
router.post('/api/derecho/:tipo', derechoRateLimit, async (req, res) => {
  // Validation inline (no usamos el middleware validate() aquí porque la
  // ruta incluye req.params.tipo en el cuerpo parseado por zod y el
  // wrapper de validate llama schema.safeParse(req.body) — no acepta
  // callbacks. Comprobar el resultado acá es más simple y más rápido
  // que extender el middleware).
  const parsed = derechoBaseSchema.safeParse({ ...req.body, tipo: req.params.tipo });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' });
  }
  const { tipo, descripcion, email, telefono } = parsed.data;

  try {
    const ip = clientIp(req);
    const ua = (req.headers['user-agent'] || '').toString().slice(0, 500);

    // Buscar el cliente por identificador
    let clientId = null;
    if (email || telefono) {
      const params = [];
      const conds = [];
      if (email) {
        params.push(email);
        conds.push(`email = $${params.length}`);
      }
      if (telefono) {
        params.push(telefono);
        conds.push(`telefono = $${params.length}`);
      }
      const { rows } = await pool.query(
        `SELECT id FROM clients WHERE ${conds.join(' OR ')} ORDER BY creado DESC LIMIT 1`,
        params
      );
      clientId = rows[0]?.id || null;
    }

    // Si la solicitud es de supresión y existe cliente, marcarlo como
    // 'borrado_solicitado' — el equipo debe revisar antes de borrar.
    if (tipo === 'supresion' && clientId) {
      await pool.query(
        `UPDATE clients SET estado = 'borrado_solicitado', "consentAt" = NOW() WHERE id = $1`,
        [clientId]
      );
    }

    // Registrar la solicitud.
    const solicitudId = `der_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await pool.query(
      `INSERT INTO derechos_solicitudes
         (id, "clientId", tipo, descripcion, identificador, "ipOrigen", "userAgent")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        solicitudId,
        clientId,
        tipo,
        descripcion,
        email || telefono || null,
        ip,
        ua,
      ]
    );

    res.status(201).json({
      ok: true,
      solicitud_id: solicitudId,
      tipo,
      plazo_dias_habiles: 10,
      msg:
        tipo === 'consulta'
          ? 'Tu solicitud de consulta fue registrada. Responderemos en máximo 10 días hábiles.'
          : tipo === 'supresion'
            ? 'Tu solicitud de supresión fue registrada. Nuestro equipo revisará las excepciones legales aplicables y te contactará.'
            : tipo === 'rectificacion'
              ? 'Tu solicitud de rectificación fue registrada. Te notificaremos la corrección aplicada.'
              : 'Tu reclamo fue registrado. Responderemos en máximo 10 días hábiles según el Art. 15 de la Ley 1581.',
    });
  } catch (e) {
    logger.error({ err: e }, '[Habeas Data] POST /api/derecho/:tipo failed');
    res.status(500).json({ error: 'No pudimos registrar tu solicitud. Intenta de nuevo más tarde.' });
  }
});

// ── GET /api/clients/:id/consent-history  (admin) ─────────────────────────
router.get(
  '/api/clients/:id/consent-history',
  authMiddleware,
  requireRole('ADMIN', 'MARKETING'),
  async (req, res) => {
    try {
      const [eventos, solicitudes] = await Promise.all([
        pool.query(
          `SELECT id, "consentType", granted, ip, path, created_at FROM consent_eventos
           WHERE "clientId" = $1 ORDER BY created_at DESC LIMIT 200`,
          [req.params.id]
        ),
        pool.query(
          `SELECT id, tipo, descripcion, identificador, estado, "respuesta", "respondedBy",
                  "respondedAt", created_at FROM derechos_solicitudes
           WHERE "clientId" = $1 ORDER BY created_at DESC LIMIT 200`,
          [req.params.id]
        ),
      ]);
      res.json({
        client_id: req.params.id,
        consent_events: eventos.rows,
        derechos_solicitudes: solicitudes.rows,
      });
    } catch (e) {
      res.status(500).json({ error: 'Error al consultar historial de consentimiento' });
    }
  }
);

export default router;
