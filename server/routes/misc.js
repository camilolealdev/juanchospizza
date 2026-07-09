import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';

const router = express.Router();

// Health check — sin exponer detalles
router.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

// Seed data endpoint
router.post('/api/seed', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const categories = [
      { id: '1', name: 'PROMOS FLASH', icon: 'bolt', color: 'text-yellow-500' },
      { id: '2', name: 'PIZZAS TRADICIONALES', icon: 'pizza-slice', color: 'text-orange-500' },
      { id: '3', name: 'PIZZAS PREMIUM', icon: 'crown', color: 'text-purple-500' },
      { id: '4', name: 'PIZZAS DULCES', icon: 'cookie', color: 'text-pink-400' },
      { id: '5', name: 'ENTRADAS', icon: 'bread-slice', color: 'text-amber-500' },
      { id: '6', name: 'COMBOS', icon: 'box-open', color: 'text-green-500' },
      { id: '7', name: 'BEBIDAS', icon: 'wine-glass', color: 'text-cyan-500' },
      { id: '8', name: 'POSTRES', icon: 'ice-cream', color: 'text-pink-500' },
      { id: '9', name: 'SALSAS PARA MOJAR', icon: 'droplet', color: 'text-red-500' },
    ];

    for (const cat of categories) {
      await pool.query(
        `INSERT INTO categories (id, name, icon, color) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [cat.id, cat.name, cat.icon, cat.color]
      );
    }

    res.json({ message: 'Seed completed' });
  } catch (e) {
    res.status(500).json({ error: 'Error seeding data' });
  }
});

export default router;
