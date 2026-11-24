import mongoose from 'mongoose';
import { connectDB } from '../lib/db';
import { Product } from '../lib/models/Product';
import { Settings } from '../lib/models/Settings';
import { Discount } from '../lib/models/Discount';
import { Page } from '../lib/models/Page';
import { Counter } from '../lib/models/Counter';

const STONES_DELTAS: Record<string, number> = {
  "garnet": 0,
  "turquoise": 500,
  "emerald": 1200,
  "sapphire": 0,
  "pinksapphire": 800,
  "whitetopaz": 0,
  "lapis": 300,
  "multicolour": 600,
  "navratna": 1500
};

const RAW_PRODUCTS: any[] = [
  {
    "id": "p01",
    "handle": "crimson-halo-ring",
    "title": "Crimson Halo Ring",
    "setting": "cluster",
    "stones": [
      "garnet"
    ],
    "base": 9800,
    "aud": "women",
    "sizes": [
      "5",
      "6",
      "7",
      "8",
      "9"
    ],
    "sold": 240,
    "created": "2026-01-20",
    "weight": 4.6,
    "width": 3,
    "desc": "An oval, deep red stone held in four claws and framed by a halo of small white stones. A slim silver band keeps it light on the hand.",
    "photos": [
      "/images/products/crimson-halo-ring-0.jpg",
      "/images/products/crimson-halo-ring-1.jpg"
    ],
    "seedStock": {
      "garnet": {
        "5": 3,
        "6": 3,
        "7": 6,
        "8": 4,
        "9": 3
      }
    },
    "cat": "ladies",
    "kind": "ring"
  },
  {
    "id": "p02",
    "handle": "midnight-sapphire-halo-ring",
    "title": "Midnight Sapphire Halo Ring",
    "setting": "cluster",
    "stones": [
      "sapphire"
    ],
    "base": 14500,
    "compare": 16500,
    "aud": "women",
    "sizes": [
      "5",
      "6",
      "7",
      "8",
      "9"
    ],
    "sold": 96,
    "created": "2026-04-12",
    "weight": 5.4,
    "width": 3,
    "desc": "A dark blue oval stone ringed by a sunburst of long baguette-cut white stones. Formal, bright and made to be noticed.",
    "photos": [
      "/images/products/midnight-sapphire-halo-ring-0.jpg"
    ],
    "seedStock": {
      "sapphire": {
        "5": 3,
        "6": 1,
        "7": 4,
        "8": 1,
        "9": 2
      }
    },
    "cat": "ladies",
    "kind": "ring"
  },
  {
    "id": "p03",
    "handle": "aqua-emerald-cut-ring",
    "title": "Aqua Emerald-Cut Ring",
    "setting": "stepcut",
    "stones": [
      "turquoise"
    ],
    "base": 8900,
    "aud": "women",
    "sizes": [
      "5",
      "6",
      "7",
      "8",
      "9"
    ],
    "sold": 58,
    "created": "2026-11-06",
    "isNew": true,
    "weight": 5,
    "width": 3,
    "desc": "A rectangular, step-cut turquoise-blue stone in a pave frame, with small blue stones tucked into the open shoulders.",
    "photos": [
      "/images/products/aqua-emerald-cut-ring-0.jpg"
    ],
    "seedStock": {
      "turquoise": {
        "5": 2,
        "6": 3,
        "7": 1,
        "8": 3,
        "9": 3
      }
    },
    "cat": "ladies",
    "kind": "ring"
  },
  {
    "id": "p04",
    "handle": "pink-emerald-cut-ring",
    "title": "Pink Emerald-Cut Ring",
    "setting": "stepcut",
    "stones": [
      "pinksapphire"
    ],
    "base": 11800,
    "aud": "women",
    "sizes": [
      "5",
      "6",
      "7",
      "8",
      "9"
    ],
    "sold": 31,
    "created": "2026-11-12",
    "isNew": true,
    "weight": 3.8,
    "width": 2,
    "desc": "A soft pink emerald-cut stone with two white baguettes stepping down each side and a row of tiny stones along the band.",
    "photos": [
      "/images/products/pink-emerald-cut-ring-0.jpg"
    ],
    "seedStock": {
      "pinksapphire": {
        "5": 1,
        "6": 1,
        "7": 2,
        "8": 0,
        "9": 2
      }
    },
    "cat": "ladies",
    "kind": "ring"
  },
  {
    "id": "p05",
    "handle": "blue-star-cluster-ring",
    "title": "Blue Star Cluster Ring",
    "setting": "cluster",
    "stones": [
      "sapphire"
    ],
    "base": 12600,
    "aud": "women",
    "sizes": [
      "5",
      "6",
      "7",
      "8",
      "9"
    ],
    "sold": 74,
    "created": "2026-06-03",
    "weight": 5.9,
    "width": 3,
    "desc": "Six large white stones set in a hexagon and edged with tiny blue stones, with a small blue flower in the middle.",
    "photos": [
      "/images/products/blue-star-cluster-ring-0.jpg"
    ],
    "seedStock": {
      "sapphire": {
        "5": 2,
        "6": 1,
        "7": 2,
        "8": 1,
        "9": 2
      }
    },
    "cat": "ladies",
    "kind": "ring"
  },
  {
    "id": "p06",
    "handle": "clear-halo-ring",
    "title": "Clear Halo Ring",
    "setting": "cluster",
    "stones": [
      "whitetopaz"
    ],
    "base": 7900,
    "aud": "women",
    "sizes": [
      "5",
      "6",
      "7",
      "8",
      "9"
    ],
    "sold": 165,
    "created": "2026-02-18",
    "weight": 3.2,
    "width": 2,
    "desc": "A round, clear stone in a polished silver bezel, circled by small stones. Light, bright and easy to wear every day.",
    "photos": [
      "/images/products/clear-halo-ring-0.jpg"
    ],
    "seedStock": {
      "whitetopaz": {
        "5": 2,
        "6": 4,
        "7": 3,
        "8": 2,
        "9": 3
      }
    },
    "cat": "ladies",
    "kind": "ring"
  },
  {
    "id": "p07",
    "handle": "emerald-halo-oval-ring",
    "title": "Emerald Halo Oval Ring",
    "setting": "cluster",
    "stones": [
      "emerald"
    ],
    "base": 12600,
    "compare": 14000,
    "aud": "women",
    "sizes": [
      "5",
      "6",
      "7",
      "8",
      "9"
    ],
    "sold": 52,
    "created": "2026-09-10",
    "weight": 5.6,
    "width": 3,
    "desc": "A deep green oval stone surrounded by a ring of bright round white stones, on a silver band with split shoulders.",
    "photos": [
      "/images/products/emerald-halo-oval-ring-0.jpg"
    ],
    "seedStock": {
      "emerald": {
        "5": 2,
        "6": 2,
        "7": 2,
        "8": 3,
        "9": 2
      }
    },
    "cat": "ladies",
    "kind": "ring"
  },
  {
    "id": "p08",
    "handle": "emerald-halo-round-ring",
    "title": "Emerald Halo Round Ring",
    "setting": "cluster",
    "stones": [
      "emerald"
    ],
    "base": 7700,
    "aud": "women",
    "sizes": [
      "5",
      "6",
      "7",
      "8",
      "9"
    ],
    "sold": 143,
    "created": "2026-03-14",
    "weight": 3,
    "width": 2,
    "desc": "A round, vivid green stone with a neat halo of small white stones, on a slim polished band.",
    "photos": [
      "/images/products/emerald-halo-round-ring-0.jpg"
    ],
    "seedStock": {
      "emerald": {
        "5": 4,
        "6": 2,
        "7": 4,
        "8": 4,
        "9": 3
      }
    },
    "cat": "ladies",
    "kind": "ring"
  },
  {
    "id": "p09",
    "handle": "turquoise-oval-ring",
    "title": "Turquoise Oval Ring",
    "setting": "cabochon",
    "stones": [
      "turquoise"
    ],
    "base": 8700,
    "aud": "men",
    "sizes": [
      "8",
      "9",
      "10",
      "11",
      "12"
    ],
    "sold": 88,
    "created": "2026-05-22",
    "weight": 8.4,
    "width": 7,
    "desc": "A smooth, domed oval turquoise in a claw-style bezel on a heavy silver band with engraved shoulders.",
    "photos": [
      "/images/products/turquoise-oval-ring-0.jpg"
    ],
    "seedStock": {
      "turquoise": {
        "8": 3,
        "9": 2,
        "10": 3,
        "11": 3,
        "12": 1
      }
    },
    "cat": "gents",
    "kind": "ring"
  },
  {
    "id": "p10",
    "handle": "tricolour-teardrop-ring",
    "title": "Tricolour Teardrop Ring",
    "setting": "cluster",
    "stones": [
      "multicolour"
    ],
    "base": 13500,
    "aud": "women",
    "sizes": [
      "5",
      "6",
      "7",
      "8",
      "9"
    ],
    "sold": 12,
    "created": "2026-11-19",
    "isNew": true,
    "weight": 6,
    "width": 3,
    "desc": "A teardrop frame of small white stones holding a blue oval centre stone, with a red stone above it and green stones around it.",
    "photos": [
      "/images/products/tricolour-teardrop-ring-0.jpg"
    ],
    "seedStock": {
      "multicolour": {
        "5": 1,
        "6": 2,
        "7": 2,
        "8": 1,
        "9": 1
      }
    },
    "cat": "ladies",
    "kind": "ring"
  },
  {
    "id": "p11",
    "handle": "navratna-cluster-ring",
    "title": "Navratna Cluster Ring",
    "setting": "cluster",
    "stones": [
      "navratna"
    ],
    "base": 16500,
    "aud": "women",
    "sizes": [
      "5",
      "6",
      "7",
      "8",
      "9"
    ],
    "sold": 9,
    "created": "2026-11-19",
    "isNew": true,
    "weight": 7,
    "width": 4,
    "desc": "A large round green centre stone surrounded by blue, red, orange, pink and turquoise stones, with two pearl-white stones between them.",
    "photos": [
      "/images/products/navratna-cluster-ring-0.jpg"
    ],
    "seedStock": {
      "navratna": {
        "5": 1,
        "6": 1,
        "7": 2,
        "8": 1,
        "9": 1
      }
    },
    "cat": "ladies",
    "kind": "ring"
  },
  {
    "id": "p12",
    "handle": "blue-red-eternity-band",
    "title": "Blue and Red Eternity Band",
    "setting": "stacker",
    "stones": [
      "multicolour"
    ],
    "base": 6900,
    "aud": "women",
    "sizes": [
      "5",
      "6",
      "7",
      "8",
      "9"
    ],
    "sold": 15,
    "created": "2026-11-19",
    "isNew": true,
    "weight": 2.5,
    "width": 3,
    "desc": "A slim silver band with a row of blue stones set beside a row of red stones. Light enough to wear alone or stacked.",
    "photos": [
      "/images/products/blue-red-eternity-band-0.jpg"
    ],
    "seedStock": {
      "multicolour": {
        "5": 2,
        "6": 3,
        "7": 3,
        "8": 2,
        "9": 2
      }
    },
    "cat": "ladies",
    "kind": "ring"
  },
  {
    "id": "p13",
    "handle": "lapis-lazuli-bead-bracelet",
    "kind": "bracelet",
    "title": "Lapis Lazuli Bead Bracelet",
    "setting": "bracelet",
    "stones": [
      "lapis"
    ],
    "base": 5200,
    "aud": "women",
    "sizes": [
      "adj"
    ],
    "sold": 20,
    "created": "2026-11-19",
    "isNew": true,
    "weight": 0,
    "width": 0,
    "desc": "A bracelet of round, deep blue lapis lazuli beads with natural golden flecks. Every bead is slightly different.",
    "photos": [
      "/images/products/lapis-lazuli-bead-bracelet-0.jpg"
    ],
    "seedStock": {
      "lapis": {
        "adj": 6
      }
    },
    "cat": "gems"
  },
  {
    "id": "p14",
    "handle": "natural-turquoise-stone-9-7g",
    "kind": "stone",
    "title": "Natural Turquoise Stone, 9.7 g",
    "setting": "loose",
    "stones": [
      "turquoise"
    ],
    "base": 9500,
    "aud": "women",
    "sizes": [
      "one"
    ],
    "sold": 3,
    "created": "2026-11-19",
    "isNew": true,
    "weight": 9.7,
    "width": 0,
    "desc": "A natural oval turquoise cabochon weighing 9.700 grams, in bright sky blue with darker markings. Sold as a single piece.",
    "photos": [
      "/images/products/natural-turquoise-stone-9-7g-0.jpg"
    ],
    "seedStock": {
      "turquoise": {
        "one": 1
      }
    },
    "cat": "gems"
  }
];

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

        const sku = `${item.handle.toUpperCase()}-${st.toUpperCase()}-${sz}`;
        const numericStock = Number(stockVal) || 10;

        variants.push({
          sku,
          stone: st,
          size: sz,
          price: variantPrice,
          compareAt: item.compareAt,
          stock: numericStock,
        });

        invMap[`${st}:${sz}`] = numericStock;
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
  const pages = [
    {
      slug: 'size-guide',
      title: 'Ring Sizing Guide',
      body: 'Our rings are crafted in standard US sizes (typically sizes 5 through 12). If you do not know your exact ring size, you can measure the inside diameter of an existing ring in millimetres or wrap a strip of paper snug around your knuckle and measure the circumference. Size 5 is 15.7 mm diameter, Size 6 is 16.5 mm, Size 7 is 17.3 mm, Size 8 is 18.1 mm, Size 9 is 18.9 mm, Size 10 is 19.8 mm, Size 11 is 20.6 mm, and Size 12 is 21.4 mm. We also provide complementary ring resizing advice via WhatsApp.'
    },
    {
      slug: 'contact',
      title: 'Contact & Atelier Inquiries',
      body: 'Have questions regarding custom ring sizing, gemstone selection, or special orders? Our master jeweler workshop is available Monday to Saturday, 10:00 AM to 7:00 PM PKT.

WhatsApp & Helpline: +92 300 1234567
Email: info@gsscollection.com
Studio: GSS Collection Fine Jewellery, Lahore, Pakistan.'
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
  ];

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
