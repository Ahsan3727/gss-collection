# GSS Collection — Vercel Implementation Plan

Live stack: **Vercel** hosts the Next.js app. **MongoDB Atlas** stores all store data. **Cloudinary** stores product photos. No Redis, no second database, and no extra cache.

The backend already exists. This plan is the short list of code changes required so the owner can run the store from `/admin` after deploy.

**Last updated: 2026-11-25.** The status tables below show what is finished and what is left.

## Status at a glance

| Section | Status |
|---|---|
| 1. Production environment | **Done in code.** One manual step left: rotate the Cloudinary key. |
| 2. Product editor | **Done.** Needs a real `next build` and a test against a real database (checklist in section 2). |
| 3. Content pages (articles) | **Done.** Needs a real `next build` and a test against a real database (checklist in section 3). |
| 4. Order SKU issue (end of this file) | **Fixed in code.** Needs the order checklist below against a real database. |
| Deploy and launch check | Not started. These are manual steps, not code. |

### Work left for the developer, in order

1. Run `npm install` and `npm run build`. Fix anything the type check reports. The product editor, the pages admin screen and the order stock fix (`lib/stock.ts`, `app/api/orders/route.ts`, `app/api/admin/orders/[id]/route.ts`) were written without a full Next.js install (see "How section 2 was tested", "How section 3 was tested" and the order SKU section), so this is the first real compile of them.
2. Run the product editor test checklist in section 2 against a real Atlas database.
3. Run the pages admin test checklist in section 3 against a real Atlas database.
4. Rotate the old Cloudinary key (section 1, manual).
5. Run the order stock checklist (end of this file) against a real Atlas database.
6. Follow the deploy order, then the launch check.

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
| Content pages editor | `/admin/pages`, `/api/admin/pages` |
| Photo upload API | `POST /api/upload` (Cloudinary) |
| Serverless Mongo connection reuse | `lib/db.ts` |

Seeded pages already in MongoDB after `npm run seed`: `size-guide`, `contact`, `about-us`, `care-guide`, `shipping-returns`, `privacy-policy`, `terms-of-service`.

`npm run seed` deletes products, pages, settings, discounts, and the order counter, then rewrites them. Never add it to the Vercel build. Run it once from a local machine against Atlas only while the database is empty.

## Code changes

### 1. Production environment — mostly done

Secrets and local defaults used to be hardcoded. The code now reads everything from env vars.

