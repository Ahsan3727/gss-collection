const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'gss-collection-store-with-admin.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const match = html.match(/const RAW = (\[[\s\S]*?\]);\s*(?:const|let|var|function)/);
if (!match) {
  console.error('Could not parse RAW from html');
  process.exit(1);
}

const products = eval(match[1]);

const STONES_DELTAS = {
  garnet: 0,
  turquoise: 500,
  emerald: 1200,
  sapphire: 0,
  pinksapphire: 800,
  whitetopaz: 0,
  lapis: 300,
  multicolour: 600,
  navratna: 1500,
};

// Transform products to assign real local photos and variants
for (const p of products) {
  const publicDir = path.join(__dirname, '..', 'public', 'images', 'products');
  const photos = [];
  if (fs.existsSync(path.join(publicDir, `${p.handle}-0.jpg`))) {
    photos.push(`/images/products/${p.handle}-0.jpg`);
  }
  if (fs.existsSync(path.join(publicDir, `${p.handle}-1.jpg`))) {
    photos.push(`/images/products/${p.handle}-1.jpg`);
  }
  p.photos = photos;

  // Determine kind
  if (p.setting === 'raw' || p.handle.includes('stone')) {
    p.kind = 'stone';
    p.cat = 'gems';
    p.sizes = ['one'];
  } else if (p.handle.includes('bracelet')) {
    p.kind = 'bracelet';
    p.sizes = ['adj'];
  } else {
    p.kind = 'ring';
  }
}

