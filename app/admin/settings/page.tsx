import { loadSettings } from '@/lib/settings';
import { requireAdminPage } from '@/lib/admin-auth';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import SettingsClient from '@/components/admin/SettingsClient';
import type { StoreSettingsData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdminPage();
  const settings: StoreSettingsData = await loadSettings();

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-8 md:py-10">
      <AdminPageHeader
        eyebrow="Store Configuration"
        title="Store & Payment Settings"
        subtitle="Changes go live on the storefront immediately."
      />

      <SettingsClient initialSettings={JSON.parse(JSON.stringify(settings)) as StoreSettingsData} />
    </div>
  );
}
