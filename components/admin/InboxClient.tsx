'use client';

import { useState } from 'react';

export default function InboxClient({ initialMessages }: { initialMessages: any[] }) {
  const [messages, setMessages] = useState(initialMessages);

  const toggleRead = async (id: string, current: boolean) => {
    try {
      const res = await fetch('/api/admin/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: !current }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m._id === id ? { ...m, read: !current } : m))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <div className="bg-white border border-line p-12 text-center text-ink-3 text-xs">
          No customer inquiries received yet.
        </div>
      ) : (
        messages.map((m) => (
          <div
            key={m._id}
            className={`border p-6 transition ${
              m.read ? 'bg-white border-line' : 'bg-ground border-neutral-400 ring-1 ring-neutral-400'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-line gap-2">
              <div>
                <span className="font-semibold text-sm text-ink block">{m.name}</span>
                <span className="text-xs text-ink-3">{m.email} · {m.phone || 'No phone'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-ink-3">
                  {new Date(m.createdAt).toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <button
                  onClick={() => toggleRead(m._id, m.read)}
                  className="text-xs uppercase tracking-wider underline text-ink hover:text-neutral-600 font-semibold"
                >
                  Mark as {m.read ? 'Unread' : 'Read'}
                </button>
              </div>
            </div>

            <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-wrap">
              {m.message}
            </p>

            <div className="mt-4 pt-3 border-t border-line/60">
              <a
                href={`mailto:${m.email}?subject=RE: GSS Collection Inquiry`}
                className="text-xs uppercase tracking-wider font-semibold text-ink hover:underline"
              >
                Reply via Email →
              </a>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
