import { slugifyHandle } from '@/lib/product-write';
import { isSafeStoreImageUrl, type PageImage } from '@/lib/types';

export interface PageWriteInput {
  slug: string;
  title: string;
  body: string;
  metaDesc?: string;
  images?: PageImage[];
}

export const PAGE_MAX_IMAGES = 8;

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

  let images: PageImage[] | undefined;
  if (input.images !== undefined) {
    if (!Array.isArray(input.images)) {
      return { error: 'Images must be a list.' };
    }
    if (input.images.length > PAGE_MAX_IMAGES) {
      return { error: `Upload at most ${PAGE_MAX_IMAGES} images per page.` };
    }
    images = [];
    for (const raw of input.images) {
      if (!raw || typeof raw !== 'object') {
        return { error: 'Invalid page image entry.' };
      }
      const item = raw as Record<string, unknown>;
      const url = String(item.url || '').trim();
      const caption = String(item.caption || '').trim().slice(0, 140);
      if (!url || !isSafeStoreImageUrl(url)) {
        return {
          error: 'Page images must be uploaded via Cloudinary or use a local /images/ path.',
        };
      }
      images.push(caption ? { url, caption } : { url });
    }
  }

  return {
    data: {
      slug,
      title,
      body: text,
      metaDesc: metaDesc || undefined,
      ...(images !== undefined ? { images } : {}),
    },
  };
}
