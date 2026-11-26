'use client';

import { useEffect, useMemo, useState } from 'react';
import { uploadAdminImage } from '@/lib/client-image';
import { useSave } from '@/lib/use-save';
import { DEFAULT_HERO, HERO_LIMITS, type HeroSettings, type StoreSettingsData } from '@/lib/types';

function withHeroDefaults(settings: StoreSettingsData): StoreSettingsData & { hero: HeroSettings } {
  return {
    ...settings,
    hero: {
      ...DEFAULT_HERO,
      ...(settings.hero || {}),
    },
  };
}

export default function SettingsClient({ initialSettings }: { initialSettings: StoreSettingsData }) {
  const initialNormalized = useMemo(() => withHeroDefaults(initialSettings), [initialSettings]);
  const [savedSnapshot, setSavedSnapshot] = useState(initialNormalized);
  const [form, setForm] = useState(initialNormalized);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroUploadError, setHeroUploadError] = useState('');
  const { status, error, run, retry, reset } = useSave();

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedSnapshot),
    [form, savedSnapshot]
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const inputClass =
  'w-full min-w-0 px-3 py-2 min-h-[44px] border border-line text-base md:text-sm bg-white focus:outline-none focus:border-ink';

  const updateHero = (patch: Partial<HeroSettings>) => {
    reset();
    setHeroUploadError('');
    setForm((prev) => ({
      ...prev,
      hero: { ...prev.hero, ...patch },
    }));
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setHeroUploadError('');
    setHeroUploading(true);
    try {
      const uploaded = await uploadAdminImage(file, 'hero');
      updateHero({ imageUrl: uploaded.url });
    } catch (err: unknown) {
      setHeroUploadError(err instanceof Error ? err.message : 'Hero image upload failed.');
    } finally {
      setHeroUploading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const payload = {
        storeName: form.storeName.trim(),
        tagline: form.tagline.trim(),
        freeShippingFrom: Math.max(0, Number(form.freeShippingFrom) || 0),
        moderateReviews: Boolean(form.moderateReviews),
        announcements: form.announcements.map((a) => a.trim()).filter(Boolean),
        hero: {
          eyebrow: form.hero.eyebrow.trim(),
          headline: form.hero.headline.trim(),
          description: form.hero.description.trim(),
          imageUrl: form.hero.imageUrl.trim(),
          imageAlt: (form.hero.imageAlt || '').trim(),
          linkHref: (form.hero.linkHref || '').trim() || '/collections/all',
        },
        contact: {
          email: form.contact.email.trim(),
          phone: form.contact.phone.trim(),
          hours: form.contact.hours.trim(),
          address: form.contact.address.trim(),
        },
        bank: {
          bankName: form.bank.bankName.trim(),
          accountTitle: form.bank.accountTitle.trim(),
          accountNumber: form.bank.accountNumber.trim(),
        },
      };

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save settings');

      const nextSettings = withHeroDefaults(data.settings ? { ...form, ...data.settings } : form);
      setForm(nextSettings);
      setSavedSnapshot(nextSettings);
    });
  };

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-6 text-xs">
      {status === 'error' && error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 p-4"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void retry()}
            className="border border-red-300 bg-white px-4 min-h-[44px] text-xs font-semibold uppercase tracking-wider hover:border-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {status === 'saved' && !dirty && (
        <p role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 font-medium">
          Settings saved and storefront cache updated.
        </p>
      )}

      {dirty && status !== 'saving' && (
        <p role="status" className="bg-amber-50 border border-amber-200 text-amber-900 p-3 font-medium">
          You have unsaved changes.
        </p>
      )}

      {/* Homepage Hero Banner */}
      <div className="bg-white border border-line p-5 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
          <h2 className="font-display text-lg font-medium">Homepage Hero Banner</h2>
          <button
            type="button"
            onClick={() =>
              updateHero({
                eyebrow: DEFAULT_HERO.eyebrow,
                headline: DEFAULT_HERO.headline,
                description: DEFAULT_HERO.description,
              })
            }
            className="text-xs uppercase tracking-wider font-semibold text-ink-2 hover:text-ink underline min-h-[44px] inline-flex items-center"
          >
            Restore Default Copy
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          <div className="md:col-span-5 space-y-3 min-w-0">
            <span className="block uppercase tracking-wider font-semibold text-ink">
              Hero Picture
            </span>
            <div className="relative aspect-[4/3] sm:aspect-square w-full bg-ink text-white border border-line overflow-hidden flex items-center justify-center">
              {form.hero.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={form.hero.imageUrl}
                  alt={form.hero.imageAlt || form.hero.headline}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="p-4 text-center">
                  <span className="font-display text-xl block mb-1">Automatic Spotlight</span>
                  <span className="text-xs text-neutral-300">
                    Showing top featured product photo until you upload a custom picture.
                  </span>
                </div>
              )}
            </div>

            {heroUploadError && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5">
                {heroUploadError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="st-hero-upload"
                className={`inline-flex items-center justify-center min-h-[44px] px-4 border border-ink text-ink uppercase tracking-wider font-semibold cursor-pointer hover:bg-ground ${heroUploading ? 'opacity-40 pointer-events-none' : ''
                  }`}
              >
                {heroUploading ? 'Uploading...' : form.hero.imageUrl ? 'Replace Picture' : 'Upload Picture'}
              </label>
              <input
                id="st-hero-upload"
                type="file"
                accept="image/*"
                disabled={heroUploading}
                onChange={handleHeroImageUpload}
                className="sr-only"
              />
              {form.hero.imageUrl && (
                <button
                  type="button"
                  onClick={() => updateHero({ imageUrl: '', imageAlt: '' })}
                  className="min-h-[44px] px-3 border border-line text-red-700 hover:border-red-700 uppercase tracking-wider font-semibold"
                >
                  Use Default Ring
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-7 space-y-4 min-w-0">
            <div>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <label htmlFor="st-hero-eyebrow" className="block uppercase tracking-wider font-semibold text-ink">
                  Eyebrow Line
                </label>
                <span className="text-xs text-ink-2">
                  {form.hero.eyebrow.length}/{HERO_LIMITS.eyebrowMax}
                </span>
              </div>
              <input
                id="st-hero-eyebrow"
                type="text"
                maxLength={HERO_LIMITS.eyebrowMax}
                value={form.hero.eyebrow}
                onChange={(e) => updateHero({ eyebrow: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <label htmlFor="st-hero-headline" className="block uppercase tracking-wider font-semibold text-ink">
                  Main Headline *
                </label>
                <span className="text-xs text-ink-2">
                  {form.hero.headline.length}/{HERO_LIMITS.headlineMax}
                </span>
              </div>
              <input
                id="st-hero-headline"
                type="text"
                required
                minLength={HERO_LIMITS.headlineMin}
                maxLength={HERO_LIMITS.headlineMax}
                value={form.hero.headline}
                onChange={(e) => updateHero({ headline: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <label htmlFor="st-hero-desc" className="block uppercase tracking-wider font-semibold text-ink">
                  Description Text
                </label>
                <span className="text-xs text-ink-2">
                  {form.hero.description.length}/{HERO_LIMITS.descriptionMax}
                </span>
              </div>
              <textarea
                id="st-hero-desc"
                rows={3}
                maxLength={HERO_LIMITS.descriptionMax}
                value={form.hero.description}
                onChange={(e) => updateHero({ description: e.target.value })}
                className="w-full min-w-0 px-3 py-2 border border-line text-base md:text-sm bg-white focus:outline-none focus:border-ink resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="st-hero-link" className="block uppercase tracking-wider font-semibold text-ink mb-1">
                  Picture Click Link
                </label>
                <input
                  id="st-hero-link"
                  type="text"
                  maxLength={HERO_LIMITS.linkHrefMax}
                  placeholder="/collections/all"
                  value={form.hero.linkHref || ''}
                  onChange={(e) => updateHero({ linkHref: e.target.value })}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label htmlFor="st-hero-alt" className="block uppercase tracking-wider font-semibold text-ink mb-1">
                  Picture Alt Text
                </label>
                <input
                  id="st-hero-alt"
                  type="text"
                  maxLength={HERO_LIMITS.imageAltMax}
                  placeholder="Optional accessibility description"
                  value={form.hero.imageAlt || ''}
                  onChange={(e) => updateHero({ imageAlt: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Identity */}
      <div className="bg-white border border-line p-5 md:p-6 space-y-4">
        <h2 className="font-display text-lg font-medium border-b border-line pb-2">Brand & Shipping</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="st-name" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Store Name
            </label>
            <input
              id="st-name"
              type="text"
              required
              value={form.storeName}
              onChange={(e) => {
                reset();
                setForm({ ...form, storeName: e.target.value });
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="st-free-ship" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Free Shipping Above (PKR)
            </label>
            <input
              id="st-free-ship"
              type="number"
              min="0"
              inputMode="numeric"
              value={form.freeShippingFrom}
              onChange={(e) => {
                reset();
                setForm({ ...form, freeShippingFrom: Number(e.target.value) });
              }}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="st-tagline" className="block uppercase tracking-wider font-semibold text-ink mb-1">
            Tagline
          </label>
          <input
            id="st-tagline"
            type="text"
            value={form.tagline}
            onChange={(e) => {
              reset();
              setForm({ ...form, tagline: e.target.value });
            }}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="st-announcements" className="block uppercase tracking-wider font-semibold text-ink mb-1">
            Announcement Bar Lines (one per line)
          </label>
          <textarea
            id="st-announcements"
            rows={3}
            value={form.announcements.join('\n')}
            onChange={(e) => {
              reset();
              setForm({ ...form, announcements: e.target.value.split('\n') });
            }}
            className="w-full px-3 py-2 border border-line text-base md:text-sm bg-white focus:outline-none focus:border-ink"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={form.moderateReviews}
            onChange={(e) => {
              reset();
              setForm({ ...form, moderateReviews: e.target.checked });
            }}
            className="w-4 h-4 accent-ink"
          />
          <span className="text-ink font-medium text-xs">
            Moderate reviews before publishing to product pages
          </span>
        </label>
      </div>

      {/* Contact Information */}
      <div className="bg-white border border-line p-5 md:p-6 space-y-4">
        <h2 className="font-display text-lg font-medium border-b border-line pb-2">Contact & Support</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="st-email" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Support Email
            </label>
            <input
              id="st-email"
              type="email"
              value={form.contact.email}
              onChange={(e) => {
                reset();
                setForm({ ...form, contact: { ...form.contact, email: e.target.value } });
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="st-phone" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Phone / WhatsApp Number
            </label>
            <input
              id="st-phone"
              type="tel"
              inputMode="tel"
              placeholder="+92 300 1234567"
              value={form.contact.phone}
              onChange={(e) => {
                reset();
                setForm({ ...form, contact: { ...form.contact, phone: e.target.value } });
              }}
              className={inputClass}
            />
            <p className="text-xs text-ink-2 mt-1">
              Leave blank to hide WhatsApp & phone buttons on the storefront. Format: +92 3XX XXXXXXX or 03XX XXXXXXX.
            </p>
          </div>
          <div>
            <label htmlFor="st-hours" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Business Hours
            </label>
            <input
              id="st-hours"
              type="text"
              value={form.contact.hours}
              onChange={(e) => {
                reset();
                setForm({ ...form, contact: { ...form.contact, hours: e.target.value } });
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="st-address" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Showroom / City Address
            </label>
            <input
              id="st-address"
              type="text"
              value={form.contact.address}
              onChange={(e) => {
                reset();
                setForm({ ...form, contact: { ...form.contact, address: e.target.value } });
              }}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Bank Transfer */}
      <div className="bg-white border border-line p-5 md:p-6 space-y-4">
        <h2 className="font-display text-lg font-medium border-b border-line pb-2">Bank Transfer Account</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="st-bank-name" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Bank Name
            </label>
            <input
              id="st-bank-name"
              type="text"
              value={form.bank.bankName}
              onChange={(e) => {
                reset();
                setForm({ ...form, bank: { ...form.bank, bankName: e.target.value } });
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="st-bank-title" className="block uppercase tracking-wider font-semibold text-ink mb-1">
              Account Title
            </label>
            <input
              id="st-bank-title"
              type="text"
              value={form.bank.accountTitle}
              onChange={(e) => {
                reset();
                setForm({ ...form, bank: { ...form.bank, accountTitle: e.target.value } });
              }}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="st-iban" className="block uppercase tracking-wider font-semibold text-ink mb-1">
            Account / IBAN Number
          </label>
          <input
            id="st-iban"
            type="text"
            value={form.bank.accountNumber}
            onChange={(e) => {
              reset();
              setForm({ ...form, bank: { ...form.bank, accountNumber: e.target.value } });
            }}
            className={`${inputClass} font-mono tracking-wider`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={status === 'saving' || heroUploading}
        className="w-full bg-ink text-white min-h-[48px] px-6 uppercase tracking-[0.2em] font-semibold text-xs hover:bg-neutral-800 disabled:opacity-40 transition"
      >
        {status === 'saving' ? 'Saving Settings...' : 'Save Settings'}
      </button>
    </form>
  );
}
