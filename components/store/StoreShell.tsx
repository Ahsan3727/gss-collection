'use client';

import { usePathname } from 'next/navigation';
import AnnouncementBar from '@/components/store/AnnouncementBar';
import Header, { type NavCategoryItem } from '@/components/store/Header';

export function StoreHeaderShell({
  announcement,
  categories,
}: {
  announcement?: string;
  categories?: NavCategoryItem[];
}) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return (
    <>
      <AnnouncementBar text={announcement} />
      <Header categories={categories} />
    </>
  );
}

export function StoreFooterShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return <>{children}</>;
}
