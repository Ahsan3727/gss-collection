'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/money';
import type { OrderRecord } from '@/lib/types';

type TrackedOrder = Pick<
  OrderRecord,
  'orderNo' | 'items' | 'total' | 'subtotal' | 'shipping' | 'shippingLabel' | 'payMethod' | 'payStatus' | 'fulfil' | 'tracking' | 'timeline' | 'createdAt'
>;

export default function TrackOrderPage() {
  const [orderNo, setOrderNo] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOrder(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/orders/track?orderNo=${encodeURIComponent(orderNo.trim())}&contact=${encodeURIComponent(contact.trim())}`
      );
      const data = (await res.json()) as { order?: TrackedOrder; error?: string };

      if (!res.ok || !data.order) {
        setError(data.error || 'Unable to find matching order.');
      } else {
        setOrder(data.order);
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (fulfil: string) => {
    switch (fulfil) {
      case 'delivered':
        return <span className="bg-emerald-100 text-ok text-xs px-2.5 py-1 font-semibold">Delivered</span>;
      case 'shipped':
        return <span className="bg-blue-100 text-blue-900 text-xs px-2.5 py-1 font-semibold">Shipped</span>;
      case 'processing':
        return <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-1 font-semibold">In Production / Processing</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-error text-xs px-2.5 py-1 font-semibold">Cancelled</span>;
      default:
        return <span className="bg-neutral-200 text-ink text-xs px-2.5 py-1 font-semibold">Order Confirmed</span>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-16">
      <div className="text-center mb-8">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-ink-2 block mb-2">
          Real-time Order Status
        </span>
        <h1 className="font-display text-3xl md:text-4xl text-ink font-normal mb-3">
          Track Your Delivery
        </h1>
        <p className="text-ink-2 text-sm max-w-md mx-auto">
          Enter your order reference number and the email or phone number used during checkout.
        </p>
      </div>

      <div className="bg-white border border-line p-5 md:p-8 mb-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="track-order-no" className="block text-xs uppercase tracking-wider font-semibold text-ink mb-2">
              Order Number
            </label>
            <input
              id="track-order-no"
              type="text"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              required
              placeholder="e.g. GSS-1001"
              className="w-full px-3.5 min-h-[48px] border border-line text-base uppercase focus:outline-none focus:border-ink transition"
            />
          </div>

          <div>
            <label htmlFor="track-contact" className="block text-xs uppercase tracking-wider font-semibold text-ink mb-2">
              Email or Phone
            </label>
            <input
              id="track-contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              placeholder="e.g. customer@example.com"
              className="w-full px-3.5 min-h-[48px] border border-line text-base focus:outline-none focus:border-ink transition"
            />
          </div>

          <div className="md:col-span-2 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-white min-h-[48px] text-xs uppercase tracking-[0.2em] font-semibold hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {loading ? 'Locating order...' : 'Check Status'}
            </button>
          </div>
        </form>

        {error && (
          <div role="alert" className="mt-6 p-4 bg-red-50 border border-red-200 text-error text-xs font-medium">
            {error}
          </div>
        )}
      </div>

      {order && (
        <div className="bg-ground border border-line p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-6 mb-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-ink-2 block">Order Reference</span>
              <h2 className="font-display text-2xl font-medium text-ink">{order.orderNo}</h2>
              <span className="text-xs text-ink-2">
                Placed on{' '}
                {new Date(order.createdAt).toLocaleDateString('en-PK', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div>{getStatusBadge(order.fulfil)}</div>
          </div>

          {order.tracking?.number && (
            <div className="mb-6 p-4 bg-white border border-line flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-ink-2 block">Courier Tracking</span>
                <span className="font-semibold text-sm text-ink">
                  {order.tracking.carrier || 'TCS Express'}: {order.tracking.number}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4 border-b border-line pb-6 mb-6">
            <span className="text-xs uppercase tracking-wider font-semibold text-ink block">
              Ordered Items
            </span>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm gap-4">
                <div>
                  <span className="font-medium text-ink block">{item.title}</span>
                  <span className="text-xs text-ink-2 capitalize">
                    {item.stone} · Size {item.size} · Qty {item.qty}
                  </span>
                </div>
                <span className="font-semibold text-ink shrink-0">
                  {formatMoney(item.price * item.qty)}
                </span>
              </div>
            ))}
          </div>

          {order.timeline && order.timeline.length > 0 && (
            <div className="mb-6">
              <span className="text-xs uppercase tracking-wider font-semibold text-ink block mb-3">
                Tracking History
              </span>
              <div className="space-y-3">
                {order.timeline.map((event, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="w-2 h-2 rounded-full bg-ink mt-1.5 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-ink font-medium">{event.text}</p>
                      <span className="text-ink-2">
                        {new Date(event.at).toLocaleString('en-PK', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-line flex justify-between items-center">
            <span className="text-xs uppercase tracking-wider text-ink-2">Total Amount</span>
            <span className="font-bold text-base text-ink">
              {formatMoney(order.total)} ({order.payMethod.toUpperCase()})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
