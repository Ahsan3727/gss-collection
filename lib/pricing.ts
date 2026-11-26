import type { DiscountType, ProductVariant, ShippingMethod, StoreSettingsData } from '@/lib/types';

/**
 * Single source of truth for pricing, stock lookup, shipping, and discount calculation.
 * Keep free of database/Node imports so browser UI, API routes, and unit tests run identical math.
 */

export interface PricedProductLike {
  handle: string;
  base: number;
  compareAt?: number;
  variants?: Pick<ProductVariant, 'sku' | 'stone' | 'size' | 'price' | 'compareAt' | 'stock'>[];
  stoneDeltas?: unknown;
  inventory?: unknown;
}

export type ResolvedVariant =
  | {
      mode: 'variant' | 'legacy';
      sku: string;
      price: number;
      compareAt?: number;
      stock: number;
      available: boolean;
    }
  | {
      mode: 'unavailable';
      sku: string;
      price: null;
      compareAt?: number;
      stock: 0;
      available: false;
    };

export function buildVariantSku(handle: string, stone: string, size: string): string {
  return `${handle.toUpperCase()}-${stone.toUpperCase()}-${size}`;
}

function readNumericMapValue(map: unknown, key: string): number | undefined {
  if (!map) return undefined;
  const val = map instanceof Map ? map.get(key) : (map as Record<string, unknown>)[key];
  if (typeof val !== 'number' || !Number.isFinite(val)) return undefined;
  return val;
}

/**
 * Resolves price, SKU, and available stock for a single (stone, size) selection.
 * Never falls back to hardcoded defaults (like base 9000 or stock 10) or global stone deltas.
 */
export function resolveVariantSelection(
  product: PricedProductLike,
  stone: string,
  size: string
): ResolvedVariant {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const match = product.variants.find((v) => v.stone === stone && v.size === size);
    if (!match || !Number.isFinite(match.price) || match.price <= 0) {
      return {
        mode: 'unavailable',
        sku: '',
        price: null,
        stock: 0,
        available: false,
      };
    }

    const stock = Math.max(0, Math.floor(Number(match.stock) || 0));
    return {
      mode: 'variant',
      sku: match.sku || buildVariantSku(product.handle, stone, size),
      price: Math.round(match.price),
      compareAt: match.compareAt ?? product.compareAt,
      stock,
      available: stock > 0,
    };
  }

  if (!Number.isFinite(product.base) || product.base <= 0) {
    return {
      mode: 'unavailable',
      sku: '',
      price: null,
      stock: 0,
      available: false,
    };
  }

  const delta = readNumericMapValue(product.stoneDeltas, stone) ?? 0;
  const rawStock = readNumericMapValue(product.inventory, `${stone}:${size}`);
  const stock = rawStock !== undefined ? Math.max(0, Math.floor(rawStock)) : 0;

  return {
    mode: 'legacy',
    sku: buildVariantSku(product.handle, stone, size),
    price: Math.round(product.base + delta),
    compareAt: product.compareAt,
    stock,
    available: stock > 0,
  };
}

/** Returns exact unit price for a stone/size combination, or null if unavailable. */
export function unitPrice(
  product: PricedProductLike,
  selection: { stone: string; size: string }
): number | null {
  return resolveVariantSelection(product, selection.stone, selection.size).price;
}

/**
 * Computes per-product display delta for a gemstone relative to product.base.
 * Uses stored variants or per-product stoneDeltas — never the global STONES config.
 */
export function productStoneDelta(product: PricedProductLike, stone: string): number {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const stoneVariants = product.variants.filter((v) => v.stone === stone && Number.isFinite(v.price));
    if (stoneVariants.length > 0 && Number.isFinite(product.base)) {
      const minPrice = Math.min(...stoneVariants.map((v) => v.price));
      return Math.round(minPrice - product.base);
    }
  }
  return Math.round(readNumericMapValue(product.stoneDeltas, stone) ?? 0);
}

