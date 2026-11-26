'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart-context';

export interface NavCategoryItem {
  slug: string;
  name: string;
  href?: string;
  targetType?: 'collection' | 'page';
}

const DEFAULT_NAV_CATEGORIES: NavCategoryItem[] = [
  { slug: 'ladies', name: 'Ladies Rings', href: '/collections/ladies', targetType: 'collection' },
  { slug: 'gents', name: 'Gents Rings', href: '/collections/gents', targetType: 'collection' },
  { slug: 'gems', name: 'Natural Gems', href: '/collections/gems', targetType: 'collection' },
];

export default function Header({ categories = DEFAULT_NAV_CATEGORIES }: { categories?: NavCategoryItem[] }) {
  const { totalCount, openDrawer } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mobileNavLinks = [
    { href: '/collections/all', label: 'All Jewellery' },
    ...categories.map((cat) => ({ href: cat.href || `/collections/${cat.slug}`, label: cat.name })),
    { href: '/wishlist', label: 'Wishlist' },
    { href: '/track-order', label: 'Track Order' },
  ];

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-line transition-all">
      <div className="max-w-site mx-auto px-2 sm:px-4 md:px-6 h-14 md:h-20 flex items-center justify-between gap-2">
        {/* Mobile menu button */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:text-ink-2"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-store-nav"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Desktop Navigation links */}
        <nav aria-label="Primary categories" className="hidden md:flex items-center gap-7 flex-wrap">
          <Link
            href="/collections/all"
            className="text-xs tracking-[0.14em] uppercase font-medium text-ink hover:underline underline-offset-8 py-2 whitespace-nowrap"
          >
            All Jewellery
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={cat.href || `/collections/${cat.slug}`}
              className="text-xs tracking-[0.14em] uppercase font-medium text-ink hover:underline underline-offset-8 py-2 whitespace-nowrap"
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        {/* Brand logo */}
        <Link href="/" className="flex flex-col items-center py-1 min-w-0">
          <span className="font-display font-semibold text-base sm:text-2xl md:text-3xl tracking-[0.06em] sm:tracking-[0.16em] uppercase text-ink whitespace-nowrap">
            GSS Collection
          </span>
          <span className="hidden md:block text-xs tracking-[0.18em] text-ink-2 uppercase -mt-0.5">
            Fine Silver &amp; Natural Gemstones
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          <Link
            href="/wishlist"
            className="hidden sm:flex min-w-[44px] min-h-[44px] items-center justify-center text-ink hover:text-ink-2 transition-colors"
            aria-label="View wishlist"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </Link>

          <Link
            href="/search"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:text-ink-2 transition-colors"
            aria-label="Search store"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </Link>

          <button
            type="button"
            onClick={openDrawer}
            className="relative min-w-[44px] min-h-[44px] flex items-center justify-center text-ink hover:text-ink-2 transition-colors"
            aria-label={`View shopping bag (${totalCount} items)`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.6"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            {totalCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 bg-ink text-white text-xs min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-bold leading-none"
              >
                {totalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <nav
          id="mobile-store-nav"
          aria-label="Mobile menu"
          className="md:hidden border-t border-neutral-800 bg-ink text-white px-4 py-2 divide-y divide-neutral-800"
        >
          {mobileNavLinks.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="min-h-[44px] flex items-center text-xs uppercase tracking-[0.16em] font-medium text-white hover:text-neutral-300 transition-colors focus-visible:outline-white focus-visible:outline-offset-[-2px]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
