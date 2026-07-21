import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createTableSchema, updateTableSchema, batchUpdateStatusSchema } from '../schemas/tables.js';
import { notifyTableUpdate } from '../websocket.js';

const router = express.Router();

// GET /api/tables — listar mesas (con filtros)
router.get('/api/tables', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { locationId, area, status } = req.query;
    let query = 'SELECT * FROM dining_tables';
    const conditions = [];
    const params = [];

    if (locationId) {
      params.push(locationId);
      conditions.push(`"locationId" = $${params.length}`);
    }
    if (area) {
      params.push(area);
      conditions.push(`area = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    // Por defecto solo activas, a menos que pidan inactivas explícitamente
    if (req.query.includeInactive !== 'true') {
      conditions.push('active IS DISTINCT FROM false');
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY "locationId", area, name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (_e) {
    res.status(500).json({ error: 'Error fetching tables' });
  }
});

// === ESPECIALIZADAS: deben ir ANTES de :id para que Express no las atrape como parámetro ===

// GET /api/tables/floor-plan — vista del plano del restaurante agrupada por área
router.get('/api/tables/floor-plan', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { locationId } = req.query;
    let query = 'SELECT * FROM dining_tables WHERE active IS DISTINCT FROM false';
    const params = [];
    if (locationId) {
      params.push(locationId);
      query += ` AND "locationId" = $1`;
    }
    query += ' ORDER BY area, name';

    const result = await pool.query(query, params);

    const floorPlan = {
      salon: result.rows.filter((t) => t.area === 'salon'),
      terraza: result.rows.filter((t) => t.area === 'terraza'),
      privado: result.rows.filter((t) => t.area === 'privado'),
      barra: result.rows.filter((t) => t.area === 'barra'),
    };

    res.json({
      locationId: locationId || 'all',
      total: result.rows.length,
      available: result.rows.filter((t) => t.status === 'available').length,
      occupied: result.rows.filter((t) => t.status === 'occupied').length,
      floorPlan,
    });
  } catch (_e) {
    res.status(500).json({ error: 'Error fetching floor plan' });
  }
});

// PATCH /api/tables/batch-status — cambio masivo de estado
router.patch(
  '/api/tables/batch-status',
  authMiddleware,
  requireRole('ADMIN', 'OPERATOR'),
  validate(batchUpdateStatusSchema),
  async (req, res) => {
    try {
      const { ids, status } = req.body;
      const result = await pool.query(
        `UPDATE dining_tables SET status = $1 WHERE id = ANY($2::text[]) RETURNING id, name, status`,
        [status, ids]
      );
      res.json({ updated: result.rows.length, tables: result.rows });

      // Notificar WebSocket para cada mesa actualizada
      setImmediate(() => {
        result.rows.forEach((table) => {
          notifyTableUpdate(table.id, table.status);
        });
      });
    } catch (_e) {
      res.status(500).json({ error: 'Error updating table statuses' });
    }
  }
);

// === POR ID (rutas paramétricas, van después de las especializadas) ===

// GET /api/tables/:id
router.get('/api/tables/:id', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dining_tables WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Mesa no encontrada' });
    res.json(result.rows[0]);
  } catch (_e) {
    res.status(500).json({ error: 'Error fetching table' });
  }
});

// POST /api/tables
router.post('/api/tables', authMiddleware, requireRole('ADMIN'), validate(createTableSchema), async (req, res) => {
  try {
    const { name, capacity, area, locationId, notes } = req.body;
    const id = `tbl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    await pool.query(
      `INSERT INTO dining_tables (id, name, capacity, area, "locationId", notes, status, active)
       VALUES ($1, $2, $3, $4, $5, $6, 'available', true)`,
      [id, name, capacity, area, locationId, notes || null]
    );

    res.status(201).json({ id, name, capacity, area, locationId, status: 'available', active: true });

    // Notificar WebSocket
    setImmediate(() => {
      notifyTableUpdate(id, 'available');
    });
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una mesa con ese nombre en esta sede' });
    }
    res.status(500).json({ error: 'Error creating table' });
  }
});

// PUT /api/tables/:id
router.put('/api/tables/:id', authMiddleware, requireRole('ADMIN'), validate(updateTableSchema), async (req, res) => {
  try {
    const { name, capacity, area, locationId, status, notes, active } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      params.push(name);
      updates.push(`name = $${params.length}`);
    }
    if (capacity !== undefined) {
      params.push(capacity);
      updates.push(`capacity = $${params.length}`);
    }
    if (area !== undefined) {
      params.push(area);
      updates.push(`area = $${params.length}`);
    }
    if (locationId !== undefined) {
      params.push(locationId);
      updates.push(`"locationId" = $${params.length}`);
    }
    if (status !== undefined) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }
    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }
    if (active !== undefined) {
      params.push(active);
      updates.push(`active = $${params.length}`);
    }

    if (!updates.length) return res.status(400).json({ error: 'Nada para actualizar' });

    params.push(req.params.id);
    const result = await pool.query(
      `UPDATE dining_tables SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Mesa no encontrada' });

    const updated = await pool.query('SELECT * FROM dining_tables WHERE id = $1', [req.params.id]);
    res.json(updated.rows[0]);

    // Notificar WebSocket
    setImmediate(() => {
      notifyTableUpdate(req.params.id, status || updated.rows[0]?.status);
    });
  } catch (_e) {
    res.status(500).json({ error: 'Error updating table' });
  }
});

export default router;
