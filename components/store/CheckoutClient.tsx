'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart, type ValidatedLineInput } from '@/lib/cart-context';
import { formatMoney } from '@/lib/money';
import { validateCheckoutPhone } from '@/lib/contact';
import { computeDiscount, resolveShippingOption } from '@/lib/pricing';
import CopyButton from '@/components/store/CopyButton';
import type { DiscountType, PayMethod, StoreSettingsData } from '@/lib/types';

const PAKISTAN_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
];

interface ValidatedCartResponse {
  valid?: boolean;
  items?: ValidatedLineInput[];
  subtotal?: number;
  shipping?: number;
  total?: number;
  issues?: string[];
}

interface AppliedDiscountState {
  code: string;
  type: DiscountType;
  discountAmount: number;
  freeShipping: boolean;
}

export default function CheckoutClient({ settings }: { settings: StoreSettingsData }) {
  const router = useRouter();
  const { items, subtotal: localSubtotal, clearCart, syncValidatedItems } = useCart();

  const errorRef = useRef<HTMLDivElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [validatedData, setValidatedData] = useState<ValidatedCartResponse | null>(null);
  const [validating, setValidating] = useState(true);
  const [priceSyncNotice, setPriceSyncNotice] = useState('');

  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscountState | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  const [idempotencyKey] = useState(
    () => `idemp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  );

  const [cityChoice, setCityChoice] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [shippingMethodId, setShippingMethodId] = useState<string>(
    settings.shipping?.pk?.[0]?.id || 'std'
  );

  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    line1: string;
    line2: string;
    state: string;
    zip: string;
    country: string;
    payMethod: PayMethod;
    note: string;
  }>({
    name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    state: '',
    zip: '',
    country: 'PK',
    payMethod: 'cod',
    note: '',
  });

  const resolvedCity = cityChoice === 'Other' ? customCity.trim() : cityChoice;

  const focusErrorBanner = (message: string) => {
    setError(message);
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      errorRef.current?.focus();
    });
  };

  useEffect(() => {
    if (items.length === 0) {
      setValidating(false);
      return;
    }

    let cancelled = false;
    setValidating(true);

    fetch('/api/cart/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        country: form.country,
        shippingMethodId,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ValidatedCartResponse | null) => {
        if (cancelled || !data) return;
        setValidatedData(data);
        if (Array.isArray(data.items)) {
          const synced = syncValidatedItems(data.items);
          if (synced.changed) {
            setPriceSyncNotice('Cart prices or stock updated from latest store data.');
          }
        }
      })
      .catch((err) => {
        console.error('Cart validation error:', err);
      })
      .finally(() => {
        if (!cancelled) setValidating(false);
      });

    return () => {
      cancelled = true;
    };
    // Revalidate when shipping method changes or item count changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, shippingMethodId]);

  const subtotal = validatedData?.subtotal ?? localSubtotal;
  const baseShipping = resolveShippingOption(settings, subtotal, form.country, shippingMethodId, false);

  const handleApplyDiscount = async () => {
    if (!discountCodeInput.trim()) return;
    setDiscountError('');
    setApplyingDiscount(true);

    try {
      const res = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountCodeInput.trim(),
          subtotal,
          country: form.country,
          shippingMethodId,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        type?: DiscountType;
        discountAmount?: number;
        freeShipping?: boolean;
      };

      if (!res.ok || !data.code || !data.type) {
        setDiscountError(data.error || 'Invalid code');
        setAppliedDiscount(null);
      } else {
        setAppliedDiscount({
          code: data.code,
          type: data.type,
          discountAmount: data.discountAmount || 0,
          freeShipping: Boolean(data.freeShipping),
        });
      }
    } catch {
      setDiscountError('Error verifying promotional code.');
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handlePhoneBlur = () => {
    const err = validateCheckoutPhone(form.phone, form.country);
    setPhoneError(err || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (items.length === 0) {
      focusErrorBanner('Your shopping bag is empty.');
      return;
    }

    const phoneValidation = validateCheckoutPhone(form.phone, form.country);
    if (phoneValidation) {
      setPhoneError(phoneValidation);
      focusErrorBanner(phoneValidation);
      return;
    }

    if (!resolvedCity || resolvedCity.length < 2) {
      focusErrorBanner('Please select or enter your delivery city.');
      return;
    }

    setSubmitting(true);

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
          })),
          contact: {
            email: form.email.trim(),
            phone: form.phone.trim(),
          },
          address: {
            name: form.name.trim(),
            line1: form.line1.trim(),
            line2: form.line2.trim() || undefined,
            city: resolvedCity,
            state: form.state.trim() || undefined,
            zip: form.zip.trim() || undefined,
            country: form.country,
          },
          payMethod: form.payMethod,
          shippingMethodId,
          discountCode: appliedDiscount?.code || undefined,
          note: form.note.trim() || undefined,
          idempotencyKey,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        orderNo?: string;
        accessToken?: string;
      };
      if (!res.ok || !data.orderNo) {
        throw new Error(data.error || 'Failed to place order.');
      }

      clearCart();
      router.push(`/order/${data.orderNo}?t=${data.accessToken}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error creating order. Please retry.';
      focusErrorBanner(msg);
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-normal text-ink mb-3">
          Your Shopping Bag is Empty
        </h1>
        <p className="text-sm text-ink-2 mb-8">
          Please add fine silver jewellery or gemstones to your bag before proceeding to checkout.
        </p>
        <Link
          href="/collections/all"
          className="inline-flex items-center justify-center bg-ink text-white text-xs uppercase tracking-[0.2em] px-8 min-h-[48px] font-medium hover:bg-neutral-800 transition"
        >
          Browse Catalogue
        </Link>
      </div>
    );
  }

  const finalShipping = resolveShippingOption(
    settings,
    subtotal,
    form.country,
    shippingMethodId,
    Boolean(appliedDiscount?.freeShipping)
  );
  const discountDeduction = appliedDiscount?.freeShipping
    ? 0
    : appliedDiscount
    ? computeDiscount(
        {
          code: appliedDiscount.code,
          type: appliedDiscount.type,
          value: appliedDiscount.discountAmount,
          minOrder: 0,
          active: true,
          uses: 0,
          limit: 0,
        },
        subtotal,
        baseShipping.price
      ).valid
      ? appliedDiscount.discountAmount
      : 0
    : 0;
  const total = Math.max(0, subtotal - discountDeduction + finalShipping.price);

  const inputClass =
    'w-full px-3.5 min-h-[48px] border border-line bg-white text-base text-ink focus:outline-none focus:border-ink transition';
  const labelClass = 'block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5';

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10 md:py-16">
      <div className="mb-8 text-center md:text-left border-b border-line pb-6">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-ink-2 block mb-2">
          Secure Store Checkout
        </span>
        <h1 className="font-display text-3xl md:text-5xl font-normal text-ink">
          Order Finalization
        </h1>
      </div>

      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mb-6 p-4 bg-red-50 border border-red-300 text-error text-sm font-medium rounded-sm focus:outline-none"
        >
          {error}
        </div>
      )}

      {priceSyncNotice && (
        <div role="status" className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-sm">
          {priceSyncNotice}
        </div>
      )}

      {validatedData?.issues && validatedData.issues.length > 0 && (
        <div role="alert" className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-sm space-y-1">
          {validatedData.issues.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-7 min-w-0 space-y-6">
          {/* 1. Customer Contact */}
          <section className="bg-white border border-line p-5 sm:p-8">
            <h2 className="font-display text-2xl font-normal text-ink mb-5">
              1. Customer Contact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="checkout-email" className={labelClass}>
                  Email Address *
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="name@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="checkout-phone" className={labelClass}>
                  Phone / WhatsApp *
                </label>
                <input
                  id="checkout-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    if (phoneError) setPhoneError('');
                  }}
                  onBlur={handlePhoneBlur}
                  aria-invalid={Boolean(phoneError)}
                  aria-describedby={phoneError ? 'checkout-phone-error' : 'checkout-phone-hint'}
                  required
                  placeholder="03XXXXXXXXX or +923XXXXXXXXX"
                  className={`${inputClass} ${phoneError ? 'border-error' : ''}`}
                />
                {phoneError ? (
                  <p id="checkout-phone-error" role="alert" className="text-xs text-error mt-1.5 font-medium">
                    {phoneError}
                  </p>
                ) : (
                  <p id="checkout-phone-hint" className="text-xs text-ink-2 mt-1">
                    Pakistani mobile format: 03001234567
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* 2. Delivery Address */}
          <section className="bg-white border border-line p-5 sm:p-8">
            <h2 className="font-display text-2xl font-normal text-ink mb-5">
              2. Delivery Address
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="checkout-name" className={labelClass}>
                  Full Recipient Name *
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Fatima Zahra"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="checkout-line1" className={labelClass}>
                  Street Address &amp; House / Flat # *
                </label>
                <input
                  id="checkout-line1"
                  type="text"
                  autoComplete="street-address"
                  value={form.line1}
                  onChange={(e) => setForm({ ...form, line1: e.target.value })}
                  required
                  placeholder="House 12, Street 4, Sector..."
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="checkout-line2" className={labelClass}>
                  Apartment, Suite, Landmark (Optional)
                </label>
                <input
                  id="checkout-line2"
                  type="text"
                  autoComplete="address-line2"
                  value={form.line2}
                  onChange={(e) => setForm({ ...form, line2: e.target.value })}
                  placeholder="Near..."
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="checkout-city-select" className={labelClass}>
                    City *
                  </label>
                  <select
                    id="checkout-city-select"
                    autoComplete="address-level2"
                    value={cityChoice}
                    onChange={(e) => setCityChoice(e.target.value)}
                    required
                    className={inputClass}
                  >
                    <option value="">Select city</option>
                    {PAKISTAN_CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                    <option value="Other">Other city</option>
                  </select>
                </div>

                {cityChoice === 'Other' && (
                  <div>
                    <label htmlFor="checkout-city-custom" className={labelClass}>
                      Enter City Name *
                    </label>
                    <input
                      id="checkout-city-custom"
                      type="text"
                      autoComplete="address-level2"
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      required
                      placeholder="City name"
                      className={inputClass}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="checkout-state" className={labelClass}>
                    Province
                  </label>
                  <input
                    id="checkout-state"
                    type="text"
                    autoComplete="address-level1"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="Punjab, Sindh..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="checkout-zip" className={labelClass}>
                    Postal Code
                  </label>
                  <input
                    id="checkout-zip"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={form.zip}
                    onChange={(e) => setForm({ ...form, zip: e.target.value })}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 3. Shipping & Payment */}
          <section className="bg-white border border-line p-5 sm:p-8 space-y-6">
            <div>
              <h2 className="font-display text-2xl font-normal text-ink mb-4">
                3. Delivery Method
              </h2>
              <div className="space-y-2.5">
                {(settings.shipping?.pk || []).map((opt) => {
                  const isFreeStd = opt.id === 'std' && subtotal >= (settings.freeShippingFrom || 15000);
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between gap-3 border p-4 cursor-pointer min-h-[56px] transition ${
                        shippingMethodId === opt.id
                          ? 'border-ink bg-ground ring-1 ring-ink'
                          : 'border-line hover:border-neutral-400'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shippingMethodId"
                          value={opt.id}
                          checked={shippingMethodId === opt.id}
                          onChange={() => setShippingMethodId(opt.id)}
                          className="accent-ink w-4 h-4"
                        />
                        <span>
                          <span className="font-semibold text-sm text-ink block">{opt.label}</span>
                          <span className="text-xs text-ink-2">{opt.eta}</span>
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-ink shrink-0">
                        {isFreeStd ? 'FREE' : formatMoney(opt.price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl font-normal text-ink mb-4">
                4. Payment Selection
              </h2>
              <div className="space-y-3">
                <label
                  className={`block border p-4 cursor-pointer transition ${
                    form.payMethod === 'cod'
                      ? 'border-ink bg-ground ring-1 ring-ink'
                      : 'border-line hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payMethod"
                      value="cod"
                      checked={form.payMethod === 'cod'}
                      onChange={() => setForm({ ...form, payMethod: 'cod' })}
                      className="accent-ink w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-sm text-ink block">
                        Cash on Delivery (COD)
                      </span>
                      <span className="text-xs text-ink-2">
                        Pay cash upon parcel delivery across Pakistan
                      </span>
                    </div>
                  </div>
                </label>

                <label
                  className={`block border p-4 cursor-pointer transition ${
                    form.payMethod === 'bank'
                      ? 'border-ink bg-ground ring-1 ring-ink'
                      : 'border-line hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payMethod"
                      value="bank"
                      checked={form.payMethod === 'bank'}
                      onChange={() => setForm({ ...form, payMethod: 'bank' })}
                      className="accent-ink w-4 h-4"
                    />
                    <div>
                      <span className="font-semibold text-sm text-ink block">
                        Direct Bank Transfer ({settings.bank.bankName || 'Bank'})
                      </span>
                      <span className="text-xs text-ink-2">
                        Transfer to {settings.bank.accountTitle || 'GSS Collection'} and share receipt on WhatsApp
                      </span>
                    </div>
                  </div>
                </label>

                {form.payMethod === 'bank' && (
                  <div className="bg-ground border border-line p-4 text-xs space-y-2">
                    <div>
                      Bank: <span className="font-semibold text-ink">{settings.bank.bankName}</span>
                    </div>
                    <div>
                      Account Title: <span className="font-semibold text-ink">{settings.bank.accountTitle}</span>
                    </div>
                    {settings.bank.accountNumber ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="font-mono font-bold text-ink break-all">
                          {settings.bank.accountNumber}
                        </span>
                        <CopyButton text={settings.bank.accountNumber} label="Copy IBAN" />
                      </div>
                    ) : (
                      <p className="text-ink-2">
                        Account details will be shared immediately after placing your order.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="checkout-note" className={labelClass}>
                Special Order Notes (Optional)
              </label>
              <textarea
                id="checkout-note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
                placeholder="Ring size notes, gift message, or courier instructions..."
                className="w-full p-3.5 border border-line bg-white text-base text-ink focus:outline-none focus:border-ink transition"
              />
            </div>
          </section>
        </div>

        {/* Right Column: Order Review & Submit */}
        <div className="lg:col-span-5 min-w-0 bg-ground border border-line p-5 sm:p-8 space-y-6">
          <h2 className="font-display text-2xl font-normal text-ink pb-4 border-b border-line">
            Your Selection ({items.length})
          </h2>

          <div className="divide-y divide-line max-h-80 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.stone}-${item.size}`}
                className="py-3 flex gap-3 items-center"
              >
                <div className="relative w-16 h-16 bg-white border border-line flex-shrink-0 overflow-hidden">
                  {item.photo ? (
                    <Image
                      src={item.photo}
                      alt={item.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-ink-2">
                      GSS
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-ink truncate">{item.title}</h3>
                  <span className="text-xs text-ink-2 capitalize block">
                    {item.stone} · Size{' '}
                    {item.size === 'adj' ? 'Adjustable' : item.size === 'one' ? 'Single' : item.size}{' '}
                    · Qty {item.qty}
                  </span>
                </div>
                <span className="text-sm font-semibold text-ink shrink-0">
                  {formatMoney(item.price * item.qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-b border-line py-4">
            <label htmlFor="checkout-discount" className={labelClass}>
              Promotional Code
            </label>
            <div className="flex gap-2">
              <input
                id="checkout-discount"
                type="text"
                value={discountCodeInput}
                onChange={(e) => setDiscountCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10"
                className="flex-1 min-w-0 px-3.5 min-h-[48px] border border-line text-base uppercase focus:outline-none focus:border-ink transition bg-white"
              />
              <button
                type="button"
                onClick={handleApplyDiscount}
                disabled={applyingDiscount}
                className="shrink-0 bg-ink text-white px-5 min-h-[48px] text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800 transition disabled:opacity-50"
              >
                {applyingDiscount ? '...' : 'Apply'}
              </button>
            </div>
            {discountError && (
              <p role="alert" className="text-xs text-error mt-1.5 font-medium">
                {discountError}
              </p>
            )}
            {appliedDiscount && (
              <p role="status" className="text-xs text-ok mt-1.5 font-medium">
                ✓ Code {appliedDiscount.code} applied (
                {appliedDiscount.freeShipping
                  ? 'Free delivery'
                  : `−${formatMoney(appliedDiscount.discountAmount)}`}
                )
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-ink-2">
              <span>Subtotal</span>
              <span className="font-semibold text-ink">{formatMoney(subtotal)}</span>
            </div>
            {discountDeduction > 0 && (
              <div className="flex justify-between text-ok">
                <span>Discount</span>
                <span>−{formatMoney(discountDeduction)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink-2">
              <span>Delivery</span>
              <span className="font-semibold text-ink">
                {finalShipping.price === 0 ? 'FREE' : formatMoney(finalShipping.price)}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-4 border-t border-line text-base">
              <span className="font-bold text-ink">Total Due</span>
              <span className="font-bold text-2xl text-ink">{formatMoney(total)}</span>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-error font-semibold bg-red-50 border border-red-200 p-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || validating}
            className="w-full bg-ink text-white min-h-[52px] px-4 text-xs uppercase tracking-[0.2em] font-semibold hover:bg-neutral-800 transition disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
          >
            {submitting && (
              <span
                aria-hidden="true"
                className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
              />
            )}
            <span>{submitting ? 'Placing Order...' : `Place Order · ${formatMoney(total)}`}</span>
          </button>

          <p className="text-xs text-ink-2 text-center leading-relaxed">
            By placing your order, you agree to GSS Collection&apos;s{' '}
            <Link href="/pages/terms-of-service" className="underline">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </form>
    </div>
  );
}
