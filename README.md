# GSS Collection

Online store for **GSS Collection** (925 sterling silver jewellery and natural gemstones). Built with Next.js 14 (App Router) and MongoDB.

Production stack:

| Part | Service |
|---|---|
| App hosting | Vercel |
| Database | MongoDB Atlas |
| Product photos | Cloudinary |

There is no Redis, no second database and no extra cache.

---

## Environment variables

Copy `.env.example` to `.env.local` for local work. On Vercel, add the same variables under Project Settings, Environment Variables.

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/gss_collection?retryWrites=true&w=majority
NEXTAUTH_SECRET=<long-random-string, at least 16 characters>
NEXTAUTH_URL=https://<your-domain>          # http://localhost:3000 locally
ADMIN_EMAIL=admin@gsscollection.com
ADMIN_PASSWORD=<strong-password-for-first-login-only>
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud-name>
```

Notes:

* There are no default values. A production `next build` fails if `MONGODB_URI` is missing or `NEXTAUTH_SECRET` is shorter than 16 characters. The other variables are checked the first time the app needs them.
* `ADMIN_PASSWORD` is used only for the first login, while no admin user exists. After that login, change the password inside the app and delete `ADMIN_PASSWORD` from Vercel.
* Never commit `.env.local`. If a key was ever committed, rotate it in the provider's dashboard.

---

## Local setup

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run seed                   # only against an empty database, see warning below
npm run dev
```

Open <http://localhost:3000>. The owner panel is at <http://localhost:3000/admin>.

> **Warning:** `npm run seed` deletes products, pages, settings, discounts and the order counter, then writes them again. Run it once against an empty database. Never add it to the Vercel build.

To create or reset the owner account from your machine (needs `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local`):

```bash
node scripts/run_create_admin.js
```

---

## Deploying to Vercel

1. Create the Atlas cluster and a database named `gss_collection`.
2. Create the Cloudinary account and copy its keys.
3. Import the GitHub repository into Vercel as a Next.js project. Add the environment variables above. The build command stays `next build`.
4. After the first deploy, run `npm run seed` once from your machine with `MONGODB_URI` pointing at Atlas.
5. Sign in at `/admin` with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Change the password in the app, then delete `ADMIN_PASSWORD` from Vercel.
6. Open `/admin/settings` and save the real bank details, phone and address. The seed data contains placeholders.

---

## What the owner can do in `/admin`

| Area | Screen |
|---|---|
| Orders and fulfilment | `/admin/orders` |
| Products (create, edit, draft, archive, photos) | `/admin/products` |
| Stock adjustments | `/admin/inventory` |
| Discount codes | `/admin/discounts` |
| Content pages (About, shipping, care, size guide, contact, policies) | `/admin/pages` |
| Customer inquiries | `/admin/inbox` |
| Store settings (address, bank, WhatsApp) | `/admin/settings` |

---

## Route overview

* **Storefront**
  * `/` homepage with featured pieces.
  * `/collections/[handle]` collections (`all`, `ladies`, `gents`, `gems`).
  * `/products/[handle]` product page with stones, ring sizes and ring visualiser.
  * `/cart`, `/checkout` cart and checkout (Cash on Delivery or direct bank transfer).
  * `/pages/[slug]` content pages edited from `/admin/pages`.
* **Public API**
  * `POST /api/orders` checks products, prices and stock on the server, takes stock atomically, applies discounts and saves the order. The SKU is always built on the server.
  * `POST /api/contact` customer inquiries.
  * `GET /api/search?q=` product search.
  * `POST /api/vitals` receives Core Web Vitals from visitors' browsers (production only). Stored without personal data and deleted after 30 days. See `docs/baseline.md`.
* **Admin API** lives under `/api/admin/*`, `/api/upload`, and the write routes of `/api/products` (`POST`, `PATCH`, `DELETE`). All of them require the owner to be signed in.

---

## Notes

* `lib/ratelimit.ts` is an in-memory limiter. Only `/api/vitals` calls it so far. If you wire it into more routes, remember that on Vercel each serverless instance counts separately, so it is a light guard, not a hard limit. Admin login has its own lockout after 5 wrong passwords.
* `docs/baseline.md` holds the performance baseline for the 10/10 plan and how to read the field data collected by `/api/vitals`.
* Product photos can only come from Cloudinary (`res.cloudinary.com`) or from `public/images/products`. The product editor uploads to Cloudinary for you.
