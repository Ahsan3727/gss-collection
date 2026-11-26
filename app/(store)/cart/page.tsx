'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart, type ValidatedLineInput } from '@/lib/cart-context';
import { formatMoney } from '@/lib/money';

export default function CartPage() {
  const { items, subtotal, removeItem, updateQty, syncValidatedItems } = useCart();
  const [notice, setNotice] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(15000);
  const [shippingFee, setShippingFee] = useState(300);

  useEffect(() => {
    if (items.length === 0) return;

    let cancelled = false;
    fetch('/api/cart/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: {
        items?: ValidatedLineInput[];
        freeShippingThreshold?: number;
        shipping?: number;
        issues?: string[];
      } | null) => {
        if (cancelled || !data) return;
        if (typeof data.freeShippingThreshold === 'number') {
          setFreeShippingThreshold(data.freeShippingThreshold);
        }
        if (typeof data.shipping === 'number') {
          setShippingFee(data.shipping);
        }
        if (Array.isArray(data.items)) {
          const synced = syncValidatedItems(data.items);
          if (synced.changed) {
            setNotice('Cart prices or stock were updated from current store inventory.');
          } else if (data.issues && data.issues.length > 0) {
            setNotice(data.issues[0]);
          }
        }
      })
      .catch(() => {
        // Keep local values if offline; checkout revalidates cleanly
      });

    return () => {
      cancelled = true;
    };
    // Run on page mount/item count change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const isFreeShipping = subtotal >= freeShippingThreshold || shippingFee === 0;
  const deliveryCharge = items.length === 0 ? 0 : isFreeShipping ? 0 : shippingFee;
  const total = subtotal + deliveryCharge;

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10 md:py-16">
      <div className="border-b border-line pb-6 mb-8 text-center md:text-left">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-ink-2 block mb-2">
          Review Your Selection
        </span>
        <h1 className="font-display text-3xl md:text-5xl font-normal text-ink">
          Shopping Bag
        </h1>
      </div>

      {notice && (
        <div role="status" className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          {notice}
        </div>
      )}

      {items.length === 0 ? (
        <div className="py-16 text-center border border-line bg-ground p-8 sm:p-12 max-w-xl mx-auto">
          <p className="font-display text-2xl text-ink mb-2">Your shopping bag is empty</p>
          <p className="text-sm text-ink-2 mb-8 leading-relaxed">
            Discover fine 925 sterling silver rings and natural gemstones crafted by master jewelers.
          </p>
          <Link
            href="/collections/all"
            className="inline-flex items-center justify-center bg-ink text-white text-xs uppercase tracking-[0.2em] font-medium px-8 min-h-[48px] hover:bg-neutral-800 transition-colors"
          >
            Explore Jewellery
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-2 divide-y divide-line border-t border-b border-line">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.stone}-${item.size}`}
                className="py-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
              >
                <div className="flex gap-4 items-center">
                  <div className="relative w-20 h-20 bg-ground border border-line flex-shrink-0 overflow-hidden">
                    {item.photo ? (
                      <Image
                        src={item.photo}
                        alt={item.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-ink-2">
                        GSS
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="font-medium text-base text-ink mb-1">{item.title}</h2>
                    <p className="text-xs text-ink-2 capitalize">
                      Stone: <span className="font-semibold text-ink">{item.stone}</span> · Size:{' '}
                      <span className="font-semibold text-ink">
                        {item.size === 'adj'
                          ? 'Adjustable'
                          : item.size === 'one'
                          ? 'Single Piece'
                          : item.size}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId, item.stone, item.size)}
                      aria-label={`Remove ${item.title} from bag`}
                      className="text-xs text-ink-2 hover:text-error uppercase tracking-wider underline mt-1 min-h-[44px] inline-flex items-center"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3">
                  <div className="flex items-center border border-line text-sm">
                    <button
                      type="button"
                      onClick={() => updateQty(item.productId, item.stone, item.size, item.qty - 1)}
                      aria-label={`Decrease quantity of ${item.title}`}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:bg-ground transition"
                    >
                      −
                    </button>
                    <span className="px-3 font-semibold text-ink text-xs">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.productId, item.stone, item.size, item.qty + 1)}
                      aria-label={`Increase quantity of ${item.title}`}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:bg-ground transition"
                    >
                      +
                    </button>
                  </div>

                  <span className="font-bold text-base text-ink">
                    {formatMoney(item.price * item.qty)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-ground border border-line p-6 sm:p-8">
            <h2 className="font-display text-2xl font-normal mb-6">Order Summary</h2>
            <div className="space-y-3 text-sm pb-6 border-b border-line">
              <div className="flex justify-between">
                <span className="text-ink-2">Subtotal</span>
                <span className="font-semibold text-ink">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Standard Delivery</span>
                <span className={`font-semibold ${isFreeShipping ? 'text-ok' : 'text-ink'}`}>
                  {isFreeShipping ? 'FREE' : formatMoney(deliveryCharge)}
                </span>
              </div>
              {isFreeShipping && (
                <p className="text-xs text-ok">
                  ✓ Free delivery applied for orders above {formatMoney(freeShippingThreshold)}.
                </p>
              )}
            </div>

            <div className="flex justify-between items-baseline pt-4 mb-6">
              <span className="font-semibold text-base text-ink">Estimated Total</span>
              <span className="font-bold text-2xl text-ink">{formatMoney(total)}</span>
            </div>

            <Link
              href="/checkout"
              className="flex w-full bg-ink text-white items-center justify-center min-h-[48px] text-xs font-semibold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors"
            >
              Proceed to Checkout
            </Link>

            <div className="mt-5 text-center">
              <Link
                href="/collections/all"
                className="text-xs uppercase tracking-wider text-ink-2 hover:text-ink underline inline-flex items-center min-h-[44px]"
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
