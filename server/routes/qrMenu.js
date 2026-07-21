// Carta QR — menú digital para escanear desde la mesa
// Genera un endpoint HTML optimizado para móvil que muestra el menú completo
// y puede asociarse a mesas específicas para toma de orden rápida.
import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createQrMenuConfigSchema } from '../schemas/procurement.js';

const router = express.Router();

// Escapa entities básicas para interpolar strings de la BD en HTML (previene XSS almacenado)
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// GET /api/qr-menu/config — obtener configuración del menú QR
router.get('/api/qr-menu/config', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { locationId } = req.query;
    let query = 'SELECT * FROM qr_menu_config WHERE active = true';
    const params = [];
    if (locationId) {
      params.push(locationId);
      query += ` AND "locationId" = $1`;
    }
    query += ' LIMIT 1';
    const result = await pool.query(query, params);
    res.json(result.rows[0] || null);
  } catch (_e) {
    res.status(500).json({ error: 'Error al obtener configuración QR' });
  }
});

// POST /api/qr-menu/config — crear/actualizar configuración
router.post(
  '/api/qr-menu/config',
  authMiddleware,
  requireRole('ADMIN'),
  validate(createQrMenuConfigSchema),
  async (req, res) => {
    try {
      const { locationId, title, showPrices, showImages, showCombos, showPromotions, categories } = req.body;

      // Upsert: si ya existe configuración para esta sede, actualizar
      const existing = await pool.query('SELECT id FROM qr_menu_config WHERE "locationId" = $1', [locationId]);
      if (existing.rows.length) {
        await pool.query(
          `UPDATE qr_menu_config SET title = $1, "showPrices" = $2, "showImages" = $3, "showCombos" = $4, "showPromotions" = $5, categories = $6, "updatedAt" = NOW() WHERE id = $7`,
          [title, showPrices, showImages, showCombos, showPromotions, JSON.stringify(categories), existing.rows[0].id]
        );
      } else {
        const id = `qr_${Date.now()}`;
        await pool.query(
          `INSERT INTO qr_menu_config (id, "locationId", title, "showPrices", "showImages", "showCombos", "showPromotions", categories)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, locationId, title, showPrices, showImages, showCombos, showPromotions, JSON.stringify(categories)]
        );
      }

      const result = await pool.query('SELECT * FROM qr_menu_config WHERE "locationId" = $1', [locationId]);
      res.json(result.rows[0]);
    } catch (_e) {
      res.status(500).json({ error: 'Error al guardar configuración' });
    }
  }
);

// GET /api/qr-menu/qr-codes — generar códigos QR para mesas
router.get('/api/qr-menu/qr-codes', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { locationId } = req.query;
    let query = 'SELECT id, name, area FROM dining_tables WHERE active IS DISTINCT FROM false';
    const params = [];
    if (locationId) {
      params.push(locationId);
      query += ` AND "locationId" = $1`;
    }
    query += ' ORDER BY area, name';

    const result = await pool.query(query, params);

    // Generar URLs de menú digital por mesa
    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`;
    const qrCodes = result.rows.map((t) => ({
      tableId: t.id,
      tableName: t.name,
      area: t.area,
      qrUrl: `${baseUrl}/menu/${t.id}`,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${baseUrl}/menu/${t.id}`)}`,
    }));

    res.json({ locationId: locationId || 'all', total: qrCodes.length, qrCodes });
  } catch (_e) {
    res.status(500).json({ error: 'Error al generar QR codes' });
  }
});

// GET /menu/:tableId — menú digital público (sin auth, optimizado para móvil)
router.get('/menu/:tableId', async (req, res) => {
  try {
    // Obtener datos de la mesa
    const tableResult = await pool.query('SELECT id, name, area, "locationId" FROM dining_tables WHERE id = $1', [
      req.params.tableId,
    ]);
    const table = tableResult.rows[0];

    // Obtener configuración del menú QR
    const configResult = await pool.query(
      'SELECT * FROM qr_menu_config WHERE "locationId" = $1 AND active = true LIMIT 1',
      [table?.locationId || 'nemocon']
    );
    const config = configResult.rows[0] || {
      showPrices: true,
      showImages: true,
      showCombos: true,
      showPromotions: true,
    };

    // Obtener categorías, productos, combos y promociones
    const [categories, products, combos, promotions] = await Promise.all([
      pool.query('SELECT * FROM categories ORDER BY name'),
      pool.query('SELECT * FROM products'),
      config.showCombos
        ? pool.query('SELECT * FROM menu_combos WHERE activo IS DISTINCT FROM false')
        : Promise.resolve({ rows: [] }),
      config.showPromotions
        ? pool.query('SELECT * FROM menu_promotions WHERE activo IS DISTINCT FROM false')
        : Promise.resolve({ rows: [] }),
    ]);

    // Construir HTML del menú digital
    const categoryHtml = categories.rows
      .map((cat) => {
        const catProducts = products.rows
          .filter((p) => p.categoryId === cat.id)
          .map(
            (p) => `
          <div class="producto">
            <div class="producto-info">
              <span class="producto-nombre">${escapeHtml(p.nombre)}</span>
              ${p.descripcion ? `<span class="producto-desc">${escapeHtml(p.descripcion)}</span>` : ''}
            </div>
            ${config.showPrices ? `<span class="producto-precio">$${(p.basePrice || 0).toLocaleString('es-CO')}</span>` : ''}
          </div>`
          )
          .join('');

        if (!catProducts) return '';
        return `
          <div class="categoria">
            <h2 class="categoria-titulo">${cat.icon ? `<i class="fas fa-${escapeHtml(cat.icon)}"></i> ` : ''}${escapeHtml(cat.name)}</h2>
            ${catProducts}
          </div>`;
      })
      .join('');

    const combosHtml = combos.rows.length
      ? `<div class="categoria"><h2 class="categoria-titulo">🔥 Combos</h2>${combos.rows
          .map(
            (c) => `
          <div class="producto combo">
            <div class="producto-info">
              <span class="producto-nombre">${escapeHtml(c.nombre)}</span>
              ${c.descripcion ? `<span class="producto-desc">${escapeHtml(c.descripcion)}</span>` : ''}
              ${c.ahorro ? `<span class="ahorro">Ahorras $${c.ahorro.toLocaleString('es-CO')}</span>` : ''}
            </div>
            ${config.showPrices ? `<span class="producto-precio">$${(c.precioTotal || 0).toLocaleString('es-CO')}</span>` : ''}
          </div>`
          )
          .join('')}</div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>${escapeHtml(config.title || 'Menú')}${table ? ` — Mesa ${escapeHtml(table.name)}` : ''}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #faf7f2; color: #1a0e0a; }
    .header { background: linear-gradient(135deg, #1a0e0a 0%, #2d1810 100%); color: white; padding: 40px 20px 30px; text-align: center; }
    .header h1 { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 5px; }
    .header .subtitle { font-size: 14px; color: #c4a882; }
    .header .mesa-badge { display: inline-block; margin-top: 12px; padding: 6px 20px; background: rgba(255,255,255,0.1); border-radius: 20px; font-size: 13px; font-weight: 700; }
    .container { max-width: 480px; margin: 0 auto; padding: 16px; }
    .categoria { margin-bottom: 24px; }
    .categoria-titulo { font-size: 18px; font-weight: 800; color: #2d1810; padding-bottom: 10px; border-bottom: 2px solid #e8d5c8; margin-bottom: 12px; }
    .producto { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid #eee8e0; gap: 12px; }
    .producto:last-child { border-bottom: none; }
    .producto-info { flex: 1; min-width: 0; }
    .producto-nombre { display: block; font-size: 15px; font-weight: 700; color: #1a0e0a; }
    .producto-desc { display: block; font-size: 12px; color: #8a7a6e; margin-top: 2px; }
    .producto-precio { font-size: 15px; font-weight: 800; color: #c0392b; white-space: nowrap; }
    .combo { background: #fff8f0; margin: 0 -8px; padding: 12px 8px; border-radius: 10px; border: 1px solid #f0e0d0; }
    .ahorro { display: inline-block; font-size: 11px; background: #27ae60; color: white; padding: 2px 8px; border-radius: 4px; margin-top: 4px; font-weight: 700; }
    .promo-banner { background: linear-gradient(135deg, #c0392b, #e74c3c); color: white; padding: 14px 18px; border-radius: 12px; margin: 16px 0; font-weight: 700; text-align: center; font-size: 14px; }
    .footer { text-align: center; padding: 30px 20px; font-size: 12px; color: #8a7a6e; }
    .footer .redes { margin-top: 10px; display: flex; justify-content: center; gap: 16px; }
    .footer .redes a { color: #2d1810; font-size: 20px; text-decoration: none; }
    @media (prefers-color-scheme: dark) {
      body { background: #0f0807; color: #f0e8e0; }
      .categoria-titulo { color: #f0e8e0; border-bottom-color: #2d1810; }
      .producto { border-bottom-color: #1a0e0a; }
      .producto-nombre { color: #f0e8e0; }
      .combo { background: #1a0e0a; border-color: #2d1810; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🍕 Juancho's Pizza</h1>
    <p class="subtitle">${escapeHtml(config.title || 'Menú')}</p>
    ${table ? `<div class="mesa-badge"><i class="fas fa-table"></i> Mesa ${escapeHtml(table.name)}</div>` : ''}
  </div>
  <div class="container">
    ${promotions.rows.length ? `<div class="promo-banner">🔥 ${escapeHtml(promotions.rows[0].nombre)}</div>` : ''}
    ${combosHtml}
    ${categoryHtml}
  </div>
  <div class="footer">
    <p>🍕 Hecho con amor en Nemocón & Zipaquirá</p>
    <div class="redes">
      <a href="#"><i class="fab fa-whatsapp"></i></a>
      <a href="#"><i class="fab fa-instagram"></i></a>
    </div>
  </div>
</body>
</html>`;

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (_e) {
    res.status(500).send('<h1>Error al cargar el menú</h1><p>Intenta de nuevo más tarde.</p>');
  }
});

// POST /api/qr-menu/regenerate — regenerar códigos QR (guardar URL en dining_tables)
router.post('/api/qr-menu/regenerate', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { locationId } = req.body;
    let query = 'SELECT id, name FROM dining_tables WHERE active IS DISTINCT FROM false';
    const params = [];
    if (locationId) {
      params.push(locationId);
      query += ` AND "locationId" = $1`;
    }

    const tables = await pool.query(query, params);
    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3001}`;
    let updated = 0;

    for (const table of tables.rows) {
      const qrUrl = `${baseUrl}/menu/${table.id}`;
      await pool.query('UPDATE dining_tables SET qr_code = $1 WHERE id = $2', [qrUrl, table.id]);
      updated++;
    }

    res.json({ updated, baseUrl });
  } catch (_e) {
    res.status(500).json({ error: 'Error al regenerar QR codes' });
  }
});

export default router;
