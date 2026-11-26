'use client';

import { useEffect, useRef, useState } from 'react';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export interface PageRecord {
  _id?: string;
  slug: string;
  title: string;
  body: string;
  metaDesc?: string;
  updatedAt?: string;
}

interface FormValues {
  slug: string;
  title: string;
  body: string;
  metaDesc: string;
}

// Same limits as parsePageWrite() in lib/page-write.ts.
const TITLE_MAX = 160;
const BODY_MAX = 20000;
// Not enforced anywhere. Search engines cut descriptions at about this length.
const META_SOFT_MAX = 160;

// Pages the shop footer links to (components/store/Footer.tsx). The links are written by hand,
// so changing one of these slugs leaves a dead footer link and there is no redirect.
const FOOTER_LINKS: Record<string, string> = {
  'size-guide': 'Ring Size Guide',
  'care-guide': 'Gemstone Care',
  'shipping-returns': 'Shipping & Exchanges',
  contact: 'Contact & Bespoke',
  'privacy-policy': 'Privacy Policy',
  'terms-of-service': 'Terms of Service',
};

const labelClass = 'block uppercase tracking-wider font-semibold text-ink mb-1';
const inputClass =
  'w-full px-3 py-2 min-h-[44px] border border-line text-base md:text-sm bg-white focus:outline-none focus:border-ink';
const cardClass = 'bg-white border border-line shadow-sm';
const cardTitleClass = 'font-display text-xl font-normal text-ink';

const BLANK: FormValues = { slug: '', title: '', body: '', metaDesc: '' };

// Same rule as slugifyHandle() on the server.
function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * The shop splits the body on blank lines, so this makes what the owner types match what the shop prints:
 * Windows line endings become \n, lines that only hold spaces count as blank, and runs of blank lines
 * collapse into one (extra blank lines would otherwise print as empty paragraphs).
 */
function normalizeBody(value: string) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toValues(page: PageRecord): FormValues {
  return {
    slug: page.slug,
    title: page.title,
    body: page.body,
    metaDesc: page.metaDesc || '',
  };
}

function sortPages(pages: PageRecord[]) {
  return [...pages].sort((a, b) => a.title.localeCompare(b.title));
}

// A fixed time zone keeps the server render and the browser render identical.
function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Karachi',
  });
}

type Mode = 'none' | 'new' | 'edit';

/** Own-property lookup, so a slug such as "constructor" is never mistaken for a footer page. */
function footerLabelFor(slug: string) {
  return Object.prototype.hasOwnProperty.call(FOOTER_LINKS, slug) ? FOOTER_LINKS[slug] : undefined;
}

