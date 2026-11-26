'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSave } from '@/lib/use-save';
import type { StoreSettingsData } from '@/lib/types';

export default function SettingsClient({ initialSettings }: { initialSettings: StoreSettingsData }) {
  const [savedSnapshot, setSavedSnapshot] = useState<StoreSettingsData>(initialSettings);
  const [form, setForm] = useState<StoreSettingsData>(initialSettings);
  const { status, error, run, retry, reset } = useSave();

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedSnapshot),
    [form, savedSnapshot]
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const inputClass =
    'w-full px-3 py-2 min-h-[44px] border border-line text-base md:text-sm bg-white focus:outline-none focus:border-ink';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const payload = {
        storeName: form.storeName.trim(),
        tagline: form.tagline.trim(),
        freeShippingFrom: Math.max(0, Number(form.freeShippingFrom) || 0),
        moderateReviews: Boolean(form.moderateReviews),
        announcements: form.announcements.map((a) => a.trim()).filter(Boolean),
        contact: {
          email: form.contact.email.trim(),
          phone: form.contact.phone.trim(),
          hours: form.contact.hours.trim(),
          address: form.contact.address.trim(),
        },
        bank: {
          bankName: form.bank.bankName.trim(),
          accountTitle: form.bank.accountTitle.trim(),
          accountNumber: form.bank.accountNumber.trim(),
        },
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save settings');

      const nextSettings: StoreSettingsData = data.settings ? { ...form, ...data.settings } : form;
      setForm(nextSettings);
      setSavedSnapshot(nextSettings);
    });
  };

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-6 text-xs">
      {status === 'error' && error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 p-4"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void retry()}
            className="border border-red-300 bg-white px-4 min-h-[44px] text-xs font-semibold uppercase tracking-wider hover:border-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {status === 'saved' && !dirty && (
        <p role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 font-medium">
          Settings saved and storefront cache updated.
        </p>
      )}

      {dirty && status !== 'saving' && (
        <p role="status" className="bg-amber-50 border border-amber-200 text-amber-900 p-3 font-medium">
          You have unsaved changes.
        </p>
      )}

      {/* Brand Identity */}
      <div className="bg-white border border-line p-5 md:p-6 space-y-4">
        <h2 className="font-display text-lg font-medium border-b border-line pb-2">Brand & Shipping</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="st-name" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Store Name
            </label>
            <input
              id="st-name"
              type="text"
              required
              value={form.storeName}
              onChange={(e) => {
                reset();
                setForm({ ...form, storeName: e.target.value });
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="st-free-ship" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Free Shipping Above (PKR)
            </label>
            <input
              id="st-free-ship"
              type="number"
              min="0"
              inputMode="numeric"
              value={form.freeShippingFrom}
              onChange={(e) => {
                reset();
                setForm({ ...form, freeShippingFrom: Number(e.target.value) });
              }}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="st-tagline" className="block uppercase tracking-wider font-semibold text-ink mb-1">
            Tagline
          </label>
          <input
            id="st-tagline"
            type="text"
            value={form.tagline}
            onChange={(e) => {
              reset();
              setForm({ ...form, tagline: e.target.value });
            }}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="st-announcements" className="block uppercase tracking-wider font-semibold text-ink mb-1">
            Announcement Bar Lines (one per line)
          </label>
          <textarea
            id="st-announcements"
            rows={3}
            value={form.announcements.join('\n')}
            onChange={(e) => {
              reset();
              setForm({ ...form, announcements: e.target.value.split('\n') });
            }}
            className="w-full px-3 py-2 border border-line text-base md:text-sm bg-white focus:outline-none focus:border-ink"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={form.moderateReviews}
            onChange={(e) => {
              reset();
              setForm({ ...form, moderateReviews: e.target.checked });
            }}
            className="w-4 h-4 accent-ink"
          />
          <span className="text-ink font-medium text-xs">
            Moderate reviews before publishing to product pages
          </span>
        </label>
      </div>

      {/* Contact Information */}
      <div className="bg-white border border-line p-5 md:p-6 space-y-4">
        <h2 className="font-display text-lg font-medium border-b border-line pb-2">Contact & Support</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="st-email" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Support Email
            </label>
            <input
              id="st-email"
              type="email"
              value={form.contact.email}
              onChange={(e) => {
                reset();
                setForm({ ...form, contact: { ...form.contact, email: e.target.value } });
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="st-phone" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Phone / WhatsApp Number
            </label>
            <input
              id="st-phone"
              type="tel"
              inputMode="tel"
              placeholder="+92 300 1234567"
              value={form.contact.phone}
              onChange={(e) => {
                reset();
                setForm({ ...form, contact: { ...form.contact, phone: e.target.value } });
              }}
              className={inputClass}
            />
            <p className="text-xs text-ink-2 mt-1">
              Leave blank to hide WhatsApp & phone buttons on the storefront. Format: +92 3XX XXXXXXX or 03XX XXXXXXX.
            </p>
          </div>
          <div>
            <label htmlFor="st-hours" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Business Hours
            </label>
            <input
              id="st-hours"
              type="text"
              value={form.contact.hours}
              onChange={(e) => {
                reset();
                setForm({ ...form, contact: { ...form.contact, hours: e.target.value } });
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="st-address" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Showroom / City Address
            </label>
            <input
              id="st-address"
              type="text"
              value={form.contact.address}
              onChange={(e) => {
                reset();
                setForm({ ...form, contact: { ...form.contact, address: e.target.value } });
              }}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Bank Transfer */}
      <div className="bg-white border border-line p-5 md:p-6 space-y-4">
        <h2 className="font-display text-lg font-medium border-b border-line pb-2">Bank Transfer Account</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="st-bank-name" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Bank Name
            </label>
            <input
              id="st-bank-name"
              type="text"
              value={form.bank.bankName}
              onChange={(e) => {
                reset();
                setForm({ ...form, bank: { ...form.bank, bankName: e.target.value } });
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="st-bank-title" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Account Title
            </label>
            <input
              id="st-bank-title"
              type="text"
              value={form.bank.accountTitle}
              onChange={(e) => {
                reset();
                setForm({ ...form, bank: { ...form.bank, accountTitle: e.target.value } });
              }}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="st-iban" className="block uppercase tracking-wider font-semibold text-ink mb-1">
            Account / IBAN Number
          </label>
          <input
            id="st-iban"
            type="text"
            value={form.bank.accountNumber}
            onChange={(e) => {
              reset();
              setForm({ ...form, bank: { ...form.bank, accountNumber: e.target.value } });
            }}
            className={`${inputClass} font-mono tracking-wider`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={status === 'saving'}
        className="w-full bg-ink text-white min-h-[48px] px-6 uppercase tracking-[0.2em] font-semibold text-xs hover:bg-neutral-800 disabled:opacity-40 transition"
      >
        {status === 'saving' ? 'Saving Settings...' : 'Save Settings'}
      </button>
    </form>
  );
}
