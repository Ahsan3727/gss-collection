import { slugifyHandle } from '@/lib/product-write';

export interface PageWriteInput {
  slug: string;
  title: string;
  body: string;
  metaDesc?: string;
}

export function parsePageWrite(body: unknown): { data: PageWriteInput } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Page details are required.' };
  }

  const input = body as Record<string, unknown>;
  const title = String(input.title || '').trim();
  const slug = slugifyHandle(String(input.slug || title));
  const text = String(input.body || '').trim();
  const metaDesc = String(input.metaDesc || '').trim();

  if (!title) return { error: 'Title is required.' };
  if (!slug) return { error: 'Slug is required.' };
  if (!text) return { error: 'Body is required.' };
  if (title.length > 160) return { error: 'Title must be 160 characters or fewer.' };
  if (text.length > 20000) return { error: 'Body must be 20,000 characters or fewer.' };

  return {
    data: {
      slug,
      title,
      body: text,
      metaDesc: metaDesc || undefined,
    },
  };
}
