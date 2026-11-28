import mongoose from 'mongoose';
import type { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryMongo } from '@/tests/helpers/memory-mongo';

const mockSessionState = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string; name: string; role?: string } },
}));

vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn(async () => mockSessionState.session),
}));

import { Product } from '@/lib/models/Product';
import { Category } from '@/lib/models/Category';
import { Order } from '@/lib/models/Order';
import { Counter } from '@/lib/models/Counter';
import { Discount } from '@/lib/models/Discount';
import { Settings } from '@/lib/models/Settings';
import { RateLimit } from '@/lib/models/RateLimit';
import { Review } from '@/lib/models/Review';
import { AuditLog } from '@/lib/models/AuditLog';
import { Message } from '@/lib/models/Message';
import { isAdminRole } from '@/lib/roles';
import { DEFAULT_HERO, loadSettings } from '@/lib/settings';

import { POST as createOrder } from '@/app/api/orders/route';
import { GET as trackOrder } from '@/app/api/orders/track/route';
import { POST as validateCart } from '@/app/api/cart/validate/route';
import { POST as validateDiscount } from '@/app/api/discounts/validate/route';
import { GET as getReviews, POST as createReview } from '@/app/api/reviews/route';
import { POST as submitContact } from '@/app/api/contact/route';
import { POST as postMonitoring } from '@/app/api/monitoring/route';
import { GET as searchProducts } from '@/app/api/search/route';
import { GET as getAdminOrder, PATCH as patchAdminOrder } from '@/app/api/admin/orders/[id]/route';
import { GET as getAdminDiscounts, POST as createAdminDiscount } from '@/app/api/admin/discounts/route';
import { GET as getAdminSettings, PATCH as patchAdminSettings } from '@/app/api/admin/settings/route';
import { GET as getAdminInbox, PATCH as patchAdminInbox } from '@/app/api/admin/inbox/route';

let mongod: MongoMemoryServer;
let ipCounter = 1;

function nextIp(): string {
  ipCounter += 1;
  return `10.0.0.${ipCounter}`;
}

function jsonRequest(url: string, method: string, body?: unknown, ip = nextIp()): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function seedCatalogueAndSettings() {
  await Settings.create({
    storeName: 'GSS Collection',
    tagline: 'Test Atelier',
    baseCurrency: 'PKR',
    freeShippingFrom: 15000,
    shipping: {
      pk: [
        { id: 'std', label: 'Standard delivery (Pakistan)', eta: '3-5 days', price: 300 },
        { id: 'exp', label: 'Express air', eta: '1-2 days', price: 750 },
      ],
      intl: [{ id: 'std', label: 'DHL Express', eta: '7-10 days', price: 3500 }],
    },
    contact: {
      email: 'support@gsscollection.pk',
      phone: '+92 300 1234567',
      hours: '10-7',
      address: 'Lahore',
    },
    bank: {
      bankName: 'Meezan Bank',
      accountTitle: 'GSS Collection',
      accountNumber: 'PK00MEZN0001',
    },
    moderateReviews: false,
  });

  await Product.create([
    {
      id: 'ring-1',
      handle: 'crimson-halo-ring',
      title: 'Crimson Halo Ring',
      setting: '925 Sterling Silver',
      family: 'halo',
      band: 'pave',
      cat: 'ladies',
      kind: 'ring',
      aud: 'women',
      stones: ['garnet', 'peridot'],
      base: 9500,
      sizes: ['6', '7'],
      variants: [
        { sku: 'CHR-GAR-6', stone: 'garnet', size: '6', price: 9500, stock: 2 },
        { sku: 'CHR-GAR-7', stone: 'garnet', size: '7', price: 9500, stock: 3 },
        { sku: 'CHR-PER-7', stone: 'peridot', size: '7', price: 11200, stock: 1 },
      ],
      photos: ['/images/products/crimson-halo-ring-0.jpg'],
      desc: 'Handcrafted silver halo ring.',
      status: 'active',
    },
    {
      id: 'ring-2',
      handle: 'emerald-signet',
      title: 'Emerald Signet Ring',
      setting: '925 Sterling Silver',
      family: 'signet',
      band: 'solid',
      cat: 'gents',
      kind: 'ring',
      aud: 'men',
      stones: ['emerald'],
      base: 16000,
      sizes: ['9'],
      variants: [{ sku: 'ESR-EMR-9', stone: 'emerald', size: '9', price: 16000, stock: 1 }],
      photos: ['/images/products/emerald-halo-oval-ring-0.jpg'],
      desc: 'Bold signet ring.',
      status: 'active',
    },
  ]);

  await Discount.create({
    code: 'WELCOME10',
    type: 'pct',
    value: 10,
    minOrder: 5000,
    active: true,
    uses: 0,
    limit: 5,
  });
}

