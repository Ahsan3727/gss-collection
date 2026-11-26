import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getStaticPageBySlug } from '@/lib/catalogue';

export const revalidate = 3600;

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const page = await getStaticPageBySlug(params.slug);
  if (!page) {
    return { title: 'Page Not Found' };
  }
  return {
    title: page.title,
    description: page.metaDesc || `Learn about ${page.title} at GSS Collection.`,
    alternates: {
      canonical: `/pages/${page.slug}`,
    },
  };
}

export default async function StaticContentPage({ params }: PageProps) {
  const page = await getStaticPageBySlug(params.slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-16">
      <div className="border-b border-line pb-6 mb-8 text-center md:text-left">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-ink-2 block mb-2">
          Information &amp; Guidelines
        </span>
        <h1 className="font-display text-3xl md:text-5xl text-ink font-normal">
          {page.title}
        </h1>
      </div>

      <div className="prose prose-neutral max-w-none text-ink leading-relaxed space-y-5 text-base font-normal">
        {page.body.split('\n\n').map((paragraph, idx) => (
          <p key={idx} className="text-ink-2 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
