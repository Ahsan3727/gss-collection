import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import Footer from '@/components/store/Footer';
import { StoreFooterShell, StoreHeaderShell } from '@/components/store/StoreShell';
import { CartProvider } from '@/lib/cart-context';
import WebVitals from '@/components/store/WebVitals';
import { getActiveCategories } from '@/lib/categories';
import { getStoreSettings } from '@/lib/settings';
import { getSiteUrl } from '@/lib/env';
import { formatDisplayPhone } from '@/lib/contact';
import { getCategoryHref } from '@/lib/types';

const CartDrawer = dynamic(() => import('@/components/store/CartDrawer'), {
  ssr: false,
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
});

const siteUrl = getSiteUrl();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0B0B0B',
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'GSS Collection | Silver Rings & Natural Gemstones',
    template: '%s | GSS Collection',
  },
  description:
    'Handcrafted 925 sterling silver ladies rings, gents rings, and untreated natural gemstones.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'GSS Collection',
    title: 'GSS Collection | Silver Rings & Natural Gemstones',
    description:
      'Handcrafted 925 sterling silver ladies rings, gents rings, and untreated natural gemstones.',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, activeCategories] = await Promise.all([
    getStoreSettings(),
    getActiveCategories(),
  ]);
  const navCategories = activeCategories
    .filter((cat) => cat.showInNav)
    .map((cat) => ({
      slug: cat.slug,
      name: cat.name,
      href: getCategoryHref(cat),
      targetType: cat.targetType,
    }));
  const phone = formatDisplayPhone(settings.contact.phone);

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.storeName || 'GSS Collection',
    url: siteUrl,
    ...(phone ? { telephone: phone } : {}),
    ...(settings.contact.email ? { email: settings.contact.email } : {}),
  };

  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="min-h-screen flex flex-col bg-white text-ink antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-ink focus:text-white focus:px-4 focus:py-2 focus:text-xs focus:font-semibold"
        >
          Skip to main content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <CartProvider>
          <StoreHeaderShell announcement={settings.announcements?.[0]} categories={navCategories} />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <StoreFooterShell>
            <Footer settings={settings} categories={navCategories} />
          </StoreFooterShell>
          <CartDrawer />
        </CartProvider>
        <WebVitals />
      </body>
    </html>
  );
}
