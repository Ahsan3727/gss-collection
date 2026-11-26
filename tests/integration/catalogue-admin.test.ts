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
import { Page } from '@/lib/models/Page';
import { Review } from '@/lib/models/Review';
import { AdminUser } from '@/lib/models/AdminUser';
import { WebVital } from '@/lib/models/WebVital';
import { RateLimit } from '@/lib/models/RateLimit';
import { Settings } from '@/lib/models/Settings';
import { AuditLog } from '@/lib/models/AuditLog';

import { GET as listProducts, POST as createProduct } from '@/app/api/products/route';
import {
  GET as getProduct,
  PATCH as patchProduct,
  DELETE as archiveProduct,
} from '@/app/api/products/[id]/route';
import { PATCH as patchInventory } from '@/app/api/admin/inventory/route';
import { GET as listPages, POST as createPage } from '@/app/api/admin/pages/route';
import { GET as getPage, PATCH as patchPage } from '@/app/api/admin/pages/[slug]/route';
import { PATCH as patchReview, DELETE as deleteReview } from '@/app/api/reviews/[id]/route';
import { POST as postVitals } from '@/app/api/vitals/route';
import {
  getApprovedReviews,
  getCollectionProducts,
  getHomeFeaturedProducts,
  getProductByHandle,
  getRelatedProducts,
  getStaticPageBySlug,
  isValidCollectionHandle,
} from '@/lib/catalogue';
import { authOptions } from '@/lib/auth';
import { getStoreSettings } from '@/lib/settings';
import { buildVariantSku } from '@/lib/pricing';

let mongod: MongoMemoryServer;

function jsonReq(url: string, method: string, body?: unknown, ip = '10.10.0.1'): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeAll(async () => {
  mongod = await createMemoryMongo();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.NEXTAUTH_SECRET = 'test-secret-minimum-sixteen-chars';
  process.env.ADMIN_EMAIL = 'admin@gsscollection.pk';
  process.env.ADMIN_PASSWORD = 'BootstrapPassword1!';
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
    Page.deleteMany({}),
    Review.deleteMany({}),
    AdminUser.deleteMany({}),
    WebVital.deleteMany({}),
    RateLimit.deleteMany({}),
    Settings.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
});

