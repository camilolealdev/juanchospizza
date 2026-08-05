import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { CATEGORIES, PRODUCTS, PIZZA_SIZES, INGREDIENTS } from '../seedData/juanchosMenu.js';

const router = express.Router();

// Seed data endpoint -- carga/actualiza la carta real (categorías, productos,
// tamaños de pizza, ingredientes del armador) desde server/seedData/juanchosMenu.js.
// Idempotente vía ON CONFLICT DO UPDATE: re-correrlo actualiza precios/textos
// existentes en vez de solo insertar una vez, así sirve tanto para el primer
// deploy como para publicar cambios de carta.
router.post('/api/seed', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    for (const cat of CATEGORIES) {
      await pool.query(
        `INSERT INTO categories (id, name, icon, color) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = $2, icon = $3, color = $4`,
        [cat.id, cat.name, cat.icon, cat.color]
      );
    }

    for (const p of PRODUCTS) {
      await pool.query(
        `INSERT INTO products (id, "categoryId", nombre, descripcion, "basePrice", type, image, tiempo, popularidad, vegetariano, "isPremium", exclusiva, subcategory)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO UPDATE SET
           "categoryId" = $2, nombre = $3, descripcion = $4, "basePrice" = $5, type = $6,
           image = $7, tiempo = $8, popularidad = $9, vegetariano = $10, "isPremium" = $11,
           exclusiva = $12, subcategory = $13`,
        [
          p.id,
          p.categoryId,
          p.nombre,
          p.descripcion,
          p.basePrice,
          p.type,
          p.image || '',
          p.tiempo || 20,
          p.popularidad || 0,
          !!p.vegetariano,
          !!p.isPremium,
          !!p.exclusiva,
          p.subcategory || null,
        ]
      );

      // Precio de combo (hamburguesas/perros) -- se modela como una
      // menu_variant "Combo" cuyo delta es comboPrice - basePrice, mismo
      // patrón que MenuInteligente.tsx ya renderiza ("+$X").
      if (p.comboPrice) {
        const variantId = `mva_${p.id}_combo`;
        await pool.query(
          `INSERT INTO menu_variants (id, "productoId", nombre, "precioModificador", activo)
           VALUES ($1,$2,'Combo',$3,true)
           ON CONFLICT (id) DO UPDATE SET "precioModificador" = $3`,
          [variantId, p.id, p.comboPrice - p.basePrice]
        );
      }
    }

    for (const s of PIZZA_SIZES) {
      await pool.query(
        `INSERT INTO pizza_sizes (id, nombre, precio, incluidos, porciones, activo)
         VALUES ($1,$2,$3,$4,$5,true)
         ON CONFLICT (id) DO UPDATE SET nombre = $2, precio = $3, incluidos = $4, porciones = $5`,
        [s.id, s.nombre, s.precio, s.incluidos, s.porciones]
      );
    }

    for (const i of INGREDIENTS) {
      // `disponible` se omite del UPDATE SET a propósito: el seed solo siembra
      // el catálogo (qué ingredientes EXISTEN), no debe revivir ingredientes que
      // el admin marcó como agotados (disponible=false) tras un incidente de
      // stock. Para volver a habilitar uno agotado, el flujo correcto es la UI
      // admin (PATCH /api/ingredients/:id) o UPDATE directo, no el seed.
      await pool.query(
        `INSERT INTO ingredients (id, nombre, descripcion, precio_extra, categoria, vegetariano, vegano, premium, dulce, disponible, "defaultIng")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE SET
           nombre = $2, descripcion = $3, precio_extra = $4, categoria = $5, vegetariano = $6,
           vegano = $7, premium = $8, dulce = $9, "defaultIng" = $11`,
        [
          i.id,
          i.nombre,
          i.descripcion,
          i.precio_extra,
          i.categoria,
          i.vegetariano,
          i.vegano,
          i.premium,
          i.dulce,
          i.disponible,
          i.defaultIng,
        ]
      );
    }

    res.json({
      message: 'Seed completed',
      categories: CATEGORIES.length,
      products: PRODUCTS.length,
      pizzaSizes: PIZZA_SIZES.length,
      ingredients: INGREDIENTS.length,
    });
  } catch (_e) {
    res.status(500).json({ error: 'Error seeding data' });
  }
});

export default router;
