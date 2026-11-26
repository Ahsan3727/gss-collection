import { spawn } from 'node:child_process';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { createMemoryMongo } from '../tests/helpers/memory-mongo';
import { Product } from '../lib/models/Product';
import { Settings } from '../lib/models/Settings';
import { Discount } from '../lib/models/Discount';
import { Page } from '../lib/models/Page';
import { AdminUser } from '../lib/models/AdminUser';

async function runPlaywright(extraEnv: Record<string, string>) {
  const pwArgs = ['playwright', 'test', ...process.argv.slice(2)];
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'cmd.exe' : 'npx';
  const args = isWin ? ['/d', '/s', '/c', 'npx', ...pwArgs] : pwArgs;
  return await new Promise<number>((resolve) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv },
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function seedE2EData() {
  await Settings.create({
    storeName: 'GSS Collection',
    tagline: 'Handcrafted in 925 Sterling Silver & Natural Gemstones',
    baseCurrency: 'PKR',
    freeShippingFrom: 15000,
    shipping: {
      pk: [
        { id: 'std', label: 'Standard delivery (Pakistan)', eta: '3 to 5 business days', price: 300 },
        { id: 'exp', label: 'Express courier delivery', eta: '1 to 2 business days', price: 700 },
      ],
      intl: [{ id: 'std', label: 'International registered mail', eta: '10 to 18 business days', price: 3500 }],
    },
    announcements: ['Handcrafted 925 Sterling Silver · Free shipping above Rs. 15,000'],
    contact: {
      email: 'support@gsscollection.pk',
      phone: '+92 300 1234567',
      hours: 'Mon - Sat, 10 AM - 7 PM',
      address: 'Lahore, Pakistan',
    },
    bank: {
      bankName: 'Meezan Bank Ltd',
      accountTitle: 'GSS Collection',
      accountNumber: 'PK12MEZN0002110100123456',
    },
    spotlightId: 'crimson-halo-ring',
    moderateReviews: false,
  });

  await Product.create([
    {
      id: 'crimson-halo-ring',
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
      compareAt: 11500,
      sizes: ['6', '7', '8'],
      variants: [
        { sku: 'CHR-GAR-6', stone: 'garnet', size: '6', price: 9500, stock: 3 },
        { sku: 'CHR-GAR-7', stone: 'garnet', size: '7', price: 9500, stock: 4 },
        { sku: 'CHR-GAR-8', stone: 'garnet', size: '8', price: 9500, stock: 2 },
        { sku: 'CHR-PER-7', stone: 'peridot', size: '7', price: 11200, stock: 3 },
      ],
      tags: ['halo', 'bestseller'],
      photos: [
        '/images/products/crimson-halo-ring-0.jpg',
        '/images/products/crimson-halo-ring-1.jpg',
      ],
      desc: 'Handcrafted sterling silver halo ring set with natural garnet.',
      status: 'active',
    },
    {
      id: 'emerald-signet',
      handle: 'emerald-halo-oval-ring',
      title: 'Emerald Halo Oval Ring',
      setting: '925 Sterling Silver',
      family: 'halo',
      band: 'split',
      cat: 'gents',
      kind: 'ring',
      aud: 'men',
      stones: ['emerald'],
      base: 16500,
      sizes: ['8', '9', '10'],
      variants: [
        { sku: 'EHO-EMR-8', stone: 'emerald', size: '8', price: 16500, stock: 2 },
        { sku: 'EHO-EMR-9', stone: 'emerald', size: '9', price: 16500, stock: 2 },
        { sku: 'EHO-EMR-10', stone: 'emerald', size: '10', price: 16500, stock: 1 },
      ],
      tags: ['new'],
      photos: ['/images/products/emerald-halo-oval-ring-0.jpg'],
      desc: 'Classic sterling silver oval bezel ring.',
      status: 'active',
    },
    {
      id: 'natural-turquoise-stone',
      handle: 'natural-turquoise-stone-9-7g',
      title: 'Natural Turquoise Specimen (9.7g)',
      setting: 'Loose Mineral Specimen',
      family: 'specimen',
      band: 'raw',
      cat: 'gems',
      kind: 'stone',
      aud: 'unisex',
      stones: ['turquoise'],
      base: 12500,
      sizes: ['one'],
      variants: [{ sku: 'NTS-TUR-ONE', stone: 'turquoise', size: 'one', price: 12500, stock: 2 }],
      tags: ['specimen'],
      photos: ['/images/products/natural-turquoise-stone-9-7g-0.jpg'],
      desc: 'Untreated turquoise specimen.',
      weight: 9.7,
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
    limit: 50,
  });

  await Page.create([
    {
      slug: 'size-guide',
      title: 'Ring Size Guide',
      body: 'Measure the inner diameter of a ring you wear comfortably in millimetres and match US size 6 (16.5 mm), size 7 (17.3 mm), or size 8 (18.1 mm).',
      metaDesc: 'How to find your exact US ring size.',
    },
    {
      slug: 'terms-of-service',
      title: 'Terms of Service',
      body: 'Every silver ring is handcrafted to authentic weight and gemstone specifications.',
      metaDesc: 'Terms of service.',
    },
    {
      slug: 'shipping-policy',
      title: 'Shipping & Delivery',
      body: 'Nationwide COD courier delivery takes 3 to 5 business days.',
      metaDesc: 'Shipping details.',
    },
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      body: 'Customer phone numbers and delivery details are used strictly for parcel fulfillment.',
      metaDesc: 'Privacy policy.',
    },
    {
      slug: 'returns-policy',
      title: 'Returns & Resizing',
      body: 'Unused items may be resized or exchanged within 7 days of delivery.',
      metaDesc: 'Returns policy.',
    },
  ]);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gsscollection.pk';
  const adminPassword = process.env.ADMIN_PASSWORD || 'TestAdmin123!';
  const hash = await bcrypt.hash(adminPassword, 10);
  await AdminUser.create({
    email: adminEmail.toLowerCase(),
    passwordHash: hash,
    name: 'E2E Admin',
    role: 'superadmin',
  });
}

async function main() {
  if (process.env.CI || process.env.E2E_USE_EXISTING_DB === '1') {
    const code = await runPlaywright({
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://127.0.0.1:3100',
      PLAYWRIGHT_PORT: process.env.PLAYWRIGHT_PORT || '3100',
    });
    process.exit(code);
  }

  const mongod = await createMemoryMongo();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  await seedE2EData();

  const port = process.env.PLAYWRIGHT_PORT || '3100';
  const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@gsscollection.pk';
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'TestAdmin123!';

  let exitCode = 1;
  try {
    exitCode = await runPlaywright({
      MONGODB_URI: uri,
      NEXTAUTH_SECRET: 'e2e-test-nextauth-secret-32-chars-minimum',
      NEXTAUTH_URL: `http://127.0.0.1:${port}`,
      PLAYWRIGHT_PORT: port,
      ADMIN_EMAIL: adminEmail,
      ADMIN_PASSWORD: adminPassword,
      E2E_ADMIN_EMAIL: adminEmail,
      E2E_ADMIN_PASSWORD: adminPassword,
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: '123456',
      CLOUDINARY_API_SECRET: 'secret',
      NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
    });
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
