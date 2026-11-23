'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/money';

export default function CheckoutPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [placedOrderNo, setPlacedOrderNo] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    city: 'Lahore',
    state: 'Punjab',
    payMethod: 'cod',
    note: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Sample single-item order if cart is empty in demo
    const sampleItem = {
      productId: 'p01',
      handle: 'crimson-halo-ring',
      title: 'Crimson Halo Ring',
      stone: 'garnet',
      size: '7',
      qty: 1,
      price: 9800,
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [sampleItem],
          contact: { email: form.email, phone: form.phone },
          address: {
            name: form.name,
            line1: form.line1,
            city: form.city,
            state: form.state,
            country: 'PK',
          },
          payMethod: form.payMethod,
          note: form.note,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      setPlacedOrderNo(data.orderNo);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (placedOrderNo) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6 text-ok">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-xs font-semibold tracking-widest uppercase text-ink-2 mb-2 block">
          Order Confirmed
        </span>
        <h1 className="font-display text-4xl font-normal text-ink mb-4">
          Thank you for your order!
        </h1>
        <p className="text-sm text-neutral-600 mb-6">
          Your order number is <strong className="text-ink font-semibold">{placedOrderNo}</strong>. We have sent a confirmation details to {form.email}.
        </p>

        {form.payMethod === 'bank' ? (
          <div className="bg-ground border border-line p-6 text-left mb-8 text-xs leading-relaxed">
            <h4 className="font-semibold text-ink uppercase tracking-wider mb-2">
              Bank Transfer Instructions
            </h4>
            <p className="mb-1"><strong>Bank:</strong> Meezan Bank</p>
            <p className="mb-1"><strong>Account Title:</strong> GSS Collection</p>
            <p className="mb-2"><strong>IBAN:</strong> PK00MEZN0000000000000000</p>
            <p className="text-neutral-500">
              Please WhatsApp your payment receipt with your order number to +92 300 000 0000.
            </p>
          </div>
        ) : (
          <p className="text-xs text-neutral-500 mb-8 bg-ground p-4 border border-line">
            Your parcel will be delivered with Cash on Delivery. Please have the exact amount ready upon courier arrival.
          </p>
        )}

        <Link
          href="/"
          className="inline-block bg-ink text-white text-xs uppercase tracking-[0.18em] font-medium px-8 py-3.5 hover:bg-neutral-800 transition-colors"
        >
          Return to Store
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
      <h1 className="font-display text-4xl font-normal text-ink mb-8">Checkout</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-error text-xs rounded-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Contact information */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink mb-4 pb-2 border-b border-line">
            1. Contact Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">Full Name *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-neutral-300 p-3 text-sm focus:border-ink outline-none"
                placeholder="Muhammad Ali"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">Email Address *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-neutral-300 p-3 text-sm focus:border-ink outline-none"
                placeholder="ali@example.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-ink-2 mb-1">Phone Number (WhatsApp) *</label>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-neutral-300 p-3 text-sm focus:border-ink outline-none"
                placeholder="0300 1234567"
              />
            </div>
          </div>
        </div>

        {/* Shipping address */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink mb-4 pb-2 border-b border-line">
            2. Delivery Address
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-1">Street Address *</label>
              <input
                required
                type="text"
                value={form.line1}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
                className="w-full border border-neutral-300 p-3 text-sm focus:border-ink outline-none"
                placeholder="House 12, Street 4, Sector G-11/2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1">City *</label>
                <input
                  required
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full border border-neutral-300 p-3 text-sm focus:border-ink outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-2 mb-1">Province *</label>
                <input
                  required
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full border border-neutral-300 p-3 text-sm focus:border-ink outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment options */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink mb-4 pb-2 border-b border-line">
            3. Payment Method
          </h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border border-line cursor-pointer hover:border-ink transition-colors">
              <input
                type="radio"
                name="payMethod"
                value="cod"
                checked={form.payMethod === 'cod'}
                onChange={() => setForm({ ...form, payMethod: 'cod' })}
                className="accent-ink w-4 h-4"
              />
              <div>
                <strong className="block text-sm text-ink">Cash on Delivery (COD)</strong>
                <span className="text-xs text-ink-2">Pay cash to courier upon receiving parcel</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border border-line cursor-pointer hover:border-ink transition-colors">
              <input
                type="radio"
                name="payMethod"
                value="bank"
                checked={form.payMethod === 'bank'}
                onChange={() => setForm({ ...form, payMethod: 'bank' })}
                className="accent-ink w-4 h-4"
              />
              <div>
                <strong className="block text-sm text-ink">Direct Bank Transfer</strong>
                <span className="text-xs text-ink-2">Transfer to Meezan Bank, share screenshot on WhatsApp</span>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-ink text-white py-4 text-xs font-semibold uppercase tracking-[0.18em] hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </form>
    </div>
  );
}
