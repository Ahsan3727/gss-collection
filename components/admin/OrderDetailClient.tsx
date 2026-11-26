'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatMoney } from '@/lib/money';
import { whatsappLink } from '@/lib/contact';
import { useSave } from '@/lib/use-save';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { FULFIL_STATUSES, type FulfilStatus, type OrderRecord } from '@/lib/types';

export default function OrderDetailClient({ initialOrder }: { initialOrder: OrderRecord }) {
  const [order, setOrder] = useState<OrderRecord>(initialOrder);
  const [carrier, setCarrier] = useState(order.tracking?.carrier || 'TCS Express');
  const [trackingNum, setTrackingNum] = useState(order.tracking?.number || '');
  const [newNote, setNewNote] = useState('');
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const { status, error, run, retry } = useSave();

  const updateOrder = (updates: Record<string, unknown>) =>
    run(async () => {
      const res = await fetch(`/api/admin/orders/${order.orderNo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = (await res.json()) as { error?: string; order?: OrderRecord };
      if (!res.ok || !data.order) {
        throw new Error(data.error || 'Update failed');
      }
      setOrder(data.order);
      if (updates.adminNote) setNewNote('');
    });

  const handleStatusClick = (nextStatus: FulfilStatus) => {
    if (nextStatus === 'cancelled') {
      setConfirmCancelOpen(true);
      return;
    }
    void updateOrder({ fulfil: nextStatus });
  };

  const customerWaHref = whatsappLink(
    order.contact.phone,
    `Hello ${order.address.name}, your GSS Collection order ${order.orderNo} (${formatMoney(order.total)}) is confirmed.`
  );

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-8 md:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-line pb-6 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="text-xs uppercase tracking-wider text-ink-2 hover:text-ink min-h-[44px] inline-flex items-center"
            >
              ← Orders
            </Link>
            <span className="text-neutral-400">/</span>
            <span className="text-xs font-semibold text-ink uppercase tracking-wider">
              {order.orderNo}
            </span>
          </div>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">
            Order {order.orderNo}
          </h1>
          <span className="text-xs text-ink-2">
            Placed on{' '}
            {new Date(order.createdAt).toLocaleString('en-PK', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </span>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="border border-line bg-white text-ink px-4 min-h-[44px] text-xs uppercase tracking-wider font-semibold hover:border-ink transition self-start sm:self-auto"
        >
          Print Packing Slip
        </button>
      </div>

      {status === 'saved' && (
        <div role="status" className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-ok text-xs font-semibold">
          ✓ Saved order changes.
        </div>
      )}
      {status === 'error' && (
        <div role="alert" className="mb-6 p-3.5 bg-red-50 border border-red-200 text-error text-xs font-semibold flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void retry()}
            className="underline font-bold uppercase tracking-wider min-h-[44px] px-2"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-line p-5 sm:p-6 shadow-sm">
            <h2 className="font-display text-xl font-medium text-ink mb-4 pb-3 border-b border-line">
              Purchased Jewellery ({order.items.length})
            </h2>
            <div className="divide-y divide-line">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-4 flex gap-4 items-center">
                  <div className="relative w-16 h-16 bg-ground border border-line flex-shrink-0 overflow-hidden">
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
                    <h3 className="font-medium text-sm text-ink">{item.title}</h3>
                    <p className="text-xs text-ink-2 capitalize">
                      Stone: <span className="text-ink font-semibold">{item.stone}</span> · Size:{' '}
                      <span className="text-ink font-semibold">{item.size}</span> · SKU:{' '}
                      <span className="font-mono">{item.sku || 'N/A'}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-semibold text-sm text-ink block">
                      {formatMoney(item.price * item.qty)}
                    </span>
                    <span className="text-xs text-ink-2">
                      Qty: {item.qty} × {formatMoney(item.price)}
                    </span>
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
                <div className="flex justify-between text-ok">
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

          <div className="bg-white border border-line p-5 sm:p-6 shadow-sm">
            <h2 className="font-display text-xl font-medium text-ink mb-4 pb-3 border-b border-line">
              Fulfillment Log &amp; Timeline
            </h2>
            <div className="space-y-3">
              {order.timeline?.map((event, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className="w-2 h-2 rounded-full bg-ink mt-1.5 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-ink font-medium">{event.text}</p>
                    <span className="text-ink-2">
                      {new Date(event.at).toLocaleString('en-PK', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-line p-5 sm:p-6 shadow-sm space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-ink border-b border-line pb-2">
              Update Fulfillment Status
            </h3>
            <div className="flex flex-wrap gap-2">
              {FULFIL_STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  disabled={status === 'saving' || order.fulfil === st}
                  onClick={() => handleStatusClick(st)}
                  className={`text-xs uppercase tracking-wider px-3.5 min-h-[44px] border transition ${
                    order.fulfil === st
                      ? 'bg-ink text-white font-bold border-ink'
                      : 'bg-ground text-ink-2 hover:border-ink'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-line space-y-3">
              <label htmlFor="admin-tracking-carrier" className="block text-xs uppercase tracking-wider font-semibold text-ink">
                Assign Courier Tracking
              </label>
              <input
                id="admin-tracking-carrier"
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="Courier (e.g. TCS, Leopard, Trax)"
                className="w-full px-3 min-h-[44px] border border-line text-base focus:outline-none focus:border-ink"
              />
              <label htmlFor="admin-tracking-num" className="sr-only">
                Tracking or waybill number
              </label>
              <input
                id="admin-tracking-num"
                type="text"
                value={trackingNum}
                onChange={(e) => setTrackingNum(e.target.value)}
                placeholder="Tracking / Waybill #"
                className="w-full px-3 min-h-[44px] border border-line text-base focus:outline-none focus:border-ink"
              />
              <button
                type="button"
                disabled={status === 'saving' || !trackingNum.trim()}
                onClick={() =>
                  void updateOrder({ trackingCarrier: carrier, trackingNumber: trackingNum.trim() })
                }
                className="w-full bg-ink text-white min-h-[44px] text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800 disabled:opacity-40"
              >
                {status === 'saving' ? 'Saving...' : 'Save Tracking #'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-line p-5 sm:p-6 shadow-sm space-y-3 text-xs">
            <h3 className="uppercase tracking-wider font-semibold text-ink border-b border-line pb-2">
              Payment Status ({order.payMethod.toUpperCase()})
            </h3>
            <div className="flex justify-between items-center gap-3">
              <span>
                Status: <strong className="capitalize">{order.payStatus}</strong>
              </span>
              <button
                type="button"
                disabled={status === 'saving'}
                onClick={() =>
                  void updateOrder({ payStatus: order.payStatus === 'paid' ? 'pending' : 'paid' })
                }
                className="text-xs uppercase tracking-wider underline text-ink hover:text-ink-2 font-semibold min-h-[44px] px-2"
              >
                Mark as {order.payStatus === 'paid' ? 'Pending' : 'Paid'}
              </button>
            </div>
          </div>

          {/* Internal Admin Notes */}
          <div className="bg-white border border-line p-5 sm:p-6 shadow-sm space-y-3 text-xs">
            <h3 className="uppercase tracking-wider font-semibold text-ink border-b border-line pb-2">
              Internal Notes
            </h3>
            {order.adminNotes && order.adminNotes.length > 0 && (
              <ul className="space-y-2 pb-2">
                {order.adminNotes.map((n, i) => (
                  <li key={i} className="bg-ground p-2.5 border border-line">
                    <p className="text-ink">{n.text}</p>
                    <span className="text-ink-2">
                      {new Date(n.at).toLocaleDateString('en-PK')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <label htmlFor="admin-internal-note" className="sr-only">
              Add internal note
            </label>
            <textarea
              id="admin-internal-note"
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add note (e.g. Verified COD call)..."
              className="w-full p-2.5 border border-line text-base focus:outline-none focus:border-ink"
            />
            <button
              type="button"
              disabled={status === 'saving' || !newNote.trim()}
              onClick={() => void updateOrder({ adminNote: newNote.trim() })}
              className="w-full border border-ink text-ink min-h-[44px] text-xs uppercase tracking-wider font-semibold hover:bg-ground disabled:opacity-40"
            >
              Add Note
            </button>
          </div>

          <div className="bg-white border border-line p-5 sm:p-6 shadow-sm text-xs space-y-4">
            <h3 className="uppercase tracking-wider font-semibold text-ink border-b border-line pb-2">
              Customer Details
            </h3>
            <div>
              <span className="font-semibold text-ink block">{order.address.name}</span>
              <p className="text-ink-2">{order.address.line1}</p>
              {order.address.line2 && <p className="text-ink-2">{order.address.line2}</p>}
              <p className="text-ink-2">
                {order.address.city}, {order.address.state} {order.address.zip}
              </p>
              <p className="text-ink-2 font-medium">{order.address.country}</p>
            </div>
            <div className="pt-2 border-t border-line space-y-1.5">
              <div>
                Phone: <strong className="text-ink">{order.contact.phone}</strong>
              </div>
              <div>
                Email: <strong className="text-ink">{order.contact.email}</strong>
              </div>
              {customerWaHref && (
                <a
                  href={customerWaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center min-h-[44px] text-ok font-semibold underline"
                >
                  Message Customer on WhatsApp →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        title={`Cancel ${order.orderNo}?`}
        description="Cancelling this order will mark it as cancelled and automatically return purchased items back into stock inventory."
        confirmLabel="Cancel Order & Restock"
        onConfirm={() => void updateOrder({ fulfil: 'cancelled' })}
      />
    </div>
  );
}
