# GSS Collection — 10/10 Mobile-First Implementation Plan

**Stack:** Next.js 14 (App Router) · MongoDB (Mongoose) · Vercel · Cloudinary
**Audience:** mostly phone users (Pakistan, mobile data, Android-heavy)
**Basis:** Graphify code graph of `Ahsan3727/gss-collection` at commit `0885b58` (indexed 2026-11-25) plus source review. Items marked **(verify)** could not be confirmed from the graph alone. The repo may have changed since that commit, so check each item against the current code before starting it.
**Last updated:** 2026-11-26. Phase 0 code is built, and this plan has been checked against the project zip. Corrections from that check are folded into the text below and listed in `docs/baseline.md`, section 5.

---

## Progress

| Phase | State |
|---|---|
| 0 Baseline | **Code done** (field-data collection and `docs/baseline.md`). **Measuring left for you, about 1 hour** (see Phase 0). |
| 1 to 10 | Not started |

---

## 1. What "10/10" means here

A score of 10 is not a feeling. It is a list of gates you can measure. The project is 10/10 when **every gate below passes**.

| Area | Gate | How to measure |
|---|---|---|
| Mobile speed | Lighthouse mobile Performance ≥ 90 on home, collection, product, checkout | Lighthouse CI on preview URL |
| Core Web Vitals | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile | Real-user data (Vercel Speed Insights or `web-vitals`), plus lab data |
| Correctness | Displayed price/stock always equals what the server charges; zero known order-flow bugs | Automated tests + manual checklist (Section 14) |
| Mobile UX | Home → product → cart → order completed one-handed on a 360 px screen with no zoom, no hidden errors, no horizontal scroll | Playwright mobile tests + real-device check |
| Accessibility | Lighthouse a11y = 100, zero axe violations on the 6 key pages, all tap targets ≥ 44 px | `@axe-core/playwright` in CI |
| SEO | Lighthouse SEO ≥ 95, sitemap + robots live, per-page metadata, valid product structured data | Lighthouse, Google Rich Results Test |
| Security | Durable rate limiting, enforced admin roles, security headers, no secrets in client, error monitoring live | Checklist + header scan |
| Admin | Every list paginated and searchable, every save gives visible feedback, usable on a phone | Playwright + manual |
| Quality | Tests on all money paths, CI blocks merges on failure, no `any` in shared types | CI status, coverage threshold on `lib/` ≥ 80% |
| Proven in the field | Two weeks of real-user data meeting the Web Vitals targets | Speed Insights dashboard |

The last gate cannot be completed in code. It needs real visitors. That is why Phase 10 exists.

---

## 2. Starting point

Scores below come from code reading, not from seeing the rendered site on a phone. Phase 0 replaces them with measured numbers.

| | Today | Target |
|---|---|---|
| Website (general) | 6.7 | 10 |
| Website (mobile-weighted) | 5.5 | 10 |
| Admin panel | 6.3 | 10 |

### Findings the plan fixes

**Trust and correctness**
- Placeholder phone/WhatsApp number (`+92 300 1234567`, `wa.me/923001234567`) in the footer, product page and order page. Settings have one phone field (`contact.phone`, labelled "Support Phone / WhatsApp"), but its **default in `lib/settings.ts` is the placeholder itself**, so an unset or failed settings read still returns the dummy number.
- `getStoreSettings()` is already used by the order page, cart validation, orders API, reviews API and admin settings. The footer, product page and home page do not use it, so this fix is small.
- `ProductDetailClient` falls back to price `9000` and stock `10`, and imports a global stone price table (`STONES`) while the admin can set per-product stone prices. Displayed price can differ from the charged price.
- `CartProvider.addItem` mutates the item in place (`copy[idx].qty += …`). `CartProvider` is used only in `app/layout.tsx`, so the fix is low-risk.
- Admin inventory save ignores the success branch and only logs failures to the console.

**Mobile speed**
- Home, collection, product, content (`/pages/[slug]`) and order pages are `force-dynamic`. There is no revalidation code anywhere.
- Seven `<Image fill>` have no `sizes`: order page, checkout, cart page, cart drawer, the product thumbnail strip, and two admin screens. The product card and the main product image already have it.
- Google Fonts loaded with a manual `<link>`.
- Collections load every matching product, no pagination.

**Mobile UX**
- Checkout error banner is at the top; "Place Order" is at the bottom, with no scroll or focus.
- No `autoComplete`, no linked labels, 12–14 px inputs (iOS zoom), no numeric keypad for postal code, city pre-filled "Lahore".
- Tap targets: cart −/+ ≈ 24 px, menu links ≈ 32 px, "Size Guide" ≈ 14 px.
- No sticky add-to-bag bar, thumbnails don't scroll, no swipe, size-guide popup not scrollable.
- Home first screen has no product photography. Header is 80 px.
- `body { overflow-x: clip }` hides overflow bugs instead of fixing them.

**Security and reliability**
- `lib/ratelimit.ts` stores counters in an in-memory `Map`. On Vercel each serverless instance has its own memory, so the limit is not enforced across instances. **Confirmed by search: no file imports `rateLimit()`**, so no route is limited today. (Phase 0 added `/api/vitals` as its first caller.)
- Login brute-force lockout is **real and durable**: 5 wrong passwords lock the account for 15 minutes, stored on the `AdminUser` document in MongoDB (`lib/auth.ts`). It does not depend on the in-memory limiter.
- Middleware checks that an admin token exists but not its role. `getAdminSession` defaults a missing role to `admin`.

