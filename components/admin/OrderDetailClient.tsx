'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatMoney } from '@/lib/money';

export default function OrderDetailClient({ initialOrder }: { initialOrder: any }) {
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [carrier, setCarrier] = useState(order.tracking?.carrier || 'TCS Express');
  const [trackingNum, setTrackingNum] = useState(order.tracking?.number || '');
  const [newNote, setNewNote] = useState('');

  const updateOrder = async (updates: Record<string, any>) => {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/orders/${order.orderNo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setOrder(data.order);
      setMsg('Order status updated successfully.');
      setNewNote('');
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-line pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/orders" className="text-xs uppercase tracking-wider text-ink-3 hover:text-ink">
              ← Orders
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="text-xs font-semibold text-ink uppercase tracking-wider">{order.orderNo}</span>
          </div>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">
            Order {order.orderNo}
          </h1>
          <span className="text-xs text-ink-3">
            Placed on {new Date(order.createdAt).toLocaleString('en-PK', { dateStyle: 'long', timeStyle: 'short' })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="border border-line bg-white text-ink px-4 py-2 text-xs uppercase tracking-wider font-semibold hover:border-ink transition"
          >
            Print Packing Slip
          </button>
        </div>
      </div>

      {msg && (
        <div className="mb-6 p-3.5 bg-neutral-100 border border-neutral-300 text-xs font-medium text-ink">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Order Items & Timeline */}
        <div className="lg:col-span-8 space-y-6">
          {/* Items Card */}
          <div className="bg-white border border-line p-6 shadow-sm">
            <h2 className="font-display text-xl font-medium text-ink mb-4 pb-3 border-b border-line">
              Purchased Jewellery ({order.items.length})
            </h2>
            <div className="divide-y divide-line">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="py-4 flex gap-4 items-center">
                  <div className="relative w-16 h-16 bg-ground border border-line flex-shrink-0 overflow-hidden">
                    {item.photo ? (
                      <Image src={item.photo} alt={item.title} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-ink-3">GSS</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm text-ink">{item.title}</h3>
                    <p className="text-xs text-ink-3 capitalize">
                      Stone: <span className="text-ink font-semibold">{item.stone}</span> · Size: <span className="text-ink font-semibold">{item.size}</span> · SKU: <span className="font-mono text-[11px]">{item.sku || 'N/A'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-sm text-ink block">{formatMoney(item.price * item.qty)}</span>
                    <span className="text-xs text-ink-3">Qty: {item.qty} × {formatMoney(item.price)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-line space-y-2 text-xs">
              <div className="flex justify-between text-ink-2">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount ({order.discountCode || 'PROMO'})</span>
                  <span>−{formatMoney(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-2">
                <span>Shipping ({order.shippingLabel})</span>
                <span>{order.shipping === 0 ? 'FREE' : formatMoney(order.shipping)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-3 border-t border-line text-sm font-bold text-ink">
                <span>Total Amount Due</span>
                <span className="text-xl">{formatMoney(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Fulfillment Timeline */}
          <div className="bg-white border border-line p-6 shadow-sm">
            <h2 className="font-display text-xl font-medium text-ink mb-4 pb-3 border-b border-line">
              Fulfillment Log & Timeline
            </h2>
            <div className="space-y-3">
              {order.timeline?.map((event: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className="w-2 h-2 rounded-full bg-ink mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-ink font-medium">{event.text}</p>
                    <span className="text-ink-3">
                      {new Date(event.at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Customer Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* Fulfillment Action Panel */}
          <div className="bg-white border border-line p-6 shadow-sm space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-ink border-b border-line pb-2">
              Update Fulfillment Status
            </h3>
            <div className="flex flex-wrap gap-2">
              {['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
                <button
                  key={st}
                  disabled={loading || order.fulfil === st}
                  onClick={() => updateOrder({ fulfil: st })}
                  className={`text-xs uppercase tracking-wider px-3 py-1.5 border transition ${
                    order.fulfil === st
                      ? 'bg-ink text-white font-bold'
                      : 'bg-ground text-ink-2 hover:border-ink'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-line space-y-3">
              <label className="block text-xs uppercase tracking-wider font-semibold text-ink">
                Assign Courier Tracking
              </label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="Courier (e.g. TCS, Leopard, Trax)"
                className="w-full px-3 py-2 border border-line text-xs focus:outline-none focus:border-ink"
              />
              <input
                type="text"
                value={trackingNum}
                onChange={(e) => setTrackingNum(e.target.value)}
                placeholder="Tracking / Waybill #"
                className="w-full px-3 py-2 border border-line text-xs focus:outline-none focus:border-ink"
              />
              <button
                disabled={loading || !trackingNum.trim()}
                onClick={() => updateOrder({ trackingCarrier: carrier, trackingNumber: trackingNum.trim() })}
                className="w-full bg-ink text-white py-2 text-xs uppercase tracking-wider font-medium hover:bg-neutral-800 disabled:opacity-40"
              >
                Save Tracking #
              </button>
            </div>
          </div>

          {/* Payment Status Panel */}
          <div className="bg-white border border-line p-6 shadow-sm space-y-3 text-xs">
            <h3 className="uppercase tracking-wider font-semibold text-ink border-b border-line pb-2 text-xs">
              Payment Status ({order.payMethod.toUpperCase()})
            </h3>
            <div className="flex justify-between items-center">
              <span>Status: <strong className="capitalize">{order.payStatus}</strong></span>
              <button
                disabled={loading}
                onClick={() => updateOrder({ payStatus: order.payStatus === 'paid' ? 'pending' : 'paid' })}
                className="text-xs uppercase tracking-wider underline text-ink hover:text-neutral-600 font-semibold"
              >
                Mark as {order.payStatus === 'paid' ? 'Pending' : 'Paid'}
              </button>
            </div>
          </div>

          {/* Customer & Address Details */}
          <div className="bg-white border border-line p-6 shadow-sm text-xs space-y-4">
            <h3 className="uppercase tracking-wider font-semibold text-ink border-b border-line pb-2">
              Customer Details
            </h3>
            <div>
              <span className="font-semibold text-ink block">{order.address.name}</span>
              <p className="text-ink-2">{order.address.line1}</p>
              {order.address.line2 && <p className="text-ink-2">{order.address.line2}</p>}
              <p className="text-ink-2">{order.address.city}, {order.address.state} {order.address.zip}</p>
              <p className="text-ink-2 font-medium">{order.address.country}</p>
            </div>
            <div className="pt-2 border-t border-line space-y-1">
              <div>Phone: <strong className="text-ink">{order.contact.phone}</strong></div>
              <div>Email: <strong className="text-ink">{order.contact.email}</strong></div>
              <a
                href={`https://wa.me/${order.contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${order.address.name}, this is GSS Collection regarding your order ${order.orderNo}.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-emerald-800 font-semibold underline"
              >
                Message Customer on WhatsApp →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
