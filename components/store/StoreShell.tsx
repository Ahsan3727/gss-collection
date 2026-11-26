'use client';

import { usePathname } from 'next/navigation';
import AnnouncementBar from '@/components/store/AnnouncementBar';
import Header from '@/components/store/Header';

export function StoreHeaderShell({ announcement }: { announcement?: string }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return (
    <>
      <AnnouncementBar text={announcement} />
      <Header />
    </>
  );
}

export function StoreFooterShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return <>{children}</>;
}