**Quality**
- There are **no tests, no test runner and no CI** in the repo.
- Discounts exist end to end (model, admin screen, admin API, public validate route, applied in the orders route) and are untested.
- `any` is used widely (about 70 uses: `initialOrder: any`, `initialDiscounts: any[]`, wishlist and search results).

---

## 3. Order of work and why

```
Phase 0  Baseline ───────────────┐
Phase 1  Correctness & trust ────┤  (must come before caching,
Phase 2  Mobile speed ───────────┤   otherwise you cache wrong prices)
Phase 3  Mobile UX ──────────────┤
Phase 4  Accessibility ──────────┤  (reuses Phase 3 components)
Phase 5  SEO ────────────────────┤
Phase 6  Admin on mobile ────────┤
Phase 7  Security & reliability ─┤
Phase 8  Tests & CI ─────────────┤  (start in Phase 1, finish here)
Phase 9  App feel & payments ────┤
Phase 10 Prove it in the field ──┘
```

Rules for the whole plan:
1. **Write the test in the same change as the fix** for anything that touches money (cart, pricing, stock, discounts, orders). Phase 8 finishes the suite; it does not start it.
2. **One phase = one branch = one Vercel preview.** Measure on the preview before merging.
3. **Server stays the source of truth** for price, stock and discounts. Caching only affects what is displayed, never what is charged.

Rough effort for one developer: **3–4 weeks**, then 2 weeks of passive field measurement.

---

## Phase 0 — Baseline and guardrails (0.5 day): code done, measuring left

**Goal:** replace guesses with measured numbers.

**Built (2026-11-26)**
- [x] **Field data collection.** `components/store/WebVitals.tsx` uses Next's built-in `useReportWebVitals`, so it needs **no new package**. It sends each metric with `navigator.sendBeacon` to `POST /api/vitals` (`app/api/vitals/route.ts`), which stores it in the `WebVital` model (`lib/models/WebVital.ts`, deletes itself after 30 days). Shared helpers are in `lib/vitals.ts`. Mounted in `app/layout.tsx`.
  - Production only. Skips `/admin`. Stores a route pattern (`/products/[handle]`), never the real URL, so order numbers and search words are not kept. No IP, cookie or user id.
  - Uses the existing `rateLimit()` as a light guard. Keep its signature when Phase 7 replaces the store, and this route needs no change.
  - Why not Vercel Speed Insights: it needs `npm i @vercel/speed-insights`, which changes `package-lock.json` and must be done on a machine with network access. It is a one-line add (`<SpeedInsights />`) and can run alongside this.
- [x] **`docs/baseline.md`**: before-table for every gate in Section 1, the exact commands for each measurement, and a p75 query for the field data.
- [x] **Static audit** of this plan against the code. The corrections are already applied in this document.

**Left for you** (needs the deployed site, a phone, or network access)
- [ ] Deploy Phase 0 to production, then open the site on a phone and confirm documents appear in the `webvitals` collection in Atlas. Do this first: the field clock only starts after it.
- [ ] `npm ci && npm run build`. Copy First Load JS per route into `docs/baseline.md`, section 3.4.
- [ ] Lighthouse mobile on `/`, one collection, one product, `/checkout` (with an item in the bag), one order page. Three runs each, record the median, save reports in `docs/baseline/`.
- [ ] Real Android phone on mobile data, with the stopwatch table in `docs/baseline.md` 3.3.
- [ ] Throttled DevTools run: Slow 4G, 4× CPU, 360 × 800.
- [ ] After about a week of traffic and **before Phase 2 ships**, run the p75 query and paste the result into `docs/baseline.md`, section 4. Data is deleted after 30 days, so this is your only "before" snapshot of real-user numbers.

**What was and was not verified.** The route-pattern and rating helpers were run against 31 assertions. The new files were type-checked in strict mode against hand-written stubs for `next`, `zod` and `mongoose`: no errors in the route, component or helpers, and one error in `WebVital.ts` that comes from the `mongoose` stub (the real types accept that line, which every existing model also uses). **Not run:** a real `next build` (no network in the build environment), the route against a real database, and the p75 aggregation. The first preview deploy is the real test of those three.

**Done when:** every `—` in `docs/baseline.md` sections 2 to 4 has a number, except the field p75 values, which fill in after about a week; and the first `webvitals` documents are in Atlas.

---

## Phase 1 — Correctness and trust (1–2 days)

**Goal:** a customer never sees a wrong number, and a failed order is never silent.

### 1.1 Real contact number everywhere
- [ ] Fetch settings once in the root layout (or a server component used by the footer) and pass `contact.phone` down as a prop (there is one phone field; no separate WhatsApp field).
- [ ] Product page and order page: replace the hard-coded `wa.me/923001234567` with a helper `whatsappLink(number, message)` in `lib/contact.ts`.
- [ ] Normalise numbers to `92XXXXXXXXXX` (strip `+`, spaces, leading `0`).
- [ ] Change the default `contact.phone` in `lib/settings.ts` (and the seed in `data/seed.ts`) from the placeholder to `''`, the same way `bank.accountNumber` is already blank on purpose. Without this, "hide when unset" never triggers, because an empty or failed settings read returns the placeholder.
- [ ] If no number is set in settings, **hide** the WhatsApp button rather than show a dummy link.
- Files: footer component, `app/(store)/products/[handle]/page.tsx` / `ProductDetailClient.tsx`, `app/(store)/order/[orderNo]/page.tsx`, `lib/settings.ts`, `data/seed.ts`, new `lib/contact.ts`.

