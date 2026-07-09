import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// --- PUSH NOTIFICATIONS ---
router.post('/api/push/subscribe', async (req, res) => {
  try {
    const { phone, clientId, endpoint, p256dh, auth } = req.body;

    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const sanitized = {
      phone: phone ? String(phone).slice(0, 30) : null,
      clientId: (clientId !== undefined && clientId !== null && clientId !== '') ? String(clientId).slice(0, 100) : null,
      endpoint: String(endpoint).slice(0, 500),
      p256dh: String(p256dh).slice(0, 200),
      auth: String(auth).slice(0, 200)
    };

    const id = `push_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO push_subscriptions (id, phone, "clientId", endpoint, p256dh, auth)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (endpoint) DO UPDATE SET phone = $2, "clientId" = $3, p256dh = $5, auth = $6`,
      [id, sanitized.phone, sanitized.clientId, sanitized.endpoint, sanitized.p256dh, sanitized.auth]
    );

    res.status(201).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error saving push subscription' });
  }
});


export default router;
