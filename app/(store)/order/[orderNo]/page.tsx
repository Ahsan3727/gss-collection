import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { connectDB } from '@/lib/db';
import { Order } from '@/lib/models/Order';
import { getStoreSettings } from '@/lib/settings';
import { formatMoney } from '@/lib/money';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface OrderConfirmationProps {
  params: { orderNo: string };
  searchParams: { t?: string };
}

export async function generateMetadata({ params }: OrderConfirmationProps): Promise<Metadata> {
  return {
    title: `Order ${params.orderNo} Confirmed | GSS Collection`,
    robots: { index: false, follow: false },
  };
}

export default async function OrderConfirmationPage({ params, searchParams }: OrderConfirmationProps) {
  const { orderNo } = params;
  const token = searchParams.t;

  await connectDB();
  const order = await Order.findOne({ orderNo: orderNo.toUpperCase() }).lean();

  if (!order) {
    notFound();
  }

  // Verify access token for privacy protection
  if (order.accessToken && order.accessToken !== token) {
    notFound();
  }

  const settings = await getStoreSettings();

  const isBank = order.payMethod === 'bank';
  const whatsappText = encodeURIComponent(
    `Hello GSS Collection! I have placed order ${order.orderNo} for Rs. ${order.total.toLocaleString()}. Please confirm.`
  );

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-20">
      <div className="text-center mb-10">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-emerald-800 block mb-1">
          Thank you for your order
        </span>
        <h1 className="font-display text-3xl md:text-5xl font-normal text-ink mb-2">
          {order.orderNo}
        </h1>
        <p className="text-sm text-ink-2 max-w-md mx-auto">
          We have received your order request and sent a confirmation summary to{' '}
          <span className="font-semibold text-ink">{order.contact.email}</span>.
        </p>
      </div>

      {/* Payment Instructions Card */}
      {isBank ? (
        <div className="bg-amber-50/70 border border-amber-200 p-6 md:p-8 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-xl">🏛️</span>
            <div>
              <h2 className="font-semibold text-base text-ink mb-1">
                Bank Transfer Instructions
              </h2>
              <p className="text-xs text-ink-2 leading-relaxed mb-4">
                Please transfer the total amount of{' '}
                <span className="font-bold text-ink">{formatMoney(order.total)}</span> to our official account. Your piece will be reserved and cast for dispatch upon verification.
              </p>

              <div className="bg-white border border-amber-200/80 p-4 rounded-sm text-xs space-y-1.5 font-mono text-ink">
                <div>Bank: <span className="font-semibold">{settings.bank.bankName}</span></div>
                <div>Account Title: <span className="font-semibold">{settings.bank.accountTitle}</span></div>
                {settings.bank.accountNumber ? (
                  <div>Account / IBAN: <span className="font-bold text-sm tracking-wider">{settings.bank.accountNumber}</span></div>
                ) : (
                  <div className="font-sans text-ink-2">
                    Account number: we will send it to you on WhatsApp shortly. Please wait for it before transferring.
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-ink-2">After transferring, share your payment screenshot on WhatsApp:</span>
                <a
                  href={`https://wa.me/923001234567?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-700 text-white px-4 py-2 uppercase tracking-wider font-semibold text-[11px] hover:bg-emerald-800 transition"
                >
                  Send Screenshot via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-ground border border-line p-6 mb-8 text-xs leading-relaxed text-ink-2">
          <span className="font-semibold text-ink block mb-1">Cash on Delivery (COD)</span>
          Please have exact cash of <span className="font-bold text-ink">{formatMoney(order.total)}</span> ready at the time of courier delivery. Our studio will reach out via WhatsApp/SMS to confirm your delivery address prior to dispatch.
        </div>
      )}

      {/* Order Summary Details */}
      <div className="bg-white border border-line p-6 md:p-8 shadow-sm mb-8">
        <h2 className="font-display text-2xl text-ink font-normal mb-6 pb-4 border-b border-line">
          Order Summary
        </h2>

        {/* Item Rows */}
        <div className="divide-y divide-line mb-6">
          {order.items.map((item: any, idx: number) => (
            <div key={idx} className="py-4 flex gap-4 items-center">
              <div className="relative w-16 h-16 bg-ground border border-line flex-shrink-0 overflow-hidden">
                {item.photo ? (
                  <Image src={item.photo} alt={item.title} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-ink-3">
                    GSS
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm text-ink">{item.title}</h3>
                <span className="text-xs text-ink-2 capitalize">
                  {item.stone} · Size {item.size} · Qty {item.qty}
                </span>
              </div>
              <span className="font-semibold text-sm text-ink">
                {formatMoney(item.price * item.qty)}
              </span>
            </div>
          ))}
        </div>

        {/* Pricing breakdown */}
        <div className="space-y-2.5 text-xs border-t border-line pt-4 mb-6">
          <div className="flex justify-between text-ink-2">
            <span>Subtotal</span>
            <span className="font-semibold text-ink">{formatMoney(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Promotional Discount ({order.discountCode})</span>
              <span>−{formatMoney(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-ink-2">
            <span>Shipping ({order.shippingLabel})</span>
            <span className="font-semibold text-ink">
              {order.shipping === 0 ? 'FREE' : formatMoney(order.shipping)}
            </span>
          </div>
          <div className="flex justify-between items-baseline pt-3 border-t border-line text-sm">
            <span className="font-bold text-ink">Total Amount</span>
            <span className="font-bold text-xl text-ink">{formatMoney(order.total)}</span>
          </div>
        </div>

        {/* Shipping address & customer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-line text-xs">
          <div>
            <span className="font-semibold uppercase tracking-wider text-ink-3 block mb-1">
              Shipping Address
            </span>
            <p className="font-medium text-ink">{order.address.name}</p>
            <p className="text-ink-2">{order.address.line1}</p>
            {order.address.line2 && <p className="text-ink-2">{order.address.line2}</p>}
            <p className="text-ink-2">{order.address.city}, {order.address.country}</p>
          </div>
          <div>
            <span className="font-semibold uppercase tracking-wider text-ink-3 block mb-1">
              Customer Contact
            </span>
            <p className="text-ink">{order.contact.email}</p>
            <p className="text-ink-2">{order.contact.phone}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Link
          href={`/track-order?orderNo=${order.orderNo}&contact=${encodeURIComponent(order.contact.email)}`}
          className="bg-ink text-white text-xs uppercase tracking-[0.2em] px-8 py-3.5 font-medium hover:bg-neutral-800 transition text-center"
        >
          Track This Order
        </Link>
        <Link
          href="/collections/all"
          className="border border-line text-ink text-xs uppercase tracking-[0.2em] px-8 py-3.5 font-medium hover:border-ink transition text-center"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
