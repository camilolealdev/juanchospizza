// Barrel de config. Los mapas legacy de imágenes (images.ts / ingredientImages.ts)
// eran código muerto -- nadie los importaba (el menú usa p.image de la DB y
// PizzaBuilder usa realIngredientIcons directo) -- y se eliminaron en la
// limpieza del 2026-08-17 (quick wins).
export { REAL_INGREDIENT_ICONS, getRealIngredientIcon } from './realIngredientIcons';
