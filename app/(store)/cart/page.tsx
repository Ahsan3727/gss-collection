'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/money';

export default function CartPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read cart from localStorage or cookie for client-side demo
    const saved = localStorage.getItem('gss_cart');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch {}
    }
    setMounted(true);
  }, []);

  const removeItem = (idx: number) => {
    const next = cart.filter((_, i) => i !== idx);
    setCart(next);
    localStorage.setItem('gss_cart', JSON.stringify(next));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price || 9800) * (item.qty || 1), 0);

  if (!mounted) return null;

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-12">
      <h1 className="font-display text-4xl font-normal text-ink mb-8">
        Your Shopping Bag
      </h1>

      {cart.length === 0 ? (
        <div className="py-16 text-center border border-line bg-ground p-12">
          <p className="text-ink-2 mb-6">Your bag is currently empty.</p>
          <Link
            href="/collections/all"
            className="inline-block bg-ink text-white text-xs uppercase tracking-[0.18em] font-medium px-8 py-3.5 hover:bg-neutral-800 transition-colors"
          >
            Explore Jewellery
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          <div className="lg:col-span-2 divide-y divide-line border-t border-b border-line">
            {cart.map((item, i) => (
              <div key={i} className="py-6 flex gap-6 items-center justify-between">
                <div>
                  <h3 className="font-medium text-base text-ink mb-1">{item.title}</h3>
                  <p className="text-xs text-ink-2">
                    Stone: <span className="capitalize">{item.stone}</span> · Size: {item.size}
                  </p>
                  <p className="text-xs text-ink-2 mt-1">Qty: {item.qty || 1}</p>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-sm block mb-2">
                    {formatMoney((item.price || 9800) * (item.qty || 1))}
                  </span>
                  <button
                    onClick={() => removeItem(i)}
                    className="text-[11px] text-error uppercase tracking-wider hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-ground border border-line p-8">
            <h2 className="font-display text-2xl font-normal mb-6">Order Summary</h2>
            <div className="space-y-3 text-sm pb-6 border-b border-line">
              <div className="flex justify-between">
                <span className="text-ink-2">Subtotal</span>
                <span className="font-medium">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Standard Delivery</span>
                <span className="font-medium">
                  {subtotal >= 15000 ? 'FREE' : formatMoney(300)}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-baseline pt-4 mb-6">
              <span className="font-semibold text-base">Estimated Total</span>
              <span className="font-bold text-xl">
                {formatMoney(subtotal >= 15000 ? subtotal : subtotal + 300)}
              </span>
            </div>

            <Link
              href="/checkout"
              className="block w-full bg-ink text-white text-center py-4 text-xs font-semibold uppercase tracking-[0.18em] hover:bg-neutral-800 transition-colors"
            >
              Proceed to Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
