import { connectDB } from '@/lib/db';
import { Message } from '@/lib/models/Message';
import InboxClient from '@/components/admin/InboxClient';

export const dynamic = 'force-dynamic';

export default async function AdminInboxPage() {
  await connectDB();
  const messages = await Message.find().sort({ createdAt: -1 }).lean();

  return (
    <div className="max-w-site mx-auto px-4 md:px-6 py-10">
      <div className="flex justify-between items-baseline border-b border-line pb-6 mb-8">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-2">
            Customer Communications
          </span>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">
            Inquiries Inbox ({messages.length})
          </h1>
        </div>
      </div>

      <InboxClient initialMessages={JSON.parse(JSON.stringify(messages))} />
    </div>
  );
}
