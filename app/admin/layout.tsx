import type { Metadata } from 'next';
import AdminNav from '@/components/admin/AdminNav';

export const metadata: Metadata = {
  title: 'Admin Portal',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ground text-ink flex flex-col">
      <AdminNav />
      <div className="flex-1 pb-24 lg:pb-16">{children}</div>
    </div>
  );
}