### 1.2 One price function, used by both sides
- [ ] Extract the server's existing pricing logic (from `app/api/orders/route.ts` and `app/api/cart/validate/route.ts`) into a pure function in `lib/pricing.ts`, for example `unitPrice(product, { size, stone })`.
- [ ] `ProductDetailClient` calls the same function with the product's own per-product stone prices. Delete the `9000` and stock-`10` fallbacks. If the data is missing, show "Unavailable" instead of a guessed number.
- [ ] Cart drawer and checkout call `/api/cart/validate`. If the server price differs from the cart price, update the cart and show a short notice ("Price updated").
- [ ] Remove the global `STONES` price table from the product page. Keep it only for admin form defaults, if still needed.

### 1.3 Cart bug
- [ ] Make `addItem` immutable in `lib/cart-context.tsx`:

```ts
setItems(prev => {
  const i = prev.findIndex(x => x.key === key);          // field names illustrative
  if (i === -1) return [...prev, newItem];
  return prev.map((x, j) =>
    j === i ? { ...x, qty: Math.min(x.qty + qty, MAX_QTY) } : x
  );
});
```

- [ ] Cap quantity at available stock when known.
- [ ] Lock page scroll while the cart drawer is open (`overflow: hidden` on `<html>` toggled in an effect, restored on close).

### 1.4 Checkout must never fail silently
- [ ] Keep an `errorRef` on the error banner. On failed submit: `errorRef.current.scrollIntoView({ block: 'center' })` and move focus to it. Give it `role="alert"`.
- [ ] Also show the error text next to the Place Order button.
- [ ] Disable the button and show a spinner while submitting (prevents double taps on slow networks; the idempotency key already protects the server).
- [ ] Remove the `"Lahore"` default for city.

### 1.5 Admin inventory feedback
- [ ] In `InventoryClient`, handle the `res.ok` branch: show a small "Saved" state on the row; show an error with a Retry button on failure. Revert the input to the last saved value if the save fails.

### 1.6 Tests written now
- [ ] `lib/pricing.ts` unit tests (per-product stones, sizes, rounding).
- [ ] `cart-context` tests: add, add same item twice, React StrictMode double-invoke does not double-count, quantity cap.

**Done when:** product price on screen = cart price = order price in a test that exercises all three; WhatsApp buttons open the real number; a forced API failure at checkout shows a visible error on a 360 px screen.

---

## Phase 2 — Mobile speed (2–3 days)

**Goal:** pages open from cache, images are right-sized, fonts don't block.

### 2.1 Cache the storefront, invalidate on write
- [ ] Remove `export const dynamic = 'force-dynamic'` from home, collections, product pages and content pages (`/pages/[slug]`).
- [ ] Wrap reads in `unstable_cache` with tags. Return plain JSON (serialise Mongoose `.lean()` output).

```ts
// lib/settings.ts
import { unstable_cache } from 'next/cache';

async function loadSettings() {
  await connectDB();
  const doc = await Settings.findOne().lean();
  return JSON.parse(JSON.stringify({ ...DEFAULT_SETTINGS, ...(doc ?? {}) }));
}
export const getStoreSettings = unstable_cache(loadSettings, ['store-settings'], {
  tags: ['settings'],
  revalidate: 3600,
});
```

```ts
// product read (illustrative field names)
export const getProduct = (handle: string) =>
  unstable_cache(
    async () => { await connectDB(); return serialize(await Product.findOne({ handle }).lean()); },
    ['product', handle],
    { tags: ['products', `product:${handle}`], revalidate: 300 }
  )();
```

- [ ] **Never cache a failure.** The current readers catch database errors and fall back (`getStoreSettings` returns `DEFAULT_SETTINGS`, `getProduct` returns `null`). Keep that `try/catch` in a thin wrapper **outside** `unstable_cache`, and let the cached function throw. If the fallback ran inside the cache, one failed read would be stored for the full `revalidate` time: the storefront would show default (placeholder) contact details and a blank bank account for an hour, or a product would 404 for five minutes.
- [ ] Call `revalidateTag` after every successful write. These are the hook points found in the graph:

| Route | Tags to revalidate |
|---|---|
| `app/api/products/[id]` (POST/PATCH/DELETE) | `products`, `product:<handle>` |
| `app/api/admin/inventory` (PATCH) | `products`, `product:<handle>` |
| `app/api/admin/settings` (PATCH) | `settings` |
| `app/api/admin/pages/[slug]` (PATCH) | `pages`, `page:<slug>` |
| `app/api/orders` (POST, after stock decrement) | `products`, `product:<handle>` for each line item |

- [ ] Keep these dynamic: `/order/[orderNo]`, everything under `/admin`, all `/api` routes.
- [ ] The money-critical routes (`orders` POST, `cart/validate`) may call `loadSettings` directly so they never use a cached value. Checkout totals then never depend on cache.
- [ ] Add `generateStaticParams` for the top products if you want them pre-rendered at build.

