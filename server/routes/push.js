import express from 'express';
import { pool } from '../db.js';
import { validate } from '../middleware/validate.js';
import { pushSubscribeSchema } from '../schemas/push.js';

const router = express.Router();

// --- PUSH NOTIFICATIONS ---
router.post('/api/push/subscribe', validate(pushSubscribeSchema), async (req, res) => {
  try {
    const sanitized = req.body;
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
