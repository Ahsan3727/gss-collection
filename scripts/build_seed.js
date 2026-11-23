const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'gss-collection-store-with-admin.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const start = html.indexOf('const RAW = [');
const end = html.indexOf('];', start);
const rawStr = html.slice(start + 'const RAW = '.length, end + 1);
const products = JSON.parse(rawStr);

for (const p of products) {
  p.photos = [];
}

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const codeLines = [
  "import mongoose from 'mongoose';",
  "import { connectDB } from '../lib/db';",
  "import { Product } from '../lib/models/Product';",
  "import { Settings } from '../lib/models/Settings';",
  "import { Discount } from '../lib/models/Discount';",
  "",
  "const PRODUCTS_DATA: any[] = " + JSON.stringify(products, null, 2) + ";",
  "",
  "export async function seed() {",
  "  console.log('Connecting to MongoDB...');",
  "  await connectDB();",
  "",
  "  console.log('Clearing existing records...');",
  "  await Product.deleteMany({});",
  "  await Settings.deleteMany({});",
  "  await Discount.deleteMany({});",
  "",
  "  console.log('Seeding products...');",
  "  for (const item of PRODUCTS_DATA) {",
  "    const inv: Record<string, number> = {};",
  "    const stones = item.stones || ['garnet'];",
  "    const sizes = item.sizes || ['7'];",
  "    for (const st of stones) {",
  "      for (const sz of sizes) {",
  "        let stockVal = 10;",
  "        if (item.seedStock && typeof item.seedStock === 'object') {",
  "          stockVal = item.seedStock[st]?.[sz] ?? 10;",
  "        } else if (typeof item.seedStock === 'number') {",
  "          stockVal = item.seedStock;",
  "        }",
  "        inv[st + ':' + sz] = Number(stockVal) || 10;",
  "      }",
  "    }",
  "",
  "    await Product.create({",
  "      id: item.id,",
  "      handle: item.handle,",
  "      title: item.title,",
  "      setting: item.setting,",
  "      family: item.setting === 'signet' || item.setting === 'stepcut' ? 'statement' : 'single',",
  "      band: (item.width || 3) >= 4 ? 'wide' : 'slim',",
  "      cat: item.cat || 'ladies',",
  "      aud: item.aud || 'women',",
  "      stones: stones,",
  "      base: item.base || 9000,",
  "      sizes: sizes,",
  "      inventory: inv,",
  "      tags: [item.cat, item.setting, ...stones],",
  "      photos: item.photos || [],",
  "      desc: item.desc || '',",
  "      weight: item.weight,",
  "      width: item.width,",
  "      status: 'active',",
  "      sold: item.sold || 0,",
  "      sortOrder: 0,",
  "    });",
  "  }",
  "",
  "  console.log('Seeding settings...');",
  "  await Settings.create({",
  "    storeName: 'GSS Collection',",
  "    tagline: 'Silver rings, set with stone',",
  "    baseCurrency: 'PKR',",
  "    freeShippingFrom: 15000,",
  "  });",
  "",
  "  console.log('Seeding discounts...');",
  "  await Discount.create({",
  "    code: 'WELCOME10',",
  "    type: 'pct',",
  "    value: 10,",
  "    minOrder: 0,",
  "    active: true,",
  "  });",
  "",
  "  console.log('Seed completed successfully!');",
  "  process.exit(0);",
  "}",
  "",
  "seed().catch((err) => {",
  "  console.error('Seed failed:', err);",
  "  process.exit(1);",
  "});",
];

fs.writeFileSync(path.join(dataDir, 'seed.ts'), codeLines.join('\n'), 'utf8');
console.log('data/seed.ts regenerated successfully!');