### 2.2 Images
- [ ] Add `sizes` to the **seven** `<Image fill>` that lack it (listed in Section 2): cart, checkout, order-page and cart-drawer thumbnails `80px`; the product thumbnail strip `80px`; admin thumbnails `64px`. The product card and the main product image already have `sizes`.
- [ ] Add `priority` only to the first (LCP) image on home and product pages. Lazy-load the rest.
- [ ] Use Cloudinary transformations (`f_auto,q_auto`, width caps) or a custom `next/image` loader so phones get AVIF/WebP at the displayed size.
- [ ] Give image containers a fixed aspect ratio to prevent layout shift.

### 2.3 Fonts
- [ ] Replace the manual Google Fonts `<link>` with `next/font/google`, `display: 'swap'`, only the weights actually used.

### 2.4 Collections
- [ ] Paginate: 12 products per page with a "Load more" button (cursor or `?page=`), server-rendered first page.
- [ ] Return `notFound()` when the collection slug is not valid (fixes soft 404s).

### 2.5 JavaScript weight
- [ ] Run `@next/bundle-analyzer`. Lazy-load with `next/dynamic`: the cart drawer, size-guide modal, wishlist, reviews form.
- [ ] Keep first-load JS under about 150 kB gzipped on home and product pages.
- [x] `lib/db.ts` caches the connection on `global` so warm serverless invocations reuse it (checked).
- [ ] **(verify first)** There is no `vercel.json`, so functions run in Vercel's default region (US East). Look up the Atlas cluster's region. If it is in Mumbai (AWS `ap-south-1`) or nearby, add `vercel.json` with `{ "regions": ["bom1"] }`. If the database is in the US, moving only the functions would make every query slower: move both, or neither.

**Done when:** Lighthouse mobile Performance ≥ 90 on home, collection, product; repeat product-page loads are served from cache; editing a product in admin updates the storefront within seconds.

---

## Phase 3 — Mobile UX: home, product, cart, checkout (3–4 days)

**Goal:** one-handed buying on a 360 px phone.

### 3.1 Header and first screen
- [ ] Header height ≈ 56–60 px on mobile; brand text sized so it never wraps at 360 px.
- [ ] Home hero: real product photography first, one clear call to action, then featured products directly below. Products should start within the first screen or two, not a thousand pixels down.
- [ ] Keep the free-delivery message as a slim bar, not a large block.

### 3.2 Product page
- [ ] **Sticky add-to-bag bar** (mobile only): price + selected size + button, fixed to the bottom with `padding-bottom: env(safe-area-inset-bottom)`. Hide it when the main button is on screen (IntersectionObserver) so they never duplicate.
- [ ] **Swipeable gallery**: CSS scroll-snap, no library.

```tsx
<div className="flex w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
  {images.map(img => (
    <div key={img.src} className="relative aspect-square w-full shrink-0 snap-center">
      <Image src={img.src} alt={img.alt} fill sizes="100vw" />
    </div>
  ))}
</div>
```
  plus a dot indicator and a horizontally scrolling thumbnail row (`overflow-x-auto`, `shrink-0` thumbnails).
- [ ] **Size guide**: bottom sheet that scrolls (`max-height: 85dvh; overflow-y: auto`), closes on backdrop tap, Escape and the ✕. Make the "Size Guide" trigger at least 44 px tall.
- [ ] Ring-size buttons stay ≥ 44 px (already true). Show "Only N left" from real stock.

### 3.3 Cart drawer
- [ ] Quantity −/+ buttons: 44 × 44 px hit area (visual size can stay smaller using padding).
- [ ] Remove button with `aria-label`. Show line price and the free-shipping progress.
- [ ] Sticky checkout button at the bottom of the drawer.

### 3.4 Checkout form (largest mobile win)
- [ ] Every input: `font-size: 16px` minimum (stops iOS zoom), 48 px height.
- [ ] Labels linked with `htmlFor`/`id`.
- [ ] Mobile keyboards and autofill:

| Field | Attributes |
|---|---|
| Name | `autoComplete="name"` |
| Phone | `type="tel" inputMode="tel" autoComplete="tel"` |
| Email | `type="email" inputMode="email" autoComplete="email"` |
| Address | `autoComplete="street-address"` |
| City | `autoComplete="address-level2"` (dropdown of common cities + "Other") |
| Postal code | `inputMode="numeric" autoComplete="postal-code"`, optional |

- [ ] Validate Pakistani mobile format (`03XXXXXXXXX` or `+923XXXXXXXXX`) on the client and again on the server; show the error under the field, linked with `aria-describedby`.
- [ ] Show the order total and delivery fee right above the Place Order button.
- [ ] Keep COD and bank transfer. For bank transfer, show account details with a one-tap copy button.

### 3.5 Remove the overflow mask
- [ ] Add the overflow detector test from Phase 8.3 and fix every element it reports (sort row, thumbnails, tables, wide uppercase text).
- [ ] Then remove `overflow-x: clip` from `body`.

### 3.6 Touch details
- [ ] `touch-action: manipulation` on buttons (removes the 300 ms tap delay on older browsers).
- [ ] `-webkit-tap-highlight-color` set to a subtle brand color.
- [ ] Use `100dvh`, not `100vh`, for full-height drawers and sheets.

