'use client';

import { useState } from 'react';

export default function SettingsClient({ initialSettings }: { initialSettings: any }) {
  const [form, setForm] = useState(initialSettings);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg('Settings updated successfully!');
      } else {
        setMsg('Failed to update settings.');
      }
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-2xl bg-white border border-line p-8 shadow-sm space-y-6 text-xs">
      {msg && (
        <div className="p-3 bg-neutral-100 border border-neutral-300 text-xs font-semibold text-ink">
          {msg}
        </div>
      )}

      {/* General */}
      <div>
        <h2 className="font-display text-xl font-normal text-ink mb-4 pb-2 border-b border-line">
          General Brand Details
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Store Name
            </label>
            <input
              type="text"
              value={form.storeName || ''}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
              className="w-full px-3 py-2 border border-line text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Free Nationwide Delivery Threshold (PKR)
            </label>
            <input
              type="number"
              value={form.freeShippingFrom ?? 15000}
              onChange={(e) => setForm({ ...form, freeShippingFrom: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-line text-sm focus:outline-none focus:border-ink"
            />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="pt-4">
        <h2 className="font-display text-xl font-normal text-ink mb-4 pb-2 border-b border-line">
          Customer Contact & Support
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Support Email
            </label>
            <input
              type="email"
              value={form.contact?.email || ''}
              onChange={(e) => setForm({ ...form, contact: { ...form.contact, email: e.target.value } })}
              className="w-full px-3 py-2 border border-line text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Support Phone / WhatsApp
            </label>
            <input
              type="text"
              value={form.contact?.phone || ''}
              onChange={(e) => setForm({ ...form, contact: { ...form.contact, phone: e.target.value } })}
              className="w-full px-3 py-2 border border-line text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Atelier Physical Address
            </label>
            <input
              type="text"
              value={form.contact?.address || ''}
              onChange={(e) => setForm({ ...form, contact: { ...form.contact, address: e.target.value } })}
              className="w-full px-3 py-2 border border-line text-sm focus:outline-none focus:border-ink"
            />
          </div>
        </div>
      </div>

      {/* Bank Account */}
      <div className="pt-4">
        <h2 className="font-display text-xl font-normal text-ink mb-4 pb-2 border-b border-line">
          Bank Transfer Instructions
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Bank Name
            </label>
            <input
              type="text"
              value={form.bank?.bankName || ''}
              onChange={(e) => setForm({ ...form, bank: { ...form.bank, bankName: e.target.value } })}
              className="w-full px-3 py-2 border border-line text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Account Title
            </label>
            <input
              type="text"
              value={form.bank?.accountTitle || ''}
              onChange={(e) => setForm({ ...form, bank: { ...form.bank, accountTitle: e.target.value } })}
              className="w-full px-3 py-2 border border-line text-sm focus:outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Account / IBAN Number
            </label>
            <input
              type="text"
              value={form.bank?.accountNumber || ''}
              onChange={(e) => setForm({ ...form, bank: { ...form.bank, accountNumber: e.target.value } })}
              className="w-full px-3 py-2 border border-line text-sm font-mono tracking-wider focus:outline-none focus:border-ink"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-ink text-white py-3.5 uppercase tracking-[0.2em] font-semibold text-xs hover:bg-neutral-800 disabled:opacity-40 transition"
      >
        {loading ? 'Saving Settings...' : 'Save Settings'}
      </button>
    </form>
  );
}
