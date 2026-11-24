'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cart-context';
import { formatMoney } from '@/lib/money';

export default function CartPage() {
  const { items, subtotal, removeItem, updateQty } = useCart();

  const freeShippingThreshold = 15000;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const deliveryCharge = isFreeShipping ? 0 : 300;
  const total = subtotal + deliveryCharge;

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-12 md:py-16">
      <div className="border-b border-line pb-6 mb-8 text-center md:text-left">
        <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ink-2 block mb-2">
          Review Your Selection
        </span>
        <h1 className="font-display text-3xl md:text-5xl font-normal text-ink">
          Shopping Bag
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="py-20 text-center border border-line bg-ground p-12 max-w-xl mx-auto">
          <p className="font-display text-2xl text-ink mb-2">Your shopping bag is empty</p>
          <p className="text-xs text-ink-3 mb-8 leading-relaxed">
            Discover fine 925 sterling silver rings and natural gemstones crafted by master jewelers.
          </p>
          <Link
            href="/collections/all"
            className="inline-block bg-ink text-white text-xs uppercase tracking-[0.2em] font-medium px-8 py-3.5 hover:bg-neutral-800 transition-colors"
          >
            Explore Jewellery
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Item list */}
          <div className="lg:col-span-2 divide-y divide-line border-t border-b border-line">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.stone}-${item.size}`}
                className="py-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between"
              >
                <div className="flex gap-4 items-center">
                  <div className="relative w-20 h-20 bg-ground border border-line flex-shrink-0 overflow-hidden">
                    {item.photo ? (
                      <Image src={item.photo} alt={item.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-ink-3">
                        GSS
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-base text-ink mb-1">{item.title}</h3>
                    <p className="text-xs text-ink-2 capitalize">
                      Stone: <span className="font-semibold text-ink">{item.stone}</span> · Size:{' '}
                      <span className="font-semibold text-ink">
                        {item.size === 'adj' ? 'Adjustable' : item.size === 'one' ? 'Single Piece' : item.size}
                      </span>
                    </p>
                    <button
                      onClick={() => removeItem(item.productId, item.stone, item.size)}
                      className="text-[11px] text-neutral-400 hover:text-red-700 uppercase tracking-wider underline mt-2 block"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3">
                  <div className="flex items-center border border-line text-xs">
                    <button
                      onClick={() => updateQty(item.productId, item.stone, item.size, item.qty - 1)}
                      className="px-2.5 py-1 text-ink-2 hover:text-ink transition"
                    >
                      −
                    </button>
                    <span className="px-3 py-1 font-semibold text-ink">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.stone, item.size, item.qty + 1)}
                      className="px-2.5 py-1 text-ink-2 hover:text-ink transition"
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

          {/* Order Summary */}
          <div className="bg-ground border border-line p-8">
            <h2 className="font-display text-2xl font-normal mb-6">Order Summary</h2>
            <div className="space-y-3 text-sm pb-6 border-b border-line">
              <div className="flex justify-between">
                <span className="text-ink-2">Subtotal</span>
                <span className="font-semibold text-ink">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Standard Delivery</span>
                <span className={`font-semibold ${isFreeShipping ? 'text-emerald-700' : 'text-ink'}`}>
                  {isFreeShipping ? 'FREE' : formatMoney(300)}
                </span>
              </div>
              {isFreeShipping && (
                <p className="text-[11px] text-emerald-700">
                  ✓ Free delivery applied for orders above Rs. 15,000.
                </p>
              )}
            </div>

            <div className="flex justify-between items-baseline pt-4 mb-6">
              <span className="font-semibold text-base text-ink">Estimated Total</span>
              <span className="font-bold text-2xl text-ink">{formatMoney(total)}</span>
            </div>

            <Link
              href="/checkout"
              className="block w-full bg-ink text-white text-center py-4 text-xs font-semibold uppercase tracking-[0.2em] hover:bg-neutral-800 transition-colors"
            >
              Proceed to Checkout
            </Link>

            <div className="mt-6 text-center">
              <Link
                href="/collections/all"
                className="text-xs uppercase tracking-wider text-ink-2 hover:text-ink underline"
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
