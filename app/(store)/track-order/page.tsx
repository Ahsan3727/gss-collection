'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/money';
import Link from 'next/link';

export default function TrackOrderPage() {
  const [orderNo, setOrderNo] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOrder(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/orders/track?orderNo=${encodeURIComponent(orderNo.trim())}&contact=${encodeURIComponent(contact.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unable to find matching order.');
      } else {
        setOrder(data.order);
      }
    } catch (err: any) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (fulfil: string) => {
    switch (fulfil) {
      case 'delivered':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 font-medium">Delivered</span>;
      case 'shipped':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 font-medium">Shipped</span>;
      case 'processing':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 font-medium">In Production / Processing</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 text-xs px-2.5 py-1 font-medium">Cancelled</span>;
      default:
        return <span className="bg-neutral-100 text-neutral-800 text-xs px-2.5 py-1 font-medium">Order Confirmed</span>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-20">
      <div className="text-center mb-10">
        <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ink-2 block mb-2">
          Real-time Order Status
        </span>
        <h1 className="font-display text-3xl md:text-4xl text-ink font-normal mb-3">
          Track Your Delivery
        </h1>
        <p className="text-ink-2 text-sm max-w-md mx-auto">
          Enter your order reference number and the email or phone number used during checkout.
        </p>
      </div>

      <div className="bg-white border border-line p-6 md:p-8 mb-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider font-medium text-ink mb-2">
              Order Number
            </label>
            <input
              type="text"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              required
              placeholder="e.g. GSS-1001"
              className="w-full px-3.5 py-2.5 border border-line text-sm uppercase focus:outline-none focus:border-ink transition"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider font-medium text-ink mb-2">
              Email or Phone
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              required
              placeholder="e.g. customer@example.com"
              className="w-full px-3.5 py-2.5 border border-line text-sm focus:outline-none focus:border-ink transition"
            />
          </div>

          <div className="md:col-span-2 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-white py-3 text-xs uppercase tracking-[0.2em] font-medium hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {loading ? 'Locating order...' : 'Check Status'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}
      </div>

      {order && (
        <div className="bg-ground border border-line p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-6 mb-6">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-ink-3 block">Order Reference</span>
              <h2 className="font-display text-2xl font-medium text-ink">{order.orderNo}</h2>
              <span className="text-xs text-ink-2">
                Placed on {new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div>{getStatusBadge(order.fulfil)}</div>
          </div>

          {order.tracking?.number && (
            <div className="mb-6 p-4 bg-white border border-line flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-ink-3 block">Courier Tracking</span>
                <span className="font-semibold text-sm text-ink">{order.tracking.carrier || 'TCS Express'}: {order.tracking.number}</span>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="space-y-4 border-b border-line pb-6 mb-6">
            <span className="text-xs uppercase tracking-wider font-semibold text-ink-2 block">
              Ordered Items
            </span>
            {order.items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium text-ink block">{item.title}</span>
                  <span className="text-xs text-ink-3 capitalize">
                    {item.stone} · Size {item.size} · Qty {item.qty}
                  </span>
                </div>
                <span className="font-semibold text-ink">{formatMoney(item.price * item.qty)}</span>
              </div>
            ))}
          </div>

          {/* Timeline */}
          {order.timeline && order.timeline.length > 0 && (
            <div className="mb-6">
              <span className="text-xs uppercase tracking-wider font-semibold text-ink-2 block mb-3">
                Tracking History
              </span>
              <div className="space-y-3">
                {order.timeline.map((event: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="w-2 h-2 rounded-full bg-ink mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-ink font-medium">{event.text}</p>
                      <span className="text-ink-3">
                        {new Date(event.at).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-line flex justify-between items-center">
            <span className="text-xs uppercase tracking-wider text-ink-2">Total Amount</span>
            <span className="font-bold text-base text-ink">{formatMoney(order.total)} ({order.payMethod.toUpperCase()})</span>
          </div>
        </div>
      )}
    </div>
  );
}
