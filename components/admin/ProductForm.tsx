'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STONES, SIZE_MM } from '@/lib/constants';
import { formatMoney } from '@/lib/money';
import { uploadAdminImage } from '@/lib/client-image';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { DEFAULT_RING_SIZES, type RingSizesConfig } from '@/lib/types';

// Do not import from '@/lib/product-write' here: it pulls mongoose into the browser bundle.
// The rules below mirror parseProductWrite(), which stays the final authority on the server.

type Category = string;
type Kind = 'ring' | 'bracelet' | 'stone';
type Status = 'active' | 'draft' | 'archived';

export interface ProductCategoryOption {
  slug: string;
  name: string;
  defaultKind?: Kind;
}

export interface ProductFormValues {
  title: string;
  handle: string;
  cat: Category;
  kind: Kind;
  desc: string;
  base: string;
  compareAt: string;
  stones: string[];
  sizes: string[];
  stock: Record<string, number>;
  status: Status;
  photos: string[];
}

interface ProductFormProps {
  mode: 'create' | 'edit';
  /** Required in edit mode: the product id or handle used in /api/products/[id]. */
  productId?: string;
  /** Edit mode: the product as saved. Create mode starts from an empty draft. */
  initial?: ProductFormValues;
  /** Edit mode: per-stone price differences already stored on the product (read only). */
  stoneDeltas?: Record<string, number>;
  /** Dynamic categories loaded from Admin Categories. */
  categories?: ProductCategoryOption[];
  /** Optional initial category slug when launched via /admin/categories. */
  initialCat?: string;
  /** Admin-saved ring size presets for Ladies & Gents rings. */
  ringSizes?: RingSizesConfig;
}

const FALLBACK_CATEGORIES: ProductCategoryOption[] = [
  { slug: 'ladies', name: 'Ladies Rings', defaultKind: 'ring' },
  { slug: 'gents', name: 'Gents Rings', defaultKind: 'ring' },
  { slug: 'gems', name: 'Natural Gems & Bracelets', defaultKind: 'stone' },
];

const KINDS: { value: Kind; label: string }[] = [
  { value: 'ring', label: 'Ring' },
  { value: 'bracelet', label: 'Bracelet' },
  { value: 'stone', label: 'Loose stone' },
];

const STATUS_OPTIONS: { value: Status; label: string; hint: string }[] = [
  { value: 'draft', label: 'Draft', hint: 'Hidden from the shop.' },
  { value: 'active', label: 'Active', hint: 'Visible and can be ordered.' },
  { value: 'archived', label: 'Archived', hint: 'Hidden. Past orders still work.' },
];

const RING_SIZES = Object.keys(SIZE_MM);
const FALLBACK_RING_PRESET = ['5', '6', '7'];
const FIXED_SIZE: Record<Exclude<Kind, 'ring'>, string> = { bracelet: 'adj', stone: 'one' };
const KNOWN_STONES = Object.keys(STONES);

const labelClass = 'block uppercase tracking-wider font-semibold text-ink mb-1';
const inputClass =
  'w-full px-3 py-2 min-h-[44px] border border-line text-base md:text-sm bg-white focus:outline-none focus:border-ink';
const cardClass = 'bg-white border border-line p-6 shadow-sm';
const cardTitleClass = 'font-display text-xl font-normal text-ink mb-4 pb-2 border-b border-line';

function blankValues(
  categoryOptions: ProductCategoryOption[],
  initialCat: string | undefined,
  presetSizesForCat: (catSlug: string) => string[]
): ProductFormValues {
  const matched =
    (initialCat && categoryOptions.find((c) => c.slug === initialCat)) || categoryOptions[0];
  const catSlug = matched?.slug || 'ladies';
  const kind: Kind = matched?.defaultKind || 'ring';
  const sizes = kind === 'ring' ? presetSizesForCat(catSlug) : [FIXED_SIZE[kind]];
  return {
    title: '',
    handle: '',
    cat: catSlug,
    kind,
    desc: '',
    base: '',
    compareAt: '',
    stones: [],
    sizes,
    stock: {},
    status: 'draft',
    photos: [],
  };
}

// Same rule as slugifyHandle() on the server.
function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function stockKey(stone: string, size: string) {
  return `${stone}:${size}`;
}