/** Total units available across all variants (or legacy inventory) for a product. */
export function totalProductStock(product: PricedProductLike): number {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants.reduce((sum, v) => sum + Math.max(0, Math.floor(v.stock || 0)), 0);
  }
  if (product.inventory instanceof Map) {
    let total = 0;
    product.inventory.forEach((val) => {
      if (typeof val === 'number' && Number.isFinite(val)) total += Math.max(0, Math.floor(val));
    });
    return total;
  }
  if (product.inventory && typeof product.inventory === 'object') {
    return Object.values(product.inventory as Record<string, unknown>).reduce<number>(
      (sum, v) => (typeof v === 'number' && Number.isFinite(v) ? sum + Math.max(0, Math.floor(v)) : sum),
      0
    );
  }
  return 0;
}

export function resolveShippingOption(
  settings: Pick<StoreSettingsData, 'freeShippingFrom' | 'shipping'>,
  subtotal: number,
  country = 'PK',
  shippingMethodId = 'std',
  freeShippingDiscount = false
): { price: number; label: string; id: string; isFree: boolean } {
  const isPk = country.toUpperCase() === 'PK';
  const pool: ShippingMethod[] = isPk
    ? settings.shipping?.pk || []
    : settings.shipping?.intl || [];

  const chosen = pool.find((m) => m.id === shippingMethodId) || pool[0] || {
    id: 'std',
    label: isPk ? 'Standard delivery (Pakistan)' : 'International registered mail',
    eta: isPk ? '3 to 5 business days' : '10 to 18 business days',
    price: isPk ? 300 : 3500,
  };

  const threshold = Number.isFinite(settings.freeShippingFrom) ? settings.freeShippingFrom : 15000;
  const qualifiesFree =
    subtotal > 0 &&
    ((isPk && chosen.id === 'std' && subtotal >= threshold) || (isPk && freeShippingDiscount));

  if (qualifiesFree) {
    return {
      id: chosen.id,
      price: 0,
      label: 'Free standard delivery',
      isFree: true,
    };
  }

  return {
    id: chosen.id,
    price: Math.max(0, Math.round(chosen.price)),
    label: `${chosen.label} (Rs. ${Math.round(chosen.price).toLocaleString()})`,
    isFree: false,
  };
}

export interface DiscountInput {
  code: string;
  type: DiscountType;
  value: number;
  minOrder: number;
  active: boolean;
  uses: number;
  limit: number;
}

export function computeDiscount(
  discount: DiscountInput | null | undefined,
  subtotal: number,
  baseShippingCost: number
):
  | { valid: true; code: string; type: DiscountType; amount: number; freeShipping: boolean }
  | { valid: false; reason: string } {
  if (!discount || !discount.active) {
    return { valid: false, reason: 'Invalid or expired promotional code' };
  }
  if (discount.limit > 0 && discount.uses >= discount.limit) {
    return { valid: false, reason: 'This discount code has reached its usage limit' };
  }
  if (discount.minOrder > 0 && subtotal < discount.minOrder) {
    return {
      valid: false,
      reason: `Minimum order amount of Rs. ${discount.minOrder.toLocaleString()} required for this code`,
    };
  }

  if (discount.type === 'pct') {
    const pct = Math.max(0, Math.min(100, discount.value));
    return {
      valid: true,
      code: discount.code,
      type: 'pct',
      amount: Math.min(subtotal, Math.round((subtotal * pct) / 100)),
      freeShipping: false,
    };
  }
  if (discount.type === 'fixed') {
    return {
      valid: true,
      code: discount.code,
      type: 'fixed',
      amount: Math.min(subtotal, Math.max(0, Math.round(discount.value))),
      freeShipping: false,
    };
  }
  return {
    valid: true,
    code: discount.code,
    type: 'ship',
    amount: Math.max(0, Math.round(baseShippingCost)),
    freeShipping: true,
  };
}
