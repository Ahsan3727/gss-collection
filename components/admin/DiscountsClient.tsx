'use client';

import { useState } from 'react';

export default function DiscountsClient({ initialDiscounts }: { initialDiscounts: any[] }) {
  const [discounts, setDiscounts] = useState(initialDiscounts);
  const [code, setCode] = useState('');
  const [type, setType] = useState('pct');
  const [value, setValue] = useState(10);
  const [minOrder, setMinOrder] = useState(0);
  const [limit, setLimit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, type, value, minOrder, limit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create code');

      setDiscounts([data.discount, ...discounts]);
      setCode('');
      setValue(10);
      setMinOrder(0);
      setLimit(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* List */}
      <div className="lg:col-span-8 bg-white border border-line shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-ground border-b border-line uppercase text-[10px] tracking-wider text-ink-2">
              <th className="py-3 px-4 font-semibold">Code</th>
              <th className="py-3 px-4 font-semibold">Discount Type</th>
              <th className="py-3 px-4 font-semibold">Value</th>
              <th className="py-3 px-4 font-semibold">Min Order</th>
              <th className="py-3 px-4 font-semibold">Uses / Limit</th>
              <th className="py-3 px-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {discounts.map((d) => (
              <tr key={d._id} className="hover:bg-neutral-50/80 transition">
                <td className="py-3.5 px-4 font-mono font-bold text-ink">{d.code}</td>
                <td className="py-3.5 px-4 capitalize text-ink-2">
                  {d.type === 'pct' ? 'Percentage' : d.type === 'fixed' ? 'Fixed PKR' : 'Free Shipping'}
                </td>
                <td className="py-3.5 px-4 font-semibold text-ink">
                  {d.type === 'pct' ? `${d.value}%` : `Rs. ${d.value}`}
                </td>
                <td className="py-3.5 px-4 text-ink-2">
                  {d.minOrder > 0 ? `Rs. ${d.minOrder.toLocaleString()}` : 'None'}
                </td>
                <td className="py-3.5 px-4 text-ink-2">
                  {d.uses} / {d.limit > 0 ? d.limit : '∞'}
                </td>
                <td className="py-3.5 px-4">
                  <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                    d.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {d.active ? 'Active' : 'Disabled'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create form */}
      <div className="lg:col-span-4 bg-white border border-line p-6 shadow-sm">
        <h2 className="font-display text-xl font-normal text-ink mb-4 pb-2 border-b border-line">
          Create Discount Code
        </h2>

        {error && <p className="mb-4 text-xs text-red-700 bg-red-50 p-2.5 border border-red-200">{error}</p>}

        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Promo Code *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              placeholder="e.g. EID15"
              className="w-full px-3 py-2 border border-line font-mono font-bold focus:outline-none focus:border-ink uppercase"
            />
          </div>

          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Discount Type *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-line focus:outline-none focus:border-ink"
            >
              <option value="pct">Percentage Off (%)</option>
              <option value="fixed">Fixed Amount (PKR)</option>
              <option value="ship">Free Shipping</option>
            </select>
          </div>

          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Discount Value *
            </label>
            <input
              type="number"
              min="1"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              required
              className="w-full px-3 py-2 border border-line focus:outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Minimum Order (PKR)
            </label>
            <input
              type="number"
              min="0"
              value={minOrder}
              onChange={(e) => setMinOrder(Number(e.target.value))}
              placeholder="0 for no minimum"
              className="w-full px-3 py-2 border border-line focus:outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Usage Limit
            </label>
            <input
              type="number"
              min="0"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              placeholder="0 for unlimited"
              className="w-full px-3 py-2 border border-line focus:outline-none focus:border-ink"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-white py-3 uppercase tracking-wider text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40 transition"
          >
            {loading ? 'Creating...' : 'Save Discount Code'}
          </button>
        </form>
      </div>
    </div>
  );
}
