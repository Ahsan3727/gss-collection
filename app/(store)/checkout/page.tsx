import type { Metadata } from 'next';
import CheckoutClient from '@/components/store/CheckoutClient';
import { loadSettings } from '@/lib/settings';
import { DEFAULT_SETTINGS } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  let settings = DEFAULT_SETTINGS;
  try {
    settings = await loadSettings();
  } catch (err) {
    console.warn('[CheckoutPage] Using fallback settings due to DB error:', err);
  }

  return <CheckoutClient settings={settings} />;
}
