'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart-context';
import { formatMoney } from '@/lib/money';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal: localSubtotal, clearCart } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [validatedData, setValidatedData] = useState<any>(null);
  const [validating, setValidating] = useState(true);

  // Discount code state
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [discountError, setDiscountError] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  // Idempotency key generated on component load
  const [idempotencyKey] = useState(() => 'idemp_' + Math.random().toString(36).substring(2, 15));

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    city: 'Lahore',
    state: 'Punjab',
    zip: '',
    country: 'PK',
    payMethod: 'cod',
    note: '',
  });

  // Revalidate cart items with server to ensure accurate price & stock
  useEffect(() => {
    if (items.length === 0) {
      setValidating(false);
      return;
    }

    const validateCart = async () => {
      setValidating(true);
      try {
        const res = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        const data = await res.json();
        setValidatedData(data);
      } catch (err) {
        console.error('Validation error:', err);
      } finally {
        setValidating(false);
      }
    };

    validateCart();
  }, [items]);

  const handleApplyDiscount = async () => {
    if (!discountCodeInput.trim()) return;
    setDiscountError('');
    setApplyingDiscount(true);

    try {
      const currentSubtotal = validatedData?.subtotal || localSubtotal;
      const res = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCodeInput.trim(),
          subtotal: currentSubtotal,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setDiscountError(data.error || 'Invalid code');
        setAppliedDiscount(null);
      } else {
        setAppliedDiscount(data);
      }
    } catch (e) {
      setDiscountError('Error verifying promotional code.');
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (items.length === 0) {
      setError('Your shopping bag is empty.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            handle: i.handle,
            title: i.title,
            stone: i.stone,
            size: i.size,
            qty: i.qty,
            sku: i.sku,
          })),
          contact: {
            email: form.email.trim(),
            phone: form.phone.trim(),
          },
          address: {
            name: form.name.trim(),
            line1: form.line1.trim(),
            line2: form.line2?.trim() || undefined,
            city: form.city.trim(),
            state: form.state.trim() || undefined,
            zip: form.zip.trim() || undefined,
            country: form.country,
          },
          payMethod: form.payMethod,
          discountCode: appliedDiscount?.code || undefined,
          note: form.note?.trim() || undefined,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order.');
      }

      // Clear cart upon successful order
      clearCart();

      // Redirect to secure confirmation receipt
      router.push(`/order/${data.orderNo}?t=${data.accessToken}`);
    } catch (err: any) {
      setError(err.message || 'Unexpected error creating order. Please retry.');
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-normal text-ink mb-3">
          Your Shopping Bag is Empty
        </h1>
        <p className="text-sm text-neutral-600 mb-8">
          Please add fine silver jewellery or gemstones to your bag before proceeding to checkout.
        </p>
        <Link
          href="/collections/all"
          className="bg-ink text-white text-xs uppercase tracking-[0.2em] px-8 py-3.5 font-medium hover:bg-neutral-800 transition"
        >
          Browse Catalogue
        </Link>
      </div>
    );
  }

  const subtotal = validatedData?.subtotal || localSubtotal;
  const isFreeShipping = subtotal >= 15000 || appliedDiscount?.type === 'ship';
  const shippingCharge = isFreeShipping ? 0 : 300;
  const discountAmount = appliedDiscount?.discountAmount || 0;
  const total = Math.max(0, subtotal - discountAmount + shippingCharge);

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-12 md:py-16">
      <div className="mb-10 text-center md:text-left border-b border-line pb-6">
        <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ink-2 block mb-2">
          Secure Store Checkout
        </span>
        <h1 className="font-display text-3xl md:text-5xl font-normal text-ink">
          Order Finalization
        </h1>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm">
          {error}
        </div>
      )}

      {validatedData?.issues && validatedData.issues.length > 0 && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-sm space-y-1">
          {validatedData.issues.map((msg: string, i: number) => (
            <p key={i}>⚠️ {msg}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Customer & Delivery Details */}
        <div className="lg:col-span-7 space-y-8">
          {/* Contact Details */}
          <section className="bg-white border border-line p-6 md:p-8">
            <h2 className="font-display text-2xl font-normal text-ink mb-6">
              1. Customer Contact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 border border-line text-sm focus:outline-none focus:border-ink transition"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                  Phone / WhatsApp *
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  placeholder="+92 300 1234567"
                  className="w-full px-3.5 py-2.5 border border-line text-sm focus:outline-none focus:border-ink transition"
                />
              </div>
            </div>
          </section>

          {/* Delivery Address */}
          <section className="bg-white border border-line p-6 md:p-8">
            <h2 className="font-display text-2xl font-normal text-ink mb-6">
              2. Delivery Address
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                  Full Recipient Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Fatima Zahra"
                  className="w-full px-3.5 py-2.5 border border-line text-sm focus:outline-none focus:border-ink transition"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                  Street Address & House / Flat # *
                </label>
                <input
                  type="text"
                  value={form.line1}
                  onChange={(e) => setForm({ ...form, line1: e.target.value })}
                  required
                  placeholder="House 12, Street 4, Sector..."
                  className="w-full px-3.5 py-2.5 border border-line text-sm focus:outline-none focus:border-ink transition"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                  Apartment, Suite, Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={form.line2}
                  onChange={(e) => setForm({ ...form, line2: e.target.value })}
                  placeholder="Near..."
                  className="w-full px-3.5 py-2.5 border border-line text-sm focus:outline-none focus:border-ink transition"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    required
                    placeholder="Lahore"
                    className="w-full px-3.5 py-2.5 border border-line text-sm focus:outline-none focus:border-ink transition"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                    Province / State
                  </label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="Punjab"
                    className="w-full px-3.5 py-2.5 border border-line text-sm focus:outline-none focus:border-ink transition"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={form.zip}
                    onChange={(e) => setForm({ ...form, zip: e.target.value })}
                    placeholder="54000"
                    className="w-full px-3.5 py-2.5 border border-line text-sm focus:outline-none focus:border-ink transition"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Payment Method */}
          <section className="bg-white border border-line p-6 md:p-8">
            <h2 className="font-display text-2xl font-normal text-ink mb-6">
              3. Payment Selection
            </h2>
            <div className="space-y-3">
              <label className={`block border p-4 cursor-pointer transition ${
                form.payMethod === 'cod' ? 'border-ink bg-ground ring-1 ring-ink' : 'border-line hover:border-neutral-400'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payMethod"
                    value="cod"
                    checked={form.payMethod === 'cod'}
                    onChange={() => setForm({ ...form, payMethod: 'cod' })}
                    className="accent-ink"
                  />
                  <div>
                    <span className="font-semibold text-sm text-ink block">Cash on Delivery (COD)</span>
                    <span className="text-xs text-ink-3">Pay cash upon parcel delivery across Pakistan</span>
                  </div>
                </div>
              </label>

              <label className={`block border p-4 cursor-pointer transition ${
                form.payMethod === 'bank' ? 'border-ink bg-ground ring-1 ring-ink' : 'border-line hover:border-neutral-400'
              }`}>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payMethod"
                    value="bank"
                    checked={form.payMethod === 'bank'}
                    onChange={() => setForm({ ...form, payMethod: 'bank' })}
                    className="accent-ink"
                  />
                  <div>
                    <span className="font-semibold text-sm text-ink block">Direct Bank Transfer (Meezan Bank)</span>
                    <span className="text-xs text-ink-3">Account and IBAN details presented on order receipt</span>
                  </div>
                </div>
              </label>
            </div>

            {/* Order Note */}
            <div className="mt-6">
              <label className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
                Special Order Notes (Optional)
              </label>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
                placeholder="Ring size adjustment notes, gift message, or delivery instructions..."
                className="w-full px-3.5 py-2.5 border border-line text-sm focus:outline-none focus:border-ink transition"
              />
            </div>
          </section>
        </div>

        {/* Right Column: Order Review & Pricing */}
        <div className="lg:col-span-5 bg-ground border border-line p-6 md:p-8 space-y-6">
          <h2 className="font-display text-2xl font-normal text-ink pb-4 border-b border-line">
            Your Selection ({items.length})
          </h2>

          {/* Cart Item Rows */}
          <div className="divide-y divide-line max-h-80 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={`${item.productId}-${item.stone}-${item.size}`} className="py-3 flex gap-3 items-center">
                <div className="relative w-14 h-14 bg-white border border-line flex-shrink-0 overflow-hidden">
                  {item.photo ? (
                    <Image src={item.photo} alt={item.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-ink-3">GSS</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium text-ink truncate">{item.title}</h4>
                  <span className="text-[11px] text-ink-3 capitalize block">
                    {item.stone} · Size {item.size} · Qty {item.qty}
                  </span>
                </div>
                <span className="text-xs font-semibold text-ink">
                  {formatMoney(item.price * item.qty)}
                </span>
              </div>
            ))}
          </div>

          {/* Discount code box */}
          <div className="border-t border-b border-line py-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={discountCodeInput}
                onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                placeholder="Discount code (e.g. WELCOME10)"
                className="flex-1 px-3 py-2 border border-line text-xs uppercase focus:outline-none focus:border-ink transition bg-white"
              />
              <button
                type="button"
                onClick={handleApplyDiscount}
                disabled={applyingDiscount}
                className="bg-ink text-white px-4 py-2 text-xs uppercase tracking-wider font-medium hover:bg-neutral-800 transition disabled:opacity-50"
              >
                {applyingDiscount ? '...' : 'Apply'}
              </button>
            </div>
            {discountError && <p className="text-[11px] text-red-700 mt-1.5">{discountError}</p>}
            {appliedDiscount && (
              <p className="text-[11px] text-emerald-700 mt-1.5 font-medium">
                ✓ Code {appliedDiscount.code} applied (−{formatMoney(appliedDiscount.discountAmount)})
              </p>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-ink-2">
              <span>Subtotal</span>
              <span className="font-semibold text-ink">{formatMoney(subtotal)}</span>
            </div>
            {appliedDiscount && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span>−{formatMoney(appliedDiscount.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink-2">
              <span>Delivery</span>
              <span className="font-semibold text-ink">
                {isFreeShipping ? 'FREE' : formatMoney(300)}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-4 border-t border-line text-base">
              <span className="font-bold text-ink">Total Due</span>
              <span className="font-bold text-2xl text-ink">{formatMoney(total)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || validating}
            className="w-full bg-ink text-white py-4 text-xs uppercase tracking-[0.2em] font-medium hover:bg-neutral-800 transition disabled:opacity-50 shadow-md"
          >
            {submitting ? 'Creating Order...' : `Place Order · ${formatMoney(total)}`}
          </button>

          <p className="text-[11px] text-ink-3 text-center leading-relaxed">
            By placing your order, you agree to GSS Collection&apos;s Terms of Service and Genuine 925 Sterling Silver Guarantee.
          </p>
        </div>
      </form>
    </div>
  );
}
