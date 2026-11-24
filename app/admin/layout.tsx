import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';

export const metadata: Metadata = {
  title: 'Admin Portal | GSS Collection',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col">
      <AdminNav />
      <main className="flex-1 pb-16">{children}</main>
    </div>
  );
}
