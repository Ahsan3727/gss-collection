'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cart-context';
import { formatMoney } from '@/lib/money';
import type { ValidatedLineInput } from '@/lib/cart-context';

export default function CartDrawer() {
  const {
    items,
    totalCount,
    subtotal,
    isDrawerOpen,
    closeDrawer,
    removeItem,
    updateQty,
    syncValidatedItems,
  } = useCart();

  const [notice, setNotice] = useState<string>('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(15000);

  useEffect(() => {
    if (!isDrawerOpen || items.length === 0) return;

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
        issues?: string[];
      } | null) => {
        if (cancelled || !data) return;
        if (typeof data.freeShippingThreshold === 'number') {
          setFreeShippingThreshold(data.freeShippingThreshold);
        }
        if (Array.isArray(data.items)) {
          const result = syncValidatedItems(data.items);
          if (result.changed) {
            setNotice('Prices or stock updated to match current store values.');
          } else if (data.issues && data.issues.length > 0) {
            setNotice(data.issues[0]);
          } else {
            setNotice('');
          }
        }
      })
      .catch(() => {
        // Silent background check; checkout still re-validates on server.
      });

    return () => {
      cancelled = true;
    };
    // Revalidate when drawer opens rather than on every local qty step to avoid loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawerOpen]);

  const progressPercent = Math.min(
    100,
    Math.round((subtotal / Math.max(1, freeShippingThreshold)) * 100)
  );
  const amountRemaining = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <Dialog.Root open={isDrawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-md h-[100dvh] bg-white border-l border-line flex flex-col shadow-2xl focus:outline-none"
        >
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <Dialog.Title className="font-display text-2xl text-ink font-normal">
                Shopping Bag
              </Dialog.Title>
              <span className="text-xs text-ink-2">
                ({totalCount} item{totalCount === 1 ? '' : 's'})
              </span>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-2 hover:text-ink transition"
                aria-label="Close shopping bag"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          {/* Free Shipping Progress */}
          <div className="bg-ground px-5 py-3 border-b border-line text-xs">
            {amountRemaining > 0 ? (
              <p className="text-ink-2 mb-1.5">
                Add <span className="font-semibold text-ink">{formatMoney(amountRemaining)}</span> more to unlock{' '}
                <span className="font-semibold text-ink">Free Nationwide Delivery</span>
              </p>
            ) : (
              <p className="text-ok font-semibold mb-1.5">
                ✓ You qualify for Free Nationwide Delivery across Pakistan!
              </p>
            )}
            <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-ink h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {notice && (
            <div role="status" className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-xs text-amber-900">
              {notice}
            </div>
          )}

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 divide-y divide-line">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <p className="font-display text-2xl text-ink mb-2">Your bag is empty</p>
                <p className="text-xs text-ink-2 mb-6">
                  Explore our handcrafted 925 sterling silver rings and natural gemstones.
                </p>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="bg-ink text-white text-xs uppercase tracking-[0.2em] px-6 min-h-[44px] font-medium hover:bg-neutral-800 transition"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={`${item.productId}-${item.stone}-${item.size}`} className="py-4 flex gap-4">
                  <div className="relative w-20 h-20 bg-ground flex-shrink-0 border border-line overflow-hidden">
                    {item.photo ? (
                      <Image
                        src={item.photo}
                        alt={item.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs uppercase text-ink-2">
                        GSS
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-sm font-medium text-ink line-clamp-1">{item.title}</h3>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId, item.stone, item.size)}
                          aria-label={`Remove ${item.title} (${item.stone}) from bag`}
                          className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center text-ink-2 hover:text-error text-sm"
                        >
                          ✕
                        </button>
                      </div>
                      <span className="text-xs text-ink-2 capitalize block mt-0.5">
                        {item.stone} · Size:{' '}
                        {item.size === 'adj'
                          ? 'Adjustable'
                          : item.size === 'one'
                          ? 'Single piece'
                          : item.size}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center border border-line text-sm">
                        <button
                          type="button"
                          onClick={() => updateQty(item.productId, item.stone, item.size, item.qty - 1)}
                          aria-label={`Decrease quantity of ${item.title}`}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:bg-ground transition"
                        >
                          −
                        </button>
                        <span className="px-3 font-semibold text-ink text-xs" aria-live="polite">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.productId, item.stone, item.size, item.qty + 1)}
                          aria-label={`Increase quantity of ${item.title}`}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:bg-ground transition"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-semibold text-sm text-ink">
                        {formatMoney(item.price * item.qty)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sticky Footer / Checkout CTA */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-line bg-ground space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-ink-2 uppercase tracking-wider text-xs">Subtotal</span>
                <span className="font-bold text-base text-ink">{formatMoney(subtotal)}</span>
              </div>
              <p className="text-xs text-ink-2">
                Shipping calculated at checkout. Cash on Delivery &amp; Bank Transfer accepted.
              </p>

              <div className="flex flex-col gap-2 pt-1">
                <Link
                  href="/checkout"
                  onClick={closeDrawer}
                  className="w-full bg-ink text-white min-h-[48px] flex items-center justify-center text-xs uppercase tracking-[0.2em] font-medium hover:bg-neutral-800 transition"
                >
                  Proceed to Checkout →
                </Link>
                <Link
                  href="/cart"
                  onClick={closeDrawer}
                  className="w-full border border-line bg-white text-ink min-h-[44px] flex items-center justify-center text-xs uppercase tracking-[0.2em] font-medium hover:border-ink transition"
                >
                  View Full Cart
                </Link>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
