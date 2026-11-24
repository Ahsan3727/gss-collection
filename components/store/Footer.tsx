import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-ink text-[#CFCFCF] mt-24 pt-16 pb-12 border-t border-neutral-800">
      <div className="max-w-site mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-16 border-b border-neutral-800">
          <div>
            <span className="font-display font-semibold text-2xl tracking-[0.16em] uppercase text-white block mb-4">
              GSS Collection
            </span>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-sm">
              Handcrafted 925 sterling silver rings, bracelets, and authentic untreated gemstones. Made for lifetime wear with timeless craftsmanship.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-ice mb-4">
              Fine Jewellery
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/collections/all" className="hover:text-white transition-colors">All Jewellery</Link></li>
              <li><Link href="/collections/ladies" className="hover:text-white transition-colors">Ladies Rings</Link></li>
              <li><Link href="/collections/gents" className="hover:text-white transition-colors">Gents Rings</Link></li>
              <li><Link href="/collections/gems" className="hover:text-white transition-colors">Natural Untreated Gems</Link></li>
              <li><Link href="/collections/new-arrivals" className="hover:text-white transition-colors">New Arrivals</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-ice mb-4">
              Help & Policies
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/pages/size-guide" className="hover:text-white transition-colors">Ring Size Guide</Link></li>
              <li><Link href="/pages/care-guide" className="hover:text-white transition-colors">Gemstone Care</Link></li>
              <li><Link href="/pages/shipping-returns" className="hover:text-white transition-colors">Shipping & Exchanges</Link></li>
              <li><Link href="/pages/contact" className="hover:text-white transition-colors">Contact & Bespoke</Link></li>
              <li><Link href="/track-order" className="hover:text-white transition-colors">Track Your Delivery</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-ice mb-4">
              Studio & Atelier
            </h4>
            <p className="text-sm text-neutral-400 leading-relaxed mb-2">
              Lahore, Pakistan<br />
              Mon to Sat: 10:00 to 19:00 (PKT)
            </p>
            <p className="text-sm text-neutral-300 font-medium">
              WhatsApp: +92 300 1234567
            </p>
            <p className="text-xs text-neutral-500 mt-2">
              info@gsscollection.com
            </p>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} GSS Collection. Hallmarked Sterling Silver 925 Guaranteed.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/pages/privacy-policy" className="hover:underline">Privacy Policy</Link>
            <span>·</span>
            <Link href="/pages/terms-of-service" className="hover:underline">Terms of Service</Link>
            <span>·</span>
            <span>Cash on Delivery</span>
            <span>·</span>
            <span>Bank Transfer</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
