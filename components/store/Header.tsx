'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart-context';

export default function Header() {
  const { totalCount, openDrawer } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-line transition-all">
      <div className="max-w-site mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
        {/* Mobile menu button */}
        <div className="flex items-center md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-ink hover:text-ink-2"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Desktop Navigation links */}
        <nav className="hidden md:flex items-center gap-7">
          <Link
            href="/collections/all"
            className="text-[12px] tracking-[0.16em] uppercase font-medium text-ink hover:underline underline-offset-8 transition-colors"
          >
            All Jewellery
          </Link>
          <Link
            href="/collections/ladies"
            className="text-[12px] tracking-[0.16em] uppercase font-medium text-ink hover:underline underline-offset-8 transition-colors"
          >
            Ladies Rings
          </Link>
          <Link
            href="/collections/gents"
            className="text-[12px] tracking-[0.16em] uppercase font-medium text-ink hover:underline underline-offset-8 transition-colors"
          >
            Gents Rings
          </Link>
          <Link
            href="/collections/gems"
            className="text-[12px] tracking-[0.16em] uppercase font-medium text-ink hover:underline underline-offset-8 transition-colors"
          >
            Natural Gems
          </Link>
        </nav>

        {/* Brand logo */}
        <Link href="/" className="flex flex-col items-center group py-2">
          <span className="font-display font-semibold text-2xl md:text-3xl tracking-[0.18em] uppercase text-ink">
            GSS Collection
          </span>
          <span className="text-[9px] tracking-[0.25em] text-ink-2 uppercase -mt-0.5">
            Fine Silver & Natural Gemstones
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Wishlist */}
          <Link
            href="/wishlist"
            className="p-2 text-ink hover:text-ink-2 transition-colors"
            aria-label="View wishlist"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </Link>

          {/* Search */}
          <Link
            href="/search"
            className="p-2 text-ink hover:text-ink-2 transition-colors"
            aria-label="Search store"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>

          {/* Cart Button */}
          <button
            onClick={openDrawer}
            className="relative p-2 text-ink hover:text-ink-2 transition-colors"
            aria-label="View shopping bag"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {totalCount > 0 && (
              <span className="absolute top-1 right-1 bg-ink text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {totalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-line bg-white px-6 py-4 space-y-3">
          <Link
            href="/collections/all"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs uppercase tracking-[0.16em] font-medium text-ink py-2"
          >
            All Jewellery
          </Link>
          <Link
            href="/collections/ladies"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs uppercase tracking-[0.16em] font-medium text-ink py-2"
          >
            Ladies Rings
          </Link>
          <Link
            href="/collections/gents"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs uppercase tracking-[0.16em] font-medium text-ink py-2"
          >
            Gents Rings
          </Link>
          <Link
            href="/collections/gems"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs uppercase tracking-[0.16em] font-medium text-ink py-2"
          >
            Natural Gems
          </Link>
          <Link
            href="/track-order"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs uppercase tracking-[0.16em] font-medium text-ink py-2 text-neutral-500"
          >
            Track Order
          </Link>
        </div>
      )}
    </header>
  );
}