| File | Change | Status |
|---|---|---|
| `lib/env.ts` | Require `MONGODB_URI`, `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. No defaults. No `REDIS_URL`. | Done |
| `lib/db.ts` | Connect with `MONGODB_URI` only. Keep connection reuse. | Done |
| `lib/auth.ts` | No `admin123` fallback. First login creates the owner only when `AdminUser` is empty and the password matches `ADMIN_PASSWORD`. | Done |
| `middleware.ts` | Use `process.env.NEXTAUTH_SECRET` only. | Done |
| `scripts/create-admin.ts` | Exit if `ADMIN_EMAIL` or `ADMIN_PASSWORD` is missing. | Done |
| `app/api/upload/route.ts` | Cloudinary config from env only. Returns 500 if missing. Admin only, images only, 8 MB limit. | Done |
| `next.config.mjs` | `next build` fails in production if `MONGODB_URI` or `NEXTAUTH_SECRET` (min 16 characters) is missing. Not in the original plan. It covers only those two. The other vars are checked by `lib/env.ts` on first use. | Done |
| `.env.example` | Removed the `MONGO_URI` line. `lib/env.ts` and `next.config.mjs` no longer accept `MONGO_URI` either, so `MONGODB_URI` is the only name. If an old `.env.local` still uses `MONGO_URI`, rename it. | Done |
| `README.md` | Rewritten: variable list, no `admin123`, no local Windows path, Vercel deploy steps, seed warning, admin screens. | Done |
| `lib/ratelimit.ts` | Comment fixed (no Redis). It also now says that no route imports this limiter, so nothing is rate limited today. Admin login has its own lockout after 5 wrong passwords. | Done |
| Cloudinary key | The old key and secret were in git history. Rotate the key in the Cloudinary dashboard. | **Left (manual)** |

Placeholder bank number: removed from the fallback in `lib/settings.ts` and from the default in `lib/models/Settings.ts`. When no account number is saved, the order confirmation page tells a bank-transfer customer that the number will be sent on WhatsApp, instead of showing a made-up number. The seed data still writes a placeholder account number, phone and address into the database, so save the real values in `/admin/settings` after seeding. Also note: the WhatsApp button on the order confirmation page is hardcoded to `923001234567` and does not use the phone saved in settings. That was not changed here.

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

### 2. Product editor — done

The owner can now create, edit, draft and archive products from `/admin/products`.

**What was built**

| File | What it does |
|---|---|
| `components/admin/ProductForm.tsx` | Client form shared by New and Edit. Calls the existing product APIs. |
| `app/admin/products/new/page.tsx` | New product page. |
| `app/admin/products/[id]/page.tsx` | Edit page. Loads the product straight from MongoDB with `productLookup(id)`, so drafts and archived products open too. Shows 404 if missing. |
| `app/admin/products/page.tsx` | Added a New product button, an Edit link on each row, and status badges that match the status (green active, amber draft, grey archived). |

The product APIs were not changed. `POST` and `PATCH` already validated with `parseProductWrite`, and `DELETE` already archives.

**How the form behaves**

- Fields: title, handle, category (`ladies`, `gents`, `gems`), kind (`ring`, `bracelet`, `stone`), description, base price, compare-at price, stones, sizes, stock for every stone and size, status (`draft`, `active`, `archived`), photos.
- New products start as **Draft** with sizes 5, 6, 7 selected.
- The handle fills in from the title. On an existing product the handle is **locked** until the owner clicks Change, and a warning explains what breaks (product link, SKUs, saved wishlists).
- Stones are chips from the shop's stone list (`lib/constants.ts`). Other stones can be typed in (lowercase letters and numbers only). Stones outside the list show with a default colour in the shop.
- Sizes: rings pick from 5 to 12. Bracelets are fixed to `adj` and loose stones to `one`, which matches the seed data. Changing the kind resets the sizes.
- The stock table shows each stone's final price (base price plus the stone's price difference).
- At least one photo is required, even for a draft. The first photo is the cover. Photos can be reordered, set as cover, or removed.
- Archive asks for confirmation. To restore, set the status back to Draft or Active and save.
- Server error messages (duplicate handle and so on) show at the top of the form.

**Decisions made, change them if you disagree**

- **Photos can only be added by upload, not by pasting a link.** The storefront only allows images from `res.cloudinary.com` (`next.config.mjs`), so a pasted link from another site would show as a broken image.
- **Photos are resized in the browser** if they are over 3 MB or 2400 px. Vercel refuses request bodies over 4.5 MB before they reach the code, while `/api/upload` accepts 8 MB. Without the resize, ordinary phone photos would fail on Vercel.
- **Saving replaces stock.** `PATCH` rebuilds all variants from the form, so every stone and size takes the number in the table. The form loads the current stock and sends it back, so nothing is zeroed by accident. If an order arrives while the page is open, saving will overwrite that order's stock change. The page tells the owner to reload first and to use `/admin/inventory` for later changes.
- **Per-stone price differences are not editable.** They are read from the stone list (or the stored value on an existing product) and shown in the stock table.

**How section 2 was tested**

The environment had no network, so a full Next.js install and build were not possible. The form was bundled and run in a real Chromium browser with mocked API responses. 70 checks passed, covering: validation messages, handle auto-fill and lock, stone and size selection, stock table rebuilding, price preview, upload of a 20 MB photo (shrunk to 2.4 MB before sending), non-image rejection, photo reordering, create and edit payloads (existing stock is sent back intact), archive with confirm and cancel, and server error display. The three server pages were type-checked against stand-in types only.

Not tested: `next build`, the server pages against a real database, and the real Cloudinary upload.

**Test checklist for the developer (real Atlas database)**

1. Create a draft with two photos. It must not appear at `/collections/all`. Set it to Active. It must appear.
2. Open a seeded product and save it without changes. Compare its stock in `/admin/inventory` before and after. The numbers must match.
3. Change a price and some stock. Reload. The numbers persist, and `/admin/inventory` agrees.
4. Archive a product. It disappears from the shop, still opens in `/admin/products`, and can be restored.
5. On the deployed Vercel site, upload a photo larger than 5 MB. It must work.
6. Place an order for an edited product. Stock drops by the right amount in both `/admin/inventory` and on the product page.

Seeded products already have photos. All 15 seed photo paths exist in `public/images/products/` and are deployed with the app. The owner can replace them with Cloudinary photos in the editor whenever they like.

### 3. Articles (content pages) — done

The owner can now edit the seeded pages (About, shipping, care, size guide, contact, privacy, terms) and add new ones from `/admin/pages`.

**What was built**

| File | What it does |
|---|---|
| `app/api/admin/pages/route.ts` | `GET` list, `POST` create. Already existed. Not changed. |
| `app/api/admin/pages/[slug]/route.ts` | `GET` one page, `PATCH` update. Checks that a new slug is free. Already existed. Not changed. |
| `app/admin/pages/page.tsx` | Server page: `connectDB()`, loads all pages sorted by title, passes them to the client component. `force-dynamic` like the other admin pages. |
| `components/admin/PagesClient.tsx` | The screen: list of pages on the left, editor on the right. Add page button. |
| `components/admin/AdminNav.tsx` | Added `Pages` between Discounts and Settings. It feeds both the desktop and the mobile menu. |
| `app/(store)/pages/[slug]/page.tsx` | No change. It prints `body` split on blank lines. |

**How the screen behaves**

- The list shows title, slug, whether the shop footer links to the page, and the last update date. Each row has a View link to the live page. The count in the list header updates when a page is added.
- Nothing is open until the owner picks a page or clicks Add page. On a phone the editor scrolls into view after a page is chosen.
- Fields: title, slug, body, meta description. Every save sends `slug`, `title`, `body` and `metaDesc`. New pages use `POST /api/admin/pages`. Existing pages use `PATCH /api/admin/pages/[slug]` with the slug the page had when it was opened, so a slug change is saved correctly. After a save the screen keeps working on the new slug.
- Checks run in the browser before anything is sent and use the same wording as the API: title and body required, title up to 160 characters, body up to 20,000. Server errors (a taken slug returns 409, and so on) show at the top of the editor. The form keeps what was typed.
- The slug fills in from the title on a new page. On an existing page the slug is **locked** until the owner clicks Change.
- The six pages the footer links to (`size-guide`, `care-guide`, `shipping-returns`, `contact`, `privacy-policy`, `terms-of-service`) get a specific warning when unlocked. It names the footer link that will break. Saving a changed slug on one of those pages also asks the owner to confirm. Other pages get a general warning about old links and bookmarks. Neither case adds a redirect.
- A note under the body says that paragraphs are split on blank lines and a single line break is not kept. It shows how many paragraphs the page will have. A second note appears when the text has lines joined by a single break.
- Before saving, the body is cleaned so what the owner types matches what the shop prints: Windows line endings become `\n`, lines that hold only spaces count as blank, and runs of blank lines become one blank line.
- Unsaved changes: the editor shows "Unsaved changes", asks before switching to another page, adding a page or closing, and the browser asks before the tab is closed. Discard changes puts the saved text back.
- There is no delete. The plan does not ask for it.

**Decisions made, change them if you disagree**

- **The meta description limit is a hint only.** The counter says "about 160", but nothing blocks a longer text. The API has no limit on it.
- **The footer page list is written into `PagesClient.tsx`** (`FOOTER_LINKS`), because the footer links are written by hand in `components/store/Footer.tsx`. If a footer link is added or renamed, update both.
- **The storefront page was not touched.** It still prints each blank-line-separated block as one paragraph.

**Known content problem in the seed data**

The seeded Contact page used to have the phone, email and studio on three lines joined by single line breaks, which the shop joins into one line. That is now fixed in `data/seed.ts` and `scripts/build_seed.js` (blank line between the three lines). If the database was already seeded with the old text, fix it once in `/admin/pages`.

**How section 3 was tested**

The environment had no network, so a full Next.js install and build were not possible. `PagesClient.tsx` was bundled and run in a real Chromium browser. The two admin API routes were replaced by an in-memory stand-in that uses the project's real `parsePageWrite` and the same 400, 404 and 409 rules as the route files. 104 checks passed, covering: list order and footer labels, opening a page, edit and save (request URL, method and payload), empty meta description, discard, slug lock, both slug warnings, the footer confirm (declined sends nothing, accepted sends the old slug in the URL and the new slug in the body), the next save after a slug change, create, create followed by edit (a PATCH, not a second POST), 409 on create and on edit, title and body limits (160 and exactly 20,000 accepted, one over refused), blank title and slug, 500, 401 and non-JSON errors with recovery, the single-line-break note on the seeded Contact page, the unsaved-changes prompts, a page whose slug is `new` and one whose slug is `constructor`, no sideways scrolling on desktop and phone width, and no console errors. The new files were type-checked in strict mode against stand-in React types.

Not tested: `next build`, the server page against a real database, the two API routes against Atlas, and the nav change in a running app.

**Test checklist for the developer (real Atlas database)**

1. Sign in. `/admin/pages` lists the seven seeded pages and `Pages` shows in the nav on desktop and on a phone. Signed out, `/admin/pages` sends you to the login page.
2. Open Shipping & Returns, change one sentence and save. Refresh `/pages/shipping-returns`. The new text shows.
3. Open Contact. Put a blank line between the phone, email and studio lines and save. `/pages/contact` shows three separate lines.
4. Add a page titled "Gift wrapping". `/pages/gift-wrapping` opens and shows the text. Add a second page with the slug `gift-wrapping`. The editor shows "A page with this slug already exists."
5. Change the slug of the new page (not a footer page) and save. The old address shows not found and the new one works.
6. Open a footer page, click Change, edit the slug and save. A confirm appears naming the footer link. Cancel it. Nothing changes.
7. Run `/admin/pages` on a phone-width window. The editor scrolls into view after a page is chosen and nothing scrolls sideways.

## Deploy order

1. Run `next build` with `MONGODB_URI` or `NEXTAUTH_SECRET` unset and confirm it fails. (`next.config.mjs` does this. Loading the config alone was checked with each variable missing, with a short secret and with both set.)
2. Create the Atlas cluster and database `gss_collection`. Put the connection string in `.env.local` and in Vercel.
3. Create the Cloudinary account you control. Rotate the old key. Put the new keys in `.env.local` and in Vercel.
4. Import the GitHub repo into Vercel as a Next.js project. Set the env vars. Deploy.
5. From your machine, with `MONGODB_URI` pointing at Atlas, run `npm run seed` once.
6. Sign in at `/admin`. Run the product editor checklist and the pages admin checklist. Confirm one content page edit shows on the storefront. Change the owner password in the app and delete `ADMIN_PASSWORD` from Vercel.

## Launch check

- Homepage, one collection, and one product load.
- Seeded products show their photos. A product made in the editor shows a Cloudinary photo.
- Cart and checkout complete a COD or bank-transfer order, and the order appears in `/admin/orders`.
- `/admin/login` rejects a wrong password and accepts the owner.
- Creating a draft product hides it from the shop. Setting it to active shows it.
- Editing Shipping & Returns in `/admin/pages` changes `/pages/shipping-returns` on refresh.
- Real bank details, phone and address are saved in `/admin/settings`.

Orders, stock, discounts, inbox, and settings need no new screens for launch.

## Order SKU issue: fixed in code

**The problem.** `POST /api/orders` used to read the SKU from the customer's browser (`item.sku`). If the owner changed a product's handle in the editor, its variant SKUs changed. A customer whose cart still held the old SKU could still place the order, but the variant stock was not reduced. The code then fell back to the older `inventory` map, while the shop and the inventory screen read variant stock first. The result was overselling.

**What changed.**

| File | Change |
|---|---|
| `lib/stock.ts` (new) | Finds the variant by **stone and size**, never by a SKU from the browser. Takes stock with one atomic update that only matches while `stock >= qty`. Never falls back to the `inventory` map for a product that has variants. Puts stock back if a later step fails. |
| `app/api/orders/route.ts` | Ignores `item.sku`. The order line gets the SKU stored on the variant (or one built from handle, stone and size if the variant has none). If a take fails because someone else bought the last piece, the customer gets a clear stock message. If any line fails, or the order cannot be saved, stock already taken for earlier lines is put back. A product with variants but no variant for the chosen stone and size answers "no longer available". |
| `app/(store)/checkout/page.tsx` | No longer sends `sku`. |
| `app/api/admin/orders/[id]/route.ts` | Cancelling an order now puts stock back by stone and size. Before, it matched on the SKU saved on the order, so orders placed before a handle change were silently not restocked while the order was still marked restocked. Old products with only an `inventory` map are restocked too. |

A deliberate choice: the SKU used is the one stored on the variant, not a fresh one built from the handle. Cancel and restock then always match what is in the database.

**How this was tested.** `lib/stock.ts` has no runtime imports, so its logic was run on its own against an in-memory stand-in for the product update. Nine scenarios passed: a renamed handle with a stale cart, losing the race for the last piece (and no fallback update), asking for more than the stock, a stone or size the product no longer sells, an old inventory-map product, a two-line order where line 2 fails (line 1 is put back), cancel restock after a handle change, and a rollback that never throws. A whole-project type check against the original showed no new errors in these files, but it ran without the Next.js, React and Mongoose types, so it cannot catch type mismatches against those.

Not tested: `next build`, the real MongoDB update behaviour (`$elemMatch` with the positional `$`, and the `inventory.<stone>:<size>` map path in a filter), and the routes themselves.

**Test checklist for the developer (real Atlas database).**

1. Open a product in the shop and add a stone and size to the cart. In `/admin/products`, change that product's handle and save. Without clearing the cart, place the order. In `/admin/inventory` the stock for that stone and size drops by the ordered amount. The order shows the new SKU.
2. Set a variant's stock to 1. Open two browsers, put it in both carts, and place both orders at nearly the same time. One succeeds. The other gets a stock message. Stock ends at 0, not negative.
3. Put two lines in one cart where the second has too little stock (lower its stock in `/admin/inventory` after filling the cart). The order fails and the first line's stock is unchanged.
4. Place an order, change the product handle, then cancel the order in `/admin/orders`. Stock goes back up by the order quantity.
5. Order from a seeded product with no changes. Stock drops by the right amount, and the order's SKU looks like `CRIMSON-HALO-RING-GARNET-7`.
