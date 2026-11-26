import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

const WishlistClient = dynamic(() => import('@/components/store/WishlistClient'), {
  ssr: false,
  loading: () => (
    <div className="max-w-site mx-auto px-4 md:px-6 py-16 text-center text-xs uppercase tracking-wider text-ink-2">
      Loading your saved pieces...
    </div>
  ),
});

export const metadata: Metadata = {
  title: 'My Wishlist',
  description: 'Review your saved handcrafted 925 sterling silver rings and natural gemstones.',
  alternates: { canonical: '/wishlist' },
  robots: { index: false, follow: true },
};

export default function WishlistPage() {
  return <WishlistClient />;
}
