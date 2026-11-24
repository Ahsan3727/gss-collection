'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/store/ProductCard';

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gss_wishlist');
      const handles: string[] = raw ? JSON.parse(raw) : [];

      if (handles.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Fetch products for wishlist
      fetch(`/api/products?handles=${encodeURIComponent(handles.join(','))}`)
        .then((res) => res.json())
        .then((data) => {
          setItems(data.products || []);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } catch (e) {
      setLoading(false);
    }
  }, []);

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-12 md:py-20">
      <div className="border-b border-line pb-6 mb-10 text-center md:text-left">
        <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ink-2 block mb-2">
          Saved Jewellery
        </span>
        <h1 className="font-display text-3xl md:text-5xl text-ink font-normal">
          My Wishlist
        </h1>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-6 h-6 border-2 border-line border-t-ink rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs uppercase tracking-wider text-ink-3">Loading your saved pieces...</span>
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {items.map((prod) => (
            <ProductCard key={prod.id || prod.handle} product={prod} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center max-w-md mx-auto">
          <p className="font-display text-2xl text-ink mb-2">Your wishlist is empty</p>
          <p className="text-xs text-ink-2 mb-8 leading-relaxed">
            Save rings and gemstones you love as you explore our catalogue to review or purchase later.
          </p>
          <Link
            href="/collections/all"
            className="inline-block bg-ink text-white text-xs uppercase tracking-[0.2em] px-8 py-3.5 font-medium hover:bg-neutral-800 transition"
          >
            Explore Jewellery
          </Link>
        </div>
      )}
    </div>
  );
}