const seedTsContent = `import mongoose from 'mongoose';
import { connectDB } from '../lib/db';
import { Product } from '../lib/models/Product';
import { Settings } from '../lib/models/Settings';
import { Discount } from '../lib/models/Discount';
import { Page } from '../lib/models/Page';
import { Counter } from '../lib/models/Counter';

const STONES_DELTAS: Record<string, number> = ${JSON.stringify(STONES_DELTAS, null, 2)};

const RAW_PRODUCTS: any[] = ${JSON.stringify(products, null, 2)};

export async function seed() {
  console.log('[Seed] Connecting to MongoDB...');
  await connectDB();

  console.log('[Seed] Resetting catalogue, pages, settings, and discounts...');
  await Product.deleteMany({});
  await Settings.deleteMany({});
  await Discount.deleteMany({});
  await Page.deleteMany({});
  await Counter.deleteMany({});

  console.log('[Seed] Seeding Counter...');
  await Counter.create({ _id: 'order', seq: 1000 });

  console.log('[Seed] Seeding products with full variants...');
  for (const item of RAW_PRODUCTS) {
    const stones: string[] = item.stones && item.stones.length > 0 ? item.stones : ['garnet'];
    const sizes: string[] = item.sizes && item.sizes.length > 0 ? item.sizes : ['7'];
    const basePrice = Number(item.base) || 9000;

    const variants: any[] = [];
    const invMap: Record<string, number> = {};

    for (const st of stones) {
      const delta = STONES_DELTAS[st] || 0;
      const variantPrice = basePrice + delta;

      for (const sz of sizes) {
        let stockVal = 10;
        if (item.seedStock && typeof item.seedStock === 'object') {
          stockVal = item.seedStock[st]?.[sz] ?? 10;
        } else if (typeof item.seedStock === 'number') {
          stockVal = item.seedStock;
        }

        const sku = \`\${item.handle.toUpperCase()}-\${st.toUpperCase()}-\${sz}\`;
        const numericStock = Number(stockVal) || 10;

        variants.push({
          sku,
          stone: st,
          size: sz,
          price: variantPrice,
          compareAt: item.compareAt,
          stock: numericStock,
        });

        invMap[\`\${st}:\${sz}\`] = numericStock;
      }
    }

    await Product.create({
      id: item.id,
      handle: item.handle,
      title: item.title,
      setting: item.setting || 'solitaire',
      family: item.setting === 'signet' || item.setting === 'stepcut' ? 'statement' : 'single',
      band: (item.width || 3) >= 4 ? 'wide' : 'slim',
      cat: item.cat || 'ladies',
      kind: item.kind || 'ring',
      aud: item.aud || (item.cat === 'gents' ? 'men' : 'women'),
      stones: stones,
      base: basePrice,
      stoneDeltas: STONES_DELTAS,
      compareAt: item.compareAt,
      sizes: sizes,
      variants: variants,
      inventory: invMap,
      tags: [item.cat, item.setting, item.kind || 'ring', ...stones],
      photos: item.photos && item.photos.length > 0 ? item.photos : [],
      desc: item.desc || '',
      weight: item.weight,
      width: item.width,
      status: 'active',
      sold: item.sold || 0,
      sortOrder: 0,
    });
  }

  console.log('[Seed] Seeding store settings...');
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
      intl: [
        { id: 'std', label: 'International registered airmail', eta: '10 to 18 business days', price: 3500 },
        { id: 'exp', label: 'DHL / FedEx Express', eta: '3 to 5 business days', price: 6500 },
      ],
    },
    announcements: [
      'Handcrafted in 925 Sterling Silver with Natural Mined Gemstones',
      'Free nationwide delivery across Pakistan on orders over Rs. 15,000',
      'Cash on delivery & direct bank transfer accepted',
    ],
    contact: {
      email: 'info@gsscollection.com',
      phone: '+92 300 1234567',
      hours: 'Mon - Sat, 10:00 AM - 7:00 PM PKT',
      address: 'GSS Collection Fine Jewellery, Lahore, Pakistan',
    },
    bank: {
      bankName: 'Meezan Bank Ltd',
      accountTitle: 'GSS Collection',
      accountNumber: 'PK12MEZN0001000123456701',
    },
    spotlightId: 'crimson-halo-ring',
    moderateReviews: false,
  });

  console.log('[Seed] Seeding discount codes...');
  await Discount.create({
    code: 'WELCOME10',
    type: 'pct',
    value: 10,
    minOrder: 0,
    active: true,
  });
  await Discount.create({
    code: 'FREESHIP',
    type: 'ship',
    value: 100,
    minOrder: 10000,
    active: true,
  });

  console.log('[Seed] Seeding static pages...');
  const pages: any[] = ${JSON.stringify([
    {
      slug: 'size-guide',
      title: 'Ring Sizing Guide',
      body: 'Our rings are crafted in standard US sizes (typically sizes 5 through 12). If you do not know your exact ring size, you can measure the inside diameter of an existing ring in millimetres or wrap a strip of paper snug around your knuckle and measure the circumference. Size 5 is 15.7 mm diameter, Size 6 is 16.5 mm, Size 7 is 17.3 mm, Size 8 is 18.1 mm, Size 9 is 18.9 mm, Size 10 is 19.8 mm, Size 11 is 20.6 mm, and Size 12 is 21.4 mm. We also provide complementary ring resizing advice via WhatsApp.'
    },
    {
      slug: 'contact',
      title: 'Contact & Atelier Inquiries',
      body: 'Have questions regarding custom ring sizing, gemstone selection, or special orders? Our master jeweler workshop is available Monday to Saturday, 10:00 AM to 7:00 PM PKT.\n\nWhatsApp & Helpline: +92 300 1234567\nEmail: info@gsscollection.com\nStudio: GSS Collection Fine Jewellery, Lahore, Pakistan.'
    },
    {
      slug: 'about-us',
      title: 'About GSS Collection',
      body: 'GSS Collection is dedicated to timeless handcrafted jewellery made with high-purity 925 sterling silver and natural, untreated earth-mined gemstones. Unlike mass-manufactured jewellery, every setting is cast and finished by skilled master jewelers, ensuring heirloom quality and lasting durability.'
    },
    {
      slug: 'care-guide',
      title: 'Jewellery & Gemstone Care Guide',
      body: 'To keep your silver jewellery glowing, store pieces in a dry pouch away from direct humidity. For cleaning, use lukewarm water and mild dish soap with a soft-bristled brush. Avoid exposing softer or porous gemstones like Turquoise or Emerald to harsh perfumes, chlorine, chemicals, or ultrasonic cleaners.'
    },
    {
      slug: 'shipping-returns',
      title: 'Shipping & Returns Policy',
      body: 'We deliver nationwide across Pakistan via trusted couriers (TCS / Leopard / Trax). Standard delivery takes 3 to 5 business days, with free shipping on orders above Rs. 15,000. Cash on delivery (COD) and direct bank transfer are accepted. If you receive a damaged piece or the wrong size, contact us within 7 days for a hassle-free exchange.'
    },
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      body: 'At GSS Collection, your privacy is strictly protected. We only collect essential customer contact and shipping details to fulfil your orders and communicate delivery status. We do not sell or share customer personal information with external marketers.'
    },
    {
      slug: 'terms-of-service',
      title: 'Terms of Service',
      body: 'By placing an order on GSS Collection, you agree to our terms of sale. All items are described accurately with genuine hallmark standards. Orders placed via Cash on Delivery are confirmed via phone or WhatsApp prior to dispatch.'
    }
  ], null, 2)};

  for (const p of pages) {
    await Page.create(p);
  }

  console.log('[Seed] Database successfully seeded with 14 products, variants, pages, counter, and settings!');
  process.exit(0);
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('[Seed] Error:', err);
    process.exit(1);
  });
}
`;

fs.writeFileSync(path.join(__dirname, '..', 'data', 'seed.ts'), seedTsContent);
console.log('data/seed.ts generated successfully with real photos, variants, pages, and counter!');