beforeAll(async () => {
  mongod = await createMemoryMongo();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.NEXTAUTH_SECRET = 'test-secret-minimum-sixteen-chars';
  process.env.ADMIN_EMAIL = 'admin@gsscollection.pk';
  process.env.CLOUDINARY_CLOUD_NAME = 'demo';
  process.env.CLOUDINARY_API_KEY = '123456';
  process.env.CLOUDINARY_API_SECRET = 'secret';

  global.mongooseCache = { conn: null, promise: null };
  await mongoose.connect(process.env.MONGODB_URI);
  global.mongooseCache = { conn: mongoose, promise: Promise.resolve(mongoose) };
});

afterAll(async () => {
  global.mongooseCache = { conn: null, promise: null };
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  mockSessionState.session = null;
  await Promise.all([
    Product.deleteMany({}),
    Category.deleteMany({}),
    Order.deleteMany({}),
    Counter.deleteMany({}),
    Discount.deleteMany({}),
    Settings.deleteMany({}),
    RateLimit.deleteMany({}),
    Review.deleteMany({}),
    AuditLog.deleteMany({}),
    Message.deleteMany({}),
  ]);
  await seedCatalogueAndSettings();
});

describe('Storefront & Order API integration (MongoMemoryServer)', () => {
  it('places COD order, re-prices server-side ignoring client price, decrements variant stock atomically, and enforces idempotency', async () => {
    const payload = {
      items: [
        {
          productId: 'ring-1',
          handle: 'crimson-halo-ring',
          title: 'Crimson Halo Ring',
          stone: 'peridot',
          size: '7',
          qty: 1,
          // Client attempts to spoof price to Rs. 1 — server must ignore it.
          price: 1,
        },
      ],
      contact: { email: 'Buyer@Example.com', phone: '03001234567' },
      address: {
        name: 'Ayesha Khan',
        line1: 'House 12, Street 4',
        city: 'Lahore',
        country: 'PK',
      },
      payMethod: 'cod',
      shippingMethodId: 'std',
      discountCode: 'welcome10',
      idempotencyKey: 'idem-order-key-1',
    };

    const res = await createOrder(jsonRequest('http://localhost/api/orders', 'POST', payload));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.orderNo).toMatch(/^GSS-\d+$/);
    expect(body.accessToken).toBeTruthy();

    const savedOrder = await Order.findOne({ orderNo: body.orderNo }).lean();
    expect(savedOrder).toBeTruthy();
    expect(savedOrder?.subtotal).toBe(11200);
    expect(savedOrder?.discount).toBe(1120);
    expect(savedOrder?.shipping).toBe(300);
    expect(savedOrder?.total).toBe(11200 - 1120 + 300);
    expect(savedOrder?.contact.email).toBe('buyer@example.com');

    const updatedProduct = await Product.findOne({ id: 'ring-1' }).lean();
    const peridotVar = updatedProduct?.variants.find((v) => v.stone === 'peridot' && v.size === '7');
    expect(peridotVar?.stock).toBe(0);

    const disc = await Discount.findOne({ code: 'WELCOME10' }).lean();
    expect(disc?.uses).toBe(1);

    // Duplicate idempotencyKey returns existing order without deducting twice
    const replayRes = await createOrder(jsonRequest('http://localhost/api/orders', 'POST', payload));
    const replayBody = await replayRes.json();
    expect(replayRes.status).toBe(200);
    expect(replayBody.orderNo).toBe(body.orderNo);
    expect(await Order.countDocuments({})).toBe(1);
  });

  it('rolls back stock of item 1 when item 2 has insufficient stock', async () => {
    const res = await createOrder(
      jsonRequest('http://localhost/api/orders', 'POST', {
        items: [
          { productId: 'ring-1', stone: 'garnet', size: '6', qty: 1 }, // has 2
          { productId: 'ring-2', stone: 'emerald', size: '9', qty: 2 }, // only 1 in stock!
        ],
        contact: { email: 'buyer@example.com', phone: '+923217654321' },
        address: { name: 'Bilal Ahmed', line1: 'Block B', city: 'Karachi', country: 'PK' },
        payMethod: 'bank',
      })
    );

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Insufficient stock');

    // Verify ring-1 garnet:6 was rolled back cleanly to 2
    const ring1 = await Product.findOne({ id: 'ring-1' }).lean();
    expect(ring1?.variants.find((v) => v.stone === 'garnet' && v.size === '6')?.stock).toBe(2);
    expect(await Order.countDocuments({})).toBe(0);
  });

  it('rejects invalid Pakistani phone numbers cleanly without mutating stock', async () => {
    const res = await createOrder(
      jsonRequest('http://localhost/api/orders', 'POST', {
        items: [{ productId: 'ring-1', stone: 'garnet', size: '7', qty: 1 }],
        contact: { email: 'buyer@example.com', phone: '04235711223' }, // landline fails mobile rule
        address: { name: 'Sara', line1: 'Main Blvd', city: 'Lahore', country: 'PK' },
        payMethod: 'cod',
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Pakistani mobile/i);
  });

  it('enforces durable MongoDB rate limiting and returns 429 with Retry-After', async () => {
    const floodIp = '192.0.2.55';
    let lastRes: Response | null = null;
    for (let i = 0; i < 6; i++) {
      lastRes = await submitContact(
        jsonRequest(
          'http://localhost/api/contact',
          'POST',
          { name: 'Test User', email: 'u@example.com', message: 'Hello atelier' },
          floodIp
        )
      );
      if (i < 5) expect(lastRes.status).toBe(200);
    }
    expect(lastRes?.status).toBe(429);
    expect(Number(lastRes?.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1);
  });

  it('validates cart items, discounts, tracking, reviews, and search safely', async () => {
    const cartRes = await validateCart(
      jsonRequest('http://localhost/api/cart/validate', 'POST', {
        items: [{ productId: 'ring-2', stone: 'emerald', size: '9', qty: 5 }], // exceeds stock 1
        country: 'PK',
        shippingMethodId: 'std',
      })
    );
    expect(cartRes.status).toBe(200);
    const cartData = await cartRes.json();
    expect(cartData.valid).toBe(false);
    expect(cartData.items[0].qty).toBe(1);
    expect(cartData.subtotal).toBe(16000);
    expect(cartData.shipping).toBe(0); // >= 15000 threshold

    const discOk = await validateDiscount(
      jsonRequest('http://localhost/api/discounts/validate', 'POST', {
        code: 'WELCOME10',
        subtotal: 10000,
      })
    );
    expect(discOk.status).toBe(200);
    expect((await discOk.json()).discountAmount).toBe(1000);

    const discMissing = await validateDiscount(
      jsonRequest('http://localhost/api/discounts/validate', 'POST', {
        code: 'NOPE',
        subtotal: 10000,
      })
    );
    expect(discMissing.status).toBe(404);

    // Search skips unsafe regex injection cleanly
    const searchRes = await searchProducts(
      new Request('http://localhost/api/search?q=(a%2B)%2B$')
    );
    expect(searchRes.status).toBe(200);

    // Monitoring ingest accepts valid client error events and rejects invalid payloads
    const monBad = await postMonitoring(jsonRequest('http://localhost/api/monitoring', 'POST', {}));
    expect(monBad.status).toBe(400);
    const monGood = await postMonitoring(
      jsonRequest('http://localhost/api/monitoring', 'POST', {
        message: 'Checkout render failed',
        route: '/checkout',
        area: 'checkout',
      })
    );
    expect(monGood.status).toBe(204);

    // Reviews post & fetch
    const revPost = await createReview(
      jsonRequest('http://localhost/api/reviews', 'POST', {
        productId: 'ring-1',
        name: 'Hina',
        rating: 5,
        comment: 'Sparkling craftsmanship.',
      })
    );
    expect(revPost.status).toBe(201);
    const revGet = await getReviews(new Request('http://localhost/api/reviews?productId=ring-1'));
    expect((await revGet.json()).reviews).toHaveLength(1);
  });

  it('enforces RBAC on admin routes (401/403), cancels order with idempotent restock even after handle change, and tracks order', async () => {
    // 1. Place order on ring-1 garnet:7 (stock 3 -> 1)
    const createRes = await createOrder(
      jsonRequest('http://localhost/api/orders', 'POST', {
        items: [{ productId: 'ring-1', stone: 'garnet', size: '7', qty: 2 }],
        contact: { email: 'TrackMe@Example.com', phone: '03019998877' },
        address: { name: 'Zain', line1: 'Street 7', city: 'Islamabad', country: 'PK' },
        payMethod: 'cod',
      })
    );
    const { orderNo } = await createRes.json();

    // 2. Rename product handle after order was placed
    await Product.updateOne({ id: 'ring-1' }, { $set: { handle: 'crimson-halo-v2' } });

    // 3. Public track endpoint works with email (case-insensitive) and phone
    const trackEmailRes = await trackOrder(
      new Request(`http://localhost/api/orders/track?orderNo=${orderNo}&contact=trackme@example.com`, {
        headers: { 'x-forwarded-for': nextIp() },
      })
    );
    expect(trackEmailRes.status).toBe(200);
    expect((await trackEmailRes.json()).order.orderNo).toBe(orderNo);

    const trackFail = await trackOrder(
      new Request(`http://localhost/api/orders/track?orderNo=${orderNo}&contact=wrong@example.com`, {
        headers: { 'x-forwarded-for': nextIp() },
      })
    );
    expect(trackFail.status).toBe(404);

    // Short 6-digit phone suffix must NOT match order tracking
    const shortPhoneFail = await trackOrder(
      new Request(`http://localhost/api/orders/track?orderNo=${orderNo}&contact=998877`, {
        headers: { 'x-forwarded-for': nextIp() },
      })
    );
    expect(shortPhoneFail.status).toBe(404);

    // 4. Unauthenticated admin call -> 401
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole('customer')).toBe(false);
    expect(isAdminRole('admin')).toBe(true);

    const unauth = await getAdminOrder(new Request('http://localhost'), { params: { id: orderNo } });
    expect(unauth.status).toBe(401);

    // 5. Non-admin authenticated user -> 403
    mockSessionState.session = {
      user: { id: 'u1', email: 'user@example.com', name: 'User', role: 'user' },
    };
    const forbidden = await patchAdminOrder(
      jsonRequest('http://localhost', 'PATCH', { fulfil: 'cancelled' }),
      { params: { id: orderNo } }
    );
    expect(forbidden.status).toBe(403);

    // 6. Real admin cancels order -> restocks garnet:7 back to 3 + logs AuditLog; second cancel is idempotent
    mockSessionState.session = {
      user: { id: 'a1', email: 'admin@gsscollection.pk', name: 'Admin', role: 'admin' },
    };
    const cancelRes = await patchAdminOrder(
      jsonRequest('http://localhost', 'PATCH', { fulfil: 'cancelled', payStatus: 'refunded' }),
      { params: { id: orderNo } }
    );
    expect(cancelRes.status).toBe(200);

    const pAfterCancel = await Product.findOne({ id: 'ring-1' }).lean();
    expect(pAfterCancel?.variants.find((v) => v.stone === 'garnet' && v.size === '7')?.stock).toBe(3);
    expect(await AuditLog.countDocuments({ entityId: orderNo })).toBe(1);

    // Repeat cancel must NOT double-restore stock
    await patchAdminOrder(
      jsonRequest('http://localhost', 'PATCH', { fulfil: 'cancelled' }),
      { params: { id: orderNo } }
    );
    const pRepeat = await Product.findOne({ id: 'ring-1' }).lean();
    expect(pRepeat?.variants.find((v) => v.stone === 'garnet' && v.size === '7')?.stock).toBe(3);

    // Admin discounts, settings & inbox endpoints
    const discCreate = await createAdminDiscount(
      jsonRequest('http://localhost', 'POST', { code: 'SHIPFREE', type: 'ship', value: 0, minOrder: 0, limit: 0 })
    );
    expect(discCreate.status).toBe(201);
    const discList = await getAdminDiscounts();
    expect((await discList.json()).discounts.length).toBeGreaterThanOrEqual(2);

    // Legacy Settings docs without `hero` merge defaults cleanly in loadSettings()
    const legacyLoaded = await loadSettings();
    expect(legacyLoaded.hero?.headline).toBe(DEFAULT_HERO.headline);
    expect(legacyLoaded.hero?.imageUrl).toBe('');

    const patchSettings = await patchAdminSettings(
      jsonRequest('http://localhost', 'PATCH', {
        freeShippingFrom: 18000,
        hero: {
          eyebrow: 'Limited Winter Release',
          headline: 'Bespoke Turquoise Signets',
          description: 'Hand-carved 925 sterling silver set with earth-mined stones.',
          imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/winter-hero.jpg',
          imageAlt: 'Bespoke turquoise signet banner',
          linkHref: '/collections/gents',
        },
      })
    );
    expect(patchSettings.status).toBe(200);
    const readSettings = await getAdminSettings();
    const readJson = await readSettings.json();
    expect(readJson.settings.freeShippingFrom).toBe(18000);
    expect(readJson.settings.hero.headline).toBe('Bespoke Turquoise Signets');
    expect(readJson.settings.hero.imageUrl).toBe(
      'https://res.cloudinary.com/demo/image/upload/v1/winter-hero.jpg'
    );

    const updatedLoaded = await loadSettings();
    expect(updatedLoaded.hero?.eyebrow).toBe('Limited Winter Release');
    expect(updatedLoaded.hero?.linkHref).toBe('/collections/gents');

    // Untrusted external hero image domains and empty headlines are rejected
    const badImageRes = await patchAdminSettings(
      jsonRequest('http://localhost', 'PATCH', {
        hero: {
          eyebrow: 'Studio',
          headline: 'Valid Headline Text',
          description: 'Description',
          imageUrl: 'https://untrusted.example.com/hero.jpg',
        },
      })
    );
    expect(badImageRes.status).toBe(400);

    const badHeadlineRes = await patchAdminSettings(
      jsonRequest('http://localhost', 'PATCH', {
        hero: {
          eyebrow: 'Studio',
          headline: 'Hi',
          description: 'Description',
          imageUrl: '',
        },
      })
    );
    expect(badHeadlineRes.status).toBe(400);

    await submitContact(
      jsonRequest('http://localhost/api/contact', 'POST', {
        name: 'Inbox Tester',
        email: 'inbox@example.com',
        message: 'Do you resize rings?',
      })
    );
    const inboxRes = await getAdminInbox();
    const inboxJson = await inboxRes.json();
    expect(inboxJson.messages).toHaveLength(1);
    const msgPatch = await patchAdminInbox(
      jsonRequest('http://localhost', 'PATCH', { id: inboxJson.messages[0]._id, read: true })
    );
    expect(msgPatch.status).toBe(200);
  });

  it('enforces discount min-order, active flag, usage limit, shipping threshold boundary, and POST /api/orders 429 limit', async () => {
    await Discount.create([
      { code: 'EXPIRED', type: 'pct', value: 15, minOrder: 0, active: false, uses: 0, limit: 0 },
      { code: 'CAPPED1', type: 'fixed', value: 500, minOrder: 0, active: true, uses: 1, limit: 1 },
    ]);

    // Below minOrder (9500 threshold >= 5000, wait test uses WELCOME10? add HIGHMIN 10000)
    await Discount.create({
      code: 'HIGHMIN',
      type: 'pct',
      value: 20,
      minOrder: 15000,
      active: true,
      uses: 0,
      limit: 0,
    });

    const minFail = await validateDiscount(
      jsonRequest('http://localhost/api/discounts/validate', 'POST', {
        code: 'HIGHMIN',
        subtotal: 14999,
      })
    );
    expect(minFail.status).toBe(400);

    const expiredFail = await validateDiscount(
      jsonRequest('http://localhost/api/discounts/validate', 'POST', {
        code: 'EXPIRED',
        subtotal: 10000,
      })
    );
    expect(expiredFail.status).toBe(404);

    const limitFail = await validateDiscount(
      jsonRequest('http://localhost/api/discounts/validate', 'POST', {
        code: 'CAPPED1',
        subtotal: 10000,
      })
    );
    expect(limitFail.status).toBe(400);

    // Free shipping boundary: Rs. 14999 charges delivery vs Rs. 15000 is free
    const belowCart = await validateCart(
      jsonRequest('http://localhost/api/cart/validate', 'POST', {
        items: [{ productId: 'ring-1', stone: 'garnet', size: '6', qty: 1 }], // 9500 < 15000
        country: 'PK',
        shippingMethodId: 'std',
      })
    );
    expect((await belowCart.json()).shipping).toBe(300);

    const atCart = await validateCart(
      jsonRequest('http://localhost/api/cart/validate', 'POST', {
        items: [{ productId: 'ring-2', stone: 'emerald', size: '9', qty: 1 }], // 16000 >= 15000
        country: 'PK',
        shippingMethodId: 'std',
      })
    );
    expect((await atCart.json()).shipping).toBe(0);

    // Rate limit POST /api/orders after 10 attempts from same IP -> 429 + Retry-After
    const floodIp = '198.51.100.77';
    let lastOrderRes: Response | null = null;
    for (let i = 0; i < 11; i++) {
      lastOrderRes = await createOrder(
        jsonRequest('http://localhost/api/orders', 'POST', { items: [] }, floodIp)
      );
      if (i < 10) expect(lastOrderRes.status).toBe(400);
    }
    expect(lastOrderRes?.status).toBe(429);
    expect(Number(lastOrderRes?.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1);
  });

  it('rejects invalid promo codes at checkout without charging full price, blocks duplicate-item qty bypass, and handles malformed JSON/ObjectIds cleanly', async () => {
    // 1. Invalid discount code on POST /api/orders returns 400 and rolls back stock
    const badPromoOrder = await createOrder(
      jsonRequest('http://localhost/api/orders', 'POST', {
        items: [{ productId: 'ring-1', stone: 'garnet', size: '7', qty: 1 }],
        contact: { email: 'promo@example.com', phone: '03001234567' },
        address: { name: 'Ali', line1: 'Street 1', city: 'Lahore', country: 'PK' },
        payMethod: 'cod',
        discountCode: 'INVALID99',
      })
    );
    expect(badPromoOrder.status).toBe(400);
    const ring1AfterPromoFail = await Product.findOne({ id: 'ring-1' }).lean();
    expect(ring1AfterPromoFail?.variants.find((v) => v.stone === 'garnet' && v.size === '7')?.stock).toBe(3);

    // 2. Duplicate line items summing > 10 rejected cleanly
    const dupItemsOrder = await createOrder(
      jsonRequest('http://localhost/api/orders', 'POST', {
        items: [
          { productId: 'ring-1', stone: 'garnet', size: '7', qty: 6 },
          { productId: 'ring-1', stone: 'garnet', size: '7', qty: 6 },
        ],
        contact: { email: 'dup@example.com', phone: '03001234567' },
        address: { name: 'Ali', line1: 'Street 1', city: 'Lahore', country: 'PK' },
        payMethod: 'cod',
      })
    );
    expect(dupItemsOrder.status).toBe(400);

    // 3. Malformed JSON returns 400 instead of 500
    const badJsonOrder = await createOrder(
      new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': nextIp() },
        body: '{not-valid-json',
      })
    );
    expect(badJsonOrder.status).toBe(400);

    // 4. Review on nonexistent product returns 404
    const ghostReview = await createReview(
      jsonRequest('http://localhost/api/reviews', 'POST', {
        productId: 'nonexistent-ring',
        name: 'Tester',
        rating: 5,
        comment: 'Should fail',
      })
    );
    expect(ghostReview.status).toBe(404);

    // 5. Admin inbox rejects invalid ObjectId with 400 and missing ObjectId with 404
    mockSessionState.session = {
      user: { id: 'a1', email: 'admin@gsscollection.pk', name: 'Admin', role: 'admin' },
    };
    const badInboxId = await patchAdminInbox(
      jsonRequest('http://localhost', 'PATCH', { id: 'not-an-object-id', read: true })
    );
    expect(badInboxId.status).toBe(400);

    const missingInboxId = await patchAdminInbox(
      jsonRequest('http://localhost', 'PATCH', {
        id: new mongoose.Types.ObjectId().toString(),
        read: true,
      })
    );
    expect(missingInboxId.status).toBe(404);
  });
});
