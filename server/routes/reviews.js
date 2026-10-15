import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createReviewSchema, reviewStatusSchema } from '../schemas/reviews.js';
import { reviewRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// --- REVIEWS ---
router.post('/api/reviews', reviewRateLimit, validate(createReviewSchema), async (req, res) => {
  try {
    const { orderId, clientPhone, clientName, rating: ratingNum, comment } = req.body;

    const order = await pool.query('SELECT status, "customerPhone" FROM orders WHERE id = $1', [orderId]);
    if (!order.rows.length) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    if (order.rows[0].status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Solo se puede reseñar un pedido completado' });
    }
    // El teléfono es el mismo verificador mínimo que usa el tracking público de
    // pedidos -- sin esto, cualquiera con un orderId podía postear reseñas
    // falsas a nombre de otro cliente.
    if (order.rows[0].customerPhone !== String(clientPhone).trim()) {
      return res.status(403).json({ error: 'El teléfono no coincide con el pedido' });
    }

    const existing = await pool.query('SELECT id FROM reviews WHERE "orderId" = $1', [orderId]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Este pedido ya tiene una reseña' });
    }

    const sanitized = { orderId, clientPhone, clientName, rating: ratingNum, comment };

    const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO reviews (id, "orderId", "clientPhone", "clientName", rating, comment, status) VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
      [id, sanitized.orderId, sanitized.clientPhone, sanitized.clientName, sanitized.rating, sanitized.comment]
    );

    res.status(201).json({ id, ...sanitized, status: 'pending' });
  } catch (_e) {
    res.status(500).json({ error: 'Error creating review' });
  }
});

router.get('/api/reviews/approved', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, rating, comment, "clientName", "createdAt" FROM reviews WHERE status = 'approved' ORDER BY "createdAt" DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (_e) {
    res.status(500).json({ error: 'Error fetching reviews' });
  }
});

router.get('/api/reviews', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { status } = req.query;
    const result = status
      ? await pool.query('SELECT * FROM reviews WHERE status = $1 ORDER BY "createdAt" DESC', [status])
      : await pool.query('SELECT * FROM reviews ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (_e) {
    res.status(500).json({ error: 'Error fetching reviews' });
  }
});

router.patch(
  '/api/reviews/:id/status',
  authMiddleware,
  requireRole('ADMIN', 'MARKETING'),
  validate(reviewStatusSchema),
  async (req, res) => {
    try {
      const { status } = req.body;

      const result = await pool.query('UPDATE reviews SET status = $1 WHERE id = $2 RETURNING *', [
        status,
        req.params.id,
      ]);

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Review not found' });
      }

      res.json(result.rows[0]);
    } catch (_e) {
      res.status(500).json({ error: 'Error updating review status' });
    }
  }
);

router.delete('/api/reviews/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Review not found' });
    res.status(204).end();
  } catch (_e) {
    res.status(500).json({ error: 'Error deleting review' });
  }
});

export default router;