function sizeLabel(size: string) {
  if (size === 'adj') return 'Adjustable';
  if (size === 'one') return 'Single';
  return size;
}

function stoneName(stone: string) {
  return STONES[stone]?.name ?? stone.charAt(0).toUpperCase() + stone.slice(1);
}

function sortSizes(sizes: string[], knownOrder: string[]) {
  const rank = (size: string) => {
    const num = Number(size);
    if (Number.isFinite(num) && size.trim() !== '') return num;
    const at = knownOrder.indexOf(size);
    return 1000 + (at === -1 ? knownOrder.length : at);
  };
  return [...sizes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export default function ProductForm({
  mode,
  productId,
  initial,
  stoneDeltas = {},
  categories,
  initialCat,
  ringSizes,
}: ProductFormProps) {
  const router = useRouter();
  const isEdit = mode === 'edit';

  const savedLadiesSizes = useMemo(
    () => (ringSizes?.ladies?.length ? ringSizes.ladies : DEFAULT_RING_SIZES.ladies).map((r) => r.size),
    [ringSizes]
  );
  const savedGentsSizes = useMemo(
    () => (ringSizes?.gents?.length ? ringSizes.gents : DEFAULT_RING_SIZES.gents).map((r) => r.size),
    [ringSizes]
  );

  const presetSizesForCat = useMemo(
    () => (catSlug: string) => {
      if (catSlug === 'gents') return [...savedGentsSizes];
      if (catSlug === 'ladies') return [...savedLadiesSizes];
      return [...FALLBACK_RING_PRESET];
    },
    [savedLadiesSizes, savedGentsSizes]
  );

  const categoryOptions = useMemo(() => {
    const base = categories && categories.length > 0 ? categories : FALLBACK_CATEGORIES;
    if (initial?.cat && !base.some((c) => c.slug === initial.cat)) {
      return [...base, { slug: initial.cat, name: initial.cat }];
    }
    return base;
  }, [categories, initial?.cat]);

  const initialValues = useMemo(
    () => initial ?? blankValues(categoryOptions, initialCat, presetSizesForCat),
    [initial, categoryOptions, initialCat, presetSizesForCat]
  );

  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialValues));
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [handleTouched, setHandleTouched] = useState(isEdit);
  const [handleLocked, setHandleLocked] = useState(isEdit);
  const [customStone, setCustomStone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const dirty = useMemo(() => JSON.stringify(values) !== savedSnapshot, [values, savedSnapshot]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const busy = saving || uploading;
  const baseNum = Number(values.base);
  const hasBase = Number.isFinite(baseNum) && baseNum > 0;
  const compareNum = Number(values.compareAt);
  const stoneOptions = Array.from(new Set([...KNOWN_STONES, ...values.stones]));
  const knownSizePool = Array.from(
    new Set([...RING_SIZES, ...savedLadiesSizes, ...savedGentsSizes, ...values.sizes])
  );
  const sizeOptions = sortSizes(knownSizePool, knownSizePool);

  const scrollTop = () => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stonePrice = (stone: string) => {
    if (!hasBase) return '';
    const delta = stoneDeltas[stone] ?? STONES[stone]?.delta ?? 0;
    return formatMoney(baseNum + delta);
  };

  /* ---------- field handlers ---------- */

  const changeTitle = (title: string) => {
    setValues((v) => ({ ...v, title, handle: handleTouched ? v.handle : slugify(title) }));
  };

  const changeCat = (catSlug: string) => {
    setValues((v) => {
      if (isEdit) return { ...v, cat: catSlug };
      const chosen = categoryOptions.find((c) => c.slug === catSlug);
      const nextKind = chosen?.defaultKind ?? v.kind;
      const nextSizes =
        nextKind === 'ring' ? presetSizesForCat(catSlug) : [FIXED_SIZE[nextKind]];
      return { ...v, cat: catSlug, kind: nextKind, sizes: nextSizes };
    });
  };

  const changeKind = (kind: Kind) => {
    setValues((v) => {
      if (v.kind === kind) return v;
      const sizes = kind === 'ring' ? presetSizesForCat(v.cat) : [FIXED_SIZE[kind]];
      return { ...v, kind, sizes };
    });
  };

  const toggleStone = (stone: string) => {
    setValues((v) => ({
      ...v,
      stones: v.stones.includes(stone) ? v.stones.filter((s) => s !== stone) : [...v.stones, stone],
    }));
  };

  const addCustomStone = () => {
    const name = customStone.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!name) {
      setError('Stone names use lowercase letters and numbers only.');
      return;
    }
    setError('');
    setValues((v) => (v.stones.includes(name) ? v : { ...v, stones: [...v.stones, name] }));
    setCustomStone('');
  };

  const toggleSize = (size: string) => {
    setValues((v) => ({
      ...v,
      sizes: sortSizes(
        v.sizes.includes(size) ? v.sizes.filter((s) => s !== size) : [...v.sizes, size],
        knownSizePool
      ),
    }));
  };

  const setStock = (key: string, raw: string) => {
    const amount = Math.max(0, Math.floor(Number(raw)) || 0);
    setValues((v) => ({ ...v, stock: { ...v.stock, [key]: amount } }));
  };

  /* ---------- photos ---------- */

  const makeCover = (index: number) => {
    setValues((v) => {
      const next = [...v.photos];
      const [photo] = next.splice(index, 1);
      next.unshift(photo);
      return { ...v, photos: next };
    });
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    setValues((v) => {
      const target = index + direction;
      if (target < 0 || target >= v.photos.length) return v;
      const next = [...v.photos];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...v, photos: next };
    });
  };

  const removePhoto = (index: number) => {
    setValues((v) => ({ ...v, photos: v.photos.filter((_, i) => i !== index) }));
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    setError('');
    setMessage('');
    setUploading(true);
    const problems: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStatus(`Uploading ${i + 1} of ${files.length}...`);

      try {
        const uploaded = await uploadAdminImage(file, 'products');
        setValues((v) =>
          v.photos.includes(uploaded.url) ? v : { ...v, photos: [...v.photos, uploaded.url] }
        );
      } catch (err: unknown) {
        problems.push(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed.'}`);
      }
    }

    setUploading(false);
    setUploadStatus('');
    if (problems.length) setError(problems.join(' '));
  };

  /* ---------- save / archive ---------- */

  const validate = () => {
    if (!values.title.trim()) return 'Title is required.';
    if (!slugify(values.handle || values.title)) return 'Handle is required.';
    if (!values.desc.trim()) return 'Description is required.';
    if (!hasBase) return 'Base price must be greater than zero.';
    if (values.compareAt.trim() !== '' && !(Number.isFinite(compareNum) && compareNum > 0)) {
      return 'Compare-at price must be greater than zero.';
    }
    if (!values.stones.length) return 'Select at least one stone.';
    if (!values.sizes.length) return 'Select at least one size.';
    if (!values.photos.length) return 'Upload at least one photo.';
    return '';
  };

  const buildPayload = () => {
    // Send only the stone and size combinations that exist.
    const stock: Record<string, number> = {};
    for (const stone of values.stones) {
      for (const size of values.sizes) {
        const key = stockKey(stone, size);
        stock[key] = values.stock[key] ?? 0;
      }
    }
    return {
      title: values.title.trim(),
      handle: slugify(values.handle || values.title),
      cat: values.cat,
      kind: values.kind,
      desc: values.desc.trim(),
      base: baseNum,
      compareAt: values.compareAt.trim() === '' ? undefined : compareNum,
      stones: values.stones,
      sizes: values.sizes,
      stock,
      status: values.status,
      photos: values.photos,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    setError('');
    setMessage('');
    const problem = validate();
    if (problem) {
      setError(problem);
      scrollTop();
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      const url = isEdit ? `/api/products/${encodeURIComponent(productId || '')}` : '/api/products';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The product could not be saved.');

      if (isEdit) {
        const nextValues = { ...values, handle: payload.handle };
        setValues(nextValues);
        setSavedSnapshot(JSON.stringify(nextValues));
        setHandleLocked(true);
        setMessage('Product saved.');
        scrollTop();
        router.refresh();
      } else {
        setSavedSnapshot(JSON.stringify(values));
        router.push('/admin/products');
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The product could not be saved.');
      scrollTop();
    } finally {
      setSaving(false);
    }
  };

  const performArchive = async () => {
    if (!isEdit || busy) return;

    setError('');
    setMessage('');
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(productId || '')}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The product could not be archived.');
      setSavedSnapshot(JSON.stringify(values));
      router.push('/admin/products');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The product could not be archived.');
      scrollTop();
      setSaving(false);
    }
  };

  /* ---------- render ---------- */

  const chipClass = (selected: boolean) =>
    `px-3.5 min-h-[44px] inline-flex items-center text-xs border transition ${selected ? 'bg-ink text-white border-ink font-semibold' : 'border-line text-ink-2 hover:border-neutral-400'
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="text-xs">
      {error && (
        <p role="alert" className="mb-6 text-xs text-red-700 bg-red-50 p-3 border border-red-200">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mb-6 text-xs font-semibold text-emerald-800 bg-emerald-50 p-3 border border-emerald-200">
          {message}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ===== Main column ===== */}
        <div className="lg:col-span-8 space-y-8">
          {/* Details */}
          <section className={cardClass}>
            <h2 className={cardTitleClass}>Details</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="pf-title" className={labelClass}>
                  Title *
                </label>
                <input
                  id="pf-title"
                  type="text"
                  value={values.title}
                  onChange={(e) => changeTitle(e.target.value)}
                  placeholder="e.g. Crimson Halo Ring"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="pf-handle" className={labelClass}>
                  Handle (web address)
                </label>
                <div className="flex gap-2">
                  <input
                    id="pf-handle"
                    type="text"
                    value={values.handle}
                    readOnly={handleLocked}
                    onChange={(e) => {
                      setHandleTouched(true);
                      setValues((v) => ({ ...v, handle: e.target.value }));
                    }}
                    onBlur={() => setValues((v) => ({ ...v, handle: slugify(v.handle) }))}
                    placeholder="created from the title"
                    className={`${inputClass} font-mono ${handleLocked ? 'bg-ground text-ink-2' : ''}`}
                  />
                  {handleLocked && (
                    <button
                      type="button"
                      onClick={() => setHandleLocked(false)}
                      className="px-3 border border-line text-ink-2 hover:border-ink hover:text-ink uppercase tracking-wider font-semibold whitespace-nowrap"
                    >
                      Change
                    </button>
                  )}
                </div>
                <p className="text-xs text-ink-2 mt-1">
                  Shop address: /products/{slugify(values.handle || values.title) || '...'}
                </p>
                {isEdit && !handleLocked && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2 mt-2">
                    Changing the handle changes the product link and its SKUs. Saved wishlists and bookmarks that use
                    the old link stop working, and a customer who already has this product in a cart should refresh
                    the page before ordering.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="pf-desc" className={labelClass}>
                  Description *
                </label>
                <textarea
                  id="pf-desc"
                  rows={6}
                  value={values.desc}
                  onChange={(e) => setValues((v) => ({ ...v, desc: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Photos */}
          <section className={cardClass}>
            <h2 className={cardTitleClass}>Photos *</h2>

            {values.photos.length > 0 ? (
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                {values.photos.map((photo, index) => (
                  <li key={photo} className="border border-line bg-ground">
                    <div className="relative aspect-square bg-mist overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt={`Product photo ${index + 1}`} className="w-full h-full object-cover" />
                      {index === 0 && (
                        <span className="absolute top-2 left-2 bg-ink text-white text-xs uppercase tracking-wider font-semibold px-2 py-0.5">
                          Cover
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1 p-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => movePhoto(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move photo ${index + 1} earlier`}
                          className="min-w-[44px] min-h-[44px] border border-line bg-white hover:border-ink disabled:opacity-30"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => movePhoto(index, 1)}
                          disabled={index === values.photos.length - 1}
                          aria-label={`Move photo ${index + 1} later`}
                          className="min-w-[44px] min-h-[44px] border border-line bg-white hover:border-ink disabled:opacity-30"
                        >
                          →
                        </button>
                      </div>
                      <div className="flex gap-2 text-xs font-semibold">
                        {index !== 0 && (
                          <button type="button" onClick={() => makeCover(index)} className="min-h-[44px] px-1 underline text-ink-2 hover:text-ink">
                            Cover
                          </button>
                        )}
                        <button type="button" onClick={() => removePhoto(index)} className="min-h-[44px] px-1 underline text-red-700 hover:text-red-900">
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-ink-2 bg-ground border border-dashed border-line p-6 text-center">
                No photos yet. Upload at least one, even for a draft.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="pf-photos"
                className={`inline-flex items-center min-h-[44px] px-4 py-2.5 border border-ink text-ink uppercase tracking-wider font-semibold cursor-pointer hover:bg-ground ${uploading ? 'opacity-40 pointer-events-none' : ''
                  }`}
              >
                {uploading ? 'Uploading...' : 'Upload photos'}
              </label>
              <input
                id="pf-photos"
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={handleFiles}
                className="sr-only"
              />
              {uploadStatus && <span className="text-ink-2">{uploadStatus}</span>}
            </div>
            <p className="text-xs text-ink-2 mt-3">
              The first photo is the cover shown in the shop. Large photos are resized in your browser before upload.
            </p>
          </section>

          {/* Stock */}
          <section className={cardClass}>
            <h2 className={cardTitleClass}>Stock</h2>
            <p className="text-ink-2 mb-4 leading-relaxed">
              {isEdit
                ? 'Saving replaces the stock of every stone and size with the numbers below. If orders arrived while this page was open, reload it first. For day-to-day changes use Inventory.'
                : 'Starting stock for each stone and size. After launch, change stock in Inventory.'}
            </p>

            {values.stones.length > 0 && values.sizes.length > 0 ? (
              <div className="overflow-x-auto border border-line">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-ground border-b border-line uppercase text-xs tracking-wider text-ink-2">
                      <th className="py-3 px-4 font-semibold">Stone</th>
                      {values.sizes.map((size) => (
                        <th key={size} className="py-3 px-3 font-semibold text-center">
                          {sizeLabel(size)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {values.stones.map((stone) => (
                      <tr key={stone}>
                        <td className="py-3 px-4">
                          <span className="font-medium text-ink block">{stoneName(stone)}</span>
                          {stonePrice(stone) && <span className="text-xs text-ink-2">{stonePrice(stone)}</span>}
                        </td>
                        {values.sizes.map((size) => {
                          const key = stockKey(stone, size);
                          return (
                            <td key={size} className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={values.stock[key] ?? 0}
                                onChange={(e) => setStock(key, e.target.value)}
                                aria-label={`Stock for ${stoneName(stone)}, ${sizeLabel(size)}`}
                                className="w-16 px-2 min-h-[44px] border border-line text-base md:text-xs font-semibold text-center focus:outline-none focus:border-ink"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-ink-2 bg-ground border border-dashed border-line p-6 text-center">
                Choose at least one stone and one size to set stock.
              </p>
            )}
          </section>
        </div>

        {/* ===== Side column ===== */}
        <div className="lg:col-span-4 space-y-8">
          {/* Status + actions */}
          <section className={cardClass}>
            <h2 className={cardTitleClass}>Status</h2>
            <label htmlFor="pf-status" className={labelClass}>
              Visibility
            </label>
            <select
              id="pf-status"
              value={values.status}
              onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as Status }))}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-2 mt-1">
              {STATUS_OPTIONS.find((option) => option.value === values.status)?.hint}
            </p>

            <button
              type="submit"
              disabled={busy}
              className="w-full mt-5 bg-ink text-white min-h-[44px] py-3 uppercase tracking-wider text-xs font-semibold hover:bg-neutral-800 disabled:opacity-40 transition"
            >
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create product'}
            </button>
            <Link
              href="/admin/products"
              className="flex items-center justify-center min-h-[44px] mt-2 text-ink-2 underline hover:text-ink uppercase tracking-wider font-semibold"
            >
              Cancel
            </Link>
            {isEdit && values.status !== 'archived' && (
              <button
                type="button"
                onClick={() => setArchiveOpen(true)}
                disabled={busy}
                className="w-full mt-4 pt-4 min-h-[44px] border-t border-line text-red-700 hover:text-red-900 uppercase tracking-wider font-semibold disabled:opacity-40"
              >
                Archive product
              </button>
            )}
          </section>

          {/* Organisation */}
          <section className={cardClass}>
            <h2 className={cardTitleClass}>Type</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <label htmlFor="pf-cat" className="block uppercase tracking-wider font-semibold text-ink">
                    Category *
                  </label>
                  <Link href="/admin/categories" className="text-xs underline text-ink-2 hover:text-ink">
                    Manage categories
                  </Link>
                </div>
                <select
                  id="pf-cat"
                  value={values.cat}
                  onChange={(e) => changeCat(e.target.value)}
                  className={inputClass}
                >
                  {categoryOptions.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-ink-2 mt-1">
                  Category address: <span className="font-mono text-ink">/collections/{values.cat}</span>
                </p>
              </div>
              <div>
                <label htmlFor="pf-kind" className={labelClass}>
                  Kind *
                </label>
                <select
                  id="pf-kind"
                  value={values.kind}
                  onChange={(e) => changeKind(e.target.value as Kind)}
                  className={inputClass}
                >
                  {KINDS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {isEdit && (
                  <p className="text-xs text-ink-2 mt-1">
                    Changing the kind resets the sizes, so check the stock table afterwards.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className={cardClass}>
            <h2 className={cardTitleClass}>Pricing</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="pf-base" className={labelClass}>
                  Base price (PKR) *
                </label>
                <input
                  id="pf-base"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={values.base}
                  onChange={(e) => setValues((v) => ({ ...v, base: e.target.value }))}
                  className={inputClass}
                />
                <p className="text-xs text-ink-2 mt-1">
                  Some stones add to this price (for example Turquoise and Emerald). The stock table shows each final price.
                </p>
              </div>
              <div>
                <label htmlFor="pf-compare" className={labelClass}>
                  Compare-at price (PKR)
                </label>
                <input
                  id="pf-compare"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={values.compareAt}
                  onChange={(e) => setValues((v) => ({ ...v, compareAt: e.target.value }))}
                  placeholder="optional"
                  className={inputClass}
                />
                {values.compareAt.trim() !== '' && hasBase && compareNum <= baseNum && (
                  <p className="text-xs text-amber-800 mt-1">
                    The crossed-out price only shows when it is higher than the selling price.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Stones */}
          <section className={cardClass}>
            <h2 className={cardTitleClass}>Stones *</h2>
            <div className="flex flex-wrap gap-2">
              {stoneOptions.map((stone) => {
                const selected = values.stones.includes(stone);
                return (
                  <button
                    key={stone}
                    type="button"
                    onClick={() => toggleStone(stone)}
                    aria-pressed={selected}
                    className={chipClass(selected)}
                  >
                    {stoneName(stone)}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-4">
              <input
                type="text"
                value={customStone}
                onChange={(e) => setCustomStone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomStone();
                  }
                }}
                placeholder="Other stone, e.g. amethyst"
                aria-label="Add another stone"
                className={inputClass}
              />
              <button
                type="button"
                onClick={addCustomStone}
                className="px-4 min-h-[44px] border border-line text-ink-2 hover:border-ink hover:text-ink uppercase tracking-wider font-semibold"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-ink-2 mt-2">
              A stone that is not in the list above shows with a default colour in the shop.
            </p>
          </section>

          {/* Sizes */}
          <section className={cardClass}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4 pb-2 border-b border-line">
              <h2 className="font-display text-xl font-normal text-ink">Sizes *</h2>
              <Link href="/admin/pages" className="text-xs underline text-ink-2 hover:text-ink">
                Edit Size Guide ↗
              </Link>
            </div>
            {values.kind === 'ring' ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, sizes: [...savedLadiesSizes] }))}
                    className="px-3 min-h-[44px] border border-line bg-ground text-xs uppercase tracking-wider font-semibold text-ink hover:border-ink"
                  >
                    Use Ladies Sizes
                  </button>
                  <button
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, sizes: [...savedGentsSizes] }))}
                    className="px-3 min-h-[44px] border border-line bg-ground text-xs uppercase tracking-wider font-semibold text-ink hover:border-ink"
                  >
                    Use Gents Sizes
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((size) => {
                    const selected = values.sizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        aria-pressed={selected}
                        className={`min-w-[44px] min-h-[44px] px-2 flex items-center justify-center ${chipClass(selected)}`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-ink-2">
                {values.kind === 'bracelet'
                  ? 'Bracelets are sold in one adjustable size.'
                  : 'Loose stones are sold as a single piece.'}
              </p>
            )}
          </section>
        </div>
      </div>
      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this product?"
        description="It disappears from the shop, and past orders keep working. To bring it back later, set the status to Draft or Active and save."
        confirmLabel="Archive product"
        destructive
        onConfirm={() => {
          void performArchive();
        }}
      />
    </form>
  );
}
