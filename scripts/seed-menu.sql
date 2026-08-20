-- ============================================================
-- Seed data para Guido Pizza / Juancho's Pizza
-- 4 categories, 4 pizza_sizes, 16 productos, 15 ingredientes
-- Precios en COP (centavos). IDs legibles para que coincidan con
-- imágenes/notifications del frontend que las esperan por nombre.
-- Idempotente: ON CONFLICT DO NOTHING permite re-correr sin error.
-- ============================================================

-- ── Defensive: column drift between initDB() vs docker initdb ──
-- docker/postgres/schema.sql (initdb) está OUT OF DATE: su CREATE
-- TABLE products NO incluye `subcategory`. Si la DB arrancó vía
-- docker compose con volume limpio (initdb corrió pero el server
-- app no llegó a initDB() — posible si app-1 crasheó antes),
-- la columna falta. ALTER ADD COLUMN IF NOT EXISTS es idempotente
-- y barato, y evita que -v ON_ERROR_STOP=1 aborte el script a
-- mitad de camino (categories+pizza_sizes pobladas pero products
-- vacías — justo el síntoma que estamos arreglando).
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Las categorías DEBEN insertarse ANTES que products (products referencian
-- categoryId por string id; no hay FK en el schema porque el SQLite
-- original nunca tuvo).

-- ── Categorías ────────────────────────────────────────────
INSERT INTO categories (id, name, icon, color) VALUES
  ('cat_pizzas',    'Pizzas',    'pizza',    '#dc2626'),
  ('cat_bebidas',   'Bebidas',   'drink',    '#2563eb'),
  ('cat_entrantes', 'Entrantes', 'starter',  '#f59e0b'),
  ('cat_postres',   'Postres',   'dessert',  '#7c3aed')
ON CONFLICT (id) DO NOTHING;

