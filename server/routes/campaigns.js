import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createCampaignSchema, updateCampaignSchema } from '../schemas/campaigns.js';

const router = express.Router();

// CAMPAIGNS
router.get('/api/campaigns', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM campaigns ORDER BY id');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching campaigns' });
  }
});

router.post(
  '/api/campaigns',
  authMiddleware,
  requireRole('ADMIN', 'MARKETING'),
  validate(createCampaignSchema),
  async (req, res) => {
    try {
      const { name, type, discount, status, budget, scheduleAt } = req.body;
      const id = `camp_${Date.now()}`;

      await pool.query(
        `INSERT INTO campaigns (id, name, type, discount, status, reach, conversions, budget, "scheduleAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        // En un INSERT no hay fecha previa que pisar: undefined → null explícito
        [id, name, type, discount, status, 0, 0, budget, scheduleAt ?? null]
      );

      res.status(201).json({ id, name, type, discount, status, reach: 0, conversions: 0, budget, scheduleAt });
    } catch (e) {
      res.status(500).json({ error: 'Error creating campaign' });
    }
  }
);

router.put(
  '/api/campaigns/:id',
  authMiddleware,
  requireRole('ADMIN', 'MARKETING'),
  validate(updateCampaignSchema),
  async (req, res) => {
    try {
      const { name, type, discount, status, budget, scheduleAt } = req.body;

      const updates = [];
      const params = [];
      if (name !== undefined) {
        params.push(name);
        updates.push(`name = $${params.length}`);
      }
      if (type !== undefined) {
        params.push(type);
        updates.push(`type = $${params.length}`);
      }
      if (discount !== undefined) {
        params.push(discount);
        updates.push(`discount = $${params.length}`);
      }
      if (status !== undefined) {
        params.push(status);
        updates.push(`status = $${params.length}`);
      }
      if (budget !== undefined) {
        params.push(budget);
        updates.push(`budget = $${params.length}`);
      }
      if (scheduleAt !== undefined) {
        // null explícito limpia la fecha programada (se valida en el schema)
        params.push(scheduleAt);
        updates.push(`"scheduleAt" = $${params.length}`);
      }

      if (updates.length) {
        params.push(req.params.id);
        await pool.query(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
      }

      const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);

      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.status(404).json({ error: 'Campaign not found' });
      }
    } catch (e) {
      res.status(500).json({ error: 'Error updating campaign' });
    }
  }
);

router.delete('/api/campaigns/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM campaigns WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Campaign not found' });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: 'Error deleting campaign' });
  }
});

export default router;
