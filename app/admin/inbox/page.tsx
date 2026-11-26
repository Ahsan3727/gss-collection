import { connectDB } from '@/lib/db';
import { Message } from '@/lib/models/Message';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import InboxClient from '@/components/admin/InboxClient';
import type { MessageRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminInboxPage() {
  await connectDB();
  const messages = await Message.find().sort({ createdAt: -1 }).lean();

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-8 md:py-10">
      <AdminPageHeader
        eyebrow="Customer Communications"
        title={`Inquiries Inbox (${messages.length})`}
        subtitle="Messages submitted via the storefront contact form."
      />

      <InboxClient initialMessages={JSON.parse(JSON.stringify(messages)) as MessageRecord[]} />
    </div>
  );
}
