import { describe, expect, it, vi } from 'vitest';
import {
  buildSku,
  resolveStockSource,
  restoreStock,
  rollbackStock,
  takeStock,
} from '@/lib/stock';

describe('stock helper', () => {
  it('matches variants by stone + size even after a handle rename', () => {
    const product = {
      handle: 'renamed-ring-slug',
      base: 9500,
      variants: [
        {
          sku: 'OLD-HANDLE-GARNET-7',
          stone: 'garnet',
          size: '7',
          price: 9500,
          stock: 4,
        },
      ],
    };

    const source = resolveStockSource(product, 'garnet', '7');
    expect(source).toEqual({
      mode: 'variant',
      sku: 'OLD-HANDLE-GARNET-7',
      stock: 4,
      unitPrice: 9500,
    });
    expect(buildSku('renamed-ring-slug', 'garnet', '7')).toBe('RENAMED-RING-SLUG-GARNET-7');
  });

  it('uses atomic $elemMatch + $inc on takeStock and restoreStock for variant products', async () => {
    const updateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    const model = { updateOne };

    const took = await takeStock(model, 'db1', 'variant', 'garnet', '7', 2);
    expect(took).toBe(true);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'db1', status: 'active', variants: { $elemMatch: { stone: 'garnet', size: '7', stock: { $gte: 2 } } } },
      { $inc: { 'variants.$.stock': -2, sold: 2 } }
    );

    await restoreStock(model, 'db1', 'variant', 'garnet', '7', 2);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'db1', variants: { $elemMatch: { stone: 'garnet', size: '7' } } },
      { $inc: { 'variants.$.stock': 2, sold: -2 } }
    );
  });

  it('uses atomic legacy inventory updates and safe rollbackStock without throwing', async () => {
    const updateOne = vi
      .fn()
      .mockResolvedValueOnce({ modifiedCount: 1 })
      .mockRejectedValueOnce(new Error('DB transient error'))
      .mockResolvedValueOnce({ modifiedCount: 1 });

    const model = { updateOne };
    expect(await takeStock(model, 'db2', 'legacy', 'ruby', 'One', 1)).toBe(true);

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      rollbackStock(model, [
        { dbId: 'db1', mode: 'variant', stone: 'garnet', size: '7', qty: 1 },
        { dbId: 'db2', mode: 'legacy', stone: 'ruby', size: 'One', qty: 1 },
      ])
    ).resolves.toBeUndefined();
    expect(updateOne).toHaveBeenCalledTimes(3);
    errSpy.mockRestore();
  });
});
