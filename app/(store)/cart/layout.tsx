import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shopping Bag',
  description: 'Review your selected 925 sterling silver pieces and proceed to checkout.',
  alternates: { canonical: '/cart' },
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
