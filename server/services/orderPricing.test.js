import { describe, it, expect, vi } from 'vitest';
import { computeVerifiedTotal, OrderPricingError } from './orderPricing.js';

// Catálogo de prueba: 1 producto plano + 1 tamaño de pizza, resueltos por
// las 2 queries que hace computeVerifiedTotal (products, luego pizza_sizes).
function fakeClient({ products = [], sizes = [] } = {}) {
  const query = vi.fn((sql) => {
    if (sql.includes('FROM products')) return Promise.resolve({ rows: products });
    if (sql.includes('FROM pizza_sizes')) return Promise.resolve({ rows: sizes });
    throw new Error(`Unexpected query in test: ${sql}`);
  });
  return { query };
}

describe('computeVerifiedTotal', () => {
  it('recomputes the total from catalog basePrice, ignoring a tampered client price', async () => {
    const client = fakeClient({
      products: [{ id: 'p1', basePrice: 30000 }],
      sizes: [],
    });

    const items = [{ productId: 'p1', name: 'Gaseosa', quantity: 2, price: 1 }]; // cliente manda $1
    const total = await computeVerifiedTotal(client, items);

    expect(total).toBe(60000); // 30000 * 2, no el $1 que mandó el cliente
  });

  it('uses pizza_sizes.precio (absolute) as the unit price when item.size matches a known size, for an actual pizza flavor product', async () => {
    const client = fakeClient({
      // categoryId:'pizzas' es lo que hace que este producto realmente
      // tenga tallas -- ver hasRealSizes() en orderPricing.js.
      products: [{ id: 'p1', basePrice: 20000, categoryId: 'pizzas' }], // basePrice del producto base, ignorado si el tamaño matchea
      sizes: [{ id: 'familiar', nombre: 'Familiar', precio: 55000 }],
    });

    const items = [{ productId: 'p1', name: 'Pizza', size: 'Familiar', quantity: 1, price: 100 }];
    const total = await computeVerifiedTotal(client, items);

    expect(total).toBe(55000);
  });

  // Auditoría de arquitectura (critico #1): antes sizePriceByKey era un mapa
  // GLOBAL sin scope por producto -- un item con size='Familiar' para un
  // producto que NUNCA tuvo tallas (ej. un combo caro, o una gaseosa)
  // igual matcheaba contra pizza_sizes y cobraba el precio de la pizza en
  // vez del basePrice real del producto. Regresión: esto debe seguir
  // cobrando basePrice sin importar qué size mande el cliente.
  it('ignores item.size for a product that is not a pizza flavor, even if it accidentally matches a real pizza_sizes name', async () => {
    const client = fakeClient({
      products: [{ id: 'combo-familiar', basePrice: 150000, categoryId: 'especiales' }],
      sizes: [{ id: 'small', nombre: 'Small', precio: 30000 }],
    });

    const items = [{ productId: 'combo-familiar', name: 'Combo Familiar', size: 'small', quantity: 1, price: 500 }];
    const total = await computeVerifiedTotal(client, items);

    expect(total).toBe(150000); // basePrice real, NO el precio de la pizza Small
  });

  it('rejects an item referencing a product id that does not exist in the catalog', async () => {
    const client = fakeClient({ products: [], sizes: [] });
    const items = [{ productId: 'no-existe', name: 'Fantasma', quantity: 1, price: 100 }];

    await expect(computeVerifiedTotal(client, items)).rejects.toThrow(OrderPricingError);
  });

  it('rejects a non-positive or non-integer quantity', async () => {
    const client = fakeClient({ products: [{ id: 'p1', basePrice: 10000 }], sizes: [] });

    await expect(computeVerifiedTotal(client, [{ productId: 'p1', quantity: 0, price: 10000 }])).rejects.toThrow(
      OrderPricingError
    );
    await expect(computeVerifiedTotal(client, [{ productId: 'p1', quantity: -1, price: 10000 }])).rejects.toThrow(
      OrderPricingError
    );
    await expect(computeVerifiedTotal(client, [{ productId: 'p1', quantity: 1.5, price: 10000 }])).rejects.toThrow(
      OrderPricingError
    );
  });

  it('returns 0 for an empty items array', async () => {
    const client = fakeClient();
    expect(await computeVerifiedTotal(client, [])).toBe(0);
  });

  it('clamps the "pizza-builder" custom item to the real pizza_sizes floor for its size when the client price is below it', async () => {
    const client = fakeClient({
      products: [],
      sizes: [{ id: 'familiar', nombre: 'Familiar', precio: 88000 }],
    });

    const items = [{ productId: 'pizza-builder', size: 'Familiar', quantity: 1, price: 500 }];
    const total = await computeVerifiedTotal(client, items);

    // Floor viene de pizza_sizes.precio real (88000), no de una constante vieja
    // -- el precio de $500 del cliente se descarta.
    expect(total).toBe(88000);
  });

  it('keeps the client price for "pizza-builder" items when it is already above the floor', async () => {
    const client = fakeClient({
      products: [],
      sizes: [{ id: 'small', nombre: 'Small', precio: 30000 }],
    });

    const items = [{ productId: 'pizza-builder', size: 'Small', quantity: 1, price: 62000 }];
    const total = await computeVerifiedTotal(client, items);

    expect(total).toBe(62000);
  });

  it('falls back to the legacy floor for "pizza-builder" items when pizza_sizes has no matching row', async () => {
    const client = fakeClient({ products: [], sizes: [] });

    const items = [{ productId: 'pizza-builder', size: 'Unknown Size', quantity: 1, price: 500 }];
    const total = await computeVerifiedTotal(client, items);

    expect(total).toBe(25000);
  });

  it('sums multiple items correctly', async () => {
    const client = fakeClient({
      products: [
        { id: 'p1', basePrice: 10000 },
        { id: 'p2', basePrice: 5000 },
      ],
      sizes: [],
    });

    const items = [
      { productId: 'p1', quantity: 2, price: 1 },
      { productId: 'p2', quantity: 3, price: 1 },
    ];
    const total = await computeVerifiedTotal(client, items);

    expect(total).toBe(10000 * 2 + 5000 * 3);
  });
});
