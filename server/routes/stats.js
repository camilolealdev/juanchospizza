import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const router = express.Router();

// STATS
router.get('/api/stats', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    // Filtro opcional por sede -- sin ?locationId= se comporta exactamente
    // igual que antes (todas las sedes juntas), no cambia el default.
    const { locationId } = req.query;
    const locationParams = locationId ? [locationId] : [];

    const totalResult = await pool.query(
      `SELECT COUNT(*)::int as count, COALESCE(SUM(total), 0)::int as revenue FROM orders WHERE 1=1${locationId ? ' AND "locationId" = $1' : ''}`,
      locationParams
    );
    const todayResult = await pool.query(
      `SELECT COUNT(*)::int as count, COALESCE(SUM(total), 0)::int as revenue FROM orders WHERE "createdAt" >= $1::date AND "createdAt" < $1::date + INTERVAL '1 day'${locationId ? ' AND "locationId" = $2' : ''}`,
      [today, ...locationParams]
    );
    const pendingResult = await pool.query(
      `SELECT COUNT(*)::int as count FROM orders WHERE status = 'PENDING'${locationId ? ' AND "locationId" = $1' : ''}`,
      locationParams
    );
    const preparingResult = await pool.query(
      `SELECT COUNT(*)::int as count FROM orders WHERE status = 'PREPARING'${locationId ? ' AND "locationId" = $1' : ''}`,
      locationParams
    );
    const readyResult = await pool.query(
      `SELECT COUNT(*)::int as count FROM orders WHERE status = 'READY'${locationId ? ' AND "locationId" = $1' : ''}`,
      locationParams
    );

    res.json({
      totalOrders: totalResult.rows[0]?.count || 0,
      todayOrders: todayResult.rows[0]?.count || 0,
      pendingOrders: pendingResult.rows[0]?.count || 0,
      preparingOrders: preparingResult.rows[0]?.count || 0,
      readyOrders: readyResult.rows[0]?.count || 0,
      totalRevenue: totalResult.rows[0]?.revenue || 0,
      todayRevenue: todayResult.rows[0]?.revenue || 0,
    });
  } catch (e) {
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

export default router;