describe('Products, Inventory, Pages, Reviews, Vitals, Catalogue & Auth', () => {
  it('creates, updates, queries via catalogue, adjusts inventory, and archives products', async () => {
    expect(isValidCollectionHandle('all')).toBe(true);
    expect(isValidCollectionHandle('blue-sapphire')).toBe(true);
    expect(isValidCollectionHandle('garnet')).toBe(true);
    expect(isValidCollectionHandle('does-not-exist')).toBe(false);

    mockSessionState.session = {
      user: { id: 'a1', email: 'admin@gsscollection.pk', name: 'Admin', role: 'admin' },
    };

    const validPayload = {
      title: 'Royal Garnet Solitaire',
      handle: 'royal-garnet-solitaire',
      cat: 'ladies',
      kind: 'ring',
      desc: 'Classic solitaire silver ring.',
      base: 9500,
      compareAt: 12000,
      stones: ['garnet'],
      sizes: ['6', '7'],
      photos: ['/images/products/crimson-halo-ring-0.jpg'],
      status: 'active',
      stock: { 'garnet:6': 4, 'garnet:7': 2 },
    };

    const badCreate = await createProduct(jsonReq('http://localhost/api/products', 'POST', { title: '' }));
    expect(badCreate.status).toBe(400);

    const createRes = await createProduct(jsonReq('http://localhost/api/products', 'POST', validPayload));
    expect(createRes.status).toBe(201);
    const createdJson = await createRes.json();
    const productId = createdJson.product.id;

    // Duplicate handle rejected
    const dupRes = await createProduct(jsonReq('http://localhost/api/products', 'POST', validPayload));
    expect(dupRes.status).toBe(409);

    // Public list & single fetch
    const listRes = await listProducts(new Request('http://localhost/api/products?cat=ladies&sort=price-asc'));
    expect(listRes.status).toBe(200);
    expect((await listRes.json()).products).toHaveLength(1);

    const singleRes = await getProduct(new Request('http://localhost'), { params: { id: productId } });
    expect(singleRes.status).toBe(200);

    // Catalogue SSR helpers
    const home = await getHomeFeaturedProducts();
    expect(home).toHaveLength(1);
    const colSale = await getCollectionProducts('sale', 'garnet', 'price-asc', 1, 12);
    expect(colSale.total).toBe(1);
    const colBest = await getCollectionProducts('best-sellers', undefined, 'best', 1, 12);
    expect(colBest.total).toBe(1);
    const byHandle = await getProductByHandle('royal-garnet-solitaire');
    expect(byHandle?.title).toBe('Royal Garnet Solitaire');
    const related = await getRelatedProducts('ladies', 'other-handle');
    expect(related).toHaveLength(1);
    expect(await getStoreSettings()).toBeTruthy();

    // Inventory PATCH
    const invRes = await patchInventory(
      jsonReq('http://localhost/api/admin/inventory', 'PATCH', {
        productId,
        sku: buildVariantSku('royal-garnet-solitaire', 'garnet', '7'),
        stone: 'garnet',
        size: '7',
        stock: 9,
      })
    );
    expect(invRes.status).toBe(200);
    expect((await invRes.json()).updatedStock).toBe(9);

    const invMissing = await patchInventory(
      jsonReq('http://localhost/api/admin/inventory', 'PATCH', {
        productId: 'nonexistent',
        stone: 'garnet',
        size: '7',
        stock: 1,
      })
    );
    expect(invMissing.status).toBe(404);

    // PATCH product into draft -> logged-out GET hides it with 404
    const patchRes = await patchProduct(
      jsonReq('http://localhost', 'PATCH', {
        ...validPayload,
        status: 'draft',
        handle: 'royal-garnet-draft',
      }),
      { params: { id: productId } }
    );
    expect(patchRes.status).toBe(200);

    mockSessionState.session = null;
    const draftHidden = await getProduct(new Request('http://localhost'), { params: { id: productId } });
    expect(draftHidden.status).toBe(404);

    mockSessionState.session = {
      user: { id: 'a1', email: 'admin@gsscollection.pk', name: 'Admin', role: 'admin' },
    };
    const archiveRes = await archiveProduct(new Request('http://localhost'), { params: { id: productId } });
    expect(archiveRes.status).toBe(200);
  });

  it('manages static CMS pages, review moderation, and Web Vitals reporting', async () => {
    mockSessionState.session = {
      user: { id: 'a1', email: 'admin@gsscollection.pk', name: 'Admin', role: 'admin' },
    };

    const pBad = await createPage(jsonReq('http://localhost/api/admin/pages', 'POST', { title: 'Empty' }));
    expect(pBad.status).toBe(400);

    const pCreate = await createPage(
      jsonReq('http://localhost/api/admin/pages', 'POST', {
        slug: 'care-guide',
        title: 'Silver Care Guide',
        body: 'Polish softly with a lint-free silver cloth.',
        metaDesc: 'How to care for sterling silver.',
      })
    );
    expect(pCreate.status).toBe(201);

    const pDup = await createPage(
      jsonReq('http://localhost/api/admin/pages', 'POST', {
        slug: 'care-guide',
        title: 'Duplicate',
        body: 'Duplicate body',
      })
    );
    expect(pDup.status).toBe(409);

    const pList = await listPages();
    expect((await pList.json()).pages).toHaveLength(1);

    const pGet = await getPage(new Request('http://localhost'), { params: { slug: 'care-guide' } });
    expect(pGet.status).toBe(200);

    const pPatch = await patchPage(
      jsonReq('http://localhost', 'PATCH', {
        slug: 'silver-care',
        title: 'Silver Care Guide Updated',
        body: 'Store in an airtight pouch away from humidity.',
      }),
      { params: { slug: 'care-guide' } }
    );
    expect(pPatch.status).toBe(200);

    const staticLoaded = await getStaticPageBySlug('silver-care');
    expect(staticLoaded?.title).toBe('Silver Care Guide Updated');

    // Review approval & deletion
    const rev = await Review.create({
      productId: 'p1',
      name: 'Nadia',
      rating: 5,
      comment: 'Gorgeous setting!',
      approved: false,
    });
    expect(await getApprovedReviews('p1')).toHaveLength(0);

    const revApprove = await patchReview(jsonReq('http://localhost', 'PATCH', { approved: true }), {
      params: { id: rev._id.toString() },
    });
    expect(revApprove.status).toBe(200);
    expect(await getApprovedReviews('p1')).toHaveLength(1);

    const revDelete = await deleteReview(new Request('http://localhost'), {
      params: { id: rev._id.toString() },
    });
    expect(revDelete.status).toBe(200);

    // Web Vitals collector
    const vBad = await postVitals(jsonReq('http://localhost/api/vitals', 'POST', { name: 'BAD', value: 1 }));
    expect(vBad.status).toBe(400);

    const vGood = await postVitals(
      jsonReq('http://localhost/api/vitals', 'POST', {
        name: 'LCP',
        value: 1800,
        id: 'v1-lcp-1',
        route: '/',
        w: 390,
      })
    );
    expect(vGood.status).toBe(204);
    expect(await WebVital.countDocuments({ metricId: 'v1-lcp-1' })).toBe(1);
  });

  it('bootstraps owner login, enforces brute-force lockout, and maps JWT/session roles strictly', async () => {
    const provider = authOptions.providers[0] as {
      options?: { authorize?: (c: Record<string, string>, r: unknown) => Promise<unknown> };
    };
    const authorize = provider.options?.authorize;
    expect(authorize).toBeTypeOf('function');

    const fakeReq = { headers: { 'x-forwarded-for': '10.20.30.40' } };

    // Bootstrap superadmin when AdminUser is empty
    const booted = await authorize!(
      { email: 'admin@gsscollection.pk', password: 'BootstrapPassword1!' },
      fakeReq
    );
    expect(booted).toMatchObject({ email: 'admin@gsscollection.pk', role: 'superadmin' });

    // Lock out after 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      await expect(
        authorize!({ email: 'admin@gsscollection.pk', password: 'WrongPassword' }, fakeReq)
      ).rejects.toThrow(/Invalid credentials/i);
    }
    await expect(
      authorize!({ email: 'admin@gsscollection.pk', password: 'BootstrapPassword1!' }, fakeReq)
    ).rejects.toThrow(/locked/i);

    // JWT & session callbacks never default missing role to admin
    const jwtCb = authOptions.callbacks!.jwt!;
    const sessCb = authOptions.callbacks!.session!;

    const emptyToken = await jwtCb({
      token: {},
      user: { id: 'u1', email: 'u@example.com', name: 'NoRole' } as never,
      account: null,
      trigger: 'signIn',
    });
    expect(emptyToken.role).toBe('');

    const sess = await sessCb({
      session: { expires: '2099-01-01', user: { name: 'NoRole', email: 'u@example.com' } },
      token: emptyToken,
      user: { id: 'u1', email: 'u@example.com' } as never,
      newSession: undefined,
      trigger: 'update',
    });
    expect((sess.user as { role?: string }).role).toBe('');
  });
});
