# GSS Collection — Next.js & MongoDB Production Storefront

Modern full-stack e-commerce application for **GSS Collection** (925 sterling silver jewelry & natural untreated gemstones), converted from single-file HTML prototype to Next.js 14 App Router + MongoDB.

---

## Getting Started

### 1. Environment Setup
Check [.env.local](file:///C:/Users/Welcome/Desktop/MyProjects/GSS%20Collection/.env.local):
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/gss-collection
NEXTAUTH_SECRET=your_32_character_secret
NEXTAUTH_URL=http://localhost:3000
ADMIN_PASSWORD=admin123
```

### 2. Seeding Catalog & Settings
To populate your MongoDB database with all 14 ring models, stone configurations, and store settings from the catalog:
```bash
npm run seed
```

### 3. Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Route Overview

* **Storefront**:
  * `/` — Luxury editorial homepage with featured pieces and trust bar.
  * `/collections/[handle]` — Filterable collections (`all`, `ladies`, `gents`, `gems`).
  * `/products/[handle]` — Product detail page with dynamic gemstone properties, ring sizing, and SVG ring visualizer.
  * `/cart` — Cart management.
  * `/checkout` — Checkout with Cash on Delivery (COD) and Direct Bank Transfer.
* **Backend API**:
  * `POST /api/orders` — Validates order items, atomically decrements variant inventory, records discount codes, and saves order.
  * `POST /api/contact` — Receives customer inquiries and WhatsApp requests.
  * `GET /api/search?q=` — Full-text and keyword search across rings and natural stones.
* **Admin**:
  * `/admin` — Revenue overview, order fulfillments, stock monitoring, and customer messages.
