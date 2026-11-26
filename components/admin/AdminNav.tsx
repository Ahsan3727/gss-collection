'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function AdminNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  if (pathname === '/admin/login') return null;

  const links = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/orders', label: 'Orders' },
    { href: '/admin/products', label: 'Products' },
    { href: '/admin/inventory', label: 'Inventory' },
    { href: '/admin/customers', label: 'Customers' },
    { href: '/admin/inbox', label: 'Inquiries' },
    { href: '/admin/discounts', label: 'Discounts' },
    { href: '/admin/pages', label: 'Pages' },
    { href: '/admin/settings', label: 'Settings' },
  ];

  const primaryMobileLinks = links.slice(0, 4);
  const secondaryMobileLinks = links.slice(4);

  return (
    <>
      <header className="bg-ink text-white border-b border-neutral-800 sticky top-0 z-40">
        <div className="max-w-site mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 shrink-0 min-h-[44px]">
              <span className="font-display font-medium text-xl tracking-[0.14em] uppercase whitespace-nowrap">
                GSS Admin
              </span>
            </Link>

            <nav aria-label="Admin navigation" className="hidden lg:flex items-center gap-5 text-xs uppercase tracking-wider font-medium">
              {links.map((link) => {
                const isActive =
                  pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`py-1.5 transition whitespace-nowrap ${
                      isActive
                        ? 'text-white border-b-2 border-white'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/"
              target="_blank"
              className="text-neutral-200 hover:text-white border border-neutral-700 px-3 min-h-[44px] inline-flex items-center uppercase tracking-wider text-xs"
            >
              Store ↗
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              className="text-neutral-300 hover:text-red-300 px-2 min-h-[44px] uppercase tracking-wider text-xs"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen "More" sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-ink text-white flex flex-col justify-between p-6 pb-24">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
              <span className="font-display text-2xl uppercase tracking-wider">More Admin Tools</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close admin menu"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white text-xl"
              >
                ✕
              </button>
            </div>
            <div className="divide-y divide-neutral-800">
              {secondaryMobileLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMoreOpen(false)}
                  className="min-h-[52px] flex items-center text-sm uppercase tracking-wider font-medium text-neutral-200 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar for core daily work */}
      <nav
        aria-label="Admin mobile tabs"
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-ink text-white border-t border-neutral-800 pb-[env(safe-area-inset-bottom)] grid grid-cols-5"
      >
        {primaryMobileLinks.map((link) => {
          const isActive =
            pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMoreOpen(false)}
              className={`min-h-[52px] flex flex-col items-center justify-center text-xs font-medium px-1 ${
                isActive ? 'text-white bg-neutral-900' : 'text-neutral-300'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={`min-h-[52px] flex flex-col items-center justify-center text-xs font-medium px-1 ${
            moreOpen ? 'text-white bg-neutral-900' : 'text-neutral-300'
          }`}
        >
          More
        </button>
      </nav>
    </>
  );
}
