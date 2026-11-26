import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Store',
  description: 'Search handcrafted 925 sterling silver rings, bracelets, and untreated natural gemstones.',
  alternates: { canonical: '/search' },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
