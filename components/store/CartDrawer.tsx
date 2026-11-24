'use client';

import { useCart } from '@/lib/cart-context';
import { formatMoney } from '@/lib/money';
import Link from 'next/link';
import Image from 'next/image';

export default function CartDrawer() {
  const { items, totalCount, subtotal, isDrawerOpen, closeDrawer, removeItem, updateQty } = useCart();

  if (!isDrawerOpen) return null;

  const freeShippingThreshold = 15000;
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const amountRemaining = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-line flex flex-col shadow-2xl">
          {/* Drawer Header */}
          <div className="p-5 border-b border-line flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-2xl text-ink font-normal">Shopping Bag</h2>
              <span className="text-xs text-ink-3">({totalCount} item{totalCount === 1 ? '' : 's'})</span>
            </div>
            <button
              onClick={closeDrawer}
              className="p-2 text-ink-2 hover:text-ink transition"
              aria-label="Close cart"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Free Shipping Progress */}
          <div className="bg-ground px-5 py-3 border-b border-line text-xs">
            {amountRemaining > 0 ? (
              <p className="text-ink-2 mb-1.5">
                Add <span className="font-semibold text-ink">{formatMoney(amountRemaining)}</span> more to unlock <span className="font-semibold text-ink">Free Nationwide Delivery</span>
              </p>
            ) : (
              <p className="text-emerald-700 font-semibold mb-1.5">
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

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-line">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <p className="font-display text-2xl text-ink mb-2">Your bag is empty</p>
                <p className="text-xs text-ink-3 mb-6">Explore our handcrafted 925 sterling silver rings and natural gemstones.</p>
                <button
                  onClick={closeDrawer}
                  className="bg-ink text-white text-xs uppercase tracking-[0.2em] px-6 py-3 font-medium hover:bg-neutral-800 transition"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={`${item.productId}-${item.stone}-${item.size}`} className="py-4 flex gap-4">
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 bg-ground flex-shrink-0 border border-line overflow-hidden">
                    {item.photo ? (
                      <Image
                        src={item.photo}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] uppercase text-ink-3">
                        GSS
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-ink line-clamp-1">{item.title}</h3>
                        <button
                          onClick={() => removeItem(item.productId, item.stone, item.size)}
                          className="text-neutral-400 hover:text-rust text-xs ml-2"
                        >
                          ✕
                        </button>
                      </div>
                      <span className="text-xs text-ink-2 capitalize block mt-0.5">
                        {item.stone} · Size: {item.size === 'adj' ? 'Adjustable' : item.size === 'one' ? 'Single piece' : item.size}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-3">
                      {/* Qty changer */}
                      <div className="flex items-center border border-line text-xs">
                        <button
                          onClick={() => updateQty(item.productId, item.stone, item.size, item.qty - 1)}
                          className="px-2.5 py-1 text-ink-2 hover:text-ink transition"
                        >
                          −
                        </button>
                        <span className="px-2 py-1 font-semibold text-ink">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.productId, item.stone, item.size, item.qty + 1)}
                          className="px-2.5 py-1 text-ink-2 hover:text-ink transition"
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

          {/* Footer / Checkout CTA */}
          {items.length > 0 && (
            <div className="p-5 border-t border-line bg-ground space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-ink-2 uppercase tracking-wider text-xs">Subtotal</span>
                <span className="font-bold text-base text-ink">{formatMoney(subtotal)}</span>
              </div>
              <p className="text-[11px] text-ink-3">
                Shipping & taxes calculated at checkout. Cash on Delivery & Bank Transfer accepted.
              </p>

              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/checkout"
                  onClick={closeDrawer}
                  className="w-full bg-ink text-white py-3.5 text-center text-xs uppercase tracking-[0.2em] font-medium hover:bg-neutral-800 transition block"
                >
                  Proceed to Checkout →
                </Link>
                <Link
                  href="/cart"
                  onClick={closeDrawer}
                  className="w-full border border-line bg-white text-ink py-2.5 text-center text-xs uppercase tracking-[0.2em] font-medium hover:border-ink transition block"
                >
                  View Full Cart
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
