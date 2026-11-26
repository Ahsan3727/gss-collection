'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime error:', error);
    if (process.env.NODE_ENV !== 'production') return;

    const payload = JSON.stringify({
      message: (error?.message || 'Unhandled runtime error').slice(0, 500),
      route: typeof window !== 'undefined' ? window.location.pathname.slice(0, 120) : undefined,
      area:
        typeof window !== 'undefined' && window.location.pathname.startsWith('/checkout')
          ? 'checkout'
          : typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
          ? 'admin'
          : 'storefront',
      digest: error?.digest,
    });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const sent = navigator.sendBeacon(
        '/api/monitoring',
        new Blob([payload], { type: 'application/json' })
      );
      if (sent) return;
    }

    fetch('/api/monitoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <span className="text-xs uppercase tracking-[0.25em] text-rust font-semibold block mb-2">
          System Notice
        </span>
        <h1 className="font-display text-3xl md:text-4xl text-ink font-normal mb-4">
          Something went wrong
        </h1>
        <p className="text-ink-2 text-sm leading-relaxed mb-8">
          An unexpected error occurred while loading this page. Our team has been notified.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => reset()}
            className="bg-ink text-white text-xs uppercase tracking-[0.18em] px-6 py-3 font-medium hover:bg-neutral-800 transition"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="border border-line text-ink text-xs uppercase tracking-[0.18em] px-6 py-3 font-medium hover:border-ink transition"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
