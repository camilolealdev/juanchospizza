// 🛎️ Notifications status & test endpoints
// Muestra qué servicios de notificación están configurados y permite
// enviar emails de prueba manualmente desde el panel de administración.
import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { sendTemplatedEmail, templates } from '../services/email.js';
import { deliverWebhook } from '../services/webhooks.js';
import { isPushEnabled } from '../push.js';

const router = express.Router();

// GET /api/notifications/status — estado de todos los servicios
router.get('/api/notifications/status', authMiddleware, requireRole('ADMIN'), (req, res) => {
  res.json({
    email: {
      configured: !!process.env.SMTP_USER,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      from: process.env.SMTP_FROM || 'noreply@guidopizza.com',
    },
    push: {
      configured: isPushEnabled(),
      vapidPresent: !!(process.env.VAPID_MAILTO && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    },
    webhook: {
      configured: !!(process.env.ORDER_WEBHOOK_URL || process.env.PAYMENT_WEBHOOK_URL || process.env.WEBHOOK_URL),
      orderUrl: process.env.ORDER_WEBHOOK_URL || null,
      paymentUrl: process.env.PAYMENT_WEBHOOK_URL || null,
    },
  });
});

// POST /api/notifications/test-email — envía un email de prueba
// Cuerpo: { to?: string } — si no se especifica destinatario, busca el
// email del empleado autenticado en la DB.
router.post('/api/notifications/test-email', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    let { to } = req.body;

    // Si no se especificó destinatario, buscar el email del admin autenticado
    if (!to && req.auth?.sub) {
      const result = await pool.query('SELECT email FROM employees WHERE id = $1', [req.auth.sub]);
      to = result.rows[0]?.email;
    }

    if (!to) {
      return res.status(400).json({
        error: 'Destinatario requerido. Proporcioná un email o asegurate de tener email configurado en tu perfil.',
      });
    }

    await sendTemplatedEmail({
      to,
      subject: '🔔 Prueba de notificaciones — Guido Pizza',
      template:
        '<h1>¡Notificaciones funcionando! ✅</h1>\n' +
        '<p>Hola,</p>\n' +
        '<p>Este es un email de prueba enviado desde el panel de administración de Guido Pizza.</p>\n' +
        '<p>Si estás viendo esto, el sistema de notificaciones por email está configurado correctamente.</p>\n' +
        '<hr>\n' +
        '<p style="color:#999;font-size:12px;">Enviado: {{timestamp}}</p>\n',
      data: { timestamp: new Date().toLocaleString('es-CO') },
    });

    res.json({ success: true, to });
  } catch (e) {
    res.status(500).json({ error: 'Error enviando email de prueba: ' + e.message });
  }
});

// POST /api/notifications/test-webhook — envía un webhook de prueba
router.post('/api/notifications/test-webhook', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const webhookUrl = process.env.ORDER_WEBHOOK_URL || process.env.WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'No hay URL de webhook configurada (ORDER_WEBHOOK_URL)' });
    }

    const result = await deliverWebhook({
      url: webhookUrl,
      payload: {
        event: 'test',
        data: { message: 'Webhook de prueba desde el panel de administración' },
        timestamp: new Date().toISOString(),
      },
      retries: 1,
      timeout: 5000,
    });

    res.json({ success: true, status: result.status });
  } catch (e) {
    res.status(502).json({ error: 'Error enviando webhook de prueba: ' + e.message });
  }
});

export default router;
