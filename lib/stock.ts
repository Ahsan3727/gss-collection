import type { Product } from '@/lib/models/Product';

/**
 * Server-side stock handling for orders.
 *
 * Variants are always matched by stone + size, never by a SKU sent from the browser.
 * A SKU is just a label built from the product handle, so it changes whenever the owner
 * changes a handle in the product editor. Stone and size do not change under a cart.
 */

// Only the one method we call, typed from the real model so a Mongoose Model fits.
// `import type` keeps this file free of runtime imports, so it can be tested without a database.
type ProductModel = Pick<typeof Product, 'updateOne'>;

interface VariantLike {
  sku?: string;
  stone: string;
  size: string;
  price: number;
  stock: number;
}

interface ProductLike {
  handle: string;
  base: number;
  variants?: VariantLike[];
  stoneDeltas?: unknown;
  inventory?: unknown;
}

/** Same format the product editor and the seed use when they build variants. */
export function buildSku(handle: string, stone: string, size: string): string {
  return `${handle.toUpperCase()}-${stone.toUpperCase()}-${size}`;
}

/**
 * Where a line item gets its stock from.
 * - `variant`: the product has a variants array (every product made by the editor or the seed).
 * - `legacy`: an older product with only the `inventory` map.
 * - `unavailable`: the product has variants but not this stone and size, for example a stone the
 *   owner removed after the customer filled the cart.
 */
export type StockSource =
  | { mode: 'variant'; sku: string; stock: number; unitPrice: number }
  | { mode: 'legacy'; sku: string; stock: number; unitPrice: number }
  | { mode: 'unavailable' };

function readMapValue(map: unknown, key: string): number | undefined {
  if (!map) return undefined;
  const value = map instanceof Map ? map.get(key) : (map as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : undefined;
}

export function resolveStockSource(product: ProductLike, stone: string, size: string): StockSource {
  if (product.variants && product.variants.length > 0) {
    const variant = product.variants.find((v) => v.stone === stone && v.size === size);
    if (!variant) return { mode: 'unavailable' };
    return {
      mode: 'variant',
      // The SKU stored on the variant is the one admin restock matches on.
      sku: variant.sku || buildSku(product.handle, stone, size),
      stock: variant.stock,
      unitPrice: variant.price,
    };
  }

  const delta = readMapValue(product.stoneDeltas, stone) ?? 0;
  return {
    mode: 'legacy',
    sku: buildSku(product.handle, stone, size),
    stock: readMapValue(product.inventory, `${stone}:${size}`) ?? 0,
    unitPrice: product.base + delta,
  };
}

export interface StockTaken {
  /** The product's Mongo `_id`. */
  dbId: any;
  mode: 'variant' | 'legacy';
  stone: string;
  size: string;
  qty: number;
}

/**
 * Takes stock for one line item. Returns false when the stock is no longer there.
 * For a variant product the update only matches while `stock >= qty`, so two customers
 * cannot both take the last piece. It never falls back to the legacy map for a variant product.
 */
export async function takeStock(
  model: ProductModel,
  dbId: any,
  mode: 'variant' | 'legacy',
  stone: string,
  size: string,
  qty: number
): Promise<boolean> {
  if (mode === 'variant') {
    const result = await model.updateOne(
      { _id: dbId, variants: { $elemMatch: { stone, size, stock: { $gte: qty } } } },
      { $inc: { 'variants.$.stock': -qty, sold: qty } }
    );
    return result.modifiedCount === 1;
  }

  const key = `inventory.${stone}:${size}`;
  const result = await model.updateOne(
    { _id: dbId, [key]: { $gte: qty } },
    { $inc: { [key]: -qty, sold: qty } }
  );
  return result.modifiedCount === 1;
}

/** Puts stock back for one line item (failed order, or an order the owner cancels). */
export async function restoreStock(
  model: ProductModel,
  dbId: any,
  mode: 'variant' | 'legacy',
  stone: string,
  size: string,
  qty: number
): Promise<boolean> {
  if (mode === 'variant') {
    const result = await model.updateOne(
      { _id: dbId, variants: { $elemMatch: { stone, size } } },
      { $inc: { 'variants.$.stock': qty, sold: -qty } }
    );
    return result.modifiedCount === 1;
  }

  const key = `inventory.${stone}:${size}`;
  const result = await model.updateOne({ _id: dbId }, { $inc: { [key]: qty, sold: -qty } });
  return result.modifiedCount === 1;
}

/** Undoes every deduction made so far. Never throws, so it cannot hide the original error. */
export async function rollbackStock(model: ProductModel, taken: StockTaken[]): Promise<void> {
  for (const t of taken) {
    try {
      await restoreStock(model, t.dbId, t.mode, t.stone, t.size, t.qty);
    } catch (err) {
      console.error('[Stock Rollback Error]:', err);
    }
  }
}