**Done when:** the Playwright mobile checkout test passes at 360 × 640, the overflow detector reports nothing, and a real-device order takes under about 60 seconds from the product page.

---

## Phase 4 — Accessibility to 100 (1–2 days)

- [ ] **Dialogs**: cart drawer, size guide, any modal → proper dialog semantics (`role="dialog"`, `aria-modal`, `aria-labelledby`), focus trap, Escape to close, return focus to the opener. A headless library (Radix Dialog or Headless UI) is the safest route.
- [ ] `aria-label` on every icon-only button (−, +, ✕, wishlist, search, menu).
- [ ] No text below 12 px; body text 16 px. Check contrast ≥ 4.5:1 for body text and ≥ 3:1 for large text and UI borders (especially grey text on cream and gold on white).
- [ ] Visible `:focus-visible` outlines on all interactive elements.
- [ ] Skip-to-content link; one `<h1>` per page; landmarks (`header`, `nav`, `main`, `footer`).
- [ ] Meaningful `alt` text on product images; decorative images get `alt=""`.
- [ ] Respect `prefers-reduced-motion`.
- [ ] Error messages: `role="alert"` for submit errors; `aria-describedby` for field errors.
- [ ] Add `@axe-core/playwright` to the mobile test suite for: home, collection, product, cart open, checkout, order confirmation, admin login.

**Done when:** Lighthouse a11y = 100 and axe reports zero violations on those pages.

---

## Phase 5 — SEO and discoverability (1 day)

- [ ] `app/sitemap.ts` (home, collections, products, pages) and `app/robots.ts` (disallow `/admin`, `/api`, `/order/`).

```ts
// app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/order/'] }],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
```

- [ ] `metadataBase` set in the root layout; canonical URL on every page.
- [ ] `generateMetadata` for collections (unique title + description + OG image) instead of inheriting the root.
- [ ] Product JSON-LD: `availability` from real stock (`InStock` / `OutOfStock` / `LimitedAvailability`), `priceCurrency: "PKR"`, correct price, brand, images. Add `BreadcrumbList` JSON-LD.
- [ ] `Organization` JSON-LD with the real phone number from settings.
- [ ] Valid OG/Twitter images for products (important for WhatsApp link previews, which many customers will see).
- [ ] Verify noindex stays on `/order/*` and `/admin/*`.

**Done when:** Lighthouse SEO ≥ 95; Google Rich Results Test passes for a product URL; a pasted product link shows a good preview in WhatsApp.

---

## Phase 6 — Admin panel, usable from a phone (3–4 days)

I could not confirm how much you use the admin from a phone. This phase assumes you do for orders and stock.

### 6.1 Pagination and search everywhere
- [ ] Orders (currently capped at 50 while the header says "Showing N orders"): page + limit, total from `countDocuments`, header shows "Showing 1–25 of N".
- [ ] Products and customers: same pattern.
- [ ] Customers page: stop aggregating every order on each visit. Paginate the aggregation (`$sort`, `$skip`, `$limit`) and cache it briefly with a tag (`orders`), or maintain a customer summary when orders are created.
- [ ] Build search links with `URLSearchParams` so a query containing `&` or `#` cannot break the status tabs.

### 6.2 Phone layouts
- [ ] Inventory: below `md`, render each product as a card with its size stock as a grid of large steppers (44 px) instead of a wide table; keep the table on `md+`.
- [ ] Products list: card view on mobile with thumbnail, price, stock summary, status.
- [ ] Orders list: already workable; add a sticky status filter row with horizontal scroll.
- [ ] Admin nav: bottom tab bar or a full-screen menu on mobile.
- [ ] All admin inputs 16 px, buttons 44 px.

### 6.3 Feedback and safety
- [ ] A shared `useSave()` hook / toast: saving → saved → error with retry. Use it in inventory, product form, settings, pages, discounts, order status/notes.
- [ ] Confirm dialogs for destructive actions (delete product, cancel order).
- [ ] Warn on unsaved changes in product form and settings (the pages editor already does this).

### 6.4 Auth and roles
- [ ] Middleware: check `token.role === 'admin'`, not just that a token exists. `getAdminSession` should default a missing role to **no access**, not `admin`.
- [ ] Login: linked labels, `autoComplete="username"` / `"current-password"`, show/hide password toggle.
- [x] Login lockout is real and durable (checked: 5 failures lock the account for 15 minutes, stored in MongoDB). Phase 7 adds an IP-level limit on top.

### 6.5 Maintainability
- [ ] Extract shared `AdminPageHeader`, `AdminTable`/`AdminCard` and `Pagination` components to remove copy-pasted markup.
- [ ] Replace `any` props (`initialOrder`, `initialDiscounts`) with shared types (Phase 8).

**Done when:** a full day's work (confirm orders, change status, update stock, add a product) can be done from a phone, and no admin save is silent.

---

## Phase 7 — Security and reliability (2 days)

- [ ] **Durable rate limiting.** Replace the in-memory `Map` in `lib/ratelimit.ts`. **Recommended: a MongoDB TTL collection.** This repo's own stated rule is "no Redis, no second database, no extra cache", traffic is low, and it adds no new service or secret. Cost: one small query per limited request. Keep the current signature `rateLimit(identifier, limit, windowSeconds)`, so `/api/vitals` and any new caller need no change.

