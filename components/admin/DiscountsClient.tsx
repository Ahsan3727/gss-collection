'use client';

import { useState } from 'react';
import { useSave } from '@/lib/use-save';
import { formatMoney } from '@/lib/money';
import type { DiscountRecord, DiscountType } from '@/lib/types';

export default function DiscountsClient({ initialDiscounts }: { initialDiscounts: DiscountRecord[] }) {
  const [discounts, setDiscounts] = useState<DiscountRecord[]>(initialDiscounts);
  const [code, setCode] = useState('');
  const [type, setType] = useState<DiscountType>('pct');
  const [value, setValue] = useState<number>(10);
  const [minOrder, setMinOrder] = useState<number>(0);
  const [limit, setLimit] = useState<number>(0);
  const { status, error, run, reset } = useSave();

  const inputClass =
    'w-full px-3 py-2 min-h-[44px] border border-line text-base md:text-sm bg-white focus:outline-none focus:border-ink';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    void run(async () => {
      const res = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          type,
          value: type === 'ship' ? 0 : Math.max(0, Number(value) || 0),
          minOrder: Math.max(0, Number(minOrder) || 0),
          limit: Math.max(0, Math.floor(Number(limit) || 0)),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to create discount code');
      setDiscounts((prev) => [data.discount as DiscountRecord, ...prev]);
      setCode('');
      setValue(10);
      setMinOrder(0);
      setLimit(0);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Existing codes */}
      <div className="lg:col-span-7">
        {discounts.length === 0 ? (
          <div className="bg-white border border-line p-10 text-center text-xs text-ink-2">
            No promo codes yet. Create your first code using the form.
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {discounts.map((d) => (
                <div key={d._id} className="bg-white border border-line p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-ink">{d.code}</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                        d.active ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-100 text-ink-2'
                      }`}
                    >
                      {d.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-2">
                    <span>
                      {d.type === 'pct'
                        ? `${d.value}% Off`
                        : d.type === 'fixed'
                          ? `${formatMoney(d.value)} Off`
                          : 'Free Shipping'}
                    </span>
                    <span>Min order: {d.minOrder > 0 ? formatMoney(d.minOrder) : 'None'}</span>
                  </div>
                  <div className="text-xs text-ink-2 pt-2 border-t border-line">
                    Uses: {d.uses} {d.limit > 0 ? `/ ${d.limit}` : '(unlimited)'}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white border border-line overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100 text-ink-2 uppercase tracking-wider border-b border-line">
                  <tr>
                    <th className="p-3.5 font-semibold">Code</th>
                    <th className="p-3.5 font-semibold">Reward</th>
                    <th className="p-3.5 font-semibold">Min Order</th>
                    <th className="p-3.5 font-semibold text-center">Uses</th>
                    <th className="p-3.5 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {discounts.map((d) => (
                    <tr key={d._id} className="hover:bg-neutral-50">
                      <td className="p-3.5 font-mono font-bold text-ink">{d.code}</td>
                      <td className="p-3.5 text-ink">
                        {d.type === 'pct'
                          ? `${d.value}% Off`
                          : d.type === 'fixed'
                            ? `${formatMoney(d.value)} Off`
                            : 'Free Shipping'}
                      </td>
                      <td className="p-3.5 text-ink-2">
                        {d.minOrder > 0 ? formatMoney(d.minOrder) : 'None'}
                      </td>
                      <td className="p-3.5 text-center font-mono">
                        {d.uses}
                        {d.limit > 0 ? ` / ${d.limit}` : ''}
                      </td>
                      <td className="p-3.5 text-right">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                            d.active ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-100 text-ink-2'
                          }`}
                        >
                          {d.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Create form */}
      <div className="lg:col-span-5 bg-white border border-line p-5 md:p-6">
        <h2 className="font-display text-lg font-medium border-b border-line pb-2 mb-4">
          New Discount Code
        </h2>

        {status === 'error' && error && (
          <p role="alert" className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 p-3">
            {error}
          </p>
        )}
        {status === 'saved' && (
          <p role="status" className="mb-4 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 p-3">
            Discount code created.
          </p>
        )}

        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label htmlFor="dc-code" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Code *
            </label>
            <input
              id="dc-code"
              type="text"
              required
              value={code}
              onChange={(e) => {
                reset();
                setCode(e.target.value.toUpperCase());
              }}
              placeholder="e.g. EID15"
              className={`${inputClass} uppercase font-mono`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dc-type" className="block uppercase tracking-wider font-semibold text-ink mb-1">
                Discount Type
              </label>
              <select
                id="dc-type"
                value={type}
                onChange={(e) => {
                  reset();
                  setType(e.target.value as DiscountType);
                }}
                className={inputClass}
              >
                <option value="pct">Percentage (%)</option>
                <option value="fixed">Fixed PKR</option>
                <option value="ship">Free Shipping</option>
              </select>
            </div>

            {type !== 'ship' && (
              <div>
                <label htmlFor="dc-value" className="block uppercase tracking-wider font-semibold text-ink mb-1">
                  {type === 'pct' ? 'Percent Off' : 'Amount (PKR)'}
                </label>
                <input
                  id="dc-value"
                  type="number"
                  min="1"
                  max={type === 'pct' ? 100 : undefined}
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dc-min" className="block uppercase tracking-wider font-semibold text-ink mb-1">
                Min Order (PKR)
              </label>
              <input
                id="dc-min"
                type="number"
                min="0"
                inputMode="numeric"
                value={minOrder}
                onChange={(e) => setMinOrder(Number(e.target.value))}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="dc-limit" className="block uppercase tracking-wider font-semibold text-ink mb-1">
                Usage Limit
              </label>
              <input
                id="dc-limit"
                type="number"
                min="0"
                inputMode="numeric"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                placeholder="0 for unlimited"
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status === 'saving'}
            className="w-full bg-ink text-white min-h-[48px] uppercase tracking-wider text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40 transition"
          >
            {status === 'saving' ? 'Creating...' : 'Save Discount Code'}
          </button>
        </form>
      </div>
    </div>
  );
}
