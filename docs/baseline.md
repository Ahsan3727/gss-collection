# Baseline (Phase 0)

Purpose: record where the store stands **before** any 10/10 work, so every later phase can be compared against real numbers.

Rule: fill every `—` below on the **same Vercel preview/production URL** you will test later. Never measure on `next dev` or `localhost`; the numbers are meaningless there.

## 1. Status

| Phase 0 item | State | Who |
|---|---|---|
| Field data collection (Web Vitals → `/api/vitals`) | **Built.** Starts collecting after the next production deploy. | Code, done |
| Static audit of the plan's claims against the code | **Done**, results in section 5. | Code, done |
| `next build` First Load JS per route | **Measured (local production build, post-optimization).** See section 3.4. | Local build, done |
| Lighthouse mobile on 5 pages | **Not measured.** Needs the deployed site. | You, 20 min |
| Real Android phone on mobile data | **Not measured.** Needs a phone. | You, 15 min |
| Throttled DevTools run (Slow 4G, 4× CPU, 360 × 800) | **Not measured.** | You, 10 min |

Phase 0 is finished when every `—` in sections 2 to 4 has a number.

## 2. Before-table (one row per gate in plan Section 1)

| Gate | Target | Baseline | Source |
|---|---|---|---|
| Lighthouse mobile Performance, home | ≥ 90 | — | Section 3.2 |
| Lighthouse mobile Performance, collection | ≥ 90 | — | Section 3.2 |
| Lighthouse mobile Performance, product | ≥ 90 | — | Section 3.2 |
| Lighthouse mobile Performance, checkout | ≥ 90 | — | Section 3.2 |
| LCP p75 (field, mobile) | ≤ 2.5 s | — (collecting) | Section 4 |
| INP p75 (field, mobile) | ≤ 200 ms | — (collecting) | Section 4 |
| CLS p75 (field, mobile) | ≤ 0.1 | — (collecting) | Section 4 |
| Correctness: known order-flow bugs | 0 | At least 5 known from code (section 5) | Static audit |
| Mobile UX: product → order on 360 px, one hand | no zoom, no hidden error, no horizontal scroll | — | Section 3.3 |
| Accessibility: Lighthouse a11y | 100 | — | Section 3.2 |
| Accessibility: axe violations on key pages | 0 | — (no axe yet) | Phase 4 |
| SEO: Lighthouse SEO | ≥ 95 | — | Section 3.2 |
| SEO: sitemap and robots | live | Neither file exists (section 5) | Static audit |
| Security: durable rate limiting | yes | No (in-memory; no route used it before Phase 0) | Static audit |
| Admin: lists paginated and searchable | yes | — | Manual |
| Quality: tests on money paths | yes | 0 test files, no test script, no CI | Static audit |
| Quality: `any` in shared types | none | about 70 uses of `any` | Static audit |

## 3. How to measure

### 3.1 First Load JS per route

```bash
npm ci
# A build needs the production env vars. Use the real values locally, or dummy
# ones: pages here are dynamic, so the build itself does not read the database.
npm run build
```

Copy the route table printed at the end of the build (columns `Size` and `First Load JS`) into section 3.4. Keep the "First Load JS shared by all" line too.

### 3.2 Lighthouse (mobile)

Lighthouse's default is already the mobile profile: simulated Slow 4G and 4× CPU slowdown. Run it from a terminal against the deployed URL, five times in total:

```bash
npx lighthouse https://YOUR-SITE/ \
  --output=html --output=json --output-path=docs/baseline/home \
  --chrome-flags="--headless=new"
```

Pages to run (repeat with a different `--output-path` each time):

| Page | URL | Note |
|---|---|---|
| Home | `/` | |
| Collection | `/collections/all` | |
| Product | `/products/crimson-halo-ring` | Any active product works |
| Checkout | `/checkout` | The page shows an empty-bag message when the cart is empty. Use the Lighthouse tab in Chrome DevTools after adding one item to the bag, so the form is what gets tested. |
| Order confirmation | `/order/GSS-XXXX?t=TOKEN` | Use the real link from a test order. The `t` token is required. |

Save the generated files under `docs/baseline/` and commit them. Then fill the table:

| Page | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Home | — | — | — | — | — | — | — |
| Collection | — | — | — | — | — | — | — |
| Product | — | — | — | — | — | — | — |
| Checkout | — | — | — | — | — | — | — |
| Order confirmation | — | — | — | — | — | — | — |

Lighthouse scores vary by a few points between runs. Run each page three times and record the median.

### 3.3 Real Android phone, mobile data (not Wi-Fi)

Turn Wi-Fi off. Use a stopwatch. Clear site data first so the first load is a cold one.

| Measurement | Time |
|---|---|
| Open the home page until the first product photo is visible | — |
| Product page: tap "Add to bag" until the cart drawer shows the item | — |
| Checkout: first field tapped until the confirmation page appears | — |
| Whole journey: home → confirmed order | — |

Also note anything that made you hesitate, zoom, or scroll sideways. Those notes feed Phase 3.

### 3.4 Throttled DevTools run

Chrome DevTools → Performance (or Lighthouse tab) → device toolbar at 360 × 800 → Network "Slow 4G" → CPU "4× slowdown". Record the LCP element and the largest requests for home and product pages.

| Page | LCP element | Largest request | Total transferred |
|---|---|---|---|
| Home | — | — | — |
| Product | — | — | — |

