'use client';

import { useState } from 'react';
import { useSave } from '@/lib/use-save';
import type { MessageRecord } from '@/lib/types';

export default function InboxClient({ initialMessages }: { initialMessages: MessageRecord[] }) {
  const [messages, setMessages] = useState<MessageRecord[]>(initialMessages);
  const { status, error, run, retry } = useSave();

  const toggleRead = (id: string, currentRead: boolean) => {
    const nextRead = !currentRead;
    void run(async () => {
      const res = await fetch('/api/admin/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: nextRead }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update message status');
      setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, read: nextRead } : m)));
    });
  };

  if (messages.length === 0) {
    return (
      <div className="bg-white border border-line p-12 text-center text-ink-2 text-xs">
        Your inquiry inbox is currently empty.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {status === 'error' && error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 p-4 text-xs"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void retry()}
            className="border border-red-300 bg-white px-4 min-h-[44px] text-xs font-semibold uppercase tracking-wider"
          >
            Retry
          </button>
        </div>
      )}

      {messages.map((m) => (
        <article
          key={m._id}
          className={`bg-white border p-5 md:p-6 transition ${
            !m.read ? 'border-ink shadow-sm' : 'border-line opacity-85'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-line pb-4 mb-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-semibold text-ink text-sm">{m.name}</h2>
                {!m.read && (
                  <span className="bg-ink text-white text-xs font-semibold uppercase px-2 py-0.5 tracking-wider">
                    New
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-ink-2 mt-1">
                <a href={`mailto:${m.email}`} className="underline hover:text-ink py-1">
                  {m.email}
                </a>
                {m.phone && (
                  <>
                    <span>·</span>
                    <a href={`tel:${m.phone}`} className="font-mono underline hover:text-ink py-1">
                      {m.phone}
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
              <span className="text-xs text-ink-2">
                {new Date(m.createdAt).toLocaleString('en-PK')}
              </span>
              <button
                type="button"
                disabled={status === 'saving'}
                onClick={() => toggleRead(m._id, m.read)}
                className="text-xs px-4 min-h-[44px] border border-line uppercase tracking-wider font-semibold hover:border-ink disabled:opacity-50"
              >
                {m.read ? 'Mark Unread' : 'Mark Read'}
              </button>
            </div>
          </div>

          <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{m.message}</p>
        </article>
      ))}
    </div>
  );
}
