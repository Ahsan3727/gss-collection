import type { Product } from '@/lib/models/Product';
import {
  buildVariantSku,
  resolveVariantSelection,
  type PricedProductLike,
} from '@/lib/pricing';

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

export const buildSku = buildVariantSku;

export type StockSource =
  | { mode: 'variant'; sku: string; stock: number; unitPrice: number }
  | { mode: 'legacy'; sku: string; stock: number; unitPrice: number }
  | { mode: 'unavailable' };

export function resolveStockSource(
  product: PricedProductLike,
  stone: string,
  size: string
): StockSource {
  const resolved = resolveVariantSelection(product, stone, size);
  if (resolved.mode === 'unavailable' || resolved.price === null) {
    return { mode: 'unavailable' };
  }
  return {
    mode: resolved.mode,
    sku: resolved.sku,
    stock: resolved.stock,
    unitPrice: resolved.price,
  };
}

export interface StockTaken {
  /** The product's Mongo `_id`. */
  dbId: unknown;
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
  dbId: unknown,
  mode: 'variant' | 'legacy',
  stone: string,
  size: string,
  qty: number
): Promise<boolean> {
  if (mode === 'variant') {
    const result = await model.updateOne(
      { _id: dbId, status: 'active', variants: { $elemMatch: { stone, size, stock: { $gte: qty } } } },
      { $inc: { 'variants.$.stock': -qty, sold: qty } }
    );
    return result.modifiedCount === 1;
  }

  const key = `inventory.${stone}:${size}`;
  const result = await model.updateOne(
    { _id: dbId, status: 'active', [key]: { $gte: qty } },
    { $inc: { [key]: -qty, sold: qty } }
  );
  return result.modifiedCount === 1;
}

/** Puts stock back for one line item (failed order, or an order the owner cancels). */
export async function restoreStock(
  model: ProductModel,
  dbId: unknown,
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
