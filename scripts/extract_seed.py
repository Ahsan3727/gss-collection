import json
import os
import pathlib

root_dir = pathlib.Path(__file__).parent.parent
html_path = root_dir / 'gss-collection-store-with-admin.html'

with open(html_path, 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('const RAW = [')
end = text.find('];', start)
raw_str = text[start + len('const RAW = '):end + 1]
products = json.loads(raw_str)

for p in products:
    p['photos'] = []

out_dir = root_dir / 'data'
out_dir.mkdir(parents=True, exist_ok=True)

ts_template = f'''import mongoose from 'mongoose';
import {{ connectDB }} from '../lib/db';
import {{ Product }} from '../lib/models/Product';
import {{ Settings }} from '../lib/models/Settings';
import {{ Discount }} from '../lib/models/Discount';

const PRODUCTS_DATA = {json.dumps(products, indent=2)};

export async function seed() {{
  console.log('Connecting to MongoDB...');
  await connectDB();

  console.log('Clearing existing products, settings, discounts...');
  await Product.deleteMany({{}});
  await Settings.deleteMany({{}});
  await Discount.deleteMany({{}});

  console.log('Seeding products...');
  for (const item of PRODUCTS_DATA) {{
    const inv: Record<string, number> = {{}};
    const stones = item.stones || ['garnet'];
    const sizes = item.sizes || ['7'];
    
    for (const st of stones) {{
      for (const sz of sizes) {{
        inv[st + ':' + sz] = item.seedStock || 10;
      }}
    }}

    await Product.create({{
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
    }});
  }}

  console.log('Seeding settings...');
  await Settings.create({{
    storeName: 'GSS Collection',
    tagline: 'Silver rings, set with stone',
    baseCurrency: 'PKR',
    freeShippingFrom: 15000,
  }});

  console.log('Seeding discounts...');
  await Discount.create({{
    code: 'WELCOME10',
    type: 'pct',
    value: 10,
    minOrder: 0,
    active: true,
  }});

  console.log('Seed completed successfully!');
  process.exit(0);
}}

seed().catch((err) => {{
  console.error('Seed failed:', err);
  process.exit(1);
}});
'''

with open(out_dir / 'seed.ts', 'w', encoding='utf-8') as out:
    out.write(ts_template)

print('data/seed.ts created successfully!')
