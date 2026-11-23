import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-line transition-all">
      <div className="max-w-site mx-auto px-4 md:px-6 h-18 flex items-center justify-between">
        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/collections/all"
            className="text-[13px] tracking-widest uppercase font-medium text-ink hover:underline underline-offset-8 transition-colors"
          >
            All Jewellery
          </Link>
          <Link
            href="/collections/ladies"
            className="text-[13px] tracking-widest uppercase font-medium text-ink hover:underline underline-offset-8 transition-colors"
          >
            Ladies Rings
          </Link>
          <Link
            href="/collections/gents"
            className="text-[13px] tracking-widest uppercase font-medium text-ink hover:underline underline-offset-8 transition-colors"
          >
            Gents Rings
          </Link>
          <Link
            href="/collections/gems"
            className="text-[13px] tracking-widest uppercase font-medium text-ink hover:underline underline-offset-8 transition-colors"
          >
            Natural Gems
          </Link>
        </nav>

        {/* Brand logo */}
        <Link href="/" className="flex flex-col items-center group py-2">
          <span className="font-display font-semibold text-2xl md:text-3xl tracking-[0.16em] uppercase text-ink">
            GSS Collection
          </span>
          <span className="text-[10px] tracking-[0.25em] text-ink-2 uppercase -mt-1">
            Fine Silver & Natural Stones
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/search"
            className="p-2 text-ink hover:text-ink-2 transition-colors"
            aria-label="Search store"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>
          <Link
            href="/cart"
            className="relative p-2 text-ink hover:text-ink-2 transition-colors"
            aria-label="View cart"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </Link>
          <Link
            href="/admin"
            className="hidden sm:inline-block text-[11px] uppercase tracking-wider text-ink-2 hover:text-ink border border-neutral-300 px-2.5 py-1"
          >
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}
