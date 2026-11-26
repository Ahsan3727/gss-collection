import { STONES } from '@/lib/constants';
import {
  CATEGORY_TARGET_TYPES,
  HOME_KIND_FILTERS,
  PRODUCT_KINDS,
  type CategoryTargetType,
  type HomeKindFilter,
  type ProductKind,
} from '@/lib/types';

export const CATEGORY_LIMITS = {
  nameMin: 2,
  nameMax: 60,
  slugMin: 2,
  slugMax: 60,
  subtitleMax: 60,
  descriptionMax: 300,
} as const;

export const RESERVED_COLLECTION_SLUGS = new Set([
  'all',
  'new-arrivals',
  'best-sellers',
  'sale',
]);

export function slugifyCategory(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CATEGORY_LIMITS.slugMax);
}

/**
 * Checks whether a candidate category slug collides with built-in collection views or gemstone filters.
 */
export function isReservedCategorySlug(slug: string): boolean {
  const clean = slug.toLowerCase().trim();
  if (!clean) return false;
  if (RESERVED_COLLECTION_SLUGS.has(clean)) return true;
  if (Object.prototype.hasOwnProperty.call(STONES, clean)) return true;
  return Object.values(STONES).some((stone) => stone.handle === clean);
}

export interface CategoryWriteInput {
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

export function parseCategoryWrite(body: unknown): { data: CategoryWriteInput } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Category details are required.' };
  }

  const input = body as Record<string, unknown>;
  const name = String(input.name || '').trim();
  const targetType = String(input.targetType || 'collection');
  const rawPageSlug = String(input.pageSlug || '').trim();
  const pageSlug = rawPageSlug ? slugifyCategory(rawPageSlug) : '';
  const slug = slugifyCategory(String(input.slug || name || pageSlug));
  const subtitle = String(input.subtitle || '').trim();
  const description = String(input.description || '').trim();
  const rawKind = String(input.defaultKind || 'ring');
  const rawFilter = String(input.homeKindFilter || 'all');
  const rawSort = input.sortOrder === undefined || input.sortOrder === '' ? 0 : Number(input.sortOrder);

  if (!CATEGORY_TARGET_TYPES.includes(targetType as CategoryTargetType)) {
    return { error: 'Category type must be collection or page.' };
  }
  if (name.length < CATEGORY_LIMITS.nameMin) {
    return { error: `Category name must be at least ${CATEGORY_LIMITS.nameMin} characters.` };
  }
  if (name.length > CATEGORY_LIMITS.nameMax) {
    return { error: `Category name must be ${CATEGORY_LIMITS.nameMax} characters or fewer.` };
  }
  if (slug.length < CATEGORY_LIMITS.slugMin || !/^[a-z0-9-]+$/.test(slug)) {
    return { error: 'Category web address must be at least 2 lowercase letters, numbers, or hyphens.' };
  }
  if (isReservedCategorySlug(slug)) {
    return {
      error: `"${slug}" is already reserved by a gemstone or special collection route. Pick another web address.`,
    };
  }
  if (targetType === 'page' && !pageSlug) {
    return { error: 'Select a CMS page to link when Category Type is CMS Page Link.' };
  }
  if (pageSlug && !/^[a-z0-9-]+$/.test(pageSlug)) {
    return { error: 'Linked page slug must use lowercase letters, numbers, and hyphens only.' };
  }
  if (subtitle.length > CATEGORY_LIMITS.subtitleMax) {
    return { error: `Subtitle must be ${CATEGORY_LIMITS.subtitleMax} characters or fewer.` };
  }
  if (description.length > CATEGORY_LIMITS.descriptionMax) {
    return { error: `Description must be ${CATEGORY_LIMITS.descriptionMax} characters or fewer.` };
  }
  if (!PRODUCT_KINDS.includes(rawKind as ProductKind)) {
    return { error: 'Default item type must be ring, bracelet, or stone.' };
  }
  if (!HOME_KIND_FILTERS.includes(rawFilter as HomeKindFilter)) {
    return { error: 'Homepage filter must be all, ring, bracelet, or stone.' };
  }
  if (!Number.isFinite(rawSort)) {
    return { error: 'Sort order must be a valid number.' };
  }

  const normalizedType = targetType as CategoryTargetType;
  return {
    data: {
      name,
      slug,
      subtitle,
      description,
      targetType: normalizedType,
      pageSlug,
      defaultKind: rawKind as ProductKind,
      homeKindFilter: rawFilter as HomeKindFilter,
      sortOrder: Math.max(-999, Math.min(999, Math.round(rawSort))),
      showInNav: input.showInNav === undefined ? true : Boolean(input.showInNav),
      showOnHome:
        normalizedType === 'page'
          ? false
          : input.showOnHome === undefined
            ? true
            : Boolean(input.showOnHome),
      active: input.active === undefined ? true : Boolean(input.active),
    },
  };
}
