// Recomputes an order's real total from current catalog prices instead of
// trusting the client-submitted `total`/`price` fields.
//
// Why this exists: POST /api/orders is public guest checkout (no auth by
// design). Before this fix it inserted the client-submitted `total` and
// `items[].price` verbatim, and that number then fed straight into the Bold
// (server/routes/payments.js `Math.floor(order.total)`) and Wompi
// (`order.total * 100`) payment-link amounts, plus loyalty spend aggregates
// (`updateClientSpendAggregate`). A guest could request a payment link for an
// arbitrary low amount regardless of what was actually in the cart. See
// docs/AUDIT_2026-07-30.md item #2.
//
// Item shapes this covers (see src/types/index.ts OrderItem, populated by
// src/components/MenuDigital.tsx and src/components/CartSection.tsx):
//   { productId, size?, quantity, price, details? }
// - Plain product: unit price = products."basePrice".
// - Sized item (pizza from the fixed menu): `size` carries either a
//   pizza_sizes.id or the human label (pizza_sizes.nombre, e.g. "Familiar")
//   -- server/db.js documents pizza_sizes.precio as the ABSOLUTE price for
//   that size (not a delta), matching MenuDigital's own
//   `if (sz) price = sz.price` client logic. When `size` matches a known
//   pizza size, that absolute price replaces the product's basePrice.
//
// Known limitation (documented, not silently papered over): the "armador"
// build-your-own-pizza flow (productId === PIZZA_BUILDER_PRODUCT_ID, see
// src/components/PizzaBuilder.tsx) sends a free-text `details` string built
// from ingredient names, not structured topping ids. There is nothing
// server-side to validate individual toppings against, so we cannot fully
// recompute that price. What we *can* do, and do here, is refuse to let it
// drop below the known per-size floor (the real `pizza_sizes.precio` for
// `item.size`, i.e. a plain pizza with no paid extras for that size) --
// this closes the "guest pays $500 for a custom Familiar with 10 toppings"
// version of the exploit. Fully closing the remaining gap (under-declaring
// toppings on a custom pizza) requires moving the armador ingredient catalog
// into the DB as structured toppings; see docs/DISENO_CATALOGO_TOPPINGS.md,
// tracked as follow-up, not in scope for this fix.
//
// The floor MUST come from the live `pizza_sizes` table (via `sizePriceByKey`
// below), not a hardcoded constant: PizzaBuilder.tsx fetches its sizes from
// GET /api/pizza-sizes, so its size names/prices change whenever the seed
// does (e.g. server/seedData/juanchosMenu.js currently seeds Small/Junior/
// Mediana/Familiar at 30000/42000/52000/88000 -- nothing like the old
// Personal/Mediana/Grande @ 25000 base this used to hardcode). A stale
// hardcoded floor silently undershoots the real base price for every size
// it doesn't recognize, which is worse than having no floor at all: it looks
// like protection while actually approving a guest total below the cheapest
// legitimate size. BUILDER_LEGACY_FLOOR below is only a last-resort fallback
// for when `pizza_sizes` has no matching row at all (e.g. empty table).

const PIZZA_BUILDER_PRODUCT_ID = 'pizza-builder';

const BUILDER_LEGACY_FLOOR = 25000;

const MAX_ITEM_QUANTITY = 500;

export class OrderPricingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OrderPricingError';
  }
}

// Recomputes the true total for `items` from current catalog prices, run
// inside the caller's open transaction (`client` is a connected pg client
// with BEGIN already issued, so lookups see a consistent snapshot alongside
// the order insert). Throws OrderPricingError for anything the caller should
// turn into a 400 (unknown product id, bad quantity) -- callers must not
// fall back to the client-submitted total when this succeeds.
export async function computeVerifiedTotal(client, items) {
  if (!Array.isArray(items) || items.length === 0) return 0;

  const productIds = [...new Set(items.map((i) => i?.productId).filter((id) => id && id !== PIZZA_BUILDER_PRODUCT_ID))];

  const [productsResult, sizesResult] = await Promise.all([
    productIds.length
      ? client.query('SELECT id, "basePrice" FROM products WHERE id = ANY($1::text[])', [productIds])
      : Promise.resolve({ rows: [] }),
    client.query('SELECT id, nombre, precio FROM pizza_sizes'),
  ]);

  const productsById = new Map(productsResult.rows.map((p) => [p.id, p]));
  const sizePriceByKey = new Map();
  for (const s of sizesResult.rows) {
    sizePriceByKey.set(String(s.id).toLowerCase(), s.precio);
    sizePriceByKey.set(String(s.nombre).toLowerCase(), s.precio);
  }

  let total = 0;
  for (const item of items) {
    const quantity = Number(item?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
      throw new OrderPricingError(`Cantidad inválida para "${item?.name || item?.productId || 'item'}"`);
    }

    let unitPrice;
    if (item?.productId === PIZZA_BUILDER_PRODUCT_ID) {
      // Sin catálogo server-side de toppings (ver nota arriba): se acepta el
      // precio del cliente, pero nunca por debajo del piso conocido para el
      // tamaño elegido (una pizza personalizada sin extras pagos). El piso
      // sale de la misma tabla pizza_sizes real, no de una constante vieja.
      const sizeKey = item?.size ? String(item.size).toLowerCase() : null;
      const floor = (sizeKey && sizePriceByKey.get(sizeKey)) ?? BUILDER_LEGACY_FLOOR;
      unitPrice = Math.max(Number(item.price) || 0, floor);
    } else {
      const product = productsById.get(item?.productId);
      if (!product) {
        throw new OrderPricingError(`Producto inválido: "${item?.productId}"`);
      }
      const sizeKey = item?.size ? String(item.size).toLowerCase() : null;
      const sizePrice = sizeKey ? sizePriceByKey.get(sizeKey) : undefined;
      unitPrice = sizePrice !== undefined ? sizePrice : Number(product.basePrice) || 0;
    }

    total += unitPrice * quantity;
  }

  return Math.round(total);
}
