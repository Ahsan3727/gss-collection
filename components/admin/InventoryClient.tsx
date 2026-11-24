'use client';

import { useState } from 'react';

export default function InventoryClient({ initialProducts }: { initialProducts: any[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [stockValues, setStockValues] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const p of initialProducts) {
      if (p.variants && p.variants.length > 0) {
        for (const v of p.variants) {
          map[`${p.id}_${v.sku}`] = v.stock;
        }
      }
    }
    return map;
  });

  const handleStockChange = (key: string, val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setStockValues((prev) => ({ ...prev, [key]: num }));
  };

  const handleSaveStock = async (productId: string, sku: string, stone: string, size: string, key: string) => {
    const stock = stockValues[key];
    setSavingKey(key);
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, sku, stone, size, stock }),
      });
      if (res.ok) {
        // Stock saved
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="bg-white border border-line shadow-sm overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-ground border-b border-line uppercase text-[10px] tracking-wider text-ink-2">
            <th className="py-3 px-4 font-semibold">Product</th>
            <th className="py-3 px-4 font-semibold">SKU</th>
            <th className="py-3 px-4 font-semibold">Gemstone</th>
            <th className="py-3 px-4 font-semibold">Size</th>
            <th className="py-3 px-4 font-semibold">Stock Quantity</th>
            <th className="py-3 px-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {products.flatMap((p) =>
            (p.variants || []).map((v: any) => {
              const inputKey = `${p.id}_${v.sku}`;
              const currentVal = stockValues[inputKey] ?? v.stock;
              const isLow = currentVal <= 3;
              const isSaving = savingKey === inputKey;

              return (
                <tr key={inputKey} className="hover:bg-neutral-50/80 transition">
                  <td className="py-3 px-4 font-medium text-ink">{p.title}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-ink-3">{v.sku}</td>
                  <td className="py-3 px-4 capitalize text-ink-2">{v.stone}</td>
                  <td className="py-3 px-4 text-ink-2 font-semibold">
                    {v.size === 'adj' ? 'Adjustable' : v.size === 'one' ? 'Single' : v.size}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={currentVal}
                        onChange={(e) => handleStockChange(inputKey, e.target.value)}
                        className="w-20 px-2 py-1 border border-line text-xs font-semibold focus:outline-none focus:border-ink"
                      />
                      {isLow && (
                        <span className="text-[10px] uppercase font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          Low Stock
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleSaveStock(p.id, v.sku, v.stone, v.size, inputKey)}
                      disabled={isSaving}
                      className="bg-ink text-white px-3 py-1 text-[11px] uppercase tracking-wider font-semibold hover:bg-neutral-800 disabled:opacity-40"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
