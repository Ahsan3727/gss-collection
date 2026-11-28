import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getStaticPageBySlug } from '@/lib/catalogue';
import { DEFAULT_RING_SIZES, getStoreSettings } from '@/lib/settings';
import type { RingSizeEntry } from '@/lib/types';
import RingSizeTable from '@/components/store/RingSizeTable';

export const revalidate = 3600;

interface PageProps {
  params: { slug: string };
}

function RingSizeChart({ title, rows }: { title: string; rows: RingSizeEntry[] }) {
  if (!rows || rows.length === 0) return null;

  return (
    <section className="border border-line bg-white">
      <div className="bg-ground border-b border-line px-4 py-3">
        <h2 className="font-display text-xl font-normal text-ink">{title}</h2>
      </div>
      <RingSizeTable rows={rows} ariaLabel={`${title} sizes`} className="p-4" />
    </section>
  );
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
  const isSizeGuide = params.slug === 'size-guide';
  const [page, settings] = await Promise.all([
    getStaticPageBySlug(params.slug),
    isSizeGuide ? getStoreSettings() : Promise.resolve(null),
  ]);

  if (!page) {
    notFound();
  }

  const pageImages = Array.isArray(page.images) ? page.images : [];
  const ringSizes = settings?.ringSizes || DEFAULT_RING_SIZES;

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

      {pageImages.length > 0 && (
        <section aria-label="Visual guide photos" className="mt-8">
          <div
            className={`grid gap-6 ${pageImages.length === 1 ? 'grid-cols-1 max-w-xl mx-auto' : 'grid-cols-1 sm:grid-cols-2'
              }`}
          >
            {pageImages.map((img, idx) => (
              <figure key={`${img.url}-${idx}`} className="border border-line bg-mist p-3">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-white">
                  <Image
                    src={img.url}
                    alt={img.caption || `${page.title} guide image ${idx + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 380px"
                    className="object-contain"
                  />
                </div>
                {img.caption && (
                  <figcaption className="pt-2.5 text-xs text-ink-2 text-center leading-snug">
                    {img.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {isSizeGuide && (
        <div className="mt-10 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RingSizeChart title="Ladies Rings Sizing" rows={ringSizes.ladies} />
            <RingSizeChart title="Gents Rings Sizing" rows={ringSizes.gents} />
          </div>
          {ringSizes.fitTip && (
            <p className="text-xs text-ink-2 bg-ground border border-line p-4 leading-relaxed">
              <strong className="text-ink uppercase tracking-wider mr-1.5">Sizing Tip:</strong>
              {ringSizes.fitTip}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
