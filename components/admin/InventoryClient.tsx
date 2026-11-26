'use client';

import { useState } from 'react';
import type { ProductVariant } from '@/lib/types';

export interface InventoryProductItem {
  id: string;
  handle: string;
  title: string;
  variants: Pick<ProductVariant, 'sku' | 'stone' | 'size' | 'stock'>[];
}

interface RowSaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message?: string;
}

export default function InventoryClient({
  initialProducts,
}: {
  initialProducts: InventoryProductItem[];
}) {
  const [products] = useState<InventoryProductItem[]>(initialProducts);

  const buildInitialMap = () => {
    const map: Record<string, number> = {};
    for (const p of initialProducts) {
      for (const v of p.variants || []) {
        map[`${p.id}_${v.sku}`] = v.stock;
      }
    }
    return map;
  };

  const [savedValues, setSavedValues] = useState<Record<string, number>>(buildInitialMap);
  const [stockValues, setStockValues] = useState<Record<string, number>>(buildInitialMap);
  const [rowStatus, setRowStatus] = useState<Record<string, RowSaveState>>({});

  const handleStockChange = (key: string, val: number) => {
    const num = Number.isFinite(val) ? Math.max(0, Math.floor(val)) : 0;
    setStockValues((prev) => ({ ...prev, [key]: num }));
    setRowStatus((prev) => ({ ...prev, [key]: { status: 'idle' } }));
  };

  const handleSaveStock = async (
    productId: string,
    sku: string,
    stone: string,
    size: string,
    key: string
  ) => {
    const stock = stockValues[key] ?? 0;
    setRowStatus((prev) => ({ ...prev, [key]: { status: 'saving' } }));

    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, sku, stone, size, stock }),
      });

      const data = (await res.json()) as { error?: string; updatedStock?: number };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save stock');
      }

      const persisted = typeof data.updatedStock === 'number' ? data.updatedStock : stock;
      setSavedValues((prev) => ({ ...prev, [key]: persisted }));
      setStockValues((prev) => ({ ...prev, [key]: persisted }));
      setRowStatus((prev) => ({ ...prev, [key]: { status: 'saved' } }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      // Revert back to the last successfully saved stock value so UI never lies.
      setStockValues((prev) => ({ ...prev, [key]: savedValues[key] ?? 0 }));
      setRowStatus((prev) => ({
        ...prev,
        [key]: { status: 'error', message: msg },
      }));
    }
  };

  const renderSize = (size: string) =>
    size === 'adj' ? 'Adjustable' : size === 'one' ? 'Single' : size;

  return (
    <>
      {/* Mobile Phone Card Layout with 44px steppers */}
      <div className="md:hidden space-y-4">
        {products.map((p) => (
          <section key={p.id} className="bg-white border border-line p-4 shadow-sm">
            <h2 className="font-medium text-base text-ink border-b border-line pb-2.5 mb-3">
              {p.title}
            </h2>
            <div className="space-y-3">
              {(p.variants || []).map((v) => {
                const inputKey = `${p.id}_${v.sku}`;
                const currentVal = stockValues[inputKey] ?? v.stock;
                const st = rowStatus[inputKey] || { status: 'idle' };
                const isLow = currentVal <= 3;

                return (
                  <div
                    key={inputKey}
                    className="border border-line bg-ground/60 p-3 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="capitalize font-semibold text-ink">
                        {v.stone} · Size {renderSize(v.size)}
                      </span>
                      {isLow && (
                        <span className="text-xs font-semibold text-gold bg-amber-50 px-2 py-0.5 rounded">
                          Low Stock
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center border border-line bg-white">
                        <button
                          type="button"
                          onClick={() => handleStockChange(inputKey, currentVal - 1)}
                          aria-label={`Decrease stock for ${p.title} ${v.stone} size ${v.size}`}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink font-semibold"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          aria-label={`Stock quantity for ${p.title} ${v.stone} size ${v.size}`}
                          value={currentVal}
                          onChange={(e) =>
                            handleStockChange(inputKey, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-16 min-h-[44px] text-center text-base font-semibold border-x border-line focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleStockChange(inputKey, currentVal + 1)}
                          aria-label={`Increase stock for ${p.title} ${v.stone} size ${v.size}`}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink font-semibold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={st.status === 'saving'}
                        onClick={() => handleSaveStock(p.id, v.sku, v.stone, v.size, inputKey)}
                        className="bg-ink text-white px-4 min-h-[44px] text-xs uppercase tracking-wider font-semibold disabled:opacity-40"
                      >
                        {st.status === 'saving'
                          ? 'Saving...'
                          : st.status === 'error'
                          ? 'Retry'
                          : 'Save'}
                      </button>
                    </div>

                    {st.status === 'saved' && (
                      <p role="status" className="text-xs text-ok font-semibold">
                        ✓ Saved
                      </p>
                    )}
                    {st.status === 'error' && (
                      <p role="alert" className="text-xs text-error font-semibold">
                        {st.message || 'Save failed. Reverted.'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-line shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-ground border-b border-line uppercase tracking-wider text-ink-2">
              <th className="py-3 px-4 font-semibold">Product</th>
              <th className="py-3 px-4 font-semibold">SKU</th>
              <th className="py-3 px-4 font-semibold">Gemstone</th>
              <th className="py-3 px-4 font-semibold">Size</th>
              <th className="py-3 px-4 font-semibold">Stock Quantity</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.flatMap((p) =>
              (p.variants || []).map((v) => {
                const inputKey = `${p.id}_${v.sku}`;
                const currentVal = stockValues[inputKey] ?? v.stock;
                const st = rowStatus[inputKey] || { status: 'idle' };
                const isLow = currentVal <= 3;

                return (
                  <tr key={inputKey} className="hover:bg-neutral-50/80 transition">
                    <td className="py-3 px-4 font-medium text-ink">{p.title}</td>
                    <td className="py-3 px-4 font-mono text-ink-2">{v.sku}</td>
                    <td className="py-3 px-4 capitalize text-ink-2">{v.stone}</td>
                    <td className="py-3 px-4 text-ink-2 font-semibold">{renderSize(v.size)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          aria-label={`Stock quantity for ${p.title} ${v.stone} ${v.size}`}
                          value={currentVal}
                          onChange={(e) =>
                            handleStockChange(inputKey, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-24 px-2.5 min-h-[44px] border border-line text-base font-semibold focus:outline-none focus:border-ink"
                        />
                        {isLow && (
                          <span className="text-xs font-semibold text-gold bg-amber-50 px-2 py-0.5 rounded">
                            Low
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {st.status === 'saved' && (
                        <span role="status" className="text-xs font-semibold text-ok">
                          ✓ Saved
                        </span>
                      )}
                      {st.status === 'error' && (
                        <span role="alert" className="text-xs font-semibold text-error">
                          {st.message || 'Error'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSaveStock(p.id, v.sku, v.stone, v.size, inputKey)}
                        disabled={st.status === 'saving'}
                        className="bg-ink text-white px-4 min-h-[44px] text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800 disabled:opacity-40"
                      >
                        {st.status === 'saving'
                          ? 'Saving...'
                          : st.status === 'error'
                          ? 'Retry'
                          : 'Save'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
