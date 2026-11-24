import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Page } from '@/lib/models/Page';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { slug: string };
}

async function getPageData(slug: string) {
  try {
    await connectDB();
    const doc = await Page.findOne({ slug }).lean();
    if (doc) {
      return JSON.parse(JSON.stringify(doc));
    }
  } catch (err) {
    console.error(`[Page] Failed to fetch page ${slug}:`, err);
  }
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getPageData(params.slug);
  if (!page) {
    return { title: 'Page Not Found | GSS Collection' };
  }
  return {
    title: `${page.title} | GSS Collection`,
    description: page.metaDesc || `Learn about ${page.title} at GSS Collection.`,
  };
}

export default async function StaticContentPage({ params }: PageProps) {
  const page = await getPageData(params.slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-14 md:py-20">
      <div className="border-b border-line pb-6 mb-8 text-center md:text-left">
        <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-ink-2 block mb-2">
          Information & Guidelines
        </span>
        <h1 className="font-display text-3xl md:text-5xl text-ink font-normal">
          {page.title}
        </h1>
      </div>

      <div className="prose prose-neutral max-w-none text-ink leading-relaxed space-y-6 text-sm md:text-base font-light">
        {page.body.split('\n\n').map((paragraph: string, idx: number) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