export default function PagesClient({ initialPages }: { initialPages: PageRecord[] }) {
  const [pages, setPages] = useState<PageRecord[]>(() => sortPages(initialPages));
  // mode says what the editor shows; activeSlug is the saved slug of the page being edited (mode 'edit' only).
  const [mode, setMode] = useState<Mode>('none');
  const [activeSlug, setActiveSlug] = useState('');
  const [values, setValues] = useState<FormValues>(BLANK);
  const [saved, setSaved] = useState<FormValues>(BLANK);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugLocked, setSlugLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const scrollPending = useRef(false);

  const isNew = mode === 'new';
  const isEdit = mode === 'edit';

  const dirty =
    mode !== 'none' &&
    (values.slug !== saved.slug ||
      values.title !== saved.title ||
      values.body !== saved.body ||
      values.metaDesc !== saved.metaDesc);

  // Browser prompt if the tab is closed or reloaded with edits that were not saved.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // On a phone the editor sits below the list. Scroll to it once it has rendered; scrolling before
  // the render would stop short, because the page is still as tall as the list.
  useEffect(() => {
    if (!scrollPending.current) return;
    scrollPending.current = false;
    if (window.innerWidth < 1024) editorRef.current?.scrollIntoView({ block: 'start' });
  }, [mode, activeSlug]);

  /* ---------- open / close ---------- */

  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    destructive: boolean;
    onConfirm: () => void;
  } | null>(null);

  const runIfClean = (action: () => void) => {
    if (!dirty) {
      action();
      return;
    }
    setPendingConfirm({
      title: 'Leave without saving?',
      description: 'You have unsaved changes on this page. Leaving will discard them.',
      confirmLabel: 'Leave page',
      destructive: true,
      onConfirm: action,
    });
  };

  const applyOpen = (page: PageRecord) => {
    const next = toValues(page);
    setMode('edit');
    setActiveSlug(page.slug);
    setValues(next);
    setSaved(next);
    setSlugTouched(true);
    setSlugLocked(true);
    setError('');
    setMessage('');
    scrollPending.current = true;
  };

  const open = (page: PageRecord) => {
    if (isEdit && activeSlug === page.slug) return;
    runIfClean(() => applyOpen(page));
  };

  const applyOpenNew = () => {
    setMode('new');
    setActiveSlug('');
    setValues(BLANK);
    setSaved(BLANK);
    setSlugTouched(false);
    setSlugLocked(false);
    setError('');
    setMessage('');
    scrollPending.current = true;
  };

  const openNew = () => {
    if (isNew && !dirty) {
      if (window.innerWidth < 1024) editorRef.current?.scrollIntoView({ block: 'start' });
      return;
    }
    runIfClean(applyOpenNew);
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

  const discard = () => {
    if (!dirty) return;
    setPendingConfirm({
      title: 'Discard changes?',
      description: 'Revert this page back to the last saved version.',
      confirmLabel: 'Discard',
      destructive: true,
      onConfirm: () => {
        setValues(saved);
        setSlugTouched(isEdit);
        setSlugLocked(isEdit);
        setError('');
        setMessage('');
      },
    });
  };

  /* ---------- field handlers ---------- */

  const changeTitle = (title: string) => {
    setValues((v) => ({ ...v, title, slug: slugTouched ? v.slug : slugify(title) }));
  };

  /* ---------- save ---------- */

  const effectiveSlug = slugify(values.slug || values.title);
  const slugChanged = isEdit && effectiveSlug !== activeSlug;
  const footerLabel = isEdit ? footerLabelFor(activeSlug) : undefined;

  const validate = (): string => {
    if (!values.title.trim()) return 'Title is required.';
    if (!effectiveSlug) return 'Slug is required.';
    if (!normalizeBody(values.body)) return 'Body is required.';
    if (values.title.trim().length > TITLE_MAX) return `Title must be ${TITLE_MAX} characters or fewer.`;
    if (normalizeBody(values.body).length > BODY_MAX) return 'Body must be 20,000 characters or fewer.';
    return '';
  };

  const submitPageSave = async () => {
    const payload = {
      slug: effectiveSlug,
      title: values.title.trim(),
      body: normalizeBody(values.body),
      metaDesc: values.metaDesc.trim(),
    };

    setSaving(true);
    try {
      const url = isNew ? '/api/admin/pages' : `/api/admin/pages/${encodeURIComponent(activeSlug)}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The page could not be saved.');

      const record: PageRecord = { ...payload, ...(data.page || {}) };
      setPages((current) =>
        sortPages(
          isNew
            ? [...current.filter((p) => p.slug !== record.slug), record]
            : current.map((p) => (p.slug === activeSlug ? record : p))
        )
      );

      const next = toValues(record);
      setMode('edit');
      setActiveSlug(record.slug);
      setValues(next);
      setSaved(next);
      setSlugTouched(true);
      setSlugLocked(true);
      setMessage(isNew ? 'Page created.' : 'Changes saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The page could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || mode === 'none') return;

    setError('');
    setMessage('');

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    if (slugChanged && footerLabel) {
      setPendingConfirm({
        title: 'Update footer-linked URL?',
        description:
          `The shop footer links to /pages/${activeSlug} ("${footerLabel}"). ` +
          `If you save the new address, that footer link will show "not found". Save anyway?`,
        confirmLabel: 'Save anyway',
        destructive: true,
        onConfirm: () => {
          void submitPageSave();
        },
      });
      return;
    }

    await submitPageSave();
  };

  /* ---------- derived text ---------- */

  const body = normalizeBody(values.body);
  const paragraphs = body ? body.split('\n\n') : [];
  const hasSingleBreaks = paragraphs.some((p) => p.includes('\n'));
  const bodyOver = body.length > BODY_MAX;
  const titleOver = values.title.trim().length > TITLE_MAX;
  const metaLength = values.metaDesc.trim().length;

  /* ---------- render ---------- */

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* ===== List ===== */}
      <aside className={`lg:col-span-4 ${cardClass}`} aria-label="Content pages">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-line">
          <h2 className={cardTitleClass}>All pages ({pages.length})</h2>
          <button
            type="button"
            onClick={openNew}
            className="bg-ink text-white px-4 min-h-[44px] text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800 transition whitespace-nowrap"
          >
            Add page
          </button>
        </div>

        {pages.length === 0 ? (
          <p className="p-6 text-xs text-ink-2">No pages yet. Use Add page to write the first one.</p>
        ) : (
          <ul className="divide-y divide-line">
            {pages.map((page) => {
              const active = isEdit && activeSlug === page.slug;
              return (
                <li
                  key={page.slug}
                  className={`flex items-stretch ${active ? 'bg-ground border-l-2 border-ink' : 'border-l-2 border-transparent'}`}
                >
                  <button
                    type="button"
                    onClick={() => open(page)}
                    aria-current={active ? 'true' : undefined}
                    className="flex-1 min-w-0 min-h-[44px] text-left px-4 py-3.5 hover:bg-neutral-50 transition"
                  >
                    <span className="block text-sm font-medium text-ink truncate">{page.title}</span>
                    <span className="block text-xs font-mono text-ink-2 truncate">/pages/{page.slug}</span>
                    <span className="block text-xs text-ink-2 mt-0.5">
                      {footerLabelFor(page.slug) ? 'Linked in footer' : 'Not in footer'}
                      {page.updatedAt ? ` · Updated ${formatDate(page.updatedAt)}` : ''}
                    </span>
                  </button>
                  <a
                    href={`/pages/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 min-w-[44px] flex items-center justify-center text-xs uppercase tracking-wider font-semibold text-ink-2 hover:text-ink underline whitespace-nowrap"
                    aria-label={`View ${page.title} on the shop`}
                  >
                    View
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {/* ===== Editor ===== */}
      <div ref={editorRef} className="lg:col-span-8 scroll-mt-28">
        {mode === 'none' ? (
          <div className={`${cardClass} p-8`}>
            <h2 className={`${cardTitleClass} mb-2`}>Edit a page</h2>
            <p className="text-xs text-ink-2 leading-relaxed max-w-md">
              Choose a page from the list to change its text, or add a new page. Saved changes show on the shop
              straight away.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSave} noValidate className={`${cardClass} p-6 text-xs`}>
            <div className="flex flex-wrap items-baseline justify-between gap-3 pb-2 mb-4 border-b border-line">
              <h2 className={cardTitleClass}>
                {isNew ? 'New page' : 'Edit page'}
                {dirty && <span className="ml-3 text-xs font-sans font-semibold text-amber-800">Unsaved changes</span>}
              </h2>
              {isEdit && (
                <a
                  href={`/pages/${activeSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="uppercase tracking-wider font-semibold text-ink-2 hover:text-ink underline min-h-[44px] inline-flex items-center"
                >
                  View live page ↗
                </a>
              )}
            </div>

            {error && (
              <p role="alert" className="mb-5 text-xs text-red-700 bg-red-50 p-3 border border-red-200">
                {error}
              </p>
            )}
            {message && (
              <p
                role="status"
                className="mb-5 text-xs font-semibold text-emerald-800 bg-emerald-50 p-3 border border-emerald-200"
              >
                {message}
              </p>
            )}

            <div className="space-y-5">
              {/* Title */}
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="pg-title" className={labelClass}>
                    Title *
                  </label>
                  <span className={`text-xs ${titleOver ? 'text-red-700 font-semibold' : 'text-ink-2'}`}>
                    {values.title.length} / {TITLE_MAX}
                  </span>
                </div>
                <input
                  id="pg-title"
                  type="text"
                  value={values.title}
                  onChange={(e) => changeTitle(e.target.value)}
                  placeholder="e.g. Shipping & Returns Policy"
                  className={inputClass}
                />
                <p className="text-xs text-ink-2 mt-1">Shown as the heading at the top of the page.</p>
              </div>

              {/* Slug */}
              <div>
                <label htmlFor="pg-slug" className={labelClass}>
                  Slug (web address)
                </label>
                <div className="flex gap-2">
                  <input
                    id="pg-slug"
                    type="text"
                    value={values.slug}
                    readOnly={slugLocked}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setValues((v) => ({ ...v, slug: e.target.value }));
                    }}
                    onBlur={() => setValues((v) => ({ ...v, slug: slugify(v.slug) }))}
                    placeholder="created from the title"
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
                  Page address: /pages/{effectiveSlug || '...'}
                </p>
                {isEdit && !slugLocked && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2 mt-2">
                    {footerLabel ? (
                      <>
                        The shop footer links to /pages/{activeSlug} (&ldquo;{footerLabel}&rdquo;). If you change the
                        slug, that footer link shows &ldquo;not found&rdquo; until a developer updates it. There is
                        no automatic redirect.
                      </>
                    ) : (
                      <>
                        Changing the slug changes the page address. Any link or bookmark that uses the old address
                        stops working. There is no automatic redirect.
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Body */}
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="pg-body" className={labelClass}>
                    Body *
                  </label>
                  <span className={`text-xs ${bodyOver ? 'text-red-700 font-semibold' : 'text-ink-2'}`}>
                    {body.length.toLocaleString('en-US')} / {BODY_MAX.toLocaleString('en-US')}
                  </span>
                </div>
                <textarea
                  id="pg-body"
                  value={values.body}
                  onChange={(e) => setValues((v) => ({ ...v, body: e.target.value }))}
                  rows={16}
                  className={`${inputClass} leading-relaxed resize-y`}
                />
                <p className="text-xs text-ink-2 mt-1">
                  Plain text only. Leave an empty line between paragraphs. A single line break is not kept, so the
                  lines on either side of it join into one paragraph.
                  {paragraphs.length > 0 && ` This page will show ${paragraphs.length} paragraph${paragraphs.length === 1 ? '' : 's'}.`}
                </p>
                {hasSingleBreaks && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2 mt-2">
                    Some lines are separated by a single line break. On the shop they will run together as one
                    paragraph. Add an empty line between them to keep them apart.
                  </p>
                )}
              </div>

              {/* Meta description */}
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="pg-meta" className={labelClass}>
                    Meta description
                  </label>
                  <span className="text-xs text-ink-2">
                    {metaLength} / about {META_SOFT_MAX}
                  </span>
                </div>
                <textarea
                  id="pg-meta"
                  value={values.metaDesc}
                  onChange={(e) => setValues((v) => ({ ...v, metaDesc: e.target.value }))}
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
                <p className="text-xs text-ink-2 mt-1">
                  Optional. The short summary search engines show under the page title. If empty, a standard
                  sentence is used.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-line flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-ink text-white px-8 min-h-[44px] py-3 uppercase tracking-wider text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40 transition"
              >
                {saving ? 'Saving...' : isNew ? 'Create page' : 'Save changes'}
              </button>
              {isEdit && (
                <button
                  type="button"
                  onClick={discard}
                  disabled={!dirty || saving}
                  className="px-4 min-h-[44px] py-3 border border-line text-ink-2 hover:border-ink hover:text-ink uppercase tracking-wider font-semibold disabled:opacity-40 transition"
                >
                  Discard changes
                </button>
              )}
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="sm:ml-auto min-h-[44px] px-2 text-ink-2 hover:text-ink underline uppercase tracking-wider font-semibold disabled:opacity-40"
              >
                {isNew ? 'Cancel' : 'Close'}
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        onOpenChange={(openState) => {
          if (!openState) setPendingConfirm(null);
        }}
        title={pendingConfirm?.title || ''}
        description={pendingConfirm?.description || ''}
        confirmLabel={pendingConfirm?.confirmLabel || 'Confirm'}
        destructive={pendingConfirm?.destructive ?? true}
        onConfirm={() => pendingConfirm?.onConfirm()}
      />
    </div>
  );
}
