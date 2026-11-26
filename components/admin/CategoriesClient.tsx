'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { CATEGORY_LIMITS, slugifyCategory } from '@/lib/category-write';
import {
  getCategoryHref,
  type CategoryRecord,
  type CategoryTargetType,
  type HomeKindFilter,
  type ProductKind,
} from '@/lib/types';

interface AvailablePageOption {
  slug: string;
  title: string;
}

interface FormValues {
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  targetType: CategoryTargetType;
  pageSlug: string;
  defaultKind: ProductKind;
  homeKindFilter: HomeKindFilter;
  sortOrder: number;
  showInNav: boolean;
  showOnHome: boolean;
  active: boolean;
}

const BLANK: FormValues = {
  name: '',
  slug: '',
  subtitle: '',
  description: '',
  targetType: 'collection',
  pageSlug: '',
  defaultKind: 'ring',
  homeKindFilter: 'all',
  sortOrder: 0,
  showInNav: true,
  showOnHome: true,
  active: true,
};

const KIND_OPTIONS: { value: ProductKind; label: string }[] = [
  { value: 'ring', label: 'Ring' },
  { value: 'bracelet', label: 'Bracelet' },
  { value: 'stone', label: 'Loose stone' },
];

const HOME_FILTER_OPTIONS: { value: HomeKindFilter; label: string }[] = [
  { value: 'all', label: 'All items in category' },
  { value: 'ring', label: 'Rings only' },
  { value: 'bracelet', label: 'Bracelets only' },
  { value: 'stone', label: 'Loose stones only' },
];

const labelClass = 'block uppercase tracking-wider font-semibold text-ink mb-1';
const inputClass =
  'w-full min-w-0 px-3 py-2 min-h-[44px] border border-line text-base md:text-sm bg-white focus:outline-none focus:border-ink';
const cardClass = 'bg-white border border-line shadow-sm';
const cardTitleClass = 'font-display text-xl font-normal text-ink';

function toValues(cat: CategoryRecord): FormValues {
  return {
    name: cat.name,
    slug: cat.slug,
    subtitle: cat.subtitle || '',
    description: cat.description || '',
    targetType: cat.targetType === 'page' ? 'page' : 'collection',
    pageSlug: cat.pageSlug || '',
    defaultKind: cat.defaultKind || 'ring',
    homeKindFilter: cat.homeKindFilter || 'all',
    sortOrder: Number.isFinite(cat.sortOrder) ? cat.sortOrder : 0,
    showInNav: cat.showInNav ?? true,
    showOnHome: cat.targetType === 'page' ? false : (cat.showOnHome ?? true),
    active: cat.active ?? true,
  };
}

