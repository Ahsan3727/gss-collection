# GSS Collection — Vercel Implementation Plan

Live stack: **Vercel** hosts the Next.js app. **MongoDB Atlas** stores all store data. **Cloudinary** stores product photos. No Redis, no second database, and no extra cache.

The backend already exists. This plan is the short list of code changes required so the owner can run the store from `/admin` after deploy.

## What already works

Leave these as they are.

| Owner job | Where it lives |
|---|---|
| Orders and fulfilment | `Order` model, `/admin/orders` |
| Inventory adjustments | `/admin/inventory`, `/api/admin/inventory` |
| Discount codes | `/admin/discounts` |
| Customer inquiries | `/admin/inbox` |
| Store settings (address, bank, WhatsApp) | `/admin/settings` |
| Owner login | NextAuth, `/admin/login`, `middleware.ts` |
| Product APIs | `GET/POST /api/products`, `GET/PATCH/DELETE /api/products/[id]` |
| Content pages on the storefront | `Page` model, rendered at `/pages/[slug]` |
| Photo upload API | `POST /api/upload` (Cloudinary) |
| Serverless Mongo connection reuse | `lib/db.ts` |

Seeded pages already in MongoDB: `size-guide`, `contact`, `about-us`, `care-guide`, `shipping-returns`, `privacy-policy`, `terms-of-service`.

`npm run seed` deletes products, pages, settings, discounts, and the order counter, then rewrites them. Never add it to the Vercel build. Run it once from a local machine against Atlas only while the database is empty.

## Code changes

### 1. Production environment

Secrets and local defaults are hardcoded. If a Vercel env var is missing, the app still boots with a known admin password and a Cloudinary account committed in source.

| File | Change |
|---|---|
| `lib/env.ts` | Require `MONGODB_URI`, `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. Remove the `admin123`, `localhost`, and `qqqoqjok` defaults. Remove `REDIS_URL`. |
| `lib/db.ts` | Connect only with `MONGODB_URI`. Remove the `mongodb://localhost:27017/gss-collection` fallback. Keep the existing connection reuse. |
| `lib/auth.ts` | Remove the `admin123` fallback. The first login may create the owner only when `AdminUser` is empty and the password matches `ADMIN_PASSWORD`. |
| `middleware.ts` | Remove the hardcoded `NEXTAUTH_SECRET` fallback. Use `process.env.NEXTAUTH_SECRET` only. |
| `scripts/create-admin.ts` | Remove the `admin123` fallback. |
| `app/api/upload/route.ts` | Read Cloudinary config only from env. If the cloud name, API key, or API secret is missing, return 500. Delete the hardcoded cloud name, API key, and API secret. |
| `.env.example` | Match the variable list below. Remove `REDIS_URL`. |

Rotate the Cloudinary API key in the Cloudinary dashboard. The current key and secret are in `app/api/upload/route.ts` and must not stay in the repo.

Vercel environment variables:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/gss_collection?retryWrites=true&w=majority
NEXTAUTH_SECRET=<long-random-string>
NEXTAUTH_URL=https://<your-domain>
ADMIN_EMAIL=admin@gsscollection.com
ADMIN_PASSWORD=<strong-password-for-first-login-only>
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud-name>
```

After the first successful admin login, change the password inside the app and delete `ADMIN_PASSWORD` from Vercel so the env password cannot be reused.

Build command stays `next build`. No custom server.

### 2. Product editor

`/admin/products` is a read-only table. The create API writes `req.body` straight into MongoDB, so a form would save products with no `id`, `handle`, variants, or stock. `PATCH` updates title, price, photos, status, and variants, and skips category, kind, stones, and sizes.

| File | Change |
|---|---|
| `app/api/products/route.ts` | Validate the body before `Product.create`. Require title, handle, category, kind, base price, stones, sizes, description, photos, and status. Generate `id` if omitted. Build `variants` and the stock map on the server, using the same rules as `data/seed.ts`. |
| `app/api/products/[id]/route.ts` | Also accept category, kind, stones, sizes, description, and stock. On delete, set `status: 'archived'` instead of removing the document, so past orders still resolve. |
| `app/admin/products/page.tsx` | Add a New product button and an Edit link on each row. |
| `app/admin/products/new/page.tsx` | New page. Form for a product. |
| `app/admin/products/[id]/page.tsx` | New page. Same form, loaded from `GET /api/products/[id]`. |

Form fields: title, handle, category (`ladies`, `gents`, `gems`), kind (`ring`, `bracelet`, `stone`), description, base price, compare-at price, stones, sizes, per-variant stock, status (`draft` or `active`), photos.

Photo upload uses the existing `POST /api/upload`. Save the returned Cloudinary URL on `photos`. `next.config.mjs` already allows `res.cloudinary.com`.

Public product queries already filter `status: 'active'`, so drafts stay off the storefront.

The repo has no image files. Seeded paths such as `/images/products/crimson-halo-ring-0.jpg` will 404 on Vercel. After the first seed, open each product in this editor and upload the real photos to Cloudinary.

### 3. Articles (content pages)

The `Page` model and `/pages/[slug]` already render title and body from MongoDB. There is no admin API and no admin screen, so the owner cannot change About, shipping, care, or the other pages after launch.

| File | Change |
|---|---|
| `app/api/admin/pages/route.ts` | `GET` list, `POST` create. Guard with `requireAdminApi`. Fields: `slug`, `title`, `body`, optional `metaDesc`. |
| `app/api/admin/pages/[slug]/route.ts` | `GET` one page, `PATCH` update. Guard with `requireAdminApi`. |
| `app/admin/pages/page.tsx` | List the pages. Edit title, slug, and body. Allow adding a page. |
| `components/admin/AdminNav.tsx` | Add a Pages link. |
| `app/(store)/pages/[slug]/page.tsx` | No structural change. It already prints `body` from MongoDB, split on blank lines. |

These pages are the articles: size guide, care guide, about, shipping and returns, contact, privacy, terms.

## Deploy order

1. Apply the env and secret cleanup in section 1. Confirm `next build` fails closed when `MONGODB_URI` or `NEXTAUTH_SECRET` is missing.
2. Create the Atlas cluster and database `gss_collection`. Put the connection string in `.env.local` and in Vercel.
3. Create the Cloudinary account you control. Rotate the leaked key. Put the new keys in `.env.local` and in Vercel.
4. Import the GitHub repo into Vercel as a Next.js project. Set the env vars. Deploy.
5. From your machine, with `MONGODB_URI` pointing at Atlas, run `npm run seed` once.
6. Apply the product editor (section 2) and the pages admin (section 3). Deploy again.
7. Sign in at `/admin`, upload product photos, and confirm one content page edit shows on the storefront.

## Launch check

- Homepage, one collection, and one product load.
- The product image is a Cloudinary URL, not `/images/products/...`.
- Cart and checkout complete a COD or bank-transfer order, and the order appears in `/admin/orders`.
- `/admin/login` rejects a wrong password and accepts the owner.
- Creating a draft product hides it from the shop. Setting it to active shows it.
- Editing Shipping & Returns in `/admin/pages` changes `/pages/shipping-returns` on refresh.

Orders, stock, discounts, inbox, and settings need no new screens for launch.
