import { connectDB } from '@/lib/db';
import { getStoreSettings } from '@/lib/settings';
import SettingsClient from '@/components/admin/SettingsClient';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await connectDB();
  const settings = await getStoreSettings();

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10">
      <div className="flex justify-between items-baseline border-b border-line pb-6 mb-8">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-2">
            Store Configuration
          </span>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">
            Store & Payment Settings
          </h1>
        </div>
      </div>

      <SettingsClient initialSettings={JSON.parse(JSON.stringify(settings))} />
    </div>
  );
}
