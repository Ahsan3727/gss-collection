import Link from 'next/link';
import { formatDisplayPhone, whatsappLink } from '@/lib/contact';
import type { NavCategoryItem } from '@/components/store/Header';
import type { StoreSettingsData } from '@/lib/types';

const DEFAULT_FOOTER_CATEGORIES: NavCategoryItem[] = [
  { slug: 'ladies', name: 'Ladies Rings' },
  { slug: 'gents', name: 'Gents Rings' },
  { slug: 'gems', name: 'Natural Gems & Bracelets' },
];

export default function Footer({
  settings,
  categories = DEFAULT_FOOTER_CATEGORIES,
}: {
  settings: StoreSettingsData;
  categories?: NavCategoryItem[];
}) {
  const displayPhone = formatDisplayPhone(settings.contact.phone);
  const waHref = whatsappLink(settings.contact.phone, 'Hello GSS Collection, I have a question.');

  return (
    <footer className="bg-ink text-neutral-200 mt-20 pt-14 pb-10 border-t border-neutral-800">
      <div className="max-w-site mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-neutral-800">
          <div>
            <span className="font-display font-semibold text-2xl tracking-[0.16em] uppercase text-white block mb-3">
              {settings.storeName || 'GSS Collection'}
            </span>
            <p className="text-sm text-neutral-300 leading-relaxed max-w-sm">
              Handcrafted 925 sterling silver rings, bracelets, and authentic untreated gemstones. Made for lifetime wear with timeless craftsmanship.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-300 mb-3">
              Fine Jewellery
            </h2>
            <ul className="space-y-0 text-sm">
              <li>
                <Link href="/collections/all" className="inline-flex items-center min-h-[44px] hover:text-white transition-colors">
                  All Jewellery
                </Link>
              </li>
              {categories.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/collections/${cat.slug}`}
                    className="inline-flex items-center min-h-[44px] hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/collections/new-arrivals" className="inline-flex items-center min-h-[44px] hover:text-white transition-colors">
                  New Arrivals
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-300 mb-3">
              Help &amp; Policies
            </h2>
            <ul className="space-y-0 text-sm">
              <li>
                <Link href="/pages/size-guide" className="inline-flex items-center min-h-[44px] hover:text-white transition-colors">
                  Ring Size Guide
                </Link>
              </li>
              <li>
                <Link href="/pages/care-guide" className="inline-flex items-center min-h-[44px] hover:text-white transition-colors">
                  Gemstone Care
                </Link>
              </li>
              <li>
                <Link href="/pages/shipping-returns" className="inline-flex items-center min-h-[44px] hover:text-white transition-colors">
                  Shipping &amp; Exchanges
                </Link>
              </li>
              <li>
                <Link href="/pages/contact" className="inline-flex items-center min-h-[44px] hover:text-white transition-colors">
                  Contact &amp; Bespoke
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="inline-flex items-center min-h-[44px] hover:text-white transition-colors">
                  Track Your Delivery
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-300 mb-3">
              Studio &amp; Atelier
            </h2>
            {settings.contact.address && (
              <p className="text-sm text-neutral-300 leading-relaxed mb-1">
                {settings.contact.address}
              </p>
            )}
            {settings.contact.hours && (
              <p className="text-sm text-neutral-300 leading-relaxed mb-2">
                {settings.contact.hours}
              </p>
            )}
            {displayPhone && waHref && (
              <p className="text-sm text-white font-medium mt-1">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline inline-flex items-center min-h-[44px]"
                >
                  WhatsApp: {displayPhone}
                </a>
              </p>
            )}
            {settings.contact.email && (
              <p className="text-sm text-neutral-300">
                <a href={`mailto:${settings.contact.email}`} className="hover:underline inline-flex items-center min-h-[44px]">
                  {settings.contact.email}
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-300">
          <p>© {new Date().getFullYear()} {settings.storeName || 'GSS Collection'}. Hallmarked Sterling Silver 925 Guaranteed.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/pages/privacy-policy" className="hover:underline inline-flex items-center min-h-[44px]">
              Privacy Policy
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/pages/terms-of-service" className="hover:underline inline-flex items-center min-h-[44px]">
              Terms of Service
            </Link>
            <span aria-hidden="true">·</span>
            <span>Cash on Delivery</span>
            <span aria-hidden="true">·</span>
            <span>Bank Transfer</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
