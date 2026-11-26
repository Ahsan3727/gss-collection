// Shared by the browser reporter (components/store/WebVitals.tsx) and the
// collector route (app/api/vitals/route.ts). Keep this file free of heavy
// imports: it is bundled into the storefront JavaScript.

export const VITALS_ENDPOINT = '/api/vitals';

// Share of page loads that report. 1 = every visit. Lower it (for example 0.25)
// only if traffic grows enough that the collection fills the database.
export const VITALS_SAMPLE_RATE = 1;

export const VITAL_NAMES = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB', 'FID'] as const;
export type VitalName = (typeof VITAL_NAMES)[number];

export function isVitalName(name: string): name is VitalName {
  return (VITAL_NAMES as readonly string[]).includes(name);
}

// Route patterns instead of raw URLs. This keeps the number of distinct values
// small (so p75 per page type is meaningful) and keeps order numbers and search
// terms out of the stored data.
export const VITAL_ROUTES = [
  '/',
  '/collections/[handle]',
  '/products/[handle]',
  '/cart',
  '/checkout',
  '/order/[orderNo]',
  '/search',
  '/track-order',
  '/wishlist',
  '/pages/[slug]',
  '/other',
] as const;
export type VitalRoute = (typeof VITAL_ROUTES)[number];

const ROUTE_PATTERNS: Array<[RegExp, VitalRoute]> = [
  [/^\/collections\/[^/]+\/?$/, '/collections/[handle]'],
  [/^\/products\/[^/]+\/?$/, '/products/[handle]'],
  [/^\/order\/[^/]+\/?$/, '/order/[orderNo]'],
  [/^\/pages\/[^/]+\/?$/, '/pages/[slug]'],
];

const STATIC_ROUTES: ReadonlySet<string> = new Set([
  '/cart',
  '/checkout',
  '/search',
  '/track-order',
  '/wishlist',
]);

export function routeFromPath(pathname: string): VitalRoute {
  const path = pathname.split(/[?#]/)[0] || '/';
  if (path === '/') return '/';
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path;
  if (STATIC_ROUTES.has(trimmed)) return trimmed as VitalRoute;
  for (const [pattern, route] of ROUTE_PATTERNS) {
    if (pattern.test(path)) return route;
  }
  return '/other';
}

export type VitalRating = 'good' | 'needs-improvement' | 'poor';

// Google's published thresholds: [good up to, poor from].
const THRESHOLDS: Record<VitalName, [number, number]> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
  FID: [100, 300],
};

// Computed here instead of trusting a value sent by the browser.
export function ratingFor(name: VitalName, value: number): VitalRating {
  const [good, poor] = THRESHOLDS[name];
  if (value <= good) return 'good';
  if (value > poor) return 'poor';
  return 'needs-improvement';
}
