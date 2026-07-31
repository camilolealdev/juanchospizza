# Diseño: catálogo de toppings del armador ("Crea tu Pizza") en base de datos

> Diseño técnico, no urgente/bloqueante. El gap de precio que resuelve ya está
> **mitigado** (piso de precio por tamaño, ver `server/services/orderPricing.js`,
> commit de la auditoría `docs/AUDIT_2026-07-30.md` ítem #2). Este documento
> planifica el cierre completo del gap como trabajo de seguimiento programado,
> no como parche de emergencia.

## 1. Resumen del problema actual

El flujo "Crea tu Pizza" (armador, `public/pizza-builder.js`) calcula el precio
enteramente en el navegador a partir de tres constantes hardcodeadas en ese
archivo estático:

- `INGREDIENTS`: array de **113 toppings** hardcodeados (`id`, `nombre`,
  `descripcion`, `precio_extra`, `categoria`, `disponible`, `default`,
  `premium`, `dulce`, `vegano`).
- `BASE_PRICE = 25000` y `SIZE_FACTORS = { Personal: 1.0, Mediana: 1.52, Grande: 1.80 }`.
- `calcPrice()`: `total = BASE_PRICE * factor + Σ(ingrediente.precio_extra * factor * mult)`,
  con `mult = 1` para toppings en "Toda", `0.5` para "Mitad Izq"/"Mitad Der".

El pedido que llega a `POST /api/orders` para este producto
(`productId: 'pizza-builder'`) **no lleva IDs de toppings**, solo un
`details` de texto libre generado concatenando nombres
(`server/services/orderPricing.js` líneas 24-39, `public/pizza-builder.js`
líneas 402-417). No hay nada estructurado que el servidor pueda validar.

`orderPricing.js::computeVerifiedTotal()` ya mitiga el caso más grave
(precio $0 o irrisorio) aplicando un **piso por tamaño**
(`builderFloorPrice()`, líneas 55-58), pero **no puede** detectar:

- Un cliente que declara 2 toppings baratos en `details` pero selecciona 5
  caros en la UI antes de que el `details` se genere (el string se arma del
  lado cliente, nada impide mandar un `details` distinto vía DevTools/curl).
- Un cliente que paga el piso de un "Grande" con toppings premium (Salami
  Ibérico, Bresaola, etc. hasta $12.000 c/u) declarando 0 extras.

### 1.1 Hallazgo adicional (no documentado en la auditoría): catálogos duplicados y desalineados

Investigando la tabla `ingredients` "huérfana" que menciona la auditoría
(CRUD en `server/routes/ingredients.js`, nunca consumido por el frontend),
encontré que **ya existe un seed real** en `scripts/seed-menu.sql` (líneas
69-89) — pero es un catálogo **completamente distinto** al del armador:

|            | `public/pizza-builder.js` (lo que el cliente ve/usa)            | `ingredients` (DB, seed actual)                  |
| ---------- | --------------------------------------------------------------- | ------------------------------------------------ |
| Cantidad   | 113 items                                                       | 15 items                                         |
| IDs        | `base_1`, `salsa_2`, `queso_7`, `carne_3`, `veg_14`...          | `ing_mozzarella`, `ing_pepperoni`, `ing_pina`... |
| Categorías | `base, salsa, queso, carne, vegetal, dulce, extra, especia` (8) | incluye `fruta`, `hierba` (no existen en el JS)  |

Es decir: **no hay overlap de IDs entre lo que el armador muestra y lo que
la tabla `ingredients` contiene hoy.** Poblar la tabla no es un simple
"activar lo que ya está" — hay que decidir qué catálogo es la fuente de
verdad (ver §3.1).

Lo mismo pasa con los tamaños. `pizza_sizes` (seed real,
`scripts/seed-menu.sql` líneas 34-39):

```sql
INSERT INTO pizza_sizes (id, nombre, precio, incluidos, porciones, activo) VALUES
  ('psz_personal',       'Personal',       18000, 1, 4,  TRUE),
  ('psz_mediana',        'Mediana',        32000, 2, 8,  TRUE),
  ('psz_familiar',       'Familiar',       48000, 3, 12, TRUE),
  ('psz_extra_familiar', 'Extra Familiar', 65000, 4, 16, TRUE)
```

... **no tiene ningún tamaño "Grande"**. El armador usa `Personal / Mediana
/ Grande` (también hardcodeado como `PizzaSize.GRANDE = 'Grande'` en
`src/types/index.ts` línea 32) con precios base `25000 / 38000 / 45000`
(`BASE_PRICE * SIZE_FACTORS`) — **sin relación aritmética ni de nombre**
con los precios reales de `pizza_sizes`. Por eso
`orderPricing.js` tiene que mantener su propia copia
(`BUILDER_BASE_PRICE`/`BUILDER_SIZE_FACTORS`, líneas 45-46) en vez de leer
`pizza_sizes`: **los dos tamaños "Mediana" del sistema no son el mismo
tamaño ni cuestan lo mismo.** Esto es adyacente al hallazgo #11 de la
auditoría (armador roto en silencio por el seed nuevo) y confirma que nadie
reconectó el armador al esquema real desde que `pizza_sizes` se creó.

La columna `pizza_sizes.incluidos` (1/2/3/4 en el seed real) sugiere que
quien diseñó esa tabla sí pensaba en un modelo "N toppings incluidos, extra
cobra aparte" — pero **el armador actual no implementa ese modelo en
absoluto**: cobra el 100% de `precio_extra` de cada topping seleccionado,
sin ningún tramo gratuito (los toppings con `precio_extra: 0`, como la masa
o salsa por defecto, son gratis porque su precio es 0, no porque cuenten
contra un cupo). Esto es importante para el diseño: no hay que _inventar_
que el sistema ya soporta tramos incluidos — hay que decidir si se adopta
ese modelo (opcional, ver §3.3) o se preserva el comportamiento actual
exacto (recomendado como default, ver §3.2).

## 2. Estado actual del esquema (verificado en código, no supuesto)

`server/db.js` (estilo: `pg` crudo, sin ORM, `CREATE TABLE IF NOT EXISTS` +
`ALTER TABLE ADD COLUMN IF NOT EXISTS` idempotentes en `initDB()`, más
`server/migrate.js` para migraciones versionadas con tracking en
`_schema_migrations`):

```sql
CREATE TABLE IF NOT EXISTS pizza_sizes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio INTEGER NOT NULL,     -- precio ABSOLUTO del tamaño, no delta
  incluidos INTEGER NOT NULL,  -- hoy sin consumidor real (ver §1.1)
  porciones INTEGER,
  activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio_extra INTEGER,
  categoria TEXT,               -- sin CHECK, sin índice
  vegetariano BOOLEAN,
  vegano BOOLEAN,
  premium BOOLEAN,
  dulce BOOLEAN,
  disponible BOOLEAN,
  "defaultIng" BOOLEAN
);
```

`orders.items` es **JSON** (no hay tabla relacional `order_items`):

```sql
CREATE TABLE IF NOT EXISTS orders (
  ...
  items JSON,
  total INTEGER,
  ...
);
```

Esto es relevante: **no hace falta una migración de esquema para que
`orders.items` pueda cargar toppings estructurados** — ya es JSON libre.
El trabajo real es (a) cambiar la _forma_ del JSON que el frontend envía, y
(b) tener contra qué validar esa forma en el servidor.

El CRUD huérfano (`server/routes/ingredients.js` + `server/schemas/ingredients.js`)
usa exactamente las mismas columnas que el diseño necesita — **es reutilizable
tal cual, sin tocar sus rutas**, una vez que la tabla tenga el catálogo
correcto y una restricción de dominio en `categoria`.

## 3. Diseño propuesto

### 3.1 Catálogo de ingredientes: adoptar el catálogo del armador como fuente de verdad

El catálogo de 113 items en `pizza-builder.js` es el que el negocio realmente
vende (photos, nombres, precios ajustados). El seed de 15 filas en
`ingredients` es un placeholder que nadie mantiene. Recomendación: la
migración **reemplaza** el contenido de `ingredients` con los 113 items del
JS (mismos IDs: `base_1..base_6`, `salsa_1..salsa_15`, `queso_1..queso_12`,
`carne_1..carne_18`, `veg_1..veg_28`, `dul_1..dul_19`, `ext_1..ext_13`),
preservando los IDs para que sean estables entre frontend y DB.

```sql
-- CHECK de dominio explícito -- las 8 categorías que el armador ya usa.
-- Agregar una categoría nueva requiere una migración (aceptable: cambia
-- pocas veces al año). Si el negocio empieza a pedir categorías dinámicas
-- desde el CRM, migrar a tabla `ingredient_categories` en ese momento.
ALTER TABLE ingredients
  ADD CONSTRAINT chk_ingredients_categoria
  CHECK (categoria IN ('base','salsa','queso','carne','vegetal','dulce','extra','especia'));

-- Se filtra por categoria en GET /api/ingredients?category=X (routes/ingredients.js:12-19)
CREATE INDEX IF NOT EXISTS idx_ingredients_categoria ON ingredients(categoria);
-- Se filtra por disponible en la validación de pedidos (ver §5)
CREATE INDEX IF NOT EXISTS idx_ingredients_disponible ON ingredients(disponible) WHERE disponible = TRUE;
```

Nota de datos: el JS no setea `vegetariano` en ningún item (solo
`vegano`, `premium`, `dulce`, `default`). La migración deja `vegetariano =
NULL`/`FALSE` por defecto — backfill manual pendiente, no bloquea el fix de
seguridad.

### 3.2 Tamaños del armador: reutilizar `pizza_sizes`, sin forzar una decisión de pricing

Unificar completamente los tamaños del armador con los de `pizza_sizes`
(retirar "Grande", adoptar "Familiar"/"Extra Familiar" y sus precios reales:
18000/32000/48000/65000) es la solución estructuralmente correcta a largo
plazo, pero **cambia lo que el cliente paga hoy** en el armador — eso es una
decisión de negocio/producto, no solo técnica, y no se toma en un doc de
diseño (dejar el disparador registrado en la sección "Decisiones pendientes" abajo).

Para no bloquear el cierre del gap de seguridad en una decisión de pricing,
se propone agregar el armador **como filas nuevas dentro de la misma tabla**
`pizza_sizes` (reuso real, no tabla paralela), distinguidas por una columna
`tipo`, preservando el precio y el factor de recargo por topping
**exactamente como están hoy**:

```sql
ALTER TABLE pizza_sizes
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'menu'
    CHECK (tipo IN ('menu', 'armador'));

-- Recargo por topping según tamaño -- hoy vive hardcodeado como
-- SIZE_FACTORS en pizza-builder.js y BUILDER_SIZE_FACTORS en
-- orderPricing.js (deben ir sincronizados a mano; con esto dejan de estarlo).
ALTER TABLE pizza_sizes
  ADD COLUMN IF NOT EXISTS factor_toppings NUMERIC(4,2) NOT NULL DEFAULT 1.00;

-- Evita colisión de "nombre" entre catálogo de menú y catálogo de armador
-- en cualquier lookup futuro que use (nombre, tipo) en vez de id.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pizza_sizes_nombre_tipo ON pizza_sizes(nombre, tipo);

INSERT INTO pizza_sizes (id, nombre, precio, incluidos, porciones, activo, tipo, factor_toppings) VALUES
  ('psz_armador_personal', 'Personal', 25000, 0, NULL, TRUE, 'armador', 1.00),
  ('psz_armador_mediana',  'Mediana',  38000, 0, NULL, TRUE, 'armador', 1.52),
  ('psz_armador_grande',   'Grande',   45000, 0, NULL, TRUE, 'armador', 1.80)
ON CONFLICT (id) DO NOTHING;
```

`incluidos = 0` preserva el comportamiento actual (todo topping se cobra
completo). Si más adelante el negocio quiere "Mediana incluye 2 toppings
gratis", es un `UPDATE pizza_sizes SET incluidos = 2 WHERE id =
'psz_armador_mediana'` + el cambio de lógica descrito en §3.3 — no requiere
otra migración de esquema.

**Importante:** `orderPricing.js::computeVerifiedTotal()` debe filtrar
siempre por `tipo = 'armador'` cuando resuelve el tamaño de un item del
armador, y por `tipo = 'menu'` (o simplemente ignorar `tipo`, ya que hoy no
existen duplicados de nombre del lado menú) para el resto — así los dos
catálogos conviven en la misma tabla sin pisarse.

### 3.3 (Opcional, fase 2) Activar `incluidos` como tramo gratuito real

No es parte de este fix. Si el negocio decide adoptarlo: ordenar los
toppings pagos seleccionados (excluyendo base/salsa/queso, que son
selección única sin costo de "extra") por `precio_extra` ascendente, eximir
del cobro a los primeros `incluidos` contando cada mitad como 0.5 de una
unidad, cobrar el resto normalmente. Requiere definir con producto qué pasa
con selecciones en mitades (¿"incluidos" cuenta por pizza completa o por
mitad?) antes de implementar — se deja como pregunta abierta, no como
default implícito.

## 4. Payload estructurado: `orders.items[].toppings`

`orders.items` sigue siendo `JSON` (sin migración de columna). Cambia la
**forma** del item que representa una pizza del armador. Forma actual:

```json
{
  "productId": "pizza-builder",
  "name": "Pizza Personalizada",
  "size": "Mediana",
  "quantity": 1,
  "price": 38000,
  "details": "Pizza artesanal · Masa Artesanal · Mozzarella de Búfala D.O.P., Pepperoni Importado, Rúgula Fresca"
}
```

Forma propuesta (agrega `toppings`, mantiene `details` para que la cocina
siga viendo el texto legible en las impresiones/tickets sin tocar
`server/routes/print.js`):

```json
{
  "productId": "pizza-builder",
  "name": "Pizza Personalizada",
  "size": "psz_armador_mediana",
  "quantity": 1,
  "price": 38000,
  "details": "Pizza artesanal · Masa Artesanal · Mozzarella de Búfala D.O.P., Pepperoni Importado, Rúgula Fresca",
  "toppings": [
    { "ingredientId": "base_1", "lado": "whole" },
    { "ingredientId": "salsa_1", "lado": "whole" },
    { "ingredientId": "queso_2", "lado": "whole" },
    { "ingredientId": "carne_2", "lado": "left" },
    { "ingredientId": "veg_4", "lado": "right" }
  ]
}
```

- `size` pasa a ser el `pizza_sizes.id` real (`psz_armador_*`), no el label
  suelto `"Mediana"` — igual de estable que como ya funciona `size` para el
  menú fijo (ver comentario en `orderPricing.js` líneas 18-22).
- `toppings[].lado` ∈ `{whole, left, right}` — mapea 1:1 a
  `selections.whole/left/right` que ya existen en el estado interno de
  `pizza-builder.js` (líneas 148, 209-212). El multiplicador (`1` / `0.5`)
  lo aplica el servidor, no el cliente.
- `details` se sigue generando client-side igual que hoy (cosmético, para
  humanos); ya no es la fuente de verdad del precio.

## 5. Cambios necesarios (descriptivo, sin código)

### `public/pizza-builder.js`

- Cargar `INGREDIENTS` y los 3 tamaños del armador desde
  `GET /api/ingredients` y una variante de `GET /api/pizza-sizes` (o un
  nuevo `GET /api/pizza-sizes?tipo=armador`) en vez del array/constantes
  hardcodeadas, al boot del builder. Fallback a las constantes actuales si
  el fetch falla (no dejar el armador sin catálogo por un blip de red).
- En el handler de `confirmBtn` (línea ~368), además de construir `details`,
  construir el array `toppings` desde `selections.whole/left/right` con el
  mismo mapeo de `lado`.
- Pasar `toppings` como cuarto argumento a
  `window.__pizzaBuilderAddToCart(name, details, currentSize, toppings)`.

### `src/context/CartContext.tsx`

- Extender la firma global `window.__pizzaBuilderAddToCart` (línea 42) y el
  tipo `CartItem` (línea 8) con `toppings?: { ingredientId: string; lado:
'whole'|'left'|'right' }[]`.
- En el bridge (líneas 91-119), guardar `toppings` en el item del carrito tal
  cual llega, sin recalcular nada del lado cliente (el precio mostrado en
  `priceDisplay` sigue siendo solo una estimación de UI; el servidor manda).
- Dondequiera que el carrito arma el payload de `POST /api/orders`, incluir
  `toppings` en cada item cuyo `productId === 'pizza-builder'`.

### `server/services/orderPricing.js`

Extender `computeVerifiedTotal()` (hoy líneas 66-114) para el branch
`PIZZA_BUILDER_PRODUCT_ID` (línea 94):

1. Reunir todos los `ingredientId` de todos los items del armador en una
   sola query `SELECT * FROM ingredients WHERE id = ANY($1::text[])`
   (mismo patrón que ya usa para `products`, líneas 71-78).
2. Reunir los tamaños de armador con
   `SELECT * FROM pizza_sizes WHERE tipo = 'armador' AND activo = TRUE`.
3. Por cada item de armador:
   - Rechazar (`OrderPricingError`) si `size` no matchea ningún
     `pizza_sizes.id` con `tipo='armador'` — ya no hay fallback silencioso.
   - Rechazar si algún `ingredientId` de `toppings` no existe en el mapa
     cargado, o existe pero `disponible = false`.
   - Rechazar si falta una base (`categoria = 'base'`) — regla que hoy vive
     implícita en `renderConfirm()` del frontend (línea 355) y debe
     re-validarse en servidor.
   - Calcular: `total = pizza_sizes.precio + Σ(ingredient.precio_extra *
pizza_sizes.factor_toppings * (lado === 'whole' ? 1 : 0.5))`,
     redondeado igual que hoy (`Math.round`).
   - Mantener el piso actual (`Math.max(calculado, pizza_sizes.precio)`)
     como red de seguridad ante bugs de cálculo, no como sustituto de la
     validación — ya no se confía en `item.price` del cliente en absoluto
     para este flujo (hoy sí se usa como base del `Math.max`, línea 99).
4. Si `toppings` no viene en el payload (cliente viejo/no migrado): mantener
   el comportamiento actual (piso por tamaño) como fallback transicional,
   con un log de advertencia — permite desplegar el fix del backend antes
   que el del frontend sin romper pedidos en vuelo.

## 6. Plan de migración (`server/migrate.js`)

Siguiendo el patrón existente (array `MIGRATIONS`, nunca modificar entradas
pasadas, cada una en su propia transacción vía `pool.connect()` +
`BEGIN/COMMIT/ROLLBACK`, tracking en `_schema_migrations` por hash):

**Migración #8 — "Catálogo de toppings del armador: extender ingredients y pizza_sizes"**

1. `ALTER TABLE ingredients ADD CONSTRAINT chk_ingredients_categoria ...`
   (con manejo de que ya puedan existir filas con `categoria` fuera del
   dominio nuevo — `fruta`/`hierba` del seed viejo. Antes del `ADD
CONSTRAINT`, correr un `UPDATE` de remapeo, ej. `fruta → dulce`,
   `hierba → especia`, o `NOT VALID` + `VALIDATE CONSTRAINT` separado si se
   prefiere no bloquear en caliente).
2. `CREATE INDEX` (categoria, disponible parcial) — no bloqueantes, `CREATE
INDEX CONCURRENTLY` si la tabla llegase a crecer mucho (hoy 113 filas,
   no aplica en la práctica).
3. `TRUNCATE`/`DELETE + INSERT ... ON CONFLICT DO NOTHING` de los 113
   ingredientes extraídos 1:1 de `pizza-builder.js` (ver §3.1). Decisión:
   **no borrar filas existentes que no estén en el catálogo nuevo** sin
   antes confirmar que nada las referencia (ningún pedido activo apunta a
   `ing_pepperoni` etc. via `recipe_ingredients` u otra FK) — revisar antes
   de escribir el `DELETE` real.
4. `ALTER TABLE pizza_sizes ADD COLUMN tipo ...`, `ADD COLUMN
factor_toppings ...`, índice único `(nombre, tipo)`.
5. `INSERT` de las 3 filas `psz_armador_*` (ver §3.2), idempotente.

**Migración #9 (separada, después de que el frontend despliegue el nuevo
payload)** — opcional: agregar un `CHECK`/trigger liviano si se detectan
abusos en producción durante la transición; no se especifica código acá
porque depende de qué se observe.

No se toca `docker/postgres/schema.sql` en este diseño — ya está
documentado como desactualizado (auditoría, ítem "ABIERTO") y se autocura
vía `initDB()`; agregar más deuda ahí no es parte de este trabajo, pero
conviene resolverlo en el mismo sprint que se implemente esto para que un
`docker compose up` fresco no vuelva a fallar en `pizza_sizes` (auditoría
Critical #3).

## 7. Decisiones pendientes (para producto/negocio, no técnicas)

1. ¿Se unifica el armador con los tamaños reales de `pizza_sizes`
   (`Familiar`/`Extra Familiar`, precios 18000-65000), retirando "Grande" y
   sus precios actuales? Esto también resolvería la confusión adyacente al
   hallazgo #11 de la auditoría, pero cambia lo que el cliente paga hoy —
   requiere validación de negocio antes de tocarlo. Este diseño usa la
   opción conservadora (§3.2) para no bloquear el cierre del gap de
   seguridad en esa decisión.
2. ¿Se adopta el modelo de "N toppings incluidos" (§3.3) o se mantiene
   "todo topping se cobra" como hoy?
3. Backfill de `vegetariano` en los 113 ingredientes (dato que el JS actual
   nunca capturó).

## 8. Estimado de esfuerzo y riesgo

| Componente                                                        | Esfuerzo   | Riesgo                                                                                                                                 |
| ----------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Migración #8 (schema + seed 113 ingredientes + 3 tamaños armador) | 0.5-1 día  | Bajo — todo idempotente, no toca datos de pedidos existentes                                                                           |
| `pizza-builder.js`: cargar catálogo desde API + emitir `toppings` | 1-1.5 días | Medio — es el archivo vanilla más grande y sensible del frontend público; probar los 3 casos (whole/left/right) y el fallback offline  |
| `CartContext.tsx` + tipos (`CartItem`, `OrderItem`)               | 0.5 día    | Bajo — cambio aditivo, no rompe items existentes en carritos guardados en `localStorage`                                               |
| `orderPricing.js`: validación real de `toppings`                  | 1 día      | Medio — es el punto que cierra el gap de seguridad; necesita tests (ya existe `orderPricing.test.js`, extenderlo con casos de armador) |
| QA end-to-end (armador → carrito → orden → cocina/impresión)      | 0.5-1 día  | Medio — `print.js` y la cocina leen `details`, confirmar que no dependen de nada que cambie                                            |

**Total estimado: ~4-5 días** de un dev backend+frontend familiarizado con
el repo. **Prioridad: seguimiento programado, no bloqueante** — el piso de
precio ya mitigado en `orderPricing.js` cierra el escenario de abuso más
grave (pagar casi nada por una pizza completa); lo que queda abierto es
"pagar el piso de un tamaño mientras se reciben toppings premium", que es
de menor impacto económico por pedido y no bloquea el deploy actual.