-- ── Pizza sizes (precios absolutos en COP; "incluidos" = ingredientes
--    base del armador "Crea tu pizza" sin costo extra) ───────
INSERT INTO pizza_sizes (id, nombre, precio, incluidos, porciones, activo) VALUES
  ('psz_personal',       'Personal',       18000, 1, 4,  TRUE),
  ('psz_mediana',        'Mediana',        32000, 2, 8,  TRUE),
  ('psz_familiar',       'Familiar',       48000, 3, 12, TRUE),
  ('psz_extra_familiar', 'Extra Familiar', 65000, 4, 16, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── Productos (pizzas, bebidas, entrantes, postres) ──────────
INSERT INTO products (id, "categoryId", nombre, descripcion, "basePrice", type, image, tiempo, popularidad, vegetariano, "isPremium", exclusiva, subcategory) VALUES
  -- Pizzas (todas arrancan en mediana 32k como base; el armador toma el tamaño seleccionado)
  -- NOTA imágenes: URLs de Unsplash (mismo patrón probado en
  -- server/seedData/juanchosMenu.js, el seed legacy) -- las rutas locales
  -- /img/*.jpg originales NUNCA existieron en public/img/ (nunca se
  -- commitearon), así que cada producto servía el fallback SPA
  -- (index.html, Content-Type text/html) como "imagen", rompiendo toda
  -- la grilla de productos en el primer deploy real (2026-07-31). Son
  -- fotos de stock genéricas para no bloquear el lanzamiento -- reemplazar
  -- por fotos reales del negocio vía el CRM (products.image es editable)
  -- en cuanto estén disponibles.
  ('prod_margarita',    'cat_pizzas', 'Margarita',         'Salsa de tomate, mozzarella fresca y albahaca.',                                  32000, 'pizza', 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=600&q=80',    20, 95, FALSE, FALSE, FALSE, 'clasica'),
  ('prod_pepperoni',    'cat_pizzas', 'Pepperoni',         'Pepperoni importado, mozzarella y orégano.',                                       35000, 'pizza', 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=600&q=80',    20, 90, FALSE, FALSE, FALSE, 'clasica'),
  ('prod_hawaiana',     'cat_pizzas', 'Hawaiana',          'Jamón, piña caramelizada y mozzarella.',                                           35000, 'pizza', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',     20, 78, FALSE, FALSE, FALSE, 'clasica'),
  ('prod_vegetariana',  'cat_pizzas', 'Vegetariana',       'Mozzarella, champiñones, pimientos, cebolla y aceitunas.',                         33000, 'pizza', 'https://images.unsplash.com/photo-1604917877934-07d8d248d396?auto=format&fit=crop&w=600&q=80',  22, 70, TRUE,  FALSE, FALSE, 'clasica'),
  ('prod_4_estaciones', 'cat_pizzas', 'Cuatro Estaciones', 'Jamón, champiñones, alcachofas y aceitunas en cuatro cuadrantes.',                38000, 'pizza', 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=600&q=80',  25, 65, FALSE, FALSE, FALSE, 'clasica'),
  ('prod_bbq_chicken',  'cat_pizzas', 'BBQ Chicken',       'Pollo a la BBQ, cebolla morada, maíz y mozzarella.',                               38000, 'pizza', 'https://images.unsplash.com/photo-1555109307-f7d9da25c244?auto=format&fit=crop&w=600&q=80',          22, 85, FALSE, FALSE, FALSE, 'especial'),
  ('prod_carbonara',    'cat_pizzas', 'Carbonara',         'Salsa blanca, mozzarella, panceta, huevo y pimienta negra.',                      39000, 'pizza', 'https://images.unsplash.com/photo-1512152272829-e3139592d56f?auto=format&fit=crop&w=600&q=80',    22, 60, FALSE, TRUE,  FALSE, 'premium'),
  ('prod_diavola',      'cat_pizzas', 'Diavola',           'Pepperoni picante, chorizo español, pimientos y mozzarella.',                   37000, 'pizza', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80',      22, 55, FALSE, TRUE,  FALSE, 'premium'),
  ('prod_margherita_dop', 'cat_pizzas', 'D.O.P. Margherita','Mozzarella di búfala D.O.P., tomate San Marzano y albahaca fresca.',            45000, 'pizza', 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=600&q=80', 25, 40, TRUE,  TRUE, TRUE, 'especial'),

  -- Bebidas
  ('prod_coca_cola',    'cat_bebidas', 'Coca-Cola 350ml',   'Gaseosa clásica, bien fría.',                                                     6000,  'bebida', 'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?auto=format&fit=crop&w=600&q=80', 2,  100, TRUE, FALSE, FALSE, 'gaseosa'),
  ('prod_sprite',       'cat_bebidas', 'Sprite 350ml',      'Limonada gasificada, sin azúcar.',                                                 6000,  'bebida', 'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?auto=format&fit=crop&w=600&q=80',     2,   85, TRUE, FALSE, FALSE, 'gaseosa'),
  ('prod_agua',         'cat_bebidas', 'Agua 500ml',        'Agua mineral natural sin gas.',                                                    4000,  'bebida', 'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?auto=format&fit=crop&w=600&q=80',       2,   60, TRUE, FALSE, FALSE, 'agua'),

  -- Entrantes
  ('prod_pan_ajo',      'cat_entrantes', 'Pan de Ajo',       'Baguette tostada con mantequilla de ajo y perejil.',                              8000,  'entrante', 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=600&q=80',    8,   70, TRUE, FALSE, FALSE, 'pan'),
  ('prod_alitas_bbq',   'cat_entrantes', 'Alitas BBQ',       '6 alitas de pollo glaseadas con salsa BBQ casera.',                               18000, 'entrante', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80', 15,  80, FALSE, FALSE, FALSE, 'carne'),

  -- Postres
  ('prod_tiramisu',     'cat_postres', 'Tiramisú',          'Clásico italiano con café espresso, mascarpone y cacao.',                        12000, 'postre', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',   3,   65, TRUE, FALSE, FALSE, 'italiano'),
  ('prod_brownie',      'cat_postres', 'Brownie con Helado','Brownie de chocolate caliente con bola de helado de vainilla.',                 10000, 'postre', 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=600&q=80',    5,   75, TRUE, FALSE, FALSE, 'chocolate')
ON CONFLICT (id) DO NOTHING;

-- ── Ingredientes (precio_extra en COP por ingrediente adicional) ──
INSERT INTO ingredients (id, nombre, descripcion, precio_extra, categoria, vegetariano, vegano, premium, dulce, disponible, "defaultIng") VALUES
  -- Bases (incluidas en la pizza sin costo extra)
  ('ing_mozzarella',   'Mozzarella',        'Queso mozzarella fresco.',                                  0, 'queso',    TRUE, FALSE, FALSE, FALSE, TRUE, TRUE),
  ('ing_tomate',       'Salsa de Tomate',   'Salsa de tomate San Marzano.',                               0, 'salsa',    TRUE, TRUE,  FALSE, FALSE, TRUE, TRUE),
  -- Proteínas
  ('ing_pepperoni',    'Pepperoni',         'Pepperoni importado.',                                       3000, 'carne',    FALSE, FALSE, FALSE, FALSE, TRUE, FALSE),
  ('ing_jamon',        'Jamón',             'Jamón ahumado.',                                              3000, 'carne',    FALSE, FALSE, FALSE, FALSE, TRUE, FALSE),
  ('ing_pollo_bbq',    'Pollo BBQ',         'Pollo marinado en salsa BBQ casera.',                        3500, 'carne',    FALSE, FALSE, FALSE, FALSE, TRUE, FALSE),
  ('ing_panceta',      'Panceta',           'Panceta ahumada italiana.',                                  3500, 'carne',    FALSE, FALSE, TRUE,  FALSE, TRUE, FALSE),
  ('ing_chorizo',      'Chorizo Español',   'Chorizo español picante.',                                   3500, 'carne',    FALSE, FALSE, FALSE, FALSE, TRUE, FALSE),
  -- Vegetales (todos vegetarianos)
  ('ing_pina',         'Piña',              'Piña caramelizada.',                                          2500, 'fruta',    TRUE, TRUE,  FALSE, TRUE,  TRUE, FALSE),
  ('ing_champinones',  'Champiñones',       'Champiñones frescos.',                                        3000, 'vegetal',  TRUE, TRUE,  FALSE, FALSE, TRUE, FALSE),
  ('ing_aceitunas',    'Aceitunas Negras',  'Aceitunas Kalamata.',                                         2500, 'vegetal',  TRUE, TRUE,  FALSE, FALSE, TRUE, FALSE),
  ('ing_pimientos',    'Pimientos Rojos',   'Pimientos rojos frescos.',                                    2500, 'vegetal',  TRUE, TRUE,  FALSE, FALSE, TRUE, FALSE),
  ('ing_cebolla',      'Cebolla',           'Cebolla blanca en aros.',                                     2000, 'vegetal',  TRUE, TRUE,  FALSE, FALSE, TRUE, FALSE),
  ('ing_albahaca',     'Albahaca Fresca',   'Hojas de albahaca genovesa.',                                  2500, 'hierba',   TRUE, TRUE,  TRUE,  FALSE, TRUE, FALSE),
  -- Premium
  ('ing_mozzarella_bufala', 'Mozzarella di Búfala D.O.P.', 'Mozzarella de búfala con denominación de origen.',   6000, 'queso', TRUE, FALSE, TRUE, FALSE, TRUE, FALSE),
  ('ing_alcachofas',   'Alcachofas',        'Corazones de alcachofa.',                                     3500, 'vegetal', TRUE, TRUE, TRUE, FALSE, TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;
