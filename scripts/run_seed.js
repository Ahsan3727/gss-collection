const fs = require('fs');
const path = require('path');

// Read .env.local and populate process.env
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        process.env[key] = val;
      }
    }
  }
}

console.log('[Runner] Target Mongo URI:', process.env.MONGODB_URI ? 'Configured (Atlas)' : 'Missing');

// Require and run seed
require('tsx/cjs');
const { seed } = require('../data/seed.ts');

seed()
  .then(() => {
    console.log('[Runner] Live Atlas seed finished successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Runner] Seed failed:', err);
    process.exit(1);
  });