```ts
// Sketch, not run. lib/models/RateLimit.ts: { _id: string, count: number, expiresAt: Date }
// with RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
export async function rateLimit(identifier: string, limit = 20, windowSeconds = 60) {
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const _id = `${identifier}:${windowStart}`;
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + windowMs + 60_000) } };
  try {
    let doc;
    try {
      doc = await RateLimit.findOneAndUpdate({ _id }, update, { upsert: true, new: true });
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;   // two first requests raced on the upsert
      doc = await RateLimit.findOneAndUpdate({ _id }, update, { new: true });
    }
    const count = doc?.count ?? 1;
    return { success: count <= limit, limit, remaining: Math.max(0, limit - count), reset: Math.ceil((windowStart + windowMs) / 1000) };
  } catch (err) {
    console.error('[RateLimit] store unavailable, allowing request:', err);   // fail open: never block a customer because the limiter broke
    return { success: true, limit, remaining: limit, reset: Math.ceil((windowStart + windowMs) / 1000) };
  }
}
```

If you later prefer Upstash Redis (free tier, Vercel Marketplace, `@upstash/ratelimit`), this is the equivalent:

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export const limiters = {
  orders:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '10 m'),  prefix: 'rl:orders' }),
  reviews: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 h'),   prefix: 'rl:reviews' }),
  login:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '15 m'),  prefix: 'rl:login' }),
  cart:    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'),  prefix: 'rl:cart' }),
};
```
- [ ] Apply it to: orders POST, reviews POST, cart validate, discount validate (stops coupon guessing), admin login. Return `429` with `Retry-After`. Key by IP (`x-forwarded-for`) plus phone number for orders.
- [ ] **Security headers** in `next.config.mjs`: `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` (or CSP `frame-ancestors`). Add a Content-Security-Policy in **report-only** mode first, then enforce once clean.
- [ ] **Environment validation**: `lib/env.ts` already parses the required variables with zod, but only on first use at runtime, and `next.config.mjs` checks just `MONGODB_URI` and `NEXTAUTH_SECRET` at build. Extend it with the site URL (and the Upstash keys only if you choose Upstash), and decide whether the build should fail for the rest.
- [ ] **Admin cookies**: `httpOnly`, `secure`, `sameSite: 'lax'` or stricter. Confirm admin mutation routes reject cross-site requests.
- [ ] **MongoDB indexes.** Already present (checked): product `handle` (unique), `status`, `cat`, a text index and `variants.sku`; order `orderNo` (unique), `createdAt`, `fulfil`, `phone`, `email`, `accessToken`, and `idempotencyKey` (unique, sparse); discount `code` (unique). **Do not add a TTL to `idempotencyKey`**: it lives on order documents, so a TTL would delete orders. Still to add or check: a compound `{ fulfil: 1, createdAt: -1 }` for the admin orders tabs, product `{ status: 1, createdAt: -1 }`, and whatever backs admin search. The `webvitals` and rate-limit TTL indexes are created by Mongoose automatically.
- [ ] **Monitoring**: Sentry (or Vercel observability) for client and server errors, with an alert on checkout failures.
- [ ] **Backups**: confirm Atlas backups are enabled and do one test restore.
- [ ] **Privacy**: orders contain names, phones and addresses. Confirm none of it is exposed in public routes, logs or the order confirmation URL beyond the access token.

**Done when:** a script hammering the orders route from one IP gets 429s even across many serverless instances; headers pass a scan; a deliberately thrown error appears in monitoring.

---

## Phase 8 — Tests, types and CI (3–4 days, started in Phase 1)

### 8.1 Shared types
- [ ] Define zod schemas once (`Product`, `Order`, `Settings`, `Discount`, `CartItem`) and export `z.infer` types. Use them in API routes, server components and client components.
- [ ] `"strict": true` is already on in `tsconfig.json`. Remove the roughly 70 uses of `any`, then turn on the `@typescript-eslint/no-explicit-any` rule as an error.

### 8.2 Unit and integration tests (Vitest)
- [ ] `lib/pricing.ts`, `lib/money.ts`, `lib/stock.ts`, phone normalisation.
- [ ] Orders POST with `mongodb-memory-server`:
  - [ ] valid COD order succeeds and decrements stock
  - [ ] insufficient stock → rollback, no partial decrement
  - [ ] same idempotency key twice → one order
  - [ ] client sends a lower price → server ignores it
  - [ ] invalid or malformed payload → 400
  - [ ] free-shipping threshold boundary (just below / exactly at)
  - [ ] discount: valid, expired, minimum order not met, usage limit reached
  - [ ] rate limit exceeded → 429
- [ ] Cart validate and discount validate routes.
- [ ] Admin routes: no token → 401; wrong role → 403; valid admin → success; product change writes an audit log entry.
- [ ] `cart-context` (React Testing Library), including StrictMode.
- [ ] Coverage threshold for `lib/` ≥ 80%.

### 8.3 End-to-end (Playwright, mobile projects)

```ts
// playwright.config.ts (excerpt)
projects: [
  { name: 'android',  use: { ...devices['Pixel 5'] } },
  { name: 'iphone-se', use: { ...devices['iPhone SE'] } },
  { name: 'small-360', use: { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true } },
],
```

- [ ] Flow: home → collection → product → choose size → add to bag → open cart → checkout → place COD order → confirmation page → WhatsApp link uses the settings number.
- [ ] Failure flow: server returns an error → error visible without scrolling.
- [ ] Sticky bar visible on product page, hidden when main button visible.
- [ ] Admin flow: login → change order status → update stock → "Saved" shown.
- [ ] **Overflow detector** (replaces the `overflow-x: clip` mask):

```ts
const offenders = await page.evaluate(() =>
  [...document.querySelectorAll('body *')]
    .filter(el => el.getBoundingClientRect().right > window.innerWidth + 1)
    .map(el => el.tagName + '.' + (el as HTMLElement).className)
    .slice(0, 10)
);
expect(offenders).toEqual([]);
```
- [ ] Axe accessibility check on the key pages (Phase 4).

### 8.4 CI (GitHub Actions)
- [ ] On every pull request: install → `tsc --noEmit` → lint → unit/integration → build → Playwright against the Vercel preview URL → Lighthouse CI with assertions (Performance ≥ 0.9, Accessibility = 1, SEO ≥ 0.95, LCP ≤ 2500 ms, CLS ≤ 0.1).
- [ ] Protect `main`: merge only when all checks are green.

**Done when:** deliberately breaking pricing, stock rollback or the checkout flow makes CI fail.

---

## Phase 9 — App feel and payments (2–3 days)

### 9.1 Installable and branded
- [ ] Favicon and `app/icon.png`, `app/apple-icon.png`.
- [ ] `app/manifest.ts` with `display: 'standalone'`, `theme_color`, 192/512 icons and a maskable icon.

```ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GSS Collection', short_name: 'GSS',
    start_url: '/', display: 'standalone',
    background_color: '#ffffff', theme_color: '#111111',   // use your brand colors
    icons: [
      { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```
- [ ] `viewport` export with `themeColor` and `viewportFit: 'cover'` so the status bar matches the brand.
- [ ] Skip a service worker unless you need offline browsing. It adds risk with cached stock and prices.

### 9.2 Buying on WhatsApp
- [ ] Product page "Order on WhatsApp" pre-fills the message: product name, size, price, product URL.
- [ ] Order confirmation "Message us" pre-fills the order number.
- [ ] Admin order detail "WhatsApp customer" (already present) uses the normalised number and a template ("Your order #… is confirmed").

### 9.3 Payments (optional, needs a decision)
- [ ] Add JazzCash and/or Easypaisa only if you have merchant accounts. Keep Cash on Delivery as the default. Implementation: server creates a pending order → redirect to provider → signed callback route verifies the hash and marks the order paid → idempotent on repeats. This needs its own tests (valid signature, tampered signature, duplicate callback).
- [ ] If you do not have merchant accounts yet, leave this out; manual bank transfer with a "send screenshot on WhatsApp" step covers it.

**Done when:** "Add to Home Screen" works with the right icon and name; WhatsApp messages arrive pre-filled.

---

## Phase 10 — Prove it in the field (2 weeks, mostly waiting)

- [ ] Deploy to production behind a quick pre-launch checklist (Section 14).
- [ ] Watch the field data for two weeks: the p75 query in `docs/baseline.md` section 4 (or Speed Insights, if you added it). The 30-day retention covers this window. Filter by mobile. Targets: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at p75.
- [ ] Watch error monitoring and checkout failure rate. Target: zero unexplained failed orders.
- [ ] Ask five to ten real customers to place an order on their own phones and tell you where they hesitated.
- [ ] Fix the top three problems found, re-measure, and then re-score against Section 1.

**Done when:** every gate in Section 1 is met on real-user data. That is the 10/10.

---

## 11. Final scorecard template

| Area | Before | After | Evidence |
|---|---|---|---|
| Mobile speed | | | Lighthouse + field p75 |
| Correctness | | | tests green, manual checklist |
| Mobile UX | | | Playwright + real device |
| Accessibility | | | Lighthouse 100, axe 0 |
| SEO | | | Lighthouse, rich results |
| Security | | | headers, 429 test, monitoring |
| Admin | | | Playwright + manual |
| Quality | | | CI, coverage |
| Field data | | | 2 weeks of Speed Insights |

---

## 12. File index (where each change lands)

| File | Phases |
|---|---|
| `lib/vitals.ts`, `lib/models/WebVital.ts`, `components/store/WebVitals.tsx`, `app/api/vitals/route.ts`, `docs/baseline.md` (new, done) | 0 |
| `lib/settings.ts`, `data/seed.ts` | 1, 2 |
| `lib/cart-context.tsx` | 1, 3, 8 |
| `lib/pricing.ts` (new) | 1, 8 |
| `lib/contact.ts` (new) | 1 |
| `lib/ratelimit.ts`, `lib/models/RateLimit.ts` (new, if MongoDB store) | 7 |
| `lib/env.ts` (exists, extend) | 7 |
| `app/layout.tsx` | 0 (done), 1, 2, 5, 9 |
| `app/page.tsx` (home) | 2, 3, 5 |
| `app/(store)/products/[handle]/page.tsx` | 2, 5 |
| `components/store/ProductDetailClient.tsx` | 1, 3, 4 |
| `components/store/CartDrawer.tsx` | 1, 3, 4 |
| checkout page/form | 1, 3, 4 |
| `app/(store)/order/[orderNo]/page.tsx` | 1, 9 |
| collection pages | 2, 5 |
| `app/api/orders/route.ts` | 1, 2, 7, 8 |
| `app/api/cart/validate/route.ts` | 1, 7, 8 |
| `app/api/discounts/validate/route.ts` | 7, 8 |
| `app/api/products/[id]/route.ts` | 2 |
| `app/api/admin/inventory/route.ts` | 2 |
| `app/api/admin/settings/route.ts` | 2 |
| `app/api/admin/pages/[slug]/route.ts` | 2 |
| `components/admin/InventoryClient.tsx` | 1, 6 |
| `components/admin/ProductForm.tsx` | 6 |
| `components/admin/DiscountsClient.tsx` | 6, 8 |
| `components/admin/AdminNav.tsx` | 6 |
| `app/admin/*/page.tsx` (orders, products, customers) | 6 |
| `app/admin/login/page.tsx` + middleware | 6, 7 |
| `next.config.mjs`, `vercel.json` (new) | 2, 7 |
| `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts` (new) | 5, 9 |
| `playwright.config.ts`, `vitest.config.ts`, `.github/workflows/ci.yml` (new) | 8 |

---

## 13. Decisions you need to make

Each has my recommendation. Reverse any of them if a fact on your side is different.

1. **Payments:** do you have JazzCash or Easypaisa merchant accounts?
   **Recommendation: skip 9.3 for now.** Cash on Delivery plus bank transfer with a "send the screenshot on WhatsApp" step already works, and payment integration is the most expensive and riskiest item in the plan. Revisit only if customers ask for card or wallet payment.
2. **Rate-limit store:** Upstash Redis or a MongoDB TTL collection.
   **Recommendation: MongoDB TTL collection.** It matches this repo's stated rule of no Redis and no second service, has nothing new to configure or leak, and your traffic does not need Redis speed. Phase 7 has a sketch. Choose Upstash only if you measure the extra query slowing checkout.
3. **Admin on phone:** do you manage orders and stock from your phone?
   **Recommendation: yes for orders and inventory only.** Build the card layouts for those two screens (Phase 6.2) and the save feedback (6.3). Leave the products list and customers screens as they are until you actually use them on a phone.
4. **Cities served:** a short city list for checkout.
   **Recommendation: a dropdown of about 10 major cities plus "Other" with free text.** Do not build per-city delivery fees: shipping is already priced by delivery method in settings, and per-city fees add admin screens and test cases for no clear gain.

---

## 14. Pre-launch checklist

- [ ] Real phone/WhatsApp number shows in footer, product page and order page.
- [ ] A test order on a real phone over mobile data: browse → add → checkout → confirmation, under about 60 seconds.
- [ ] Price on product page = cart = order confirmation, with a per-product stone price.
- [ ] Sold-out item shows as sold out within seconds of the last unit selling.
- [ ] A forced checkout error is visible without scrolling.
- [ ] No horizontal scroll on 360 px home, collection, product, cart, checkout.
- [ ] Sitemap and robots load; product URL previews well in WhatsApp.
- [ ] 429 appears after repeated order attempts from one IP.
- [ ] Admin: non-admin token cannot reach `/admin`; inventory save shows "Saved".
- [ ] CI is green on `main`; Sentry receives a test error; Atlas backup restore tested.
- [ ] All environment variables set in Vercel production and preview.
- [ ] `webvitals` documents are arriving in Atlas, and the p75 query in `docs/baseline.md` returns rows.

---

## 15. My best recommendations

In priority order.

1. **Deploy Phase 0 on its own, first.** One small branch, one preview. Field data needs a head start, and the 30-day retention means an early start costs nothing. Open the preview on your phone and confirm a document appears in the `webvitals` collection before anything else. That is the real test of the three things I could not run (build, route, query).
2. **Take the "before" numbers before Phase 2 ships.** Lab numbers (Lighthouse, phone, throttled run) this week, taken on the production site as it is now. Field p75 after about a week of traffic. After Phase 2 ships, the "before" can no longer be recovered, and without it the final scorecard has nothing to compare against.
3. **Start Phase 1 in parallel, but do not merge it to production until the Lighthouse runs are done.** Phase 1 changes the product page and checkout, so merging it first would move your baseline.
4. **Inside Phase 1, do 1.1 (phone number) and 1.2 (one price function) first.** A dummy WhatsApp number and a price that can differ from the charged price are the two ways the site can lose a customer's trust or money today. Write the pricing tests in the same change.
5. **After Phase 1, the likely biggest mobile wins per hour are:** caching (2.1, with the "never cache a failure" rule), `sizes` and `priority` on images (2.2), `next/font` (2.3), and the checkout input fixes (3.4: 16 px inputs, autofill, numeric keyboard). This is my judgment from the code, not a measurement. Re-measure against the baseline after each one and let the numbers set the order of the rest.
6. **Keep these small or leave them out:** no service worker (cached stock and prices are a risk); no custom Cloudinary loader until the baseline shows images are the LCP problem (first add `formats: ['image/avif', 'image/webp']` to `images` in `next.config.mjs`, one line); no JazzCash or Easypaisa (section 13); no per-city fees; defer the shared admin components in 6.5 until the phone layouts in 6.2 are done.
7. **Keep the money-path rule.** Any change to cart, pricing, stock, discounts or orders ships with its test in the same change.
