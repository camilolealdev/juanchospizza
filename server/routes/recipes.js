import express from 'express';
import { pool } from '../db.js';
import { authMiddleware, requireRole } from '../auth.js';
import { validate } from '../middleware/validate.js';
import { createRecipeSchema, updateRecipeSchema } from '../schemas/recipes.js';

const router = express.Router();

// --- RECIPES ---
router.get('/api/recipes', authMiddleware, requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const recipes = await pool.query('SELECT * FROM recipes');
    const allIngredients = await pool.query('SELECT * FROM recipe_ingredients');
    const byRecipeId = new Map();
    for (const ingredient of allIngredients.rows) {
      if (!byRecipeId.has(ingredient.recipeId)) byRecipeId.set(ingredient.recipeId, []);
      byRecipeId.get(ingredient.recipeId).push(ingredient);
    }
    const result = recipes.rows.map(recipe => ({ ...recipe, ingredientes: byRecipeId.get(recipe.id) || [] }));
    res.json(result);
  } catch (e) { res.status(500).json({ error: 'Error fetching recipes' }); }
});

router.post('/api/recipes', authMiddleware, requireRole('ADMIN'), validate(createRecipeSchema), async (req, res) => {
  try {
    const { nombre, productoId, porciones, costoTotal, instrucciones, ingredientes } = req.body;
    const sanitized = { nombre, productoId, porciones, costoTotal, instrucciones };
    const id = `rcp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO recipes (id, nombre, "productoId", porciones, "costoTotal", instrucciones) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, sanitized.nombre, sanitized.productoId, sanitized.porciones, sanitized.costoTotal, sanitized.instrucciones]
    );

    const savedIngredients = [];
    for (const ing of ingredientes) {
      const ingId = `rci_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await pool.query(
        `INSERT INTO recipe_ingredients (id, "recipeId", "itemId", nombre, cantidad, unidad, costo) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [ingId, id, ing.itemId, ing.nombre, ing.cantidad, ing.unidad, ing.costo]
      );
      savedIngredients.push({ id: ingId, recipeId: id, ...ing });
    }

    res.status(201).json({ id, ...sanitized, ingredientes: savedIngredients });
  } catch (e) {
    res.status(500).json({ error: 'Error creating recipe' });
  }
});

router.put('/api/recipes/:id', authMiddleware, requireRole('ADMIN'), validate(updateRecipeSchema), async (req, res) => {
  try {
    const { nombre, productoId, porciones, costoTotal, instrucciones, ingredientes } = req.body;

    const updates = [];
    const params = [];
    if (nombre !== undefined) { params.push(nombre); updates.push(`nombre = $${params.length}`); }
    if (productoId !== undefined) { params.push(productoId); updates.push(`"productoId" = $${params.length}`); }
    if (porciones !== undefined) { params.push(porciones); updates.push(`porciones = $${params.length}`); }
    if (costoTotal !== undefined) { params.push(costoTotal); updates.push(`"costoTotal" = $${params.length}`); }
    if (instrucciones !== undefined) { params.push(instrucciones); updates.push(`instrucciones = $${params.length}`); }

    if (updates.length) {
      params.push(req.params.id);
      await pool.query(`UPDATE recipes SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
    }

    const result = await pool.query('SELECT * FROM recipes WHERE id = $1', [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    let savedIngredients;
    if (Array.isArray(ingredientes)) {
      await pool.query('DELETE FROM recipe_ingredients WHERE "recipeId" = $1', [req.params.id]);
      savedIngredients = [];
      for (const ing of ingredientes) {
        const ingId = `rci_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await pool.query(
          `INSERT INTO recipe_ingredients (id, "recipeId", "itemId", nombre, cantidad, unidad, costo) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [ingId, req.params.id, ing.itemId, ing.nombre, ing.cantidad, ing.unidad, ing.costo]
        );
        savedIngredients.push({ id: ingId, recipeId: req.params.id, ...ing });
      }
    } else {
      const existingIngredients = await pool.query('SELECT * FROM recipe_ingredients WHERE "recipeId" = $1', [req.params.id]);
      savedIngredients = existingIngredients.rows;
    }

    res.json({ ...result.rows[0], ingredientes: savedIngredients });
  } catch (e) {
    res.status(500).json({ error: 'Error updating recipe' });
  }
});

router.delete('/api/recipes/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    // recipe_ingredients no tiene constraint ON DELETE CASCADE hacia
    // recipes en el esquema actual, así que se borran manualmente primero.
    await pool.query('DELETE FROM recipe_ingredients WHERE "recipeId" = $1', [req.params.id]);

    const result = await pool.query('DELETE FROM recipes WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error deleting recipe' });
  }
});


export default router;
