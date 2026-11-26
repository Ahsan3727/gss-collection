'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/store/ProductCard';
import type { ProductRecord } from '@/lib/types';

export default function WishlistClient() {
  const [items, setItems] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gss_wishlist');
      const handles: unknown = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(handles) || handles.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      fetch(`/api/products?handles=${encodeURIComponent(handles.map(String).join(','))}`)
        .then((res) => res.json())
        .then((data: { products?: ProductRecord[] }) => {
          setItems(data.products || []);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } catch {
      setLoading(false);
    }
  }, []);

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10 md:py-16">
      <div className="border-b border-line pb-6 mb-8 text-center md:text-left">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-ink-2 block mb-2">
          Saved Jewellery
        </span>
        <h1 className="font-display text-3xl md:text-5xl text-ink font-normal">
          My Wishlist
        </h1>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="w-6 h-6 border-2 border-line border-t-ink rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs uppercase tracking-wider text-ink-2">
            Loading your saved pieces...
          </span>
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-8">
          {items.map((prod) => (
            <ProductCard key={prod.id || prod.handle} product={prod} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center max-w-md mx-auto">
          <p className="font-display text-2xl text-ink mb-2">Your wishlist is empty</p>
          <p className="text-sm text-ink-2 mb-8 leading-relaxed">
            Save rings and gemstones you love as you explore our catalogue to review or purchase later.
          </p>
          <Link
            href="/collections/all"
            className="inline-flex items-center justify-center bg-ink text-white text-xs uppercase tracking-[0.2em] px-8 min-h-[48px] font-medium hover:bg-neutral-800 transition"
          >
            Explore Jewellery
          </Link>
        </div>
      )}
    </div>
  );
}