Build output (from 3.1, local `next build` on 2026-11-26):

| Route | Size | First Load JS |
|---|---|---|
| `/` | 1.92 kB | 103 kB |
| `/collections/[handle]` | 1.92 kB | 103 kB |
| `/products/[handle]` | 10.5 kB | 112 kB |
| `/checkout` | 8.18 kB | 109 kB |
| `/order/[orderNo]` | 484 B | 102 kB |
| Shared by all | — | 87.4 kB |

## 4. Field data (Web Vitals from real visitors)

Collection is built in. After the next production deploy, every storefront page load sends LCP, INP, CLS, FCP, TTFB and FID to `POST /api/vitals`, which stores one small document per metric in the `webvitals` collection.

What it stores: metric name, value, rating, a route pattern such as `/products/[handle]` (never the real URL, so order numbers and search words are not kept), viewport width, and connection type. No IP address, cookie or user id. Documents delete themselves after 30 days.

What it skips: `/admin`, and any non-production build.

Read p75 per page type for the last 14 days, mobile only. Run it in MongoDB Atlas (Data Explorer → `gss_collection` → `webvitals` → Aggregations, or `mongosh`). It needs MongoDB 7.0 or newer for `$percentile`, which current Atlas clusters have. **This query was written without access to a database and has not been run. Check the first result against a few raw documents.**

```js
db.webvitals.aggregate([
  { $match: {
      createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
      viewportWidth: { $lte: 767 }
  } },
  { $sort: { createdAt: 1 } },
  // CLS and INP can be reported more than once per page load; keep the last.
  { $group: { _id: { id: '$metricId', name: '$name' }, route: { $last: '$route' }, value: { $last: '$value' } } },
  { $group: {
      _id: { name: '$_id.name', route: '$route' },
      samples: { $sum: 1 },
      p75: { $percentile: { input: '$value', p: [0.75], method: 'approximate' } }
  } },
  { $sort: { '_id.route': 1, '_id.name': 1 } }
])
```

Values are milliseconds, except CLS which has no unit. Ignore any route with fewer than about 30 samples.

Known limit: CLS and INP are reported when the visitor leaves or hides the page, so in a single-page navigation they are filed under the last route visited. For a small store that is acceptable; it is why Phase 10 also asks real customers to try the site.

Alternative: Vercel Speed Insights (`npm i @vercel/speed-insights`, then `<SpeedInsights />` in `app/layout.tsx`, then enable it in the Vercel dashboard) gives a ready-made p75 dashboard. It was not added here because installing a package changes `package-lock.json`, which should be done and committed from a machine with network access. The two can run side by side.

| Metric | p75 mobile (first 14 days) |
|---|---|
| LCP | — |
| INP | — |
| CLS | — |

## 5. Static audit: the plan's claims checked against this code

Checked by reading the source in the project zip (snapshot of 2026-11-25). Nothing here was measured on a running site.

**Confirmed as described in the plan**

- Placeholder `+92 300 1234567` / `wa.me/923001234567` in `components/store/Footer.tsx`, `components/store/ProductDetailClient.tsx` and `app/(store)/order/[orderNo]/page.tsx`.
- `ProductDetailClient` falls back to price `9000` and stock `10`, and reads the global `STONES` table.
- `CartProvider.addItem` mutates in place (`copy[idx].qty += newItem.qty`).
- `InventoryClient` has an empty `if (res.ok) { // Stock saved }` branch and only `console.error` on failure.
- Checkout: no `autoComplete`, no `htmlFor` labels, no `inputMode`, no `role="alert"`, 14 px inputs (`text-sm`), city default `'Lahore'`.
- `body { overflow-x: clip }` in `app/globals.css`.
- Google Fonts loaded with a manual `<link>` in `app/layout.tsx`; `next/font` is not used.
- `force-dynamic` on `app/page.tsx`, collections, product, order and content pages.
- `lib/ratelimit.ts` is in-memory and **no file imported it** before Phase 0. Confirmed by search, so the "no callers" graph result was not an indexing gap. `/api/vitals` is now its only caller.
- Middleware checks that a token exists, not its role. `getAdminSession` defaults a missing role to `'admin'`.
- No test files, no test runner, no CI, no `sitemap` / `robots` / `manifest`.
- Seven `<Image fill>` without `sizes`: order page, checkout, cart page, `CartDrawer`, the thumbnail strip in `ProductDetailClient`, admin products list, admin order detail.

**Different from the plan (corrections)**

- Admin login lockout **is real and durable**: 5 wrong passwords lock the account for 15 minutes, stored on the `AdminUser` document in MongoDB (`lib/auth.ts`). It does not depend on the in-memory limiter.
- `ProductCard` and the main product image **already have `sizes`**.
- `tsconfig.json` already has `"strict": true`.
- The config file is `next.config.mjs`, not `next.config.js`.
- `lib/env.ts` already exists (zod, required variables). Phase 7 only needs to extend it.
- `Order.idempotencyKey` already has a unique sparse index. A TTL must **not** be added to it, because that would delete orders.
- Settings have one phone field, `contact.phone` ("Support Phone / WhatsApp"). There is no separate `whatsapp` field.
- The default for `contact.phone` in `lib/settings.ts` is the placeholder itself. So "hide the button when no number is set" will never trigger until that default is blank.
- `app/(store)/pages/[slug]/page.tsx` is also `force-dynamic`.
- The order page link token is the query parameter `t`.
