import { describe, expect, it } from 'vitest';
import {
  buildVariantSku,
  computeDiscount,
  productStoneDelta,
  resolveShippingOption,
  resolveVariantSelection,
  totalProductStock,
  unitPrice,
} from '@/lib/pricing';
import type { StoreSettingsData } from '@/lib/types';

const settingsFixture: Pick<StoreSettingsData, 'freeShippingFrom' | 'shipping'> = {
  freeShippingFrom: 15000,
  shipping: {
    pk: [
      { id: 'std', label: 'Standard delivery', eta: '3-5 days', price: 300 },
      { id: 'exp', label: 'Express air', eta: '1-2 days', price: 750 },
    ],
    intl: [{ id: 'intl', label: 'DHL Express', eta: '7-10 days', price: 3500 }],
  },
};

describe('pricing & variant selection', () => {
  it('resolves stored variant SKU, price, compareAt, and stock', () => {
    const product = {
      handle: 'crimson-halo-ring',
      base: 9500,
      variants: [
        { sku: 'CHR-GAR-7', stone: 'garnet', size: '7', price: 9500, compareAt: 11000, stock: 3 },
        { sku: 'CHR-PER-7', stone: 'peridot', size: '7', price: 11200, stock: 0 },
      ],
    };

    expect(resolveVariantSelection(product, 'garnet', '7')).toEqual({
      mode: 'variant',
      sku: 'CHR-GAR-7',
      price: 9500,
      compareAt: 11000,
      stock: 3,
      available: true,
    });

    expect(resolveVariantSelection(product, 'peridot', '7')).toEqual({
      mode: 'variant',
      sku: 'CHR-PER-7',
      price: 11200,
      compareAt: undefined,
      stock: 0,
      available: false,
    });

    expect(unitPrice(product, { stone: 'missing', size: '7' })).toBeNull();
  });

  it('resolves legacy map products without inventing fake stock 10 or fake base 9000', () => {
    const legacy = {
      handle: 'vintage-band',
      base: 8000,
      stoneDeltas: { turquoise: 1500 },
      inventory: { 'turquoise:8': 2 },
    };

    expect(resolveVariantSelection(legacy, 'turquoise', '8')).toEqual({
      mode: 'legacy',
      sku: buildVariantSku('vintage-band', 'turquoise', '8'),
      price: 9500,
      compareAt: undefined,
      stock: 2,
      available: true,
    });

    // Unlisted combination defaults to 0 stock (unavailable), never 10
    expect(resolveVariantSelection(legacy, 'turquoise', '9').stock).toBe(0);
    expect(resolveVariantSelection(legacy, 'turquoise', '9').available).toBe(false);

    // Zero or invalid base is unavailable, never defaults to 9000
    expect(resolveVariantSelection({ handle: 'bad', base: 0 }, 'garnet', '7').mode).toBe('unavailable');
  });

  it('computes per-product stone delta and total stock', () => {
    const product = {
      handle: 'crown-ring',
      base: 10000,
      variants: [
        { sku: 'A', stone: 'garnet', size: '6', price: 10000, stock: 2 },
        { sku: 'B', stone: 'peridot', size: '6', price: 11800, stock: 5 },
      ],
    };
    expect(productStoneDelta(product, 'garnet')).toBe(0);
    expect(productStoneDelta(product, 'peridot')).toBe(1800);
    expect(totalProductStock(product)).toBe(7);

    const legacyMap = {
      handle: 'stone-item',
      base: 12000,
      stoneDeltas: new Map([['emerald', 4000]]),
      inventory: new Map([
        ['emerald:One', 3],
        ['bad:One', -2],
      ]),
    };
    expect(productStoneDelta(legacyMap, 'emerald')).toBe(4000);
    expect(totalProductStock(legacyMap)).toBe(3);
  });
});

describe('shipping threshold boundaries', () => {
  it('charges standard rate below 15,000 PKR and waives at 15,000 PKR+', () => {
    const below = resolveShippingOption(settingsFixture, 14999, 'PK', 'std', false);
    expect(below.price).toBe(300);
    expect(below.isFree).toBe(false);

    const atThreshold = resolveShippingOption(settingsFixture, 15000, 'PK', 'std', false);
    expect(atThreshold.price).toBe(0);
    expect(atThreshold.isFree).toBe(true);

    // Express stays paid even above free standard threshold
    const express = resolveShippingOption(settingsFixture, 20000, 'PK', 'exp', false);
    expect(express.price).toBe(750);

    // Free-shipping promo waives PK delivery even below threshold
    const promo = resolveShippingOption(settingsFixture, 5000, 'PK', 'std', true);
    expect(promo.price).toBe(0);

    // International ignores PK threshold
    const intl = resolveShippingOption(settingsFixture, 30000, 'UK', 'intl', true);
    expect(intl.price).toBe(3500);
  });
});

describe('discount calculation', () => {
  it('handles pct, fixed, ship, inactive, minOrder, and limit rules', () => {
    expect(
      computeDiscount(
        { code: 'EID15', type: 'pct', value: 15, minOrder: 0, active: true, uses: 0, limit: 0 },
        10000,
        300
      )
    ).toEqual({
      valid: true,
      code: 'EID15',
      type: 'pct',
      amount: 1500,
      freeShipping: false,
    });

    // Capped at subtotal
    expect(
      computeDiscount(
        { code: 'BIG', type: 'fixed', value: 5000, minOrder: 0, active: true, uses: 0, limit: 0 },
        3000,
        300
      )
    ).toEqual({
      valid: true,
      code: 'BIG',
      type: 'fixed',
      amount: 3000,
      freeShipping: false,
    });

    expect(
      computeDiscount(
        { code: 'FREESHIP', type: 'ship', value: 0, minOrder: 0, active: true, uses: 0, limit: 0 },
        8000,
        300
      )
    ).toEqual({
      valid: true,
      code: 'FREESHIP',
      type: 'ship',
      amount: 300,
      freeShipping: true,
    });

    expect(
      computeDiscount(
        { code: 'OFF', type: 'pct', value: 10, minOrder: 0, active: false, uses: 0, limit: 0 },
        10000,
        300
      ).valid
    ).toBe(false);

    expect(
      computeDiscount(
        { code: 'LIMIT', type: 'pct', value: 10, minOrder: 0, active: true, uses: 5, limit: 5 },
        10000,
        300
      ).valid
    ).toBe(false);

    expect(
      computeDiscount(
        { code: 'MIN12K', type: 'pct', value: 10, minOrder: 12000, active: true, uses: 0, limit: 0 },
        11999,
        300
      ).valid
    ).toBe(false);
  });
});
