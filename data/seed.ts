import mongoose from 'mongoose';
import { connectDB } from '../lib/db';
import { Product } from '../lib/models/Product';
import { Settings } from '../lib/models/Settings';
import { Discount } from '../lib/models/Discount';

const PRODUCTS_DATA: any[] = [
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
    "photos": [],
    "seedStock": {
      "garnet": {
        "5": 3,
        "6": 3,
        "7": 6,
        "8": 4,
        "9": 3
      }
    },
    "cat": "ladies"
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
    "photos": [],
    "seedStock": {
      "sapphire": {
        "5": 3,
        "6": 1,
        "7": 4,
        "8": 1,
        "9": 2
      }
    },
    "cat": "ladies"
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
    "photos": [],
    "seedStock": {
      "turquoise": {
        "5": 2,
        "6": 3,
        "7": 1,
        "8": 3,
        "9": 3
      }
    },
    "cat": "ladies"
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
    "photos": [],
    "seedStock": {
      "pinksapphire": {
        "5": 1,
        "6": 1,
        "7": 2,
        "8": 0,
        "9": 2
      }
    },
    "cat": "ladies"
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
    "photos": [],
    "seedStock": {
      "sapphire": {
        "5": 2,
        "6": 1,
        "7": 2,
        "8": 1,
        "9": 2
      }
    },
    "cat": "ladies"
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
    "photos": [],
    "seedStock": {
      "whitetopaz": {
        "5": 2,
        "6": 4,
        "7": 3,
        "8": 2,
        "9": 3
      }
    },
    "cat": "ladies"
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
    "photos": [],
    "seedStock": {
      "emerald": {
        "5": 2,
        "6": 2,
        "7": 2,
        "8": 3,
        "9": 2
      }
    },
    "cat": "ladies"
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
    "photos": [],
    "seedStock": {
      "emerald": {
        "5": 4,
        "6": 2,
        "7": 4,
        "8": 4,
        "9": 3
      }
    },
    "cat": "ladies"
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
    "photos": [],
    "seedStock": {
      "turquoise": {
        "8": 3,
        "9": 2,
        "10": 3,
        "11": 3,
        "12": 1
      }
    },
    "cat": "gents"
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
    "photos": [],
    "seedStock": {
      "multicolour": {
        "5": 1,
        "6": 2,
        "7": 2,
        "8": 1,
        "9": 1
      }
    },
    "cat": "ladies"
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
    "photos": [],
    "seedStock": {
      "navratna": {
        "5": 1,
        "6": 1,
        "7": 2,
        "8": 1,
        "9": 1
      }
    },
    "cat": "ladies"
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
    "photos": [],
    "seedStock": {
      "multicolour": {
        "5": 2,
        "6": 3,
        "7": 3,
        "8": 2,
        "9": 2
      }
    },
    "cat": "ladies"
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
    "photos": [],
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
    "photos": [],
    "seedStock": {
      "turquoise": {
        "one": 1
      }
    },
    "cat": "gems"
  }
];

export async function seed() {
  console.log('Connecting to MongoDB...');
  await connectDB();

  console.log('Clearing existing records...');
  await Product.deleteMany({});
  await Settings.deleteMany({});
  await Discount.deleteMany({});

  console.log('Seeding products...');
  for (const item of PRODUCTS_DATA) {
    const inv: Record<string, number> = {};
    const stones = item.stones || ['garnet'];
    const sizes = item.sizes || ['7'];
    for (const st of stones) {
      for (const sz of sizes) {
        let stockVal = 10;
        if (item.seedStock && typeof item.seedStock === 'object') {
          stockVal = item.seedStock[st]?.[sz] ?? 10;
        } else if (typeof item.seedStock === 'number') {
          stockVal = item.seedStock;
        }
        inv[st + ':' + sz] = Number(stockVal) || 10;
      }
    }

    await Product.create({
      id: item.id,
      handle: item.handle,
      title: item.title,
      setting: item.setting,
      family: item.setting === 'signet' || item.setting === 'stepcut' ? 'statement' : 'single',
      band: (item.width || 3) >= 4 ? 'wide' : 'slim',
      cat: item.cat || 'ladies',
      aud: item.aud || 'women',
      stones: stones,
      base: item.base || 9000,
      sizes: sizes,
      inventory: inv,
      tags: [item.cat, item.setting, ...stones],
      photos: item.photos || [],
      desc: item.desc || '',
      weight: item.weight,
      width: item.width,
      status: 'active',
      sold: item.sold || 0,
      sortOrder: 0,
    });
  }

  console.log('Seeding settings...');
  await Settings.create({
    storeName: 'GSS Collection',
    tagline: 'Silver rings, set with stone',
    baseCurrency: 'PKR',
    freeShippingFrom: 15000,
  });

  console.log('Seeding discounts...');
  await Discount.create({
    code: 'WELCOME10',
    type: 'pct',
    value: 10,
    minOrder: 0,
    active: true,
  });

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});