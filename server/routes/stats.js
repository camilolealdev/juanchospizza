import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const router = express.Router();

// STATS
router.get('/api/stats', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const totalResult = await pool.query('SELECT COUNT(*)::int as count, COALESCE(SUM(total), 0)::int as revenue FROM orders');
    const todayResult = await pool.query(
      `SELECT COUNT(*)::int as count, COALESCE(SUM(total), 0)::int as revenue FROM orders WHERE "createdAt" >= $1::date AND "createdAt" < $1::date + INTERVAL '1 day'`,
      [today]
    );
    const pendingResult = await pool.query("SELECT COUNT(*)::int as count FROM orders WHERE status = 'PENDING'");
    const preparingResult = await pool.query("SELECT COUNT(*)::int as count FROM orders WHERE status = 'PREPARING'");
    const readyResult = await pool.query("SELECT COUNT(*)::int as count FROM orders WHERE status = 'READY'");

    res.json({
      totalOrders: totalResult.rows[0]?.count || 0,
      todayOrders: todayResult.rows[0]?.count || 0,
      pendingOrders: pendingResult.rows[0]?.count || 0,
      preparingOrders: preparingResult.rows[0]?.count || 0,
      readyOrders: readyResult.rows[0]?.count || 0,
      totalRevenue: totalResult.rows[0]?.revenue || 0,
      todayRevenue: todayResult.rows[0]?.revenue || 0
    });
  } catch (e) {
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

export default router;
