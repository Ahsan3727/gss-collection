import { unstable_cache } from 'next/cache';
import { connectDB } from '@/lib/db';
import { Settings } from '@/lib/models/Settings';
import { DEFAULT_HERO, DEFAULT_RING_SIZES, type StoreSettingsData } from '@/lib/types';

export { DEFAULT_HERO, DEFAULT_RING_SIZES };

export const DEFAULT_SETTINGS: StoreSettingsData = {
  storeName: 'GSS Collection',
  tagline: 'Handcrafted in 925 Sterling Silver & Natural Gemstones',
  baseCurrency: 'PKR',
  freeShippingFrom: 15000,
  shipping: {
    pk: [
      { id: 'std', label: 'Standard delivery (Pakistan)', eta: '3 to 5 business days', price: 300 },
      { id: 'exp', label: 'Express courier delivery', eta: '1 to 2 business days', price: 700 },
    ],
    intl: [
      { id: 'std', label: 'International registered mail', eta: '10 to 18 business days', price: 3500 },
      { id: 'exp', label: 'DHL / FedEx Express', eta: '3 to 5 business days', price: 6500 },
    ],
  },
  announcements: [
    'Handcrafted in 925 Sterling Silver with Natural Mined Gemstones',
    'Free nationwide delivery across Pakistan on orders over Rs. 15,000',
    'Cash on delivery & direct bank transfer accepted',
  ],
  contact: {
    email: '',
    // Left blank on purpose so WhatsApp buttons stay hidden until a real number is saved in /admin/settings.
    phone: '',
    hours: 'Mon - Sat, 10:00 AM - 7:00 PM PKT',
    address: '',
  },
  bank: {
    bankName: 'Meezan Bank Ltd',
    accountTitle: 'GSS Collection',
    // Left blank on purpose: the real account number is saved in /admin/settings.
    accountNumber: '',
  },
  hero: DEFAULT_HERO,
  ringSizes: DEFAULT_RING_SIZES,
  spotlightId: 'crimson-halo-ring',
  moderateReviews: false,
};

/**
 * Direct, uncached DB reader. Throws on database errors so callers like POST /api/orders
 * never charge against stale or cached defaults, and unstable_cache never caches a failure.
 */
export async function loadSettings(): Promise<StoreSettingsData> {
  await connectDB();
  const doc = await Settings.findOne().lean();
  if (!doc) return DEFAULT_SETTINGS;
  const serialized = JSON.parse(JSON.stringify(doc)) as Partial<StoreSettingsData>;
  const rawHero = serialized.hero;
  const rawSizes = serialized.ringSizes;
  return {
    ...DEFAULT_SETTINGS,
    ...serialized,
    contact: { ...DEFAULT_SETTINGS.contact, ...(serialized.contact || {}) },
    bank: { ...DEFAULT_SETTINGS.bank, ...(serialized.bank || {}) },
    hero: {
      eyebrow: typeof rawHero?.eyebrow === 'string' ? rawHero.eyebrow : DEFAULT_HERO.eyebrow,
      headline: rawHero?.headline?.trim() ? rawHero.headline : DEFAULT_HERO.headline,
      description:
        typeof rawHero?.description === 'string' ? rawHero.description : DEFAULT_HERO.description,
      imageUrl: rawHero?.imageUrl ?? DEFAULT_HERO.imageUrl,
      imageAlt: rawHero?.imageAlt ?? DEFAULT_HERO.imageAlt,
      linkHref: rawHero?.linkHref?.trim() ? rawHero.linkHref : DEFAULT_HERO.linkHref,
    },
    ringSizes: {
      ladies: rawSizes?.ladies?.length ? rawSizes.ladies : DEFAULT_RING_SIZES.ladies,
      gents: rawSizes?.gents?.length ? rawSizes.gents : DEFAULT_RING_SIZES.gents,
      fitTip:
        typeof rawSizes?.fitTip === 'string' ? rawSizes.fitTip : DEFAULT_RING_SIZES.fitTip,
    },
    shipping: {
      pk: serialized.shipping?.pk?.length ? serialized.shipping.pk : DEFAULT_SETTINGS.shipping.pk,
      intl: serialized.shipping?.intl?.length ? serialized.shipping.intl : DEFAULT_SETTINGS.shipping.intl,
    },
    announcements: serialized.announcements?.length
      ? serialized.announcements
      : DEFAULT_SETTINGS.announcements,
  };
}

const getCachedSettings = unstable_cache(loadSettings, ['store-settings'], {
  tags: ['settings'],
  revalidate: 3600,
});

/**
 * Cached storefront settings reader. try/catch lives OUTSIDE unstable_cache so a temporary
 * DB error never gets stored in the Next.js cache for an hour.
 */
export async function getStoreSettings(): Promise<StoreSettingsData> {
  try {
    return await getCachedSettings();
  } catch (err) {
    console.warn('[Settings] Failed to fetch settings from DB, using safe defaults:', err);
    return DEFAULT_SETTINGS;
  }
}
