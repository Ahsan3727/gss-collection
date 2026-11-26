import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Your Delivery',
  description: 'Check real-time fulfillment and courier tracking status for your GSS Collection order.',
  alternates: { canonical: '/track-order' },
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
