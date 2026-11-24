'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function AdminNav() {
  const pathname = usePathname();

  // If on login page, don't show navigation
  if (pathname === '/admin/login') return null;

  const links = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/orders', label: 'Orders' },
    { href: '/admin/products', label: 'Products' },
    { href: '/admin/inventory', label: 'Inventory' },
    { href: '/admin/customers', label: 'Customers' },
    { href: '/admin/inbox', label: 'Inquiries' },
    { href: '/admin/discounts', label: 'Discounts' },
    { href: '/admin/settings', label: 'Settings' },
  ];

  return (
    <header className="bg-ink text-white border-b border-neutral-800 sticky top-0 z-40">
      <div className="max-w-site mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="font-display font-medium text-xl tracking-[0.16em] uppercase">
              GSS Admin
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-xs uppercase tracking-wider font-medium">
            {links.map((link) => {
              const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`py-1 transition ${
                    isActive ? 'text-white border-b-2 border-white' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/"
            target="_blank"
            className="text-neutral-300 hover:text-white border border-neutral-700 px-3 py-1.5 uppercase tracking-wider text-[11px]"
          >
            Live Store ↗
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="text-neutral-400 hover:text-red-400 uppercase tracking-wider text-[11px]"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Mobile navigation tab scroll */}
      <div className="lg:hidden flex overflow-x-auto px-4 py-2 bg-neutral-900 border-t border-neutral-800 gap-4 text-xs">
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap px-2 py-1 ${
                isActive ? 'text-white font-semibold' : 'text-neutral-400'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