function sortCategories(list: CategoryRecord[]): CategoryRecord[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export default function CategoriesClient({
  initialCategories,
  availablePages = [],
}: {
  initialCategories: CategoryRecord[];
  availablePages?: AvailablePageOption[];
}) {
  const [categories, setCategories] = useState<CategoryRecord[]>(() =>
    sortCategories(initialCategories)
  );
  const [mode, setMode] = useState<'none' | 'new' | 'edit'>('none');
  const [activeSlug, setActiveSlug] = useState('');
  const [values, setValues] = useState<FormValues>(BLANK);
  const [saved, setSaved] = useState<FormValues>(BLANK);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugLocked, setSlugLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const scrollPending = useRef(false);

  const isNew = mode === 'new';
  const isEdit = mode === 'edit';
  const isPageLink = values.targetType === 'page';
  const dirty = mode !== 'none' && JSON.stringify(values) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!scrollPending.current) return;
    scrollPending.current = false;
    if (window.innerWidth < 1024) editorRef.current?.scrollIntoView({ block: 'start' });
  }, [mode, activeSlug]);

  const runIfClean = (action: () => void) => {
    if (!dirty) {
      action();
      return;
    }
    setConfirmState({
      title: 'Discard unsaved changes?',
      description: 'You have unsaved category changes. Leaving will discard them.',
      confirmLabel: 'Discard',
      onConfirm: action,
    });
  };

  const openCategory = (cat: CategoryRecord) => {
    if (isEdit && activeSlug === cat.slug) return;
    runIfClean(() => {
      const next = toValues(cat);
      setMode('edit');
      setActiveSlug(cat.slug);
      setValues(next);
      setSaved(next);
      setSlugTouched(true);
      setSlugLocked(true);
      setError('');
      setMessage('');
      scrollPending.current = true;
    });
  };

  const openNew = () => {
    if (isNew && !dirty) {
      if (window.innerWidth < 1024) editorRef.current?.scrollIntoView({ block: 'start' });
      return;
    }
    runIfClean(() => {
      const nextSort =
        categories.reduce((max, c) => Math.max(max, Number(c.sortOrder) || 0), 0) + 1;
      const blank = { ...BLANK, sortOrder: nextSort };
      setMode('new');
      setActiveSlug('');
      setValues(blank);
      setSaved(blank);
      setSlugTouched(false);
      setSlugLocked(false);
      setError('');
      setMessage('');
      scrollPending.current = true;
    });
  };

  const closeEditor = () => {
    runIfClean(() => {
      setMode('none');
      setActiveSlug('');
      setValues(BLANK);
      setSaved(BLANK);
      setError('');
      setMessage('');
    });
  };

  const effectiveSlug = slugifyCategory(values.slug || values.name);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || mode === 'none') return;

    setError('');
    setMessage('');

    const trimmedName = values.name.trim();
    if (trimmedName.length < CATEGORY_LIMITS.nameMin) {
      setError(`Category name must be at least ${CATEGORY_LIMITS.nameMin} characters.`);
      return;
    }
    if (!effectiveSlug || effectiveSlug.length < CATEGORY_LIMITS.slugMin) {
      setError('Enter a valid category web address (at least 2 characters).');
      return;
    }
    if (values.targetType === 'page' && !values.pageSlug.trim()) {
      setError('Select which CMS Page this category should open.');
      return;
    }

    setSaving(true);
    try {
      const url = isNew
        ? '/api/admin/categories'
        : `/api/admin/categories/${encodeURIComponent(activeSlug)}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          name: trimmedName,
          slug: effectiveSlug,
          subtitle: values.subtitle.trim(),
          description: values.description.trim(),
          pageSlug: values.pageSlug.trim(),
          showOnHome: values.targetType === 'page' ? false : values.showOnHome,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.category) {
        throw new Error(data.error || 'Could not save category.');
      }

      const record = data.category as CategoryRecord;
      setCategories((curr) =>
        sortCategories(
          isNew
            ? [...curr.filter((c) => c.slug !== record.slug), record]
            : curr.map((c) => (c.slug === activeSlug ? record : c))
        )
      );

      const next = toValues(record);
      setMode('edit');
      setActiveSlug(record.slug);
      setValues(next);
      setSaved(next);
      setSlugTouched(true);
      setSlugLocked(true);
      const targetHref = getCategoryHref(record);
      setMessage(
        isNew
            ? `Category created. Storefront link: ${targetHref}`
            : 'Category updated and live storefront cache refreshed.'
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save category.');
    } finally {
      setSaving(false);
    }
  };

  const activeRecord = isEdit ? categories.find((c) => c.slug === activeSlug) : undefined;

  const performDelete = async () => {
    if (!isEdit || !activeSlug || saving) return;
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/categories/${encodeURIComponent(activeSlug)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not delete category.');

      setCategories((curr) => curr.filter((c) => c.slug !== activeSlug));
      setMode('none');
      setActiveSlug('');
      setValues(BLANK);
      setSaved(BLANK);
      setMessage('Category deleted.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Category List */}
      <aside className={`lg:col-span-5 ${cardClass}`} aria-label="Store categories">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-line">
          <h2 className={cardTitleClass}>All categories ({categories.length})</h2>
          <button
            type="button"
            onClick={openNew}
            className="bg-ink text-white px-4 min-h-[44px] text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800 transition whitespace-nowrap"
          >
            Add category
          </button>
        </div>

        <ul className="divide-y divide-line">
          {categories.map((cat) => {
            const selected = isEdit && activeSlug === cat.slug;
            const count = cat.productCount ?? 0;
            const isPage = cat.targetType === 'page';
            const liveHref = getCategoryHref(cat);
            return (
              <li
                key={cat.slug}
                className={`p-4 space-y-2 border-l-2 ${
                  selected ? 'bg-ground border-ink' : 'border-transparent'
                }`}
              >
                <button
                  type="button"
                  onClick={() => openCategory(cat)}
                  aria-current={selected ? 'true' : undefined}
                  className="w-full text-left min-h-[44px] group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm text-ink group-hover:underline truncate">
                      {cat.name}
                    </span>
                    <span className="text-xs font-semibold text-ink-2 shrink-0">
                      {isPage ? 'Page link' : `${count} ${count === 1 ? 'article' : 'articles'}`}
                    </span>
                  </div>
                  <span className="block text-xs font-mono text-ink-2 truncate mt-0.5">
                    {liveHref}
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
                    {!cat.active && (
                      <span className="px-2 py-0.5 bg-neutral-200 text-ink-2 font-semibold uppercase">
                        Hidden
                      </span>
                    )}
                    {isPage && (
                      <span className="px-2 py-0.5 bg-neutral-900 text-white font-semibold uppercase">
                        CMS Page
                      </span>
                    )}
                    {cat.active && cat.showInNav && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-ok font-semibold uppercase">
                        Nav
                      </span>
                    )}
                    {!isPage && cat.active && cat.showOnHome && (
                      <span className="px-2 py-0.5 bg-stone-100 text-ink font-semibold uppercase">
                        Homepage
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-ground border border-line text-ink-2 uppercase">
                      Order {cat.sortOrder}
                    </span>
                  </div>
                </button>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold uppercase tracking-wider">
                  {isPage ? (
                    <Link
                      href="/admin/pages"
                      className="min-h-[44px] inline-flex items-center text-ink underline hover:text-ink-2"
                    >
                      Edit page content
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/admin/products/new?cat=${encodeURIComponent(cat.slug)}`}
                        className="min-h-[44px] inline-flex items-center text-ink underline hover:text-ink-2"
                      >
                        + Add article here
                      </Link>
                      <Link
                        href={`/admin/products?cat=${encodeURIComponent(cat.slug)}`}
                        className="min-h-[44px] inline-flex items-center text-ink-2 underline hover:text-ink"
                      >
                        Manage articles ({count})
                      </Link>
                    </>
                  )}
                  {cat.active && (
                    <a
                      href={liveHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] inline-flex items-center text-ink-2 underline hover:text-ink ml-auto"
                    >
                      View live ↗
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Editor */}
      <div ref={editorRef} className="lg:col-span-7 scroll-mt-28">
        {mode === 'none' ? (
          <div className={`${cardClass} p-6 md:p-8`}>
            <h2 className={`${cardTitleClass} mb-2`}>Edit or add a category</h2>
            <p className="text-xs text-ink-2 leading-relaxed max-w-lg mb-4">
              Choose <strong>Product Collection</strong> for categories containing articles (such as
              Ladies Rings or Silver Bracelets), or choose <strong>CMS Page Link</strong> to put an
              info page (such as Size Guide) straight into your top and mobile navigation menu.
            </p>
            {message && (
              <p
                role="status"
                className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-3 border border-emerald-200"
              >
                {message}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} noValidate className={`${cardClass} p-5 md:p-6 text-xs`}>
            <div className="flex flex-wrap items-baseline justify-between gap-3 pb-2 mb-4 border-b border-line">
              <h2 className={cardTitleClass}>
                {isNew ? 'New Category' : `Edit: ${saved.name}`}
                {dirty && (
                  <span className="ml-3 text-xs font-sans font-semibold text-amber-800">
                    Unsaved changes
                  </span>
                )}
              </h2>
              {isEdit && activeRecord?.active && (
                <a
                  href={getCategoryHref(activeRecord)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="uppercase tracking-wider font-semibold text-ink-2 hover:text-ink underline min-h-[44px] inline-flex items-center"
                >
                  Open {getCategoryHref(activeRecord)} ↗
                </a>
              )}
            </div>

            {error && (
              <p role="alert" className="mb-4 text-xs text-red-700 bg-red-50 p-3 border border-red-200">
                {error}
              </p>
            )}
            {message && (
              <p
                role="status"
                className="mb-4 text-xs font-semibold text-emerald-800 bg-emerald-50 p-3 border border-emerald-200"
              >
                {message}
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="cat-target-type" className={labelClass}>
                  Category Type *
                </label>
                <select
                  id="cat-target-type"
                  value={values.targetType}
                  onChange={(e) => {
                    const nextType = e.target.value as CategoryTargetType;
                    setValues((v) => ({
                      ...v,
                      targetType: nextType,
                      showOnHome: nextType === 'page' ? false : v.showOnHome,
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="collection">Product Collection (/collections/...)</option>
                  <option value="page">CMS Page Link (opens a page like Size Guide)</option>
                </select>
              </div>

              <div className="border border-line bg-ground p-3.5 space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <label htmlFor="cat-page-slug" className="block uppercase tracking-wider font-semibold text-ink">
                    {isPageLink ? 'Linked CMS Page *' : 'Optional Collection Guide Page'}
                  </label>
                  <Link href="/admin/pages" className="text-xs underline text-ink-2 hover:text-ink">
                    Manage / Create Pages ↗
                  </Link>
                </div>
                <select
                  id="cat-page-slug"
                  value={values.pageSlug}
                  onChange={(e) => {
                    const chosenSlug = e.target.value;
                    const chosenPage = availablePages.find((p) => p.slug === chosenSlug);
                    setValues((v) => {
                      const nextName =
                        v.targetType === 'page' && !v.name.trim() && chosenPage
                          ? chosenPage.title
                          : v.name;
                      return {
                        ...v,
                        pageSlug: chosenSlug,
                        name: nextName,
                        slug: slugTouched ? v.slug : slugifyCategory(nextName || chosenSlug),
                      };
                    });
                  }}
                  className={inputClass}
                >
                  <option value="">
                    {isPageLink ? '-- Select a page from Admin → Pages --' : 'None (no guide banner)'}
                  </option>
                  {availablePages.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title} (/pages/{p.slug})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-ink-2">
                  {isPageLink
                    ? 'Nav links open this page directly instead of showing an empty product grid.'
                    : 'Optionally display a direct link to this guide inside the collection page header (e.g. Ring Sizing Guide).'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cat-name" className={labelClass}>
                    Category Name *
                  </label>
                  <input
                    id="cat-name"
                    type="text"
                    maxLength={CATEGORY_LIMITS.nameMax}
                    value={values.name}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      setValues((v) => ({
                        ...v,
                        name: nextName,
                        slug: slugTouched ? v.slug : slugifyCategory(nextName),
                      }));
                    }}
                    placeholder={isPageLink ? 'e.g. Size Guide' : 'e.g. Silver Bracelets'}
                    className={inputClass}
                  />
                </div>
                {!isPageLink && (
                  <div>
                    <label htmlFor="cat-subtitle" className={labelClass}>
                      Short Eyebrow Label
                    </label>
                    <input
                      id="cat-subtitle"
                      type="text"
                      maxLength={CATEGORY_LIMITS.subtitleMax}
                      value={values.subtitle}
                      onChange={(e) => setValues((v) => ({ ...v, subtitle: e.target.value }))}
                      placeholder="e.g. Handcrafted Wrists"
                      className={inputClass}
                    />
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="cat-slug" className={labelClass}>
                  Web Address (Slug) *
                </label>
                <div className="flex gap-2">
                  <input
                    id="cat-slug"
                    type="text"
                    readOnly={slugLocked}
                    maxLength={CATEGORY_LIMITS.slugMax}
                    value={values.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setValues((v) => ({ ...v, slug: e.target.value }));
                    }}
                    onBlur={() =>
                      setValues((v) => ({ ...v, slug: slugifyCategory(v.slug || v.name) }))
                    }
                    placeholder={isPageLink ? 'e.g. size-guide' : 'e.g. silver-bracelets'}
                    className={`${inputClass} font-mono ${slugLocked ? 'bg-ground text-ink-2' : ''}`}
                  />
                  {slugLocked && (
                    <button
                      type="button"
                      onClick={() => setSlugLocked(false)}
                      className="px-3 min-h-[44px] border border-line text-ink-2 hover:border-ink hover:text-ink uppercase tracking-wider font-semibold whitespace-nowrap"
                    >
                      Change
                    </button>
                  )}
                </div>
                <p className="text-xs text-ink-2 mt-1">
                  {isPageLink ? (
                    <>
                      Opens{' '}
                      <span className="font-mono text-ink">
                        /pages/{values.pageSlug || '...'}
                      </span>{' '}
                      (and <span className="font-mono">/collections/{effectiveSlug || '...'}</span>{' '}
                      redirects there cleanly).
                    </>
                  ) : (
                    <>
                      Collection URL:{' '}
                      <span className="font-mono text-ink">
                        /collections/{effectiveSlug || '...'}
                      </span>
                    </>
                  )}
                </p>
                {!isPageLink && isEdit && !slugLocked && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2 mt-2">
                    Changing the web address updates all existing articles inside this category to the
                    new URL automatically, though old bookmarks will need the new URL.
                  </p>
                )}
              </div>

              {!isPageLink && (
                <>
                  <div>
                    <label htmlFor="cat-desc" className={labelClass}>
                      Collection Description
                    </label>
                    <textarea
                      id="cat-desc"
                      rows={2}
                      maxLength={CATEGORY_LIMITS.descriptionMax}
                      value={values.description}
                      onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
                      placeholder="Shown under the heading on the collection page and in search results."
                      className={`${inputClass} resize-y`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="cat-default-kind" className={labelClass}>
                        Default Article Type
                      </label>
                      <select
                        id="cat-default-kind"
                        value={values.defaultKind}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, defaultKind: e.target.value as ProductKind }))
                        }
                        className={inputClass}
                      >
                        {KIND_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="cat-home-filter" className={labelClass}>
                        Homepage Row Shows
                      </label>
                      <select
                        id="cat-home-filter"
                        value={values.homeKindFilter}
                        onChange={(e) =>
                          setValues((v) => ({
                            ...v,
                            homeKindFilter: e.target.value as HomeKindFilter,
                          }))
                        }
                        className={inputClass}
                      >
                        {HOME_FILTER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="cat-sort" className={labelClass}>
                        Display Order
                      </label>
                      <input
                        id="cat-sort"
                        type="number"
                        inputMode="numeric"
                        value={values.sortOrder}
                        onChange={(e) =>
                          setValues((v) => ({ ...v, sortOrder: Number(e.target.value) || 0 }))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                </>
              )}

              {isPageLink && (
                <div>
                  <label htmlFor="cat-sort" className={labelClass}>
                    Menu Display Order
                  </label>
                  <input
                    id="cat-sort"
                    type="number"
                    inputMode="numeric"
                    value={values.sortOrder}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, sortOrder: Number(e.target.value) || 0 }))
                    }
                    className={inputClass}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-line">
                <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={values.active}
                    onChange={(e) => setValues((v) => ({ ...v, active: e.target.checked }))}
                    className="w-4 h-4 accent-ink"
                  />
                  <span className="font-medium text-ink">Active on store</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={values.showInNav}
                    onChange={(e) => setValues((v) => ({ ...v, showInNav: e.target.checked }))}
                    className="w-4 h-4 accent-ink"
                  />
                  <span className="font-medium text-ink">
                    {isPageLink ? 'Show in Menu' : 'Show in Nav & Footer'}
                  </span>
                </label>

                {!isPageLink && (
                  <label className="flex items-center gap-2.5 cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={values.showOnHome}
                      onChange={(e) => setValues((v) => ({ ...v, showOnHome: e.target.checked }))}
                      className="w-4 h-4 accent-ink"
                    />
                    <span className="font-medium text-ink">Show on Homepage</span>
                  </label>
                )}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-line flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-ink text-white px-7 min-h-[44px] py-2.5 uppercase tracking-wider font-semibold hover:bg-neutral-800 disabled:opacity-40 transition"
              >
                {saving ? 'Saving...' : isNew ? 'Create Category' : 'Save Changes'}
              </button>

              {isEdit && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    setConfirmState({
                      title: `Delete "${activeRecord?.name || activeSlug}"?`,
                      description:
                        (activeRecord?.productCount ?? 0) > 0
                          ? `This category still contains ${activeRecord?.productCount} article(s), so deletion will be blocked until those items are moved.`
                          : 'This permanently removes the category entry.',
                      confirmLabel: 'Delete Category',
                      onConfirm: () => {
                        void performDelete();
                      },
                    })
                  }
                  className="px-4 min-h-[44px] border border-line text-red-700 hover:border-red-700 uppercase tracking-wider font-semibold disabled:opacity-40"
                >
                  Delete
                </button>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={closeEditor}
                className="sm:ml-auto min-h-[44px] px-2 text-ink-2 hover:text-ink underline uppercase tracking-wider font-semibold"
              >
                {isNew ? 'Cancel' : 'Close'}
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
        title={confirmState?.title || ''}
        description={confirmState?.description || ''}
        confirmLabel={confirmState?.confirmLabel || 'Confirm'}
        destructive
        onConfirm={() => confirmState?.onConfirm()}
      />
    </div >
  );
}
