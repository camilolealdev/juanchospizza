import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createClientSchema, patchClientSchema, updateClientSchema } from '../schemas/clients.js';

const router = express.Router();

// ===================== GASTROPRO CRM API ROUTES =====================

// --- CLIENTS ---
router.get('/api/clients', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const { estado, search } = req.query;
    let query = 'SELECT * FROM clients';
    const params = [];
    const conditions = [];
    if (estado && estado !== 'todos') { params.push(estado); conditions.push(`estado = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      const p1 = params.length;
      params.push(`%${search}%`);
      const p2 = params.length;
      conditions.push(`(nombre ILIKE $${p1} OR telefono ILIKE $${p2})`);
    }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY "totalGastado" DESC';
    const result = await pool.query(query, params);
    // tags es JSON nativo: el driver ya lo devuelve parseado (array u null)
    res.json(result.rows.map(r => ({ ...r, tags: r.tags || [], vip: !!r.vip })));
  } catch (e) { res.status(500).json({ error: 'Error fetching clients' }); }
});

router.get('/api/clients/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (result.rows.length) {
      const client = { ...result.rows[0], tags: result.rows[0].tags || [], vip: !!result.rows[0].vip };
      res.json(client);
    } else res.status(404).json({ error: 'Client not found' });
  } catch (e) { res.status(500).json({ error: 'Error fetching client' }); }
});

router.post('/api/clients', authMiddleware, requireRole('ADMIN', 'MARKETING'), validate(createClientSchema), async (req, res) => {
  try {
    const { nombre, telefono, email, direccion, notas, cumpleanos } = req.body;
    const id = `cli_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    await pool.query(
      `INSERT INTO clients (id, nombre, telefono, email, direccion, notas, cumpleanos, creado) VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())`,
      [id, nombre, telefono, email, direccion, notas, cumpleanos]
    );
    res.status(201).json({ id, nombre, telefono, email, direccion, notas, cumpleanos });
  } catch (e) { res.status(500).json({ error: 'Error creating client' }); }
});

router.patch('/api/clients/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), validate(patchClientSchema), async (req, res) => {
  try {
    const { vip, notas, tags, estado } = req.body;
    const updates = []; const params = [];
    if (vip !== undefined) { params.push(vip); updates.push(`vip = $${params.length}`); }
    if (notas !== undefined) { params.push(notas); updates.push(`notas = $${params.length}`); }
    if (tags !== undefined) { params.push(JSON.stringify(tags)); updates.push(`tags = $${params.length}`); }
    if (estado !== undefined) { params.push(estado); updates.push(`estado = $${params.length}`); }
    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE clients SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Error updating client' }); }
});

// Full profile edit (name/phone/email/address/notes/birthday). Separate from
// the PATCH route above, which only ever covered vip/notas/tags/estado.
router.put('/api/clients/:id', authMiddleware, requireRole('ADMIN', 'MARKETING'), validate(updateClientSchema), async (req, res) => {
  try {
    const { nombre, telefono, email, direccion, notas, cumpleanos } = req.body;
    const updates = []; const params = [];
    if (nombre !== undefined) { params.push(nombre); updates.push(`nombre = $${params.length}`); }
    if (telefono !== undefined) { params.push(telefono); updates.push(`telefono = $${params.length}`); }
    if (email !== undefined) { params.push(email); updates.push(`email = $${params.length}`); }
    if (direccion !== undefined) { params.push(direccion); updates.push(`direccion = $${params.length}`); }
    if (notas !== undefined) { params.push(notas); updates.push(`notas = $${params.length}`); }
    if (cumpleanos !== undefined) { params.push(cumpleanos); updates.push(`cumpleanos = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE clients SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Client not found' });
    res.json({ ...result.rows[0], tags: result.rows[0].tags || [], vip: !!result.rows[0].vip });
  } catch (e) { res.status(500).json({ error: 'Error updating client profile' }); }
});


// --- CLIENT HISTORY ---
router.get('/api/clients/:id/orders', authMiddleware, requireRole('ADMIN', 'MARKETING'), async (req, res) => {
  try {
    // Filtra por la FK real "clientId" en vez del nombre de cliente en
    // texto libre. Pedidos legacy o de invitado sin clientId simplemente
    // no aparecerán aquí, lo cual es el comportamiento correcto.
    const result = await pool.query(
      `SELECT * FROM orders WHERE "clientId" = $1 ORDER BY "createdAt" DESC LIMIT 20`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: 'Error fetching client orders' }); }
});


export default router;
