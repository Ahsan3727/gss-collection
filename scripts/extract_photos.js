const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'gss-collection-store-with-admin.html');
const outDir = path.join(__dirname, '..', 'public', 'images', 'products');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/const RAW = (\[[\s\S]*?\]);\s*(?:const|let|var|function)/);

if (!match) {
  console.error('Could not find const RAW in HTML');
  process.exit(1);
}

const products = eval(match[1]);
console.log(`Processing ${products.length} products for photo extraction...`);

let totalSaved = 0;
for (const p of products) {
  if (p.photos && p.photos.length > 0) {
    p.photos.forEach((photoData, idx) => {
      if (typeof photoData === 'string' && photoData.startsWith('data:image')) {
        const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${p.handle}-${idx}.jpg`;
        const filepath = path.join(outDir, filename);
        fs.writeFileSync(filepath, buffer);
        totalSaved++;
      }
    });
  }
}

console.log(`Extracted and saved ${totalSaved} high-resolution product photos to public/images/products/!`);
